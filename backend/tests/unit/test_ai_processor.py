import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.ai_processor import AIProcessorService
from app.models.common import LLMProvider
from app.models.settings import AppSettings, LLMConfig
from app.exceptions import AppException

class TestAIProcessorService:

    @pytest.fixture
    def service(self):
        settings = MagicMock()
        return AIProcessorService(settings)

    @pytest.fixture
    def app_settings(self):
        return AppSettings(
            llm_provider=LLMProvider.GEMINI,
            llm_model="gemini-2.0-flash",
            llm_primary_enabled=True,
            google_api_key="primary-key"
        )

    @pytest.mark.asyncio
    async def test_process_primary_success(self, service, app_settings):
        """Test that the primary provider is used and succeeds."""
        service._call_llm_direct = AsyncMock(return_value=json.dumps({
            "technical_diary": [{"category": "event", "name": "Test Event"}],
            "review_script": "Test script",
            "filtered_segments": []
        }))
        
        result = await service.process(
            raw_transcription="Test transcription",
            game_system="D&D 5e",
            mapping_context="Context",
            app_settings=app_settings
        )
        
        assert result["technical_diary"][0]["name"] == "Test Event"
        assert result["metadata"]["provider"] == "gemini"
        assert result["metadata"]["attempts"] == "1"
        service._call_llm_direct.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_fallback_success(self, service, app_settings):
        """Test that if the primary fails, it falls back to the configured fallback."""
        app_settings.llm_fallbacks = [
            LLMConfig(provider=LLMProvider.OPENROUTER, model="meta-llama/llama-3-70b-instruct", enabled=True, api_key="fallback-key")
        ]
        
        # Primary fails, Fallback succeeds
        service._call_llm_direct = AsyncMock()
        service._call_llm_direct.side_effect = [
            Exception("Primary Failed"),
            json.dumps({
                "technical_diary": [],
                "review_script": "Fallback script",
                "filtered_segments": []
            })
        ]
        
        result = await service.process(
            raw_transcription="Test transcription",
            game_system="D&D 5e",
            mapping_context="Context",
            app_settings=app_settings
        )
        
        assert result["review_script"] == "Fallback script"
        assert result["metadata"]["provider"] == "openrouter"
        assert result["metadata"]["attempts"] == "2"
        assert service._call_llm_direct.call_count == 2

    @pytest.mark.asyncio
    async def test_process_all_fail(self, service, app_settings):
        """Test that if all providers fail, an AppException is raised."""
        app_settings.llm_fallbacks = [
            LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o", enabled=True)
        ]
        
        service._call_llm_direct = AsyncMock(side_effect=Exception("API Error"))
        
        with pytest.raises(AppException) as excinfo:
            await service.process(
                raw_transcription="Test",
                game_system="System",
                mapping_context="Context",
                app_settings=app_settings
            )
        
        assert excinfo.value.status_code == 503
        assert "Falha ao processar com IA após 2 tentativas" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_no_providers_active(self, service, app_settings):
        """Test that if no providers are enabled, an AppException is raised."""
        app_settings.llm_primary_enabled = False
        app_settings.llm_fallbacks = []
        
        with pytest.raises(AppException) as excinfo:
            await service.process(
                raw_transcription="Test",
                game_system="System",
                mapping_context="Context",
                app_settings=app_settings
            )
        
        assert excinfo.value.status_code == 400
        assert "Nenhum provedor de IA está ativo" in str(excinfo.value.detail)

    def test_resolve_api_key_priority(self, service, app_settings):
        """Test API key resolution priority: Fallback Specific > Global DB > Env Var."""
        app_settings.openai_api_key = "db-key"
        service._settings.openai_api_key = "env-key"
        
        # 1. Fallback Specific
        key = service._resolve_api_key(LLMProvider.OPENAI, "fallback-specific-key", app_settings)
        assert key == "fallback-specific-key"
        
        # 2. Global DB
        key = service._resolve_api_key(LLMProvider.OPENAI, None, app_settings)
        assert key == "db-key"
        
        # 3. Env Var (mocking DB key as None)
        app_settings.openai_api_key = None
        key = service._resolve_api_key(LLMProvider.OPENAI, None, app_settings)
        assert key == "env-key"

    def test_parse_response_with_markdown(self, service):
        """Test that the parser handles markdown code fences correctly."""
        raw_json = '{"technical_diary": [], "review_script": "Hello", "filtered_segments": []}'
        markdown_response = f"```json\n{raw_json}\n```"
        
        parsed = service._parse_response(markdown_response, "fallback")
        assert parsed["review_script"] == "Hello"
        
        # Test with garbage around JSON
        messy_response = f"Here is the result:\n{markdown_response}\nHope you like it!"
        parsed = service._parse_response(messy_response, "fallback")
        assert parsed["review_script"] == "Hello"

    def test_parse_response_invalid_json(self, service):
        """Test that invalid JSON returns a graceful fallback."""
        invalid_json = "{ invalid }"
        parsed = service._parse_response(invalid_json, "Original Transcription")
        
        assert parsed["technical_diary"] == []
        assert parsed["review_script"] == "Original Transcription"
