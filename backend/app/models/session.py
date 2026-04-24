"""Session-related Pydantic models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import MessageType, SessionStatus


class TranscriptionSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    speaker_discord_id: str
    speaker_character_name: Optional[str] = None
    text: str
    message_type: MessageType = MessageType.IC
    timestamp_start: float
    timestamp_end: float
    timestamp_absolute_start: Optional[str] = None
    timestamp_absolute_end: Optional[str] = None
    confidence: float = 1.0
    uncertain_terms: List[str] = []


class TranscriptionSegmentUpdate(BaseModel):
    text: Optional[str] = None
    message_type: Optional[MessageType] = None
    speaker_character_name: Optional[str] = None


class TechnicalDiaryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # npc, location, item, xp, event
    name: str
    description: Optional[str] = None
    timestamp: Optional[str] = None


class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    game_system: str = "D&D 5e"
    status: SessionStatus = SessionStatus.AWAITING_REVIEW
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_minutes: Optional[int] = None
    transcription_segments: List[TranscriptionSegment] = []
    technical_diary: List[TechnicalDiaryEntry] = []
    review_script: str = ""
    raw_transcription: str = ""
    cover_image_url: Optional[str] = None
    audio_file_id: Optional[str] = None
    narration_audio_url: Optional[str] = None
    is_audio_append: bool = False
    chunk_duration_minutes: int = 20


class SessionCreate(BaseModel):
    name: str
    game_system: str = "D&D 5e"
    cover_image_url: Optional[str] = None
    chunk_duration_minutes: int = 20


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    game_system: Optional[str] = None
    status: Optional[SessionStatus] = None
    review_script: Optional[str] = None
    technical_diary: Optional[List[TechnicalDiaryEntry]] = None
    cover_image_url: Optional[str] = None
    chunk_duration_minutes: Optional[int] = None
