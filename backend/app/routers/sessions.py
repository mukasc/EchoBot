# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

"""
Sessions router — CRUD, audio upload and AI processing.
"""
from __future__ import annotations

import gzip
import io
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Settings, get_settings
from app.database import get_db
from app.exceptions import BadRequestException, NotFoundException
from app.models.session import (
    Session,
    SessionCreate,
    SessionStatus,
    SessionUpdate,
    TechnicalDiaryEntry,
    TranscriptionSegment,
    TranscriptionSegmentUpdate,
    MessageType,
)
from app.models.settings import AppSettings
from app.services.ai_processor import AIProcessorService
from app.services.elevenlabs import ElevenLabsService
from app.services.transcription import TranscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])

_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
_ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".webm", ".mp4", ".m4a"}
_ALLOWED_CONTENT_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_datetime(obj):
    """Recursively convert datetime objects to ISO strings for MongoDB."""
    if isinstance(obj, dict):
        return {k: _serialize_datetime(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_datetime(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def _deserialize_session(doc: dict) -> Session:
    for field in ("created_at", "updated_at"):
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except ValueError:
                pass
    return Session(**doc)


async def _get_app_settings(db: AsyncIOMotorDatabase) -> AppSettings:
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if doc:
        return AppSettings(**doc)
    return AppSettings()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[Session])
async def list_sessions(db: AsyncIOMotorDatabase = Depends(get_db)):
    docs = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_deserialize_session(d) for d in docs]


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)
    return _deserialize_session(doc)


@router.post("/", response_model=Session, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    session = Session(**payload.model_dump())
    await db.sessions.insert_one(_serialize_datetime(session.model_dump()))
    return session


@router.put("/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    payload: SessionUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if "technical_diary" in update_data:
        update_data["technical_diary"] = [
            _serialize_datetime(
                entry.model_dump() if hasattr(entry, "model_dump") else entry
            )
            for entry in update_data["technical_diary"]
        ]

    await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    updated = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    return _deserialize_session(updated)


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise NotFoundException("Session", session_id)


# ---------------------------------------------------------------------------
# Transcription segments
# ---------------------------------------------------------------------------

@router.put("/{session_id}/segments/{segment_id}", status_code=200)
async def update_segment(
    session_id: str,
    segment_id: str,
    payload: TranscriptionSegmentUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    segments = doc.get("transcription_segments", [])
    found = False
    for seg in segments:
        if seg.get("id") == segment_id:
            if payload.text is not None:
                seg["text"] = payload.text
            if payload.message_type is not None:
                seg["message_type"] = payload.message_type
            if payload.speaker_character_name is not None:
                seg["speaker_character_name"] = payload.speaker_character_name
            found = True
            break

    if not found:
        raise NotFoundException("Segment", segment_id)

    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "transcription_segments": segments,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "Segment updated"}


# ---------------------------------------------------------------------------
# Audio upload + transcription
# ---------------------------------------------------------------------------

@router.post("/{session_id}/upload-audio")
async def upload_audio(
    session_id: str,
    file: UploadFile = File(...),
    speaker_id: Optional[str] = Form(None),
    session_start_time: Optional[str] = Form(None),
    chunk_offset: float = Form(0.0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Upload and transcribe audio for a session."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    # Validate file type
    suffix = Path(file.filename or "").suffix.lower()
    if file.content_type not in _ALLOWED_CONTENT_TYPES and suffix not in _ALLOWED_AUDIO_EXTENSIONS:
        raise BadRequestException("Invalid audio file type")

    # Parse optional session start time
    session_start_dt: Optional[datetime] = None
    if session_start_time:
        try:
            session_start_dt = datetime.fromisoformat(session_start_time.replace("Z", "+00:00"))
        except ValueError:
            logger.warning("Could not parse session_start_time: %s", session_start_time)

    # Mark as transcribing
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": SessionStatus.TRANSCRIBING.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    try:
        audio_content = await file.read()

        # Determine append mode
        is_append = bool(doc.get("audio_file_id"))

        # Persist compressed audio (GridFS via sync client runs in threadpool)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "audio"))
        file_path = _UPLOAD_DIR / f"session_{session_id}_{timestamp}_{safe_name}"
        _UPLOAD_DIR.mkdir(exist_ok=True)
        file_path.write_bytes(audio_content)

        # Transcribe
        svc = TranscriptionService(settings)
        result = await svc.transcribe(
            audio_content=audio_content,
            filename=file.filename or "audio.wav",
            file_path=file_path,
        )

        # Build TranscriptionSegment documents
        def _calc_absolute(relative: float) -> Optional[str]:
            if session_start_dt and relative is not None:
                return (session_start_dt + timedelta(seconds=chunk_offset + relative)).isoformat()
            return None

        speaker = speaker_id or "unknown"
        processed_segments = []

        if result.segments:
            for seg in result.segments:
                ts = TranscriptionSegment(
                    speaker_discord_id=speaker,
                    text=seg.text,
                    timestamp_start=chunk_offset + seg.start,
                    timestamp_end=chunk_offset + seg.end,
                    timestamp_absolute_start=_calc_absolute(seg.start),
                    timestamp_absolute_end=_calc_absolute(seg.end),
                    message_type=MessageType.IC,
                )
                processed_segments.append(_serialize_datetime(ts.model_dump()))
        else:
            ts = TranscriptionSegment(
                speaker_discord_id=speaker,
                text=result.raw_text,
                timestamp_start=chunk_offset,
                timestamp_end=chunk_offset,
                timestamp_absolute_start=_calc_absolute(0),
                timestamp_absolute_end=_calc_absolute(0),
                message_type=MessageType.IC,
            )
            processed_segments.append(_serialize_datetime(ts.model_dump()))

        # Store in MongoDB
        if is_append:
            existing = await db.sessions.find_one({"id": session_id}, {"raw_transcription": 1})
            existing_text = (existing or {}).get("raw_transcription", "")
            new_text = f"{existing_text} {result.raw_text}".strip()
            # Calculate new duration
            last_end = 0
            if result.segments:
                last_end = max(seg.end for seg in result.segments)
            current_duration_sec = chunk_offset + last_end
            current_duration_min = int(current_duration_sec // 60)

            await db.sessions.update_one(
                {"id": session_id},
                {
                    "$push": {"transcription_segments": {"$each": processed_segments}},
                    "$set": {
                        "raw_transcription": new_text,
                        "status": SessionStatus.AWAITING_REVIEW.value,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "duration_minutes": current_duration_min
                    },
                },
            )
        else:
            # Compress and store audio_file_id reference (lightweight approach)
            compressed = io.BytesIO()
            with gzip.GzipFile(fileobj=compressed, mode="wb") as gz:
                gz.write(audio_content)
            audio_file_id = f"file:{file_path.name}"  # reference to disk path

            await db.sessions.update_one(
                {"id": session_id},
                {
                    "$set": {
                        "raw_transcription": result.raw_text,
                        "transcription_segments": processed_segments,
                        "audio_file_id": audio_file_id,
                        "status": SessionStatus.AWAITING_REVIEW.value,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

        return {
            "message": "Audio transcribed successfully",
            "method": result.method,
            "segments_count": len(processed_segments),
            "is_append": is_append,
        }

    except Exception as exc:
        logger.exception("Transcription error: %s", exc)
        
        # Determine if it's a quota error
        msg = str(exc).lower()
        if "quota" in msg or "rate limit" in msg or "429" in msg:
            raise HTTPException(status_code=429, detail=f"Quota exceeded: {exc}") from exc

        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc


# ---------------------------------------------------------------------------
# AI Processing
# ---------------------------------------------------------------------------

@router.post("/{session_id}/process")
async def process_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Process transcription with AI to generate technical diary and review script."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    raw_transcription = doc.get("raw_transcription", "")
    if not raw_transcription:
        raise BadRequestException("No transcription available to process")

    mappings = await db.character_mappings.find({}, {"_id": 0}).to_list(100)
    mapping_context = (
        "\n".join(f"- {m['discord_username']} -> {m['character_name']}" for m in mappings)
        if mappings
        else "Nenhum mapeamento definido"
    )

    app_settings = await _get_app_settings(db)

    try:
        processor = AIProcessorService(settings)
        ai_result = await processor.process(
            raw_transcription=raw_transcription,
            game_system=doc.get("game_system", "D&D 5e"),
            mapping_context=mapping_context,
            app_settings=app_settings,
        )
    except Exception as exc:
        logger.error("AI processing error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc

    # Build diary entries
    diary_entries = [
        _serialize_datetime(
            TechnicalDiaryEntry(
                category=entry.get("category", "event"),
                name=entry.get("name", ""),
                description=entry.get("description"),
            ).model_dump()
        )
        for entry in ai_result.get("technical_diary", [])
    ]

    # Apply IC/OOC classification to existing segments
    segments = doc.get("transcription_segments", [])
    filtered = ai_result.get("filtered_segments", [])
    for i, seg in enumerate(segments):
        if i < len(filtered):
            seg["message_type"] = filtered[i].get("type", "ic")
            if filtered[i].get("character"):
                seg["speaker_character_name"] = filtered[i]["character"]

    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "technical_diary": diary_entries,
                "review_script": ai_result.get("review_script", raw_transcription),
                "transcription_segments": segments,
                "status": SessionStatus.AWAITING_REVIEW.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    return {"message": "Session processed successfully", "diary_entries": len(diary_entries)}


@router.post("/{session_id}/narration")
async def generate_narration(
    session_id: str, 
    provider: Optional[str] = None,
    voice_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Gera o áudio da narração épica usando ElevenLabs ou Deepgram."""
    doc = await db.sessions.find_one({"id": session_id})
    if not doc:
        raise NotFoundException("Sessão não encontrada")

    script = doc.get("review_script", "").strip()
    if not script:
        raise BadRequestException("Roteiro de revisão está vazio. Processe a sessão primeiro.")

    app_settings = await _get_app_settings(db)
    
    # Decide which provider to use
    used_provider = provider or app_settings.tts_provider or "elevenlabs"
    
    logger.info(f"--- Narration Request ---")
    logger.info(f"Provider: {used_provider}")
    logger.info(f"Voice ID: {voice_id}")
    logger.info(f"Script (first 50 chars): {script[:50]}...")
    
    try:
        if used_provider == "elevenlabs":
            from app.services.elevenlabs import ElevenLabsService
            api_key = app_settings.elevenlabs_api_key
            v_id = voice_id or app_settings.elevenlabs_voice_id
            
            if not api_key:
                raise BadRequestException("Chave de API do ElevenLabs não configurada.")
                
            svc = ElevenLabsService(app_settings)
            filename = await svc.generate_narration(text=script, api_key=api_key, voice_id=v_id)
        
        elif used_provider == "deepgram":
            from app.services.deepgram import DeepgramService
            api_key = app_settings.deepgram_api_key
            v_id = voice_id or app_settings.deepgram_model
            
            if not api_key:
                raise BadRequestException("Chave de API do Deepgram não configurada.")
                
            svc = DeepgramService(app_settings)
            filename = await svc.generate_narration(text=script, voice_id=v_id)

        elif used_provider == "kokoro":
            from app.services.kokoro import KokoroService
            # Kokoro local uses our internal API, but we can call the service directly if we want.
            # However, KokoroService in services/kokoro.py is a client for the Kokoro Web API.
            # We should probably use kokoro_local_engine directly to avoid HTTP loopback if possible,
            # or keep it as is if KokoroService is what we want.
            # Since we have kokoro_local_engine, let's use it directly to be more efficient.
            
            v_id = voice_id or app_settings.kokoro_voice
            logger.info(f"Kokoro target voice: {v_id}")
            
            # Sanitization of voice id
            if v_id:
                v_id = v_id.strip()

            from app.services.kokoro_local import kokoro_local_engine
            import uuid
            import soundfile as sf
            
            filename = f"narration_kokoro_{uuid.uuid4()}.mp3"
            upload_dir = Path(__file__).parent.parent.parent / "uploads" / "narrations"
            upload_dir.mkdir(parents=True, exist_ok=True)
            output_path = upload_dir / filename
            
            # Use .wav for intermediate then we can convert or just use .wav if mp3 is not strictly required
            # But the filename says .mp3. Soundfile can't write mp3 directly easily.
            # Let's use .wav for now as it's safe, and update the filename.
            filename = filename.replace(".mp3", ".wav")
            output_path = upload_dir / filename

            from fastapi.concurrency import run_in_threadpool
            samples, sample_rate = await run_in_threadpool(
                kokoro_local_engine.generate,
                text=script,
                voice=v_id
            )
            sf.write(str(output_path), samples, sample_rate)
        
        else:
            raise BadRequestException(f"Provedor de TTS inválido: {used_provider}")
        
        # Audio is served via static files at /uploads/narrations/
        audio_url = f"/uploads/narrations/{filename}"
        
        await db.sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "narration_audio_url": audio_url,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        
        return {"message": "Narração gerada com sucesso!", "audio_url": audio_url}
    except Exception as exc:
        import traceback
        logger.error(f"Narration generation error for session {session_id}: {exc}")
        logger.error(traceback.format_exc())
        
        # If it's already an HTTPException, re-raise it
        if isinstance(exc, HTTPException):
            raise exc
            
        # Detail the error for the frontend
        error_detail = str(exc)
        if "ElevenLabs" in error_detail:
            raise HTTPException(status_code=400, detail=error_detail)
            
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar áudio: {error_detail}")
