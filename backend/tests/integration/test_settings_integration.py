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
