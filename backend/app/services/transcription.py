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
import asyncio
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from app.config import Settings
from app.models.settings import AppSettings

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

    _model_instance = None  # Singleton model
    _model_lock = threading.Lock()  # Thread lock for initialization
    _local_sem: Optional[asyncio.Semaphore] = None  # Lazy-initialized semaphore
    
    _cuda_probed = False
    _cuda_available = False

    # Track current settings of the loaded model instance to detect changes
    _current_whisper_model = None
    _current_whisper_device = None
    _current_whisper_compute_type = None
    _current_whisper_cpu_threads = None

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
        target_language: str = "pt-BR",
        glossary: Optional[str] = None,
        app_settings: Optional[AppSettings] = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio using the best available method.

        Args:
            audio_content: Raw audio bytes.
            filename: Original filename (used for MIME detection).
            file_path: Path on disk (required for local Whisper).
            app_settings: Configured application settings.

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
                return await self._transcribe_local(file_path, target_language, glossary, app_settings)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Local Whisper failed: %s — falling back to cloud.", exc)

        # 2. Try cloud providers based on settings
        google_key = self._settings.google_api_key
        openai_key = self._settings.openai_api_key

        if google_key:
            try:
                return await self._transcribe_gemini(audio_content, filename, google_key, target_language, glossary)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini transcription failed: %s — trying OpenAI.", exc)

        if openai_key:
            try:
                return await self._transcribe_openai(audio_content, filename, openai_key, target_language, glossary)
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
    def _register_nvidia_dlls(cls):
        """Register NVIDIA DLL directories on Windows so ctranslate2 can find cublas/cudnn."""
        import os
        import sys
        if sys.platform != "win32":
            return
        try:
            import importlib.util
            nvidia_spec = importlib.util.find_spec("nvidia")
            if nvidia_spec is None or nvidia_spec.submodule_search_locations is None:
                return
            nvidia_base = list(nvidia_spec.submodule_search_locations)[0]
            # Walk nvidia package subdirectories looking for bin/ folders with DLLs
            for pkg_name in os.listdir(nvidia_base):
                bin_dir = os.path.join(nvidia_base, pkg_name, "bin")
                if os.path.isdir(bin_dir):
                    os.add_dll_directory(bin_dir)
                    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
                    logger.info("Registered NVIDIA DLL directory: %s", bin_dir)
        except Exception as e:
            logger.warning("Could not register NVIDIA DLL directories: %s", e)

    @classmethod
    def _probe_cuda(cls):
        """One-time probe to check if CUDA is truly usable by ctranslate2/faster-whisper."""
        if cls._cuda_probed:
            return cls._cuda_available
        cls._cuda_probed = True
        # Register NVIDIA DLLs from pip packages (Windows-specific)
        cls._register_nvidia_dlls()
        try:
            import ctranslate2
            supported = ctranslate2.get_supported_compute_types("cuda")
            if "float16" in supported or "int8" in supported:
                logger.info("CUDA probe: ctranslate2 CUDA backend is available. Supported types: %s", supported)
                cls._cuda_available = True
            else:
                logger.warning("CUDA probe: ctranslate2 reports no CUDA compute types available.")
                cls._cuda_available = False
        except Exception as e:
            logger.warning("CUDA probe failed (%s). CUDA will not be used.", e)
            cls._cuda_available = False
        return cls._cuda_available

    @classmethod
    def _get_local_model(cls, app_settings: Optional[AppSettings] = None):
        from faster_whisper import WhisperModel
        
        # Force model to "medium" as requested by the user
        whisper_model = "medium"
        whisper_device = app_settings.whisper_device if app_settings else "auto"
        
        # Probe CUDA availability (only runs once per process lifetime)
        cuda_ok = cls._probe_cuda()
        
        # Override to CPU if CUDA is not available
        if whisper_device in ["cuda", "auto"] and not cuda_ok:
            if whisper_device == "cuda":
                logger.warning("CUDA requested but not available. Forcing CPU mode.")
            whisper_device = "cpu"
            
        whisper_compute_type = app_settings.whisper_compute_type if app_settings else "auto"
        
        # Force CPU compatible compute type if device is CPU
        if whisper_device == "cpu" and whisper_compute_type in ["float16", "int8_float16"]:
            whisper_compute_type = "int8"
            
        whisper_cpu_threads = app_settings.whisper_cpu_threads if app_settings else 0
        
        with cls._model_lock:
            # Check if settings changed
            needs_reload = False
            if cls._model_instance is not None:
                if (
                    cls._current_whisper_model != whisper_model or
                    cls._current_whisper_device != whisper_device or
                    cls._current_whisper_compute_type != whisper_compute_type or
                    cls._current_whisper_cpu_threads != whisper_cpu_threads
                ):
                    logger.info("Whisper configuration changed. Reloading model...")
                    needs_reload = True
            else:
                needs_reload = True
                
            if needs_reload:
                if cls._model_instance is not None:
                    # Clean up old instance
                    logger.info("Unloading previous Whisper model (%s)...", cls._current_whisper_model)
                    cls._model_instance = None
                    import gc
                    gc.collect()
                    try:
                        import torch
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                    except Exception:
                        pass
                
                # Resolve parameters
                resolved_device = whisper_device
                if resolved_device == "auto":
                    resolved_device = "cuda" if cuda_ok else "cpu"
                
                resolved_compute_type = whisper_compute_type if whisper_compute_type != "auto" else ("float16" if resolved_device == "cuda" else "int8")
                
                import os
                resolved_threads = whisper_cpu_threads if whisper_cpu_threads > 0 else max(1, (os.cpu_count() or 4) // 2)
                
                logger.info(
                    "Loading Whisper model '%s' (Device: %s, Compute: %s, Threads: %d) ...",
                    whisper_model,
                    resolved_device,
                    resolved_compute_type,
                    resolved_threads
                )
                
                try:
                    cls._model_instance = WhisperModel(
                        whisper_model,
                        device=resolved_device,
                        compute_type=resolved_compute_type,
                        cpu_threads=resolved_threads
                    )
                    # Cache current settings
                    cls._current_whisper_model = whisper_model
                    cls._current_whisper_device = whisper_device
                    cls._current_whisper_compute_type = whisper_compute_type
                    cls._current_whisper_cpu_threads = whisper_cpu_threads
                except Exception as e:
                    logger.error("Failed to load Whisper model '%s' on %s: %s", whisper_model, resolved_device, e)
                    # Safe fallback to CPU if CUDA initialization fails
                    if resolved_device == "cuda":
                        logger.warning("Attempting safe fallback to CPU...")
                        cls._cuda_available = False
                        try:
                            resolved_device = "cpu"
                            resolved_compute_type = "int8"
                            cls._model_instance = WhisperModel(
                                whisper_model,
                                device=resolved_device,
                                compute_type=resolved_compute_type,
                                cpu_threads=resolved_threads
                            )
                            # Cache CPU values since we fell back
                            cls._current_whisper_model = whisper_model
                            cls._current_whisper_device = "cpu"
                            cls._current_whisper_compute_type = "int8"
                            cls._current_whisper_cpu_threads = whisper_cpu_threads
                        except Exception as fallback_err:
                            logger.critical("Critical fallback error loading Whisper model on CPU: %s", fallback_err)
                            raise fallback_err
                    else:
                        raise e
                        
            return cls._model_instance

    async def _transcribe_local(
        self,
        file_path: Path,
        target_language: str,
        glossary: Optional[str] = None,
        app_settings: Optional[AppSettings] = None
    ) -> TranscriptionResult:
        from fastapi.concurrency import run_in_threadpool
        
        if TranscriptionService._local_sem is None:
            TranscriptionService._local_sem = asyncio.Semaphore(1)

        async with self._local_sem:
            def _sync_transcribe():
                model = self._get_local_model(app_settings)

                logger.info("Transcribing %s …", file_path)
                
                from app.utils.i18n import t
                
                lang_code = target_language.split("-")[0].lower() if target_language else "pt"
                
                # Build initial prompt with global i18n context + campaign glossary
                initial_prompt = t('stt.initial_prompt', target_language)
                if glossary:
                    initial_prompt = f"{initial_prompt} UNIQUE CAMPAIGN TERMS: {glossary}"

                try:
                    segments_gen, info = model.transcribe(
                        str(file_path),
                        language=lang_code,
                        beam_size=5,
                        vad_filter=True,
                        initial_prompt=initial_prompt, # Helps with RPG context
                    )
                    raw_segments = list(segments_gen)
                except Exception as e:
                    err_str = str(e)
                    is_cuda_err = any(
                        term in err_str.lower()
                        for term in ["cublas", "cuda", "cudnn", "cublas64", "cudnn64"]
                    )
                    model_device = getattr(getattr(model, "model", None), "device", "")
                    if is_cuda_err or model_device == "cuda":
                        logger.warning(
                            "Local Whisper CUDA execution failed during transcription: %s. Falling back to CPU...",
                            e
                        )
                        # Mark CUDA as unavailable to prevent future attempts
                        TranscriptionService._cuda_available = False
                        
                        from app.models.settings import AppSettings
                        cpu_settings = AppSettings(
                            whisper_model="medium",
                            whisper_device="cpu",
                            whisper_compute_type="int8",
                            whisper_cpu_threads=app_settings.whisper_cpu_threads if app_settings else 4
                        )
                        model = self._get_local_model(cpu_settings)
                        logger.info("Retrying transcription on CPU...")
                        segments_gen, info = model.transcribe(
                            str(file_path),
                            language=lang_code,
                            beam_size=5,
                            vad_filter=True,
                            initial_prompt=initial_prompt,
                        )
                        raw_segments = list(segments_gen)
                    else:
                        raise e
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
        self, content: bytes, filename: str, api_key: str, target_language: str, glossary: Optional[str] = None
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
                
                glossary_instruction = f" Considere estes termos específicos da campanha: {glossary}." if glossary else ""
                
                # Using wait_for for explicit timeout handling
                response = await asyncio.wait_for(
                    model.generate_content_async([
                        f"Transcreva este áudio de uma sessão de RPG.{glossary_instruction} "
                        f"Retorne apenas a transcrição literal no idioma correspondente a {target_language}.",
                        {"mime_type": mime, "data": content},
                    ]),
                    timeout=90.0  # Slightly longer for large audio files
                )
                return TranscriptionResult(
                    raw_text=response.text,
                    segments=[],
                    method="Gemini",
                )
            except asyncio.TimeoutError:
                logger.warning("Gemini model %s timed out.", model_name)
                last_err = RuntimeError(f"Gemini {model_name} timed out after 90s")
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini model %s failed: %s", model_name, exc)
                last_err = exc

        raise last_err  # type: ignore[misc]

    async def _transcribe_openai(
        self, content: bytes, filename: str, api_key: str, target_language: str, glossary: Optional[str] = None
    ) -> TranscriptionResult:
        import openai

        async with openai.AsyncOpenAI(api_key=api_key, timeout=60.0) as client:
            audio_file = io.BytesIO(content)
            audio_file.name = filename

            lang_code = target_language.split("-")[0].lower() if target_language else "pt"
            
            response = await client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json",
                language=lang_code,
                timestamp_granularities=["segment"],
                prompt=glossary, # Use glossary as prompt for Whisper API
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
