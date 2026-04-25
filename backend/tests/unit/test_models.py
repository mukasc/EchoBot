import pytest
from pydantic import ValidationError
from app.models.settings import AppSettings, LLMConfig, TTSProvider
from app.models.common import LLMProvider

class TestSettingsModels:

    def test_llm_config_defaults(self):
        """Test LLMConfig default values and basic validation."""
        config = LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o")
        assert config.label == "Fallback"
        assert config.enabled is True
        assert config.api_key is None

    def test_app_settings_defaults(self):
        """Test AppSettings default values."""
        settings = AppSettings()
        assert settings.id == "app_settings"
        assert settings.llm_provider == LLMProvider.GEMINI
        assert settings.llm_primary_enabled is True
        assert settings.llm_fallbacks == []
        assert settings.tts_provider == TTSProvider.ELEVENLABS

    def test_app_settings_validation_invalid_provider(self):
        """Test that invalid enum values raise ValidationError."""
        with pytest.raises(ValidationError):
            AppSettings(llm_provider="invalid-provider")

    def test_llm_fallbacks_parsing(self):
        """Test that list of fallbacks is correctly parsed."""
        data = {
            "llm_fallbacks": [
                {"provider": "openai", "model": "gpt-4o", "label": "Primary Fallback"},
                {"provider": "groq", "model": "llama3-70b-8192", "enabled": False}
            ]
        }
        settings = AppSettings(**data)
        assert len(settings.llm_fallbacks) == 2
        assert settings.llm_fallbacks[0].provider == LLMProvider.OPENAI
        assert settings.llm_fallbacks[0].label == "Primary Fallback"
        assert settings.llm_fallbacks[1].provider == LLMProvider.GROQ
        assert settings.llm_fallbacks[1].enabled is False

    def test_extra_fields_ignored(self):
        """Test that extra fields are ignored as per ConfigDict(extra='ignore')."""
        settings = AppSettings(something_extra="value")
        assert not hasattr(settings, "something_extra")

    def test_tts_provider_enum(self):
        """Test TTSProvider enum validation."""
        settings = AppSettings(tts_provider="kokoro")
        assert settings.tts_provider == TTSProvider.KOKORO
        
        with pytest.raises(ValidationError):
            AppSettings(tts_provider="invalid-tts")
