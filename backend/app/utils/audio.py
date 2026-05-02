# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

import subprocess
import logging
from pathlib import Path
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

def _sync_convert_to_ogg(input_path: Path) -> Path:
    """Synchronous ffmpeg call to convert audio to OGG/Opus."""
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    output_path = input_path.with_suffix(".ogg")
    
    # -c:a libopus -b:a 64k provides high quality at low bitrate for speech
    command = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-c:a", "libopus", "-b:a", "64k",
        str(output_path)
    ]
    
    try:
        subprocess.run(command, capture_output=True, text=True, check=True)
        logger.info(f"FFmpeg: Converted {input_path.name} to {output_path.name}")
        
        # Delete original if it's different
        if input_path.suffix != ".ogg":
            input_path.unlink()
            
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed: {e.stderr}")
        raise RuntimeError(f"FFmpeg conversion failed: {e.stderr}") from e

async def convert_to_ogg(input_path: Path) -> Path:
    """Asynchronously converts an audio file to .ogg (Opus) using ffmpeg."""
    return await run_in_threadpool(_sync_convert_to_ogg, input_path)

def _sync_mix_audio_with_background(narration_path: Path, background_path: Path, bg_volume: float = 0.12) -> Path:
    """Mix narration with background music using ffmpeg."""
    if not narration_path.exists():
        raise FileNotFoundError(f"Narration file not found: {narration_path}")
    if not background_path.exists():
        logger.warning(f"Background file not found: {background_path}. Returning narration only.")
        return narration_path
        
    output_path = narration_path.parent / f"mixed_{narration_path.stem}.ogg"
    
    # filter_complex: 
    # [1:a]volume={bg_volume}[bg] -> set background volume
    # [0:a][bg]amix=inputs=2:duration=first -> mix and end when narration ends
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
