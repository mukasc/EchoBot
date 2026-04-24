import httpx
import logging
import os
from typing import List, Optional
from app.models.settings import AppSettings

logger = logging.getLogger(__name__)

class DeepgramService:
    def __init__(self, settings: AppSettings):
        self.settings = settings
        self.api_key = settings.deepgram_api_key
        self.base_url = "https://api.deepgram.com/v1/speak"

    async def generate_narration(self, text: str, voice_id: Optional[str] = None, output_path: Optional[str] = None) -> str:
        """
        Generates narration using Deepgram Aura TTS.
        """
        if not self.api_key:
            raise Exception("Deepgram API Key não configurada.")

        model = voice_id or self.settings.deepgram_model
        url = f"{self.base_url}?model={model}"
        
        headers = {
            "Authorization": f"Token {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        
        payload = {"text": text}

        logger.info(f"Generating narration with Deepgram (Model: {model})...")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                error_msg = response.text
                try:
                    error_json = response.json()
                    error_msg = error_json.get("err_msg", error_msg)
                except:
                    pass
                logger.error(f"Deepgram API error ({response.status_code}): {error_msg}")
                raise Exception(f"Erro Deepgram ({response.status_code}): {error_msg}")

            if not output_path:
                import uuid
                from pathlib import Path
                upload_dir = Path(__file__).parent.parent.parent / "uploads" / "narrations"
                upload_dir.mkdir(parents=True, exist_ok=True)
                filename = f"narration_dg_{uuid.uuid4()}.mp3"
                output_path = upload_dir / filename

            with open(output_path, "wb") as f:
                f.write(response.content)

            logger.info(f"Narration generated successfully: {output_path}")
            return os.path.basename(output_path)

    async def get_subscription_info(self, api_key: str) -> dict:
        """
        Fetches usage/balance info for Deepgram.
        """
        headers = {"Authorization": f"Token {api_key.strip()}"}
        
        async with httpx.AsyncClient() as client:
            # 1. Get projects to find project_id
            p_res = await client.get("https://api.deepgram.com/v1/projects", headers=headers)
            if p_res.status_code != 200:
                logger.error(f"Failed to fetch Deepgram projects: {p_res.text}")
                return {}
            
            projects = p_res.json().get("projects", [])
            if not projects:
                return {}
            
            project_id = projects[0].get("project_id")
            
            # 2. Get balance
            b_res = await client.get(f"https://api.deepgram.com/v1/projects/{project_id}/balances", headers=headers)
            if b_res.status_code != 200:
                logger.error(f"Failed to fetch Deepgram balance: {b_res.text}")
                return {}
            
            balance_info = b_res.json()
            balances = balance_info.get("balances", [])
            
            # Transform to a structure similar to ElevenLabs for easier frontend handling
            # Deepgram uses dollars, ElevenLabs uses characters. 
            # We'll just return the raw balance info.
            if balances:
                main_balance = balances[0]
                return {
                    "tier": "Pay-as-you-go" if main_balance.get("amount", 0) > 0 else "Free/Trial",
                    "balance": main_balance.get("amount", 0),
                    "units": main_balance.get("units", "USD"),
                    "project_name": projects[0].get("name")
                }
            return {}

    async def get_voices(self, api_key: Optional[str] = None) -> List[dict]:
        """
        Deepgram doesn't have a dynamic voice list endpoint like ElevenLabs (it's fixed models).
        Returning a static list of known Aura models.
        """
        # Static list of Aura models as of 2026
        voices = [
            {"voice_id": "aura-asteria-en", "name": "Asteria (Feminina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-luna-en", "name": "Luna (Feminina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-stella-en", "name": "Stella (Feminina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-athena-en", "name": "Athena (Feminina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-hera-en", "name": "Hera (Feminina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-orion-en", "name": "Orion (Masculina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-arcas-en", "name": "Arcas (Masculina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-perseus-en", "name": "Perseus (Masculina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-angus-en", "name": "Angus (Masculina - Inglesa)", "category": "premade"},
            {"voice_id": "aura-orpheus-en", "name": "Orpheus (Masculina - Inglesa)", "category": "premade"},
        ]
        return voices
