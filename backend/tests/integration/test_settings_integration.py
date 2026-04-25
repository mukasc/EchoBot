import pytest
from unittest.mock import AsyncMock

class TestSettingsIntegration:

    def test_get_settings_default(self, client, mock_db):
        """Test GET /api/settings/ when no settings in DB (returns defaults)."""
        mock_db.settings.find_one.return_value = None
        
        response = client.get("/api/settings/")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "app_settings"
        assert data["llm_provider"] == "gemini" # Default

    def test_update_settings(self, client, mock_db):
        """Test PUT /api/settings/"""
        payload = {
            "llm_provider": "openai",
            "openai_api_key": "new-key"
        }
        
        # Mock find_one to return the updated object after update
        mock_db.settings.find_one.return_value = {
            "id": "app_settings",
            "llm_provider": "openai",
            "openai_api_key": "new-key"
        }
        
        response = client.put("/api/settings/", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["llm_provider"] == "openai"
        assert data["openai_api_key"] == "new-key"
        mock_db.settings.update_one.assert_called_once()

    def test_update_settings_tts_and_notion(self, client, mock_db):
        """Test updating TTS and Notion specific settings."""
        payload = {
            "tts_provider": "kokoro",
            "kokoro_base_url": "http://my-kokoro:3000",
            "notion_api_key": "notion-secret"
        }
        
        mock_db.settings.find_one.return_value = {
            "id": "app_settings",
            "tts_provider": "kokoro",
            "kokoro_base_url": "http://my-kokoro:3000",
            "notion_api_key": "notion-secret"
        }
        
        response = client.put("/api/settings/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["tts_provider"] == "kokoro"
        assert data["kokoro_base_url"] == "http://my-kokoro:3000"
        assert data["notion_api_key"] == "notion-secret"

    def test_update_llm_fallbacks(self, client, mock_db):
        """Test updating LLM fallbacks list."""
        payload = {
            "llm_fallbacks": [
                {"label": "Secondary", "provider": "openai", "model": "gpt-4o", "enabled": True}
            ]
        }
        
        mock_db.settings.find_one.return_value = {
            "id": "app_settings",
            "llm_fallbacks": [
                {"label": "Secondary", "provider": "openai", "model": "gpt-4o", "enabled": True}
            ]
        }
        
        response = client.put("/api/settings/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["llm_fallbacks"]) == 1
        assert data["llm_fallbacks"][0]["model"] == "gpt-4o"
