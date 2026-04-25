"""App settings Pydantic models (stored in MongoDB, not env vars)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from enum import Enum
from app.models.common import LLMProvider


class TTSProvider(str, Enum):
    ELEVENLABS = "elevenlabs"
    DEEPGRAM = "deepgram"
    KOKORO = "kokoro"


class LLMConfig(BaseModel):
    label: str = "Fallback"
    provider: LLMProvider
    model: str
    enabled: bool = True
    api_key: Optional[str] = None # If provided, overrides the global key


class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = "app_settings"
    llm_provider: LLMProvider = LLMProvider.GEMINI
    llm_model: str = "gemini-2.0-flash"
    llm_primary_enabled: bool = True
    llm_fallbacks: List[LLMConfig] = Field(default_factory=list)
    
    # LLM API Keys
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    custom_api_key: Optional[str] = None # Legacy / generic
    
    # Discord Configuration
    discord_bot_token: Optional[str] = None
    discord_app_id: Optional[str] = None
    discord_public_key: Optional[str] = None
    discord_guild_id: Optional[str] = None
    
    # TTS Configuration
    tts_provider: TTSProvider = TTSProvider.ELEVENLABS
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: str = "onwK4e9ZLuTAKqWW03AF"
    deepgram_api_key: Optional[str] = None
    deepgram_model: str = "aura-asteria-en"
    kokoro_api_key: Optional[str] = None
    kokoro_base_url: str = "http://localhost:3000/api/v1"
    kokoro_model: str = "model_q8f16"
    kokoro_voice: str = "af_heart"
    # Notion Configuration
    notion_api_key: Optional[str] = None
    notion_page_id: Optional[str] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppSettingsUpdate(BaseModel):
    llm_provider: Optional[LLMProvider] = None
    llm_model: Optional[str] = None
    llm_primary_enabled: Optional[bool] = None
    llm_fallbacks: Optional[List[LLMConfig]] = None
    
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    custom_api_key: Optional[str] = None
    
    discord_bot_token: Optional[str] = None
    discord_app_id: Optional[str] = None
    discord_public_key: Optional[str] = None
    discord_guild_id: Optional[str] = None
    
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: Optional[str] = None
    deepgram_api_key: Optional[str] = None
    deepgram_model: Optional[str] = None
    kokoro_api_key: Optional[str] = None
    kokoro_base_url: Optional[str] = None
    kokoro_model: Optional[str] = None
    kokoro_voice: Optional[str] = None
    tts_provider: Optional[TTSProvider] = None
    notion_api_key: Optional[str] = None
    notion_page_id: Optional[str] = None
