"""Character mapping Pydantic models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CharacterMapping(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_user_id: str
    discord_username: str
    character_name: str
    character_role: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CharacterMappingCreate(BaseModel):
    discord_user_id: str
    discord_username: str
    character_name: str
    character_role: Optional[str] = None
    avatar_url: Optional[str] = None
