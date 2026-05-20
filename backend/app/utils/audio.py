# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

import subprocess
import logging
import json
import shutil
from pathlib import Path
from typing import Optional
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

def get_audio_metadata(file_path: Path) -> dict:
    """Extract metadata tags from an audio file using ffprobe."""
    if not file_path.exists():
        return {}
    
    if not shutil.which("ffprobe"):
        logger.warning("ffprobe not found in PATH. Cannot extract audio metadata.")
        return {}
        
    command = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(file_path)
    ]
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        format_info = data.get("format", {})
        tags = format_info.get("tags", {})
        # Normalize keys to lowercase for easier lookup
        return {k.lower(): v for k, v in tags.items()}
    except Exception as e:
        logger.error(f"Error reading metadata using ffprobe: {e}")
        return {}

async def get_audio_metadata_async(file_path: Path) -> dict:
    """Asynchronously extract metadata tags using ffprobe."""
    return await run_in_threadpool(get_audio_metadata, file_path)

def _sync_convert_to_ogg(input_path: Path, metadata: Optional[dict] = None) -> Path:
    """Synchronous ffmpeg call to convert audio to OGG/Opus with temporary file swap and metadata embedding."""
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Evita sobrescrever diretamente gravando em temp
    temp_output_path = input_path.parent / f"conv_{input_path.stem}.ogg"
    
    # -c:a libopus -b:a 64k provides high quality at low bitrate for speech
    command = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-c:a", "libopus", "-b:a", "64k",
        "-map_metadata", "0"  # Map metadata from source
    ]
    
    if metadata:
        for key, value in metadata.items():
            if value is not None:
                command.extend(["-metadata", f"{key}={value}"])
                
    command.append(str(temp_output_path))
    
    try:
        subprocess.run(command, capture_output=True, text=True, check=True)
        final_output_path = input_path.with_suffix(".ogg")
        logger.info(f"FFmpeg: Converted {input_path.name} to {final_output_path.name} via temp {temp_output_path.name}")
        
        # Se o arquivo original não for .ogg, podemos removê-lo com segurança
        if input_path.resolve() != final_output_path.resolve():
            input_path.unlink()
            
        if temp_output_path.exists():
            # Remove o destino final se ele já existir e não for o temp em si
            if final_output_path.exists() and final_output_path.resolve() != temp_output_path.resolve():
                final_output_path.unlink()
            # Renomeia o temp para o destino final
            temp_output_path.rename(final_output_path)
            
        return final_output_path
    except subprocess.CalledProcessError as e:
        if temp_output_path.exists():
            try:
                temp_output_path.unlink()
            except Exception as unlink_err:
                logger.warning(f"Failed to cleanup temp file {temp_output_path}: {unlink_err}")
        logger.error(f"FFmpeg conversion failed: {e.stderr}")
        raise RuntimeError(f"FFmpeg conversion failed: {e.stderr}") from e

async def convert_to_ogg(input_path: Path, metadata: Optional[dict] = None) -> Path:
    """Asynchronously converts an audio file to .ogg (Opus) using ffmpeg."""
    return await run_in_threadpool(_sync_convert_to_ogg, input_path, metadata)

def _sync_mix_audio_with_background(narration_path: Path, background_path: Path, bg_volume: float = 0.12) -> Path:
    """Mix narration with background music using ffmpeg."""
    if not narration_path.exists():
        raise FileNotFoundError(f"Narration file not found: {narration_path}")
    if not background_path.exists():
        logger.warning(f"Background file not found: {background_path}. Returning narration only.")
        return narration_path
        
    output_path = narration_path.parent / f"mixed_{narration_path.stem}.ogg"
    
    command = [
        "ffmpeg", "-y",
        "-i", str(narration_path),
        "-i", str(background_path),
        "-filter_complex", f"[1:a]volume={bg_volume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3",
        "-c:a", "libopus", "-b:a", "64k",
        str(output_path)
    ]
    
    try:
        subprocess.run(command, capture_output=True, text=True, check=True)
        logger.info(f"FFmpeg: Mixed {narration_path.name} with background {background_path.name}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg mixing failed: {e.stderr}")
        # If mixing fails, return original narration to not break the flow
        return narration_path

async def mix_audio_with_background(narration_path: Path, background_path: Path, bg_volume: float = 0.12) -> Path:
    """Asynchronously mix narration with background music."""
    return await run_in_threadpool(_sync_mix_audio_with_background, narration_path, background_path, bg_volume)
