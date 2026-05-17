# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

import subprocess
import logging
from pathlib import Path
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

def _sync_convert_to_ogg(input_path: Path) -> Path:
    """Synchronous ffmpeg call to convert audio to OGG/Opus with temporary file swap."""
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Evita sobrescrever diretamente gravando em temp
    temp_output_path = input_path.parent / f"conv_{input_path.stem}.ogg"
    
    # -c:a libopus -b:a 64k provides high quality at low bitrate for speech
    command = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-c:a", "libopus", "-b:a", "64k",
        str(temp_output_path)
    ]
    
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
