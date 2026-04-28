"""Campaign-related Pydantic models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    game_system: str = "D&D 5e"
    cover_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    description: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    game_system: str = "D&D 5e"
    cover_image_url: Optional[str] = None
    description: Optional[str] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    game_system: Optional[str] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None
