"""Shared enums used across models."""
from enum import Enum


class SessionStatus(str, Enum):
    RECORDING = "recording"
    TRANSCRIBING = "transcribing"
    PROCESSING = "processing"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"


class MessageType(str, Enum):
    IC = "ic"          # In-Character
    OOC = "ooc"        # Out-of-Character
    NARRATION = "narration"


class LLMProvider(str, Enum):
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"
    GROQ = "groq"
