"""
TranscriptionService — encapsulates all transcription strategies.

Strategies (in order of preference):
1. Local Faster-Whisper (no API cost)
2. Google Gemini audio transcription
3. OpenAI Whisper API

The service is instantiated once and injected into route handlers.
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from app.config import Settings

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionSegmentResult:
    text: str
    start: float
    end: float


@dataclass
class TranscriptionResult:
    raw_text: str
    segments: List[TranscriptionSegmentResult] = field(default_factory=list)
    method: str = "unknown"


class TranscriptionService:
    """Tries multiple transcription backends with automatic fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def transcribe(
        self,
        audio_content: bytes,
        filename: str,
        file_path: Optional[Path] = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio using the best available method.

        Args:
            audio_content: Raw audio bytes.
            filename: Original filename (used for MIME detection).
            file_path: Path on disk (required for local Whisper).

        Returns:
            TranscriptionResult with raw text and optional timed segments.
        """
        # 0. Check for empty content
        if not audio_content or len(audio_content) < 100:  # less than 100 bytes is definitely not valid audio
            logger.warning("Empty or too small audio content received for %s", filename)
            return TranscriptionResult(raw_text="", segments=[], method="None")

        # 1. Try local Whisper first (free, offline)
        if file_path and file_path.exists():
            try:
                return await self._transcribe_local(file_path)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Local Whisper failed: %s — falling back to cloud.", exc)

        # 2. Try cloud providers based on settings
        google_key = self._settings.google_api_key
        openai_key = self._settings.openai_api_key

        if google_key:
            try:
                return await self._transcribe_gemini(audio_content, filename, google_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini transcription failed: %s — trying OpenAI.", exc)

        if openai_key:
            try:
                return await self._transcribe_openai(audio_content, filename, openai_key)
            except Exception as exc:  # noqa: BLE001
                logger.error("OpenAI transcription failed: %s", exc)
                raise

        raise RuntimeError(
            "All transcription methods failed. "
            "Configure GOOGLE_API_KEY or OPENAI_API_KEY, or install faster-whisper."
        )

    # ------------------------------------------------------------------
    # Private strategies
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Private strategies
    # ------------------------------------------------------------------

    _model_instance = None  # Singleton model

    @classmethod
    def _get_local_model(cls):
        from faster_whisper import WhisperModel
        if cls._model_instance is None:
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:
                device = "cpu"
            
            compute_type = "float16" if device == "cuda" else "int8"
            logger.info("Loading local Whisper model (medium) on %s …", device)
            cls._model_instance = WhisperModel("medium", device=device, compute_type=compute_type)
        return cls._model_instance

    async def _transcribe_local(self, file_path: Path) -> TranscriptionResult:
        from fastapi.concurrency import run_in_threadpool
        
        def _sync_transcribe():
            model = self._get_local_model()

            logger.info("Transcribing %s …", file_path)
            segments_gen, info = model.transcribe(
                str(file_path),
                language="pt",
                beam_size=5,
                vad_filter=True,
                initial_prompt="Esta é uma sessão de RPG de mesa.", # Helps with RPG context
            )
            raw_segments = list(segments_gen)
            lang = info.language or "pt"
            logger.info("Detected language: %s (prob=%.3f)", lang, info.language_probability)

            result_segments = [
                TranscriptionSegmentResult(
                    text=s.text.strip(),
                    start=s.start,
                    end=s.end,
                )
                for s in raw_segments
            ]
            raw_text = " ".join(s.text for s in result_segments)
            return TranscriptionResult(raw_text=raw_text, segments=result_segments, method="LocalWhisper")

        return await run_in_threadpool(_sync_transcribe)

    async def _transcribe_gemini(
        self, content: bytes, filename: str, api_key: str
    ) -> TranscriptionResult:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        mime = self._detect_mime(filename)

        models_to_try = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]
        last_err: Exception | None = None
        for model_name in models_to_try:
            try:
                logger.info("Trying Gemini model: %s …", model_name)
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([
                    "Transcreva este áudio de uma sessão de RPG. "
                    "Retorne apenas a transcrição literal em português.",
                    {"mime_type": mime, "data": content},
                ])
                return TranscriptionResult(
                    raw_text=response.text,
                    segments=[],
                    method="Gemini",
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini model %s failed: %s", model_name, exc)
                last_err = exc

        raise last_err  # type: ignore[misc]

    async def _transcribe_openai(
        self, content: bytes, filename: str, api_key: str
    ) -> TranscriptionResult:
        import openai

        client = openai.OpenAI(api_key=api_key)
        audio_file = io.BytesIO(content)
        audio_file.name = filename

        response = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            language="pt",
            timestamp_granularities=["segment"],
        )

        result_segments: List[TranscriptionSegmentResult] = []
        if hasattr(response, "segments") and response.segments:
            result_segments = [
                TranscriptionSegmentResult(
                    text=s.text.strip(),
                    start=s.start,
                    end=s.end,
                )
                for s in response.segments
            ]

        return TranscriptionResult(
            raw_text=response.text,
            segments=result_segments,
            method="OpenAIWhisper",
        )

    @staticmethod
    def _detect_mime(filename: str) -> str:
        name = filename.lower()
        if name.endswith(".mp3"):
            return "audio/mpeg"
        if name.endswith(".webm"):
            return "audio/webm"
        if name.endswith(".ogg") or name.endswith(".opus"):
            return "audio/ogg"
        if name.endswith(".mp4"):
            return "audio/mp4"
        if name.endswith(".m4a"):
            return "audio/mp4"
        return "audio/wav"
