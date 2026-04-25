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
