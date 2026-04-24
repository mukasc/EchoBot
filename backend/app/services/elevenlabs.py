# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

import logging
import uuid
from pathlib import Path
import httpx
from app.config import Settings

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self, settings: Settings):
        self.settings = settings
        # API Key and Voice ID can come from env (settings) or DB settings
        self.base_url = "https://api.elevenlabs.io/v1/text-to-speech"

    async def generate_narration(self, text: str, api_key: str, voice_id: str = None) -> str:
        """
        Generates an MP3 narration from text using ElevenLabs.
        Returns the filename of the generated audio.
        """
        key = api_key.strip() if api_key else self.settings.elevenlabs_api_key.strip()
        if not key:
            raise ValueError("ElevenLabs API Key is missing. Please configure it in settings.")

        target_voice = voice_id or self.settings.elevenlabs_voice_id or "pNInz6obpgmqS2C9NfX" # Adam (Standard)
        url = f"{self.base_url}/{target_voice}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": key
        }

        # Optimized for epic narration (multilingual v2)
        # ElevenLabs has limits per request (varies by tier, but ~5000 is common for some)
        truncated_text = text[:5000]
        if len(text) > 5000:
             logger.warning(f"Text truncated for ElevenLabs from {len(text)} to 5000 chars.")

        data = {
            "text": truncated_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.8,
                "style": 0.5,
                "use_speaker_boost": True
            }
        }

        logger.info(f"Generating narration with ElevenLabs (Voice: {target_voice})...")

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers, timeout=120.0)

            if response.status_code != 200:
                try:
                    error_json = response.json()
                    # ElevenLabs often returns error in 'detail' or 'message'
                    error_msg = error_json.get("detail", {}).get("message") or error_json.get("message") or response.text
                except Exception:
                    error_msg = response.text
                
                logger.error(f"ElevenLabs API error ({response.status_code}): {error_msg}")
                raise Exception(f"Erro ElevenLabs ({response.status_code}): {error_msg}")

            # Ensure upload directory exists
            upload_dir = Path(__file__).parent.parent.parent / "uploads" / "narrations"
            upload_dir.mkdir(parents=True, exist_ok=True)

            filename = f"narration_{uuid.uuid4()}.mp3"
            file_path = upload_dir / filename
            
            with open(file_path, "wb") as f:
                f.write(response.content)

            logger.info(f"Narration generated successfully: {filename}")
            return filename

    async def get_voices(self, api_key: str) -> list:
        """
        Fetches the list of available voices for the given API key.
        """
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {"xi-api-key": api_key.strip()}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                error_data = response.json()
                msg = error_data.get("detail", {}).get("message", response.text)
                logger.error(f"Failed to fetch voices: {msg}")
                raise Exception(f"ElevenLabs Error: {msg}")
            
            data = response.json()
            return data.get("voices", [])

    async def get_subscription_info(self, api_key: str) -> dict:
        """
        Fetches subscription and usage info for the given API key.
        """
        url = "https://api.elevenlabs.io/v1/user/subscription"
        headers = {"xi-api-key": api_key.strip()}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                error_data = response.json()
                msg = error_data.get("detail", {}).get("message", response.text)
                logger.error(f"Failed to fetch subscription: {msg}")
                raise Exception(f"ElevenLabs Error: {msg}")
            
            return response.json()
