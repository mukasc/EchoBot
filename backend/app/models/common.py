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


class ScriptDensity(str, Enum):
    SHORT = "short"
    STANDARD = "standard"
    ALTERNATIVE = "alternative"
    DETAILED = "detailed"


class NarrativePerspective(str, Enum):
    FIRST_PERSON = "1p"
    SECOND_PERSON = "2p"
    THIRD_PERSON_EPIC = "3p_epic"
    TACTICAL_REPORT = "tactical"
