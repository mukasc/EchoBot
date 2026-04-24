from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from app.services.kokoro_local import kokoro_local_engine
import io
import soundfile as sf
import logging
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/v1/audio", tags=["tts"])
logger = logging.getLogger(__name__)

class TTSRequest(BaseModel):
    model: str = "kokoro"
    input: str
    voice: str = "af_heart"
    response_format: str = "mp3"
    speed: float = 1.0

@router.post("/speech")
async def text_to_speech(request: TTSRequest):
    """
    OpenAI-compatible TTS endpoint using local Kokoro engine.
    """
    try:
        logger.info(f"Generating local TTS for: {request.input[:50]}...")
        samples, sample_rate = kokoro_local_engine.generate(
            text=request.input,
            voice=request.voice,
            speed=request.speed
        )
        
        # Convert to bytes (WAV first, then we could encode to MP3 if needed, 
        # but for now let's use WAV as it's simpler and works fine)
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format='WAV')
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e:
        logger.error(f"Error in local TTS generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
@router.get("/v1/voices", include_in_schema=False)
async def list_voices():
    """
    List available voices for the local Kokoro engine.
    """
    try:
        return kokoro_local_engine.get_voices()
    except Exception as e:
        logger.error(f"Error listing local voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))
