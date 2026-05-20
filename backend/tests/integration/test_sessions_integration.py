import pytest
from unittest.mock import patch, AsyncMock, MagicMock

class TestSessionsIntegration:

    def test_list_sessions(self, client, mock_db):
        """Test GET /api/sessions/"""
        mock_db.sessions.find.return_value.sort.return_value.to_list.return_value = [
            {"id": "s1", "name": "Session 1", "created_at": "2024-01-01T00:00:00Z", "status": "completed"},
            {"id": "s2", "name": "Session 2", "created_at": "2024-01-02T00:00:00Z", "status": "recording"}
        ]
        
        response = client.get("/api/sessions/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "s1"
        assert data[1]["name"] == "Session 2"

    def test_get_session_not_found(self, client, mock_db):
        """Test GET /api/sessions/{id} 404 case."""
        mock_db.sessions.find_one.return_value = None
        
        response = client.get("/api/sessions/nonexistent")
        assert response.status_code == 404
        assert "nonexistent" in response.json()["detail"]

    def test_create_session(self, client, mock_db):
        """Test POST /api/sessions/"""
        payload = {"campaign_id": "c1", "name": "New Session", "game_system": "Vampire"}
        
        response = client.post("/api/sessions/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Session"
        assert "id" in data
        mock_db.sessions.insert_one.assert_called_once()

    @patch("app.routers.sessions.AIProcessorService")
    def test_process_session_success(self, mock_ai_service_class, client, mock_db):
        """Test POST /api/sessions/{id}/process flow."""
        from unittest.mock import ANY
        session_id = "test-session"
        
        # Mock AI Service instance and its process method
        mock_processor = mock_ai_service_class.return_value
        mock_processor.process = AsyncMock(return_value={})
        
        # Mock session in DB
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "raw_transcription": "Existing transcription text",
            "game_system": "D&D 5e",
            "status": "awaiting_review"
        }
        
        # Mock settings retrieval
        mock_db.settings.find_one.return_value = {"id": "app_settings", "llm_provider": "gemini"}
        
        # Mock character mappings
        mock_db.character_mappings.find.return_value.to_list.return_value = []

        response = client.post(f"/api/sessions/{session_id}/process/", json={})
        
        assert response.status_code == 200
        assert response.json()["status"] == "processing"
        
        # Verify DB update to 'processing'
        mock_db.sessions.update_one.assert_called_with(
            {"id": session_id},
            ANY
        )

    def test_process_session_no_transcription(self, client, mock_db):
        """Test POST /api/sessions/{id}/process with missing transcription."""
        session_id = "test-session"
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "raw_transcription": "", # Empty
            "status": "awaiting_review"
        }
        
        response = client.post(f"/api/sessions/{session_id}/process/", json={})
        assert response.status_code == 400
        assert "No transcription available" in response.json()["detail"]

    def test_delete_segment_success(self, client, mock_db):
        """Test DELETE /api/sessions/{session_id}/segments/{segment_id}"""
        session_id = "test-session"
        segment_id = "seg-1"
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "transcription_segments": [
                {"id": "seg-1", "text": "Segment 1"},
                {"id": "seg-2", "text": "Segment 2"}
            ]
        }
        
        response = client.delete(f"/api/sessions/{session_id}/segments/{segment_id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Segment deleted successfully"
        mock_db.sessions.update_one.assert_called_once()

    def test_delete_segment_not_found(self, client, mock_db):
        """Test DELETE /api/sessions/{session_id}/segments/{segment_id} when segment is missing"""
        session_id = "test-session"
        segment_id = "seg-nonexistent"
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "transcription_segments": [
                {"id": "seg-1", "text": "Segment 1"}
            ]
        }
        
        response = client.delete(f"/api/sessions/{session_id}/segments/{segment_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_bulk_delete_segments(self, client, mock_db):
        """Test POST /api/sessions/{session_id}/segments/bulk-delete"""
        session_id = "test-session"
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "transcription_segments": [
                {"id": "seg-1", "text": "Segment 1"},
                {"id": "seg-2", "text": "Segment 2"},
                {"id": "seg-3", "text": "Segment 3"}
            ]
        }
        
        payload = {"segment_ids": ["seg-1", "seg-3"]}
        response = client.post(f"/api/sessions/{session_id}/segments/bulk-delete", json=payload)
        assert response.status_code == 200
        assert response.json()["message"] == "Segments deleted successfully"
        mock_db.sessions.update_one.assert_called_once()
