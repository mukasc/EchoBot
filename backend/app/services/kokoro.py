# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

import httpx
import logging
import uuid
from pathlib import Path
from typing import Optional
from app.models.settings import AppSettings

logger = logging.getLogger(__name__)

class KokoroService:
    def __init__(self, settings: AppSettings):
        self.settings = settings
        self.base_url = settings.kokoro_base_url.strip().rstrip("/")
        self.api_key = settings.kokoro_api_key

    async def generate_narration(
        self, 
        text: str, 
        api_key: Optional[str] = None, 
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        voice: Optional[str] = None
    ) -> str:
        """
        Generates an MP3 narration from text using Kokoro Web (OpenAI-compatible API).
        Returns the filename of the generated audio.
        """
        target_url = (base_url or self.base_url).strip().rstrip("/")
        # The endpoint in Kokoro Web is usually /audio/speech or /v1/audio/speech
        # Based on README example, it's baseURL: 'http://host/api/v1', so endpoint is baseURL + /audio/speech
        url = f"{target_url}/audio/speech"
        
        key = api_key or self.api_key
        headers = {
            "Content-Type": "application/json",
        }
        if key:
            headers["Authorization"] = f"Bearer {key.strip()}"

        target_model = model or self.settings.kokoro_model or "model_q8f16"
        target_voice = voice or self.settings.kokoro_voice or "af_heart"

        data = {
            "model": target_model,
            "input": text,
            "voice": target_voice,
            "response_format": "mp3"
        }

        logger.info(f"Generating narration with Kokoro (Base: {target_url}, Model: {target_model}, Voice: {target_voice})...")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers, timeout=120.0)
            except httpx.RequestError as exc:
                logger.error(f"Error connecting to Kokoro API at {url}: {exc}")
                raise Exception(f"Erro de conexão com Kokoro: {exc}")

            if response.status_code != 200:
                error_msg = response.text
                try:
                    error_json = response.json()
                    error_msg = error_json.get("error", {}).get("message") or error_json.get("message") or response.text
                except Exception:
                    pass
                
                logger.error(f"Kokoro API error ({response.status_code}): {error_msg}")
                raise Exception(f"Erro Kokoro ({response.status_code}): {error_msg}")

            # Ensure upload directory exists
            upload_dir = Path(__file__).parent.parent.parent / "uploads" / "narrations"
            upload_dir.mkdir(parents=True, exist_ok=True)

            filename = f"narration_ko_{uuid.uuid4()}.mp3"
            file_path = upload_dir / filename
            
            with open(file_path, "wb") as f:
                f.write(response.content)

            logger.info(f"Narration generated successfully: {filename}")
            return filename

    async def get_voices(self) -> list:
        """
        Attempts to fetch voices from the Kokoro instance.
        Tries multiple common endpoints: /voices, /v1/voices, /audio/voices.
        """
        if not self.base_url:
            return self._get_fallback_voices()

        # Possible endpoints to try
        endpoints = ["/voices", "/v1/voices", "/audio/voices"]
        
        async with httpx.AsyncClient() as client:
            for endpoint in endpoints:
                url = f"{self.base_url}{endpoint}"
                try:
                    response = await client.get(url, timeout=5.0)
                    if response.status_code == 200:
                        voices = response.json()
                        if isinstance(voices, list):
                            return voices
                except Exception:
                    continue
        
        return self._get_fallback_voices()

    def _get_fallback_voices(self) -> list:
        """Return a static list of common Kokoro voices as fallback"""
        return [
            {"voice_id": "af_heart", "name": "Heart (Female - US)"},
            {"voice_id": "af_bella", "name": "Bella (Female - US)"},
            {"voice_id": "af_nicole", "name": "Nicole (Female - US)"},
            {"voice_id": "af_aoife", "name": "Aoife (Female - UK)"},
            {"voice_id": "am_adam", "name": "Adam (Male - US)"},
            {"voice_id": "am_michael", "name": "Michael (Male - US)"},
            {"voice_id": "bf_emma", "name": "Emma (Female - UK)"},
            {"voice_id": "bf_isabella", "name": "Isabella (Female - UK)"},
            {"voice_id": "bm_george", "name": "George (Male - UK)"},
            {"voice_id": "bm_lewis", "name": "Lewis (Male - UK)"},
        ]
