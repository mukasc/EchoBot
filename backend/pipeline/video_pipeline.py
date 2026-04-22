from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

from faster_whisper import WhisperModel
from tqdm import tqdm

try:
    from transformers import pipeline as hf_pipeline
except Exception:  # pragma: no cover
    hf_pipeline = None

LOGGER = logging.getLogger(__name__)
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


@dataclass
class PipelineConfig:
    model_size: str = "medium"
    device: str = "auto"  # auto, cpu, cuda
    compute_type_gpu: str = "float16"
    compute_type_cpu: str = "int8"
    task: str = "transcribe"  # transcribe | transcribe_translate
    assume_language: Optional[str] = None
    beam_size: int = 5


class VideoPipeline:
    def __init__(self, config: PipelineConfig) -> None:
        self.config = config
        self._translator = None
        self._model = self._load_model()

    def _load_model(self) -> WhisperModel:
        device = self.config.device
        if device == "auto":
            try:
                import torch

                device = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:
                device = "cpu"

        compute_type = (
            self.config.compute_type_gpu if device == "cuda" else self.config.compute_type_cpu
        )

        LOGGER.info(
            "Carregando modelo Whisper (%s) no dispositivo '%s' com compute_type='%s'...",
            self.config.model_size,
            device,
            compute_type,
        )
        return WhisperModel(self.config.model_size, device=device, compute_type=compute_type)

    def _load_translator(self):
        if self._translator is not None:
            return self._translator
        if hf_pipeline is None:
            raise RuntimeError(
                "Transformers não está disponível. Instale dependências para usar tradução local."
            )

        LOGGER.info("Carregando tradutor local EN->PT-BR (Helsinki-NLP/opus-mt-en-pt)...")
        self._translator = hf_pipeline(
            "translation",
            model="Helsinki-NLP/opus-mt-en-pt",
            tokenizer="Helsinki-NLP/opus-mt-en-pt",
        )
        return self._translator

    @staticmethod
    def validate_video_file(video_path: Path) -> None:
        if not video_path.exists() or not video_path.is_file():
            raise FileNotFoundError(f"Arquivo não encontrado: {video_path}")
        if video_path.suffix.lower() not in SUPPORTED_VIDEO_EXTENSIONS:
            raise ValueError(
                f"Formato inválido ({video_path.suffix}). Use: {sorted(SUPPORTED_VIDEO_EXTENSIONS)}"
            )

    @staticmethod
    def extract_audio(video_path: Path, output_audio_path: Path) -> None:
        output_audio_path.parent.mkdir(parents=True, exist_ok=True)
        command = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-acodec",
            "pcm_s16le",
            str(output_audio_path),
        ]
        LOGGER.info("Extraindo áudio com ffmpeg...")
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                "Falha ao extrair áudio com ffmpeg. "
                f"stderr: {result.stderr.strip()[:500]}"
            )

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        total_ms = int(seconds * 1000)
        h = total_ms // 3_600_000
        m = (total_ms % 3_600_000) // 60_000
        s = (total_ms % 60_000) // 1000
        ms = total_ms % 1000
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    @staticmethod
    def _write_txt(lines: Iterable[str], output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8") as f:
            f.write("\n".join(lines).strip() + "\n")

    def _translate_lines(self, lines: List[str]) -> List[str]:
        translator = self._load_translator()
        translated = []
        for text in tqdm(lines, desc="Traduzindo", unit="linha"):
            if not text.strip():
                translated.append("")
                continue
            out = translator(text, max_length=512)
            translated.append(out[0]["translation_text"].strip())
        return translated

    def process_video(self, video_path: Path, output_dir: Path) -> dict:
        self.validate_video_file(video_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        base_name = video_path.stem
        audio_path = output_dir / f"{base_name}.wav"
        txt_path = output_dir / f"{base_name}.txt"
        srt_path = output_dir / f"{base_name}.srt"

        self.extract_audio(video_path, audio_path)

        LOGGER.info("Iniciando transcrição...")
        segments_gen, info = self._model.transcribe(
            str(audio_path),
            beam_size=self.config.beam_size,
            language=self.config.assume_language,
            vad_filter=True,
        )
        segments = list(tqdm(segments_gen, desc="Transcrevendo", unit="segmento"))

        if not segments:
            raise RuntimeError("Nenhuma fala detectada no áudio.")

        detected_language = info.language or "desconhecido"
        LOGGER.info("Idioma detectado: %s (prob=%.3f)", detected_language, info.language_probability)

        original_lines = [s.text.strip() for s in segments]
        output_lines = original_lines

        if self.config.task == "transcribe_translate":
            if detected_language != "en" and not self.config.assume_language:
                LOGGER.warning(
                    "Idioma detectado '%s' não é inglês. A tradução EN->PT-BR pode perder qualidade.",
                    detected_language,
                )
            output_lines = self._translate_lines(original_lines)

        self._write_txt(output_lines, txt_path)

        with srt_path.open("w", encoding="utf-8") as f:
            for idx, (segment, text) in enumerate(zip(segments, output_lines), start=1):
                f.write(f"{idx}\n")
                f.write(
                    f"{self._format_timestamp(segment.start)} --> "
                    f"{self._format_timestamp(segment.end)}\n"
                )
                f.write(f"{text}\n\n")

        LOGGER.info("Arquivos gerados: %s e %s", txt_path, srt_path)
        return {
            "video": str(video_path),
            "audio": str(audio_path),
            "txt": str(txt_path),
            "srt": str(srt_path),
            "detected_language": detected_language,
            "segments": len(segments),
        }
