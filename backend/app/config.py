"""
Pydantic Settings — loads and validates all environment variables.

All configuration is centralised here. Import `get_settings` and inject
via FastAPI `Depends()` wherever env values are needed.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database Settings ---
    db_provider: str = Field(
        "mongodb",
        validation_alias=AliasChoices("db_provider", "DATABASE_TYPE"),
        description="Database provider: mongodb or flatfile"
    )
    flatfile_dir: str = Field(
        "./data",
        validation_alias=AliasChoices("flatfile_dir", "DATABASE_DIR"),
        description="Directory to store Flat-File JSON databases"
    )
    mongo_url: str = Field(default="", description="MongoDB connection string")
    db_name: str = Field("rpbcronista", description="MongoDB database name")
    master_key: str = Field(default="", description="Master key for encryption")

    # --- AI / LLM APIs ---
    openai_api_key: str = Field(default="", description="OpenAI API key")
    google_api_key: str = Field(default="", description="Google / Gemini API key")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key")
    groq_api_key: str = Field(default="", description="Groq API key")

    # --- Discord ---
    discord_app_id: str = Field(default="")
    discord_public_key: str = Field(default="")
    discord_bot_token: str = Field(default="")
    discord_guild_id: str = Field(default="")

    # --- ElevenLabs ---
    elevenlabs_api_key: str = Field(default="", description="ElevenLabs API key")
    elevenlabs_voice_id: str = Field(default="pNInz6obpgmqS2C9NfX", description="Default voice ID (Adam)")

    # --- Deepgram ---
    deepgram_api_key: str = Field(default="", description="Deepgram API key")

    # --- CORS ---
    cors_origins: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins (comma-separated in env)",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("db_provider", mode="before")
    @classmethod
    def normalize_db_provider(cls, v):
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in ("flatfile", "flatfiles", "flat_file", "flat-file", "json"):
                return "flatfile"
            if v_clean in ("mongodb", "mongo"):
                return "mongodb"
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton)."""
    return Settings()
