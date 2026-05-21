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

import asyncio
import gzip
import io
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from app.interfaces import DatabaseProviderInterface

from app.config import Settings, get_settings
from app.models.common import SessionStatus
from app.utils.audio import convert_to_ogg, split_and_convert_to_ogg, mix_audio_with_background
from app.database import get_db
from app.exceptions import AppException, BadRequestException, NotFoundException
from app.models.session import (
    Session,
    SessionCreate,
    SessionStatus,
    SessionUpdate,
    TechnicalDiaryEntry,
    TranscriptionSegment,
    TranscriptionSegmentUpdate,
    MessageType,
    SessionProcessRequest,
    SessionFindReplaceRequest,
    BulkDeleteSegmentsRequest,
)
from app.models.settings import AppSettings
from app.services.ai_processor import AIProcessorService
from app.services.elevenlabs import ElevenLabsService
from app.services.transcription import TranscriptionService
from app.services.export import ExportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])

_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
_ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".webm", ".mp4", ".m4a", ".ogg", ".opus"}
_ALLOWED_CONTENT_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a",
    "audio/ogg", "audio/opus", "video/ogg", "application/ogg"
}

# Lock to prevent concurrent transcriptions (OOM protection and race condition avoidance)
_transcription_lock = asyncio.Lock()


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


from app.services.settings_service import get_app_settings as _get_app_settings


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[Session])
async def list_sessions(db: DatabaseProviderInterface = Depends(get_db)):
    docs = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_deserialize_session(d) for d in docs]


@router.get("/{session_id}", response_model=Session)
async def get_session(
    session_id: str, 
    db: DatabaseProviderInterface = Depends(get_db),
    accept_language: str = Header("pt-BR", alias="Accept-Language"),
):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        from app.utils.i18n import t
        raise NotFoundException(t('error.session_not_found', accept_language), session_id)
    return _deserialize_session(doc)


@router.post("/", response_model=Session, status_code=201)
async def create_session(payload: SessionCreate, db: DatabaseProviderInterface = Depends(get_db)):
    session = Session(**payload.model_dump())
    await db.sessions.insert_one(_serialize_datetime(session.model_dump()))
    return session


@router.put("/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    payload: SessionUpdate,
    db: DatabaseProviderInterface = Depends(get_db),
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
async def delete_session(session_id: str, db: DatabaseProviderInterface = Depends(get_db)):
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
    db: DatabaseProviderInterface = Depends(get_db),
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


@router.delete("/{session_id}/segments/{segment_id}", status_code=200)
async def delete_segment(
    session_id: str,
    segment_id: str,
    db: DatabaseProviderInterface = Depends(get_db),
):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    segments = doc.get("transcription_segments", [])
    initial_len = len(segments)
    segments = [seg for seg in segments if seg.get("id") != segment_id]
    
    if len(segments) == initial_len:
        raise NotFoundException("Segment", segment_id)
        
    # Re-assemble raw_transcription based on remaining segments
    raw_text = " ".join(seg.get("text", "") for seg in segments).strip()

    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "transcription_segments": segments,
                "raw_transcription": raw_text,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "Segment deleted successfully"}


@router.post("/{session_id}/segments/bulk-delete", status_code=200)
async def delete_segments_bulk(
    session_id: str,
    payload: BulkDeleteSegmentsRequest,
    db: DatabaseProviderInterface = Depends(get_db),
):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    segments = doc.get("transcription_segments", [])
    to_delete = set(payload.segment_ids)
    segments = [seg for seg in segments if seg.get("id") not in to_delete]
    
    # Re-assemble raw_transcription based on remaining segments
    raw_text = " ".join(seg.get("text", "") for seg in segments).strip()

    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "transcription_segments": segments,
                "raw_transcription": raw_text,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "Segments deleted successfully"}


# ---------------------------------------------------------------------------
# Background Task Helpers
# ---------------------------------------------------------------------------

async def _get_campaign_glossary(db: DatabaseProviderInterface, campaign_id: Optional[str]) -> str:
    """Combines manual glossary with terms discovered in previous technical diaries."""
    if not campaign_id:
        return ""
    
    # 1. Fetch manual glossary
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"spelling_glossary": 1})
    manual_glossary = (campaign or {}).get("spelling_glossary", "") or ""
    
    # 2. Fetch terms from past technical diaries
    # We look for NPCs, Locations, and Items specifically
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {"$unwind": "$technical_diary"},
        {"$match": {"technical_diary.category": {"$in": ["npc", "location", "item"]}}},
        {"$group": {"_id": "$technical_diary.name"}}
    ]
    
    auto_names = []
    try:
        cursor = db.sessions.aggregate(pipeline)
        async for doc in cursor:
            if doc.get("_id"):
                auto_names.append(doc["_id"])
    except Exception as e:
        logger.warning(f"Error aggregating auto-glossary: {e}")

    if not auto_names:
        return manual_glossary
        
    auto_glossary_str = "Conhecimento Prévio (Sessões Anteriores): " + ", ".join(auto_names)
    
    if manual_glossary:
        return f"{manual_glossary}\n\n{auto_glossary_str}"
    return auto_glossary_str


async def _get_campaign_quests(db: DatabaseProviderInterface, campaign_id: Optional[str], current_session_id: str) -> str:
    """Retrieves and consolidates active/completed quests from previous sessions of the campaign."""
    if not campaign_id:
        return ""
    
    # Query all sessions in the campaign except the current one, sorted by created_at (ascending)
    pipeline = [
        {"$match": {"campaign_id": campaign_id, "id": {"$ne": current_session_id}}},
        {"$sort": {"created_at": 1}},
        {"$unwind": "$technical_diary"},
        {"$match": {"technical_diary.category": "quest"}},
        {"$project": {
            "name": "$technical_diary.name",
            "description": "$technical_diary.description",
            "status": "$technical_diary.status",
        }}
    ]
    
    quests = {}
    try:
        cursor = db.sessions.aggregate(pipeline)
        async for doc in cursor:
            name = doc.get("name")
            if not name:
                continue
            # Keep the latest status / description for each quest name (overwriting older ones)
            quests[name] = {
                "description": doc.get("description") or "",
                "status": doc.get("status") or "Ativa",
            }
    except Exception as e:
        logger.warning(f"Error aggregating campaign quests: {e}")
        return ""

    if not quests:
        return ""

    lines = []
    for q_name, q_data in quests.items():
        desc = f" ({q_data['description']})" if q_data['description'] else ""
        status = q_data['status'] or "Ativa"
        lines.append(f"- Quest: {q_name}{desc} | Status: {status}")
    
    return "\n".join(lines)


async def _background_transcribe(
    session_id: str,
    filename: str,
    file_path: Path,
    speaker_id: Optional[str],
    chunk_offset: float,
    session_start_dt: Optional[datetime],
    db: DatabaseProviderInterface,
    settings: Settings,
    target_language: str = "pt-BR",
    glossary: Optional[str] = None,
):
    logger.info("Queued background transcription task started for session %s, file: %s (offset: %s)", session_id, filename, chunk_offset)
    async with _transcription_lock:
        logger.info("Acquired lock for session %s, transcribing file: %s (offset: %s)", session_id, filename, chunk_offset)
        try:
            # Determine append mode: check if there is any existing transcription
            doc = await db.sessions.find_one({"id": session_id}, {"audio_file_id": 1, "raw_transcription": 1, "transcription_segments": 1})
            has_existing = bool(doc.get("transcription_segments")) or bool(doc.get("raw_transcription")) if doc else False
            is_append = has_existing


            # Calculate dynamic offset if chunk_offset is 0.0
            actual_offset = chunk_offset
            if chunk_offset == 0.0:
                session_doc = await db.sessions.find_one({"id": session_id}, {"transcription_segments": 1})
                if session_doc and "transcription_segments" in session_doc:
                    segments = session_doc["transcription_segments"] or []
                    if segments:
                        actual_offset = max(float(seg.get("timestamp_end", 0.0)) for seg in segments)
                        logger.info(f"Dynamic offset calculated under Lock: {actual_offset}s for session {session_id}")

            # Lazy Loading: Read the audio content from disk under the Lock
            if not file_path.exists():
                raise FileNotFoundError(f"Audio file not found at path: {file_path}")
            audio_content = file_path.read_bytes()

            # Transcribe
            logger.info("Starting audio transcription for file: %s, session: %s, offset: %s", filename, session_id, actual_offset)
            app_settings = await _get_app_settings(db)
            svc = TranscriptionService(settings)
            result = await svc.transcribe(
                audio_content=audio_content,
                filename=filename,
                file_path=file_path,
                target_language=target_language,
                glossary=glossary,
                app_settings=app_settings,
            )
            logger.info("Successfully transcribed file: %s, method: %s", filename, result.method)

            # Build TranscriptionSegment documents
            def _calc_absolute(relative: float) -> Optional[str]:
                if session_start_dt and relative is not None:
                    return (session_start_dt + timedelta(seconds=actual_offset + relative)).isoformat()
                return None

            speaker = speaker_id or "unknown"
            processed_segments = []

            if result.segments:
                for seg in result.segments:
                    ts = TranscriptionSegment(
                        speaker_discord_id=speaker,
                        text=seg.text,
                        timestamp_start=actual_offset + seg.start,
                        timestamp_end=actual_offset + seg.end,
                        timestamp_absolute_start=_calc_absolute(seg.start),
                        timestamp_absolute_end=_calc_absolute(seg.end),
                        message_type=MessageType.IC,
                    )
                    processed_segments.append(_serialize_datetime(ts.model_dump()))
            else:
                ts = TranscriptionSegment(
                    speaker_discord_id=speaker,
                    text=result.raw_text,
                    timestamp_start=actual_offset,
                    timestamp_end=actual_offset,
                    timestamp_absolute_start=_calc_absolute(0),
                    timestamp_absolute_end=_calc_absolute(0),
                    message_type=MessageType.IC,
                )
                processed_segments.append(_serialize_datetime(ts.model_dump()))

            # Store in MongoDB
            if is_append:
                # RE-FETCH to avoid race condition on raw_transcription
                existing = await db.sessions.find_one({"id": session_id}, {"raw_transcription": 1})
                existing_text = (existing or {}).get("raw_transcription", "")
                new_text = f"{existing_text} {result.raw_text}".strip()
                # Calculate new duration
                last_end = 0
                if result.segments:
                    last_end = max(seg.end for seg in result.segments)
                current_duration_sec = actual_offset + last_end
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
            logger.info("Background transcription completed for session %s", session_id)

        except Exception as exc:
            logger.exception("Background transcription error for session %s: %s", session_id, exc)
            await db.sessions.update_one(
                {"id": session_id},
                {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )


async def _background_process(
    session_id: str,
    raw_transcription: str,
    game_system: str,
    mapping_context: str,
    app_settings: AppSettings,
    db: DatabaseProviderInterface,
    settings: Settings,
    script_density: str = "standard",
    narrative_perspective: str = "3p_epic",
    target_language: str = "pt-BR",
    scope: str = "all",
    glossary: Optional[str] = None,
    quests_context: Optional[str] = None,
):
    logger.info("Background AI processing started for session %s", session_id)
    try:
        session = await db.sessions.find_one({"id": session_id})
        if not session:
            logger.warning("Session %s not found in background process", session_id)
            return

        processor = AIProcessorService(settings)
        ai_result = await processor.process(
            raw_transcription=raw_transcription,
            game_system=game_system,
            mapping_context=mapping_context,
            app_settings=app_settings,
            script_density=script_density,
            narrative_perspective=narrative_perspective,
            target_language=target_language,
            scope=scope,
            glossary=glossary,
            quests_context=quests_context,
        )

        update_fields = {
            "status": SessionStatus.AWAITING_REVIEW.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        llm_metadata = ai_result.get("metadata", {})

        # Selective update based on scope
        if scope in ("all", "diary"):
            # Build diary entries
            diary_entries = [
                _serialize_datetime(
                    TechnicalDiaryEntry(
                        category=entry.get("category", "event"),
                        name=entry.get("name", ""),
                        description=entry.get("description"),
                        status=entry.get("status"),
                        player_name=entry.get("player_name"),
                    ).model_dump()
                )
                for entry in ai_result.get("technical_diary", [])
            ]
            update_fields["technical_diary"] = diary_entries
            update_fields["diary_metadata"] = llm_metadata
            
            # Apply IC/OOC classification only if we have diary/all scope
            segments = session.get("transcription_segments", [])
            filtered = ai_result.get("filtered_segments", [])
            for i, seg in enumerate(segments):
                if i < len(filtered):
                    seg["message_type"] = filtered[i].get("type", "ic")
                    if filtered[i].get("character"):
                        seg["speaker_character_name"] = filtered[i]["character"]
            update_fields["transcription_segments"] = segments

        if scope in ("all", "script"):
            update_fields["review_script"] = ai_result.get("review_script", raw_transcription)
            update_fields["review_metadata"] = llm_metadata

        await db.sessions.update_one(
            {"id": session_id},
            {"$set": update_fields},
        )
        logger.info("Background AI processing successfully completed for session %s", session_id)

        # Trigger RAG auto-indexing to keep the campaign memory updated
        campaign_id = session.get("campaign_id")
        if campaign_id:
            try:
                from app.services.rag_service import RAGService
                rag_svc = RAGService()
                await rag_svc.reindex_campaign(campaign_id, db)
                logger.info("Background RAG auto-reindexing completed for campaign %s", campaign_id)
            except Exception as r_err:
                logger.exception("Failed to auto-reindex campaign %s after AI processing: %s", campaign_id, r_err)

    except Exception as exc:
        logger.exception("CRITICAL: Background AI processing error for session %s: %s", session_id, exc)
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )


# ---------------------------------------------------------------------------
# Audio upload + transcription
# ---------------------------------------------------------------------------

@router.post("/{session_id}/upload-audio")
async def upload_audio(
    session_id: str,
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    speaker_id: Optional[str] = Form(None),
    session_start_time: Optional[str] = Form(None),
    chunk_offset: float = Form(0.0),
    accept_language: str = Header("pt-BR", alias="Accept-Language"),
    db: DatabaseProviderInterface = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Upload and transcribe audio for a session (in background)."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    # Consolidate files from both 'file' and 'files'
    uploaded_files: List[UploadFile] = []
    if file:
        uploaded_files.append(file)
    if files:
        uploaded_files.extend(files)

    if not uploaded_files:
        raise BadRequestException("No audio files provided")

    # Parse optional session start time
    session_start_dt: Optional[datetime] = None
    if session_start_time:
        try:
            session_start_dt = datetime.fromisoformat(session_start_time.replace("Z", "+00:00"))
        except ValueError:
            logger.warning("Could not parse session_start_time: %s", session_start_time)

    # Mark as transcribing and update session start time if provided
    update_data = {
        "status": SessionStatus.TRANSCRIBING.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if session_start_time:
        update_data["session_start_time"] = session_start_time

    await db.sessions.update_one(
        {"id": session_id},
        {"$set": update_data},
    )

    # Fetch campaign glossary (Manual + Auto-Learning)
    glossary = await _get_campaign_glossary(db, doc.get("campaign_id"))

    app_settings = await _get_app_settings(db)

    # Persist audio files and convert to OGG
    _UPLOAD_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    spk = speaker_id or "central"
    offset_val = int(chunk_offset)
    
    tasks_to_queue = []

    try:
        for idx, upload_file in enumerate(uploaded_files):
            # Validate individual file type
            suffix = Path(upload_file.filename or "").suffix.lower()
            if upload_file.content_type not in _ALLOWED_CONTENT_TYPES and suffix not in _ALLOWED_AUDIO_EXTENSIONS:
                raise BadRequestException(f"Invalid audio file type: {upload_file.filename}")
                
            audio_content = await upload_file.read()
            
            safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (upload_file.filename or "audio"))
            # Save raw upload temporarily
            temp_filename = f"session_{session_id}_off_{offset_val:06d}_spk_{spk}_{timestamp}_{idx}_{safe_name}"
            temp_file_path = _UPLOAD_DIR / temp_filename
            
            temp_file_path.write_bytes(audio_content)
            
            # Extract metadata from raw uploaded file using ffprobe before we delete/convert/split it
            from app.utils.audio import get_audio_metadata
            metadata_tags = get_audio_metadata(temp_file_path)
            logger.info("Probed metadata tags for %s: %s", upload_file.filename, metadata_tags)
            
            # Convert and split immediately (deletes temp raw file on success)
            chunk_duration = doc.get("chunk_duration_minutes", 20) or 20
            final_file_paths = await split_and_convert_to_ogg(temp_file_path, chunk_duration)
            
            if not final_file_paths:
                logger.warning(f"No audio segments generated for {upload_file.filename}")
                continue
            
            file_speaker = metadata_tags.get("speaker_id")
            file_start_time = metadata_tags.get("real_start_time")
            file_offset = metadata_tags.get("chunk_offset")
            
            resolved_speaker = speaker_id or file_speaker or "central"
            resolved_offset = chunk_offset
            
            if resolved_offset == 0.0 and file_offset is not None:
                try:
                    resolved_offset = float(file_offset)
                except ValueError:
                    pass
            
            # Retrieve session doc to check if session_start_time is already set
            doc_ref = await db.sessions.find_one({"id": session_id}, {"session_start_time": 1})
            session_start_str = session_start_time or (doc_ref.get("session_start_time") if doc_ref else None)
            
            # Calculate offset from start times if possible
            if file_start_time and session_start_str and resolved_offset == 0.0:
                try:
                    fs_dt = datetime.fromisoformat(file_start_time.replace("Z", "+00:00"))
                    ss_dt = datetime.fromisoformat(session_start_str.replace("Z", "+00:00"))
                    resolved_offset = max(0.0, (fs_dt - ss_dt).total_seconds())
                    logger.info("Calculated offset from real-world times: %ss", resolved_offset)
                except Exception as offset_err:
                    logger.warning("Failed to calculate offset from times: %s", offset_err)
            
            # If session doesn't have start time but file has, update session start time in DB
            if not session_start_str and file_start_time:
                session_start_str = file_start_time
                await db.sessions.update_one(
                    {"id": session_id},
                    {"$set": {"session_start_time": file_start_time}}
                )
                logger.info("Initialized session_start_time to file's real_start_time: %s", file_start_time)
            
            session_start_dt_final = None
            if session_start_str:
                try:
                    session_start_dt_final = datetime.fromisoformat(session_start_str.replace("Z", "+00:00"))
                except ValueError:
                    pass

            for seg_idx, final_file_path in enumerate(final_file_paths):
                # Calculate chunk offset for each segment based on original offset and part index
                segment_offset = resolved_offset + (seg_idx * chunk_duration * 60.0)
                
                tasks_to_queue.append({
                    "filename": final_file_path.name,
                    "file_path": final_file_path,
                    "speaker_id": resolved_speaker,
                    "chunk_offset": segment_offset,
                    "session_start_dt": session_start_dt_final
                })
            
        # Queue background transcriptions
        for task_info in tasks_to_queue:
            background_tasks.add_task(
                _background_transcribe,
                session_id=session_id,
                filename=task_info["filename"],
                file_path=task_info["file_path"],
                speaker_id=task_info["speaker_id"],
                chunk_offset=task_info["chunk_offset"],
                session_start_dt=task_info["session_start_dt"],
                db=db,
                settings=settings,
                target_language=app_settings.language or accept_language,
                glossary=glossary,
            )

        return {
            "message": "Upload successful. Transcription started in background.",
            "session_id": session_id,
            "status": SessionStatus.TRANSCRIBING.value
        }

    except AppException as exc:
        logger.warning("Upload validation/client error: %s", exc)
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        raise
    except Exception as exc:
        logger.exception("Upload error: %s", exc)
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc


@router.post("/audio/convert-webrtc")
async def convert_webrtc(
    file: UploadFile = File(...),
    speaker_id: Optional[str] = Form(None),
    real_start_time: Optional[str] = Form(None),
):
    """
    Helper to convert a raw browser WebRTC recording (WebM/WAV) to OGG/Opus with metadata.
    Returns the converted file as a streaming download response.
    """
    suffix = Path(file.filename or "").suffix.lower()
    if not suffix:
        suffix = ".webm" # default browser format
        
    temp_raw_path = _UPLOAD_DIR / f"raw_webrtc_{datetime.now().strftime('%Y%m%d_%H%M%S')}{suffix}"
    _UPLOAD_DIR.mkdir(exist_ok=True)
    
    try:
        content = await file.read()
        temp_raw_path.write_bytes(content)
        
        # Prepare metadata tags to embed
        metadata = {}
        if speaker_id:
            metadata["speaker_id"] = speaker_id
            metadata["speaker_name"] = speaker_id
        if real_start_time:
            metadata["real_start_time"] = real_start_time
            
        metadata["mode"] = "webrtc"
        
        # Convert and embed
        converted_ogg_path = await convert_to_ogg(temp_raw_path, metadata=metadata)
        
        # Stream the file back to the browser
        def iterfile():
            with open(converted_ogg_path, mode="rb") as f:
                yield from f
            # Delete file after streaming
            try:
                converted_ogg_path.unlink()
            except Exception as e:
                logger.warning(f"Could not delete temp converted file: {e}")
                
        download_name = f"webrtc_{speaker_id or 'recording'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ogg"
        
        return StreamingResponse(
            iterfile(),
            media_type="audio/ogg",
            headers={
                "Content-Disposition": f"attachment; filename={download_name}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.exception("WebRTC conversion error: %s", e)
        if temp_raw_path.exists():
            try:
                temp_raw_path.unlink()
            except Exception: pass
        raise HTTPException(status_code=500, detail=f"WebRTC audio conversion failed: {str(e)}")


# ---------------------------------------------------------------------------
# AI Processing
# ---------------------------------------------------------------------------

@router.post("/{session_id}/process/")
async def process_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    payload: SessionProcessRequest,
    accept_language: str = Header("pt-BR", alias="Accept-Language"),
    db: DatabaseProviderInterface = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Process transcription with AI (in background)."""
    logger.info("Manual AI processing requested for session %s", session_id)
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

    # Fetch campaign glossary and quests context
    glossary = await _get_campaign_glossary(db, doc.get("campaign_id"))
    quests_context = await _get_campaign_quests(db, doc.get("campaign_id"), session_id)

    # Mark as processing
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": SessionStatus.PROCESSING.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Queue background processing
    logger.info("Adding AI processing task to queue for session %s", session_id)
    background_tasks.add_task(
        _background_process,
        session_id=session_id,
        raw_transcription=raw_transcription,
        game_system=doc.get("game_system", "D&D 5e"),
        mapping_context=mapping_context,
        app_settings=app_settings,
        db=db,
        settings=settings,
        script_density=payload.script_density,
        narrative_perspective=payload.narrative_perspective,
        target_language=app_settings.language or accept_language,
        scope=payload.scope,
        glossary=glossary,
        quests_context=quests_context,
    )

    return {
        "message": "AI processing started in background.",
        "session_id": session_id,
        "status": SessionStatus.PROCESSING.value
    }


@router.post("/{session_id}/reprocess/")
async def reprocess_transcription(
    session_id: str,
    background_tasks: BackgroundTasks,
    accept_language: str = Header("pt-BR", alias="Accept-Language"),
    db: DatabaseProviderInterface = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Reprocess all audio files for a session from scratch."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    # 1. Clear current transcription
    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "status": SessionStatus.TRANSCRIBING.value,
                "raw_transcription": "",
                "transcription_segments": [],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    app_settings = await _get_app_settings(db)

    # Fetch campaign glossary
    glossary = await _get_campaign_glossary(db, doc.get("campaign_id"))

    # 2. Find all audio files for this session
    audio_files = list(_UPLOAD_DIR.glob(f"session_{session_id}_*"))
    
    import re
    def _sort_key(f: Path):
        # 1. New Format: _off_{offset}_
        match = re.search(r"_off_(\d+)", f.name)
        if match:
            return (0, int(match.group(1)), f.name)
        # 2. Old Format / Bridge Format: _1714000000000.
        ts_match = re.search(r"_(\d{13})\.", f.name)
        if ts_match:
            return (0, int(ts_match.group(1)), f.name)
        # 3. Fallback: filename
        return (1, 0, f.name)

    audio_files.sort(key=_sort_key)
    
    if not audio_files:
        # Fallback if no files found but we have an audio_file_id
        if doc.get("audio_file_id") and doc["audio_file_id"].startswith("file:"):
            legacy_file = _UPLOAD_DIR / doc["audio_file_id"].replace("file:", "")
            if legacy_file.exists():
                audio_files = [legacy_file]

    if not audio_files:
        raise BadRequestException("No audio files found on disk for this session")

    # 3. Queue a sequential background reprocess
    background_tasks.add_task(
        _background_reprocess_all,
        session_id=session_id,
        audio_files=audio_files,
        db=db,
        settings=settings,
        target_language=app_settings.language or accept_language,
        glossary=glossary,
    )

    return {
        "message": f"Reprocessing {len(audio_files)} audio files started.",
        "session_id": session_id,
        "status": SessionStatus.TRANSCRIBING.value
    }


async def _background_reprocess_all(
    session_id: str,
    audio_files: List[Path],
    db: DatabaseProviderInterface,
    settings: Settings,
    target_language: str = "pt-BR",
    glossary: Optional[str] = None,
):
    """Sequential reprocessing of all files within the transcription lock."""
    async with _transcription_lock:
        try:
            app_settings = await _get_app_settings(db)
            svc = TranscriptionService(settings)
            total_duration_sec = 0.0
            
            # 1. Pre-scan files to find the baseline if missing in DB
            session_start_unix: float = 0.0
            session_doc = await db.sessions.find_one({"id": session_id}, {"session_start_time": 1})
            if session_doc and session_doc.get("session_start_time"):
                try:
                    dt = datetime.fromisoformat(session_doc["session_start_time"].replace("Z", "+00:00"))
                    session_start_unix = dt.timestamp()
                except Exception: pass

            import re
            
            # If still 0, find the earliest Unix timestamp among files
            if session_start_unix == 0:
                all_found_ts = []
                for f in audio_files:
                    ts_match = re.search(r"_(\d{13})\.", f.name)
                    if ts_match:
                        all_found_ts.append(float(ts_match.group(1)) / 1000.0)
                if all_found_ts:
                    session_start_unix = min(all_found_ts)
                    logger.info(f"Baseline established from earliest file: {session_start_unix}")

            segments_objs: List[TranscriptionSegment] = []
            
            for idx, file_path in enumerate(audio_files):
                logger.info(f"Reprocessing file {idx+1}/{len(audio_files)}: {file_path.name}")
                
                content = file_path.read_bytes()
                
                # Default values
                chunk_offset = total_duration_sec
                speaker = "unknown"
                
                # Try to determine exact offset
                match_new = re.search(r"_off_(\d+)_spk_([^_]+)", file_path.name)
                if match_new:
                    chunk_offset = float(match_new.group(1))
                    speaker = match_new.group(2)
                    if speaker == "central": speaker = "unknown"
                else:
                    spk_match = re.search(r"user_(\d+)", file_path.name)
                    speaker = spk_match.group(1) if spk_match else "unknown"
                    
                    ts_match = re.search(r"_(\d{13})\.", file_path.name)
                    if ts_match and session_start_unix > 0:
                        file_unix = float(ts_match.group(1)) / 1000.0
                        chunk_offset = max(0.0, file_unix - session_start_unix)
                    else:
                        chunk_offset = total_duration_sec

                result = await svc.transcribe(
                    audio_content=content,
                    filename=file_path.name,
                    file_path=file_path,
                    target_language=target_language,
                    glossary=glossary,
                    app_settings=app_settings,
                )
                
                for seg in result.segments:
                    start_val = chunk_offset + seg.start
                    end_val = chunk_offset + seg.end
                    
                    # Absolute time is session_start + offset
                    abs_dt_start = datetime.fromtimestamp(session_start_unix + start_val, tz=timezone.utc)
                    abs_dt_end = datetime.fromtimestamp(session_start_unix + end_val, tz=timezone.utc)

                    ts = TranscriptionSegment(
                        speaker_discord_id=speaker,
                        text=seg.text,
                        timestamp_start=start_val,
                        timestamp_end=end_val,
                        timestamp_absolute_start=abs_dt_start.isoformat(),
                        timestamp_absolute_end=abs_dt_end.isoformat(),
                        message_type=MessageType.IC,
                    )
                    segments_objs.append(ts)
                
                # Update total duration for fallback tracking
                if result.segments:
                    file_end = max(seg.end for seg in result.segments)
                    total_duration_sec = max(total_duration_sec, chunk_offset + file_end)
                else:
                    total_duration_sec = max(total_duration_sec, chunk_offset + 60.0)

            # Sort ALL segments from ALL files chronologically
            segments_objs.sort(key=lambda x: x.timestamp_start)
            
            # Final data for DB
            all_segments = [_serialize_datetime(s.model_dump()) for s in segments_objs]
            full_text = " ".join(s.text for s in segments_objs).strip()

            # Update DB once at the end
            await db.sessions.update_one(
                {"id": session_id},
                {
                    "$set": {
                        "raw_transcription": full_text,
                        "transcription_segments": all_segments,
                        "status": SessionStatus.AWAITING_REVIEW.value,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "duration_minutes": int(total_duration_sec // 60)
                    }
                },
            )
            logger.info(f"Reprocess completed for session {session_id}")

        except Exception as exc:
            logger.exception(f"Reprocess error for session {session_id}: {exc}")
            await db.sessions.update_one(
                {"id": session_id},
                {"$set": {"status": SessionStatus.AWAITING_REVIEW.value}}
            )


@router.post("/{session_id}/find-replace")
async def find_replace(
    session_id: str,
    payload: SessionFindReplaceRequest,
    db: DatabaseProviderInterface = Depends(get_db),
):
    """
    Globally find and replace terms in transcription, diary and script.
    """
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)

    find_term = payload.find_term
    replace_term = payload.replace_term
    match_case = payload.match_case
    whole_word = payload.whole_word

    if not find_term:
        raise BadRequestException("Find term cannot be empty")

    # Helper for regex replacement
    flags = 0 if match_case else re.IGNORECASE
    pattern_str = re.escape(find_term)
    if whole_word:
        pattern_str = rf"\b{pattern_str}\b"
    
    pattern = re.compile(pattern_str, flags=flags)

    def _replace(text: Optional[str]) -> str:
        if not text:
            return ""
        return pattern.sub(replace_term, text)

    # 1. Update Transcription Segments
    segments = doc.get("transcription_segments", [])
    for seg in segments:
        if "text" in seg:
            seg["text"] = _replace(seg["text"])

    # 2. Update Technical Diary
    diary = doc.get("technical_diary", [])
    for entry in diary:
        if "name" in entry:
            entry["name"] = _replace(entry["name"])
        if "description" in entry:
            entry["description"] = _replace(entry["description"])

    # 3. Update Review Script
    review_script = _replace(doc.get("review_script", ""))

    # 4. Update Raw Transcription
    raw_transcription = _replace(doc.get("raw_transcription", ""))

    # Save to DB
    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "transcription_segments": segments,
                "technical_diary": diary,
                "review_script": review_script,
                "raw_transcription": raw_transcription,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    return {"message": "Terms updated successfully"}


@router.post("/{session_id}/narration/")
async def generate_narration(
    session_id: str, 
    provider: Optional[str] = None,
    voice_id: Optional[str] = None,
    db: DatabaseProviderInterface = Depends(get_db)
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
        
        # Check for selected music to mix
        selected_music = doc.get("selected_music")
        if selected_music and selected_music.get("title"):
            try:
                music_title = selected_music["title"]
                # Encode spaces for URL
                encoded_title = music_title.replace(' ', '%20')
                music_url = f"https://incompetech.com/music/royalty-free/mp3-royaltyfree/{encoded_title}.mp3"
                
                music_dir = _UPLOAD_DIR / "music"
                music_dir.mkdir(exist_ok=True)
                # Safe filename
                safe_music_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in music_title)
                music_path = music_dir / f"{safe_music_name}.mp3"
                
                # Download if not exists
                if not music_path.exists():
                    logger.info(f"Downloading background music: {music_url}")
                    import httpx
                    async with httpx.AsyncClient(follow_redirects=True) as client:
                        resp = await client.get(music_url, timeout=30.0)
                        if resp.status_code == 200:
                            music_path.write_bytes(resp.content)
                        else:
                            logger.error(f"Failed to download music: {resp.status_code} from {music_url}")
                            music_path = None
                
                if music_path and music_path.exists():
                    # Mix it!
                    logger.info(f"Mixing narration with background music: {music_title}")
                    mixed_path = await mix_audio_with_background(upload_dir / filename, music_path)
                    filename = mixed_path.name
                    # Note: mix_audio_with_background already outputs .ogg (libopus)
                else:
                    # Fallback to standard conversion
                    final_ogg_path = await convert_to_ogg(upload_dir / filename)
                    filename = final_ogg_path.name
            except Exception as mix_err:
                logger.error(f"Error mixing music: {mix_err}")
                # Fallback to standard conversion
                final_ogg_path = await convert_to_ogg(upload_dir / filename)
                filename = final_ogg_path.name
        else:
            # Standard conversion without music
            final_ogg_path = await convert_to_ogg(upload_dir / filename)
            filename = final_ogg_path.name
        
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


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@router.get("/{session_id}/export/markdown/")
async def export_markdown(session_id: str, db: DatabaseProviderInterface = Depends(get_db)):
    """Export session as a Markdown file."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)
    
    session = _deserialize_session(doc)
    svc = ExportService()
    md_content = svc.generate_markdown(session)
    
    filename = f"EchoBot_{session.name.replace(' ', '_')}_{session.created_at.strftime('%Y%m%d')}.md"
    
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{session_id}/export/pdf/")
async def export_pdf(session_id: str, db: DatabaseProviderInterface = Depends(get_db)):
    """Export session as a PDF file."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)
    
    session = _deserialize_session(doc)
    svc = ExportService()
    
    try:
        pdf_bytes = svc.generate_pdf(session)
        filename = f"EchoBot_{session.name.replace(' ', '_')}_{session.created_at.strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.exception("Error exporting PDF: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@router.post("/{session_id}/export/notion/")
async def export_notion(session_id: str, db: DatabaseProviderInterface = Depends(get_db)):
    """Export session to Notion."""
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Session", session_id)
    
    session = _deserialize_session(doc)
    app_settings = await _get_app_settings(db)
    
    if not app_settings.notion_api_key or not app_settings.notion_page_id:
        raise BadRequestException("Configurações do Notion (API Key e Page ID) não preenchidas.")
    
    svc = ExportService()
    try:
        notion_url = await svc.export_to_notion(
            session=session,
            api_key=app_settings.notion_api_key,
            parent_page_id=app_settings.notion_page_id
        )
        return {"message": "Exportado para o Notion com sucesso!", "url": notion_url}
    except Exception as e:
        logger.exception("Error exporting to Notion: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao exportar para o Notion: {str(e)}")
