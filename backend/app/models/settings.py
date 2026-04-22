"""App settings Pydantic models (stored in MongoDB, not env vars)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import LLMProvider


class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = "app_settings"
    llm_provider: LLMProvider = LLMProvider.GEMINI
    llm_model: str = "gemini-2.0-flash"
    custom_api_key: Optional[str] = None
    use_emergent_key: bool = True
    discord_bot_token: Optional[str] = None
    discord_guild_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppSettingsUpdate(BaseModel):
    llm_provider: Optional[LLMProvider] = None
    llm_model: Optional[str] = None
    custom_api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None
    discord_bot_token: Optional[str] = None
    discord_guild_id: Optional[str] = None
