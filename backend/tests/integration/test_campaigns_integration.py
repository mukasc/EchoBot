import pytest

class TestCampaignsIntegration:

    def test_list_campaigns(self, client, mock_db):
        """Test GET /api/campaigns/"""
        mock_db.campaigns.find.return_value.sort.return_value.to_list.return_value = [
            {"id": "c1", "name": "Campaign 1", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "c2", "name": "Campaign 2", "created_at": "2024-01-02T00:00:00Z"}
        ]
        
        response = client.get("/api/campaigns/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "c1"
        assert data[1]["name"] == "Campaign 2"

    def test_create_campaign(self, client, mock_db):
        """Test POST /api/campaigns/"""
        payload = {
            "name": "New Campaign",
            "game_system": "Vampire",
            "description": "Test description"
        }
        
        response = client.post("/api/campaigns/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Campaign"
        assert data["game_system"] == "Vampire"
        assert "id" in data
        mock_db.campaigns.insert_one.assert_called_once()

    def test_get_campaign(self, client, mock_db):
        """Test GET /api/campaigns/{id}"""
        mock_db.campaigns.find_one.return_value = {
            "id": "c1",
            "name": "Campaign 1",
            "game_system": "D&D 5e"
        }
        
        response = client.get("/api/campaigns/c1")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Campaign 1"

    def test_get_campaign_not_found(self, client, mock_db):
        """Test GET /api/campaigns/{id} 404 case."""
        mock_db.campaigns.find_one.return_value = None
        
        response = client.get("/api/campaigns/nonexistent")
        assert response.status_code == 404
        assert "nonexistent" in response.json()["detail"]

    def test_update_campaign(self, client, mock_db):
        """Test PUT /api/campaigns/{id}"""
        mock_db.campaigns.find_one.side_effect = [
            {"id": "c1", "name": "Old Campaign", "game_system": "D&D 5e"}, # First check
            {"id": "c1", "name": "Updated Campaign", "game_system": "D&D 5e"} # Return after update
        ]
        
        payload = {"name": "Updated Campaign"}
        response = client.put("/api/campaigns/c1", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Campaign"
        mock_db.campaigns.update_one.assert_called_once()

    def test_get_campaign_technical_diary(self, client, mock_db):
        """Test GET /api/campaigns/{id}/technical_diary"""
        mock_db.campaigns.find_one.return_value = {"id": "c1", "name": "Campaign 1"}
        
        mock_db.sessions.aggregate.return_value.to_list.return_value = [
            {
                "_id": "npc",
                "entries": [
                    {"id": "n1", "name": "Goblin", "session_name": "S1"}
                ]
            },
            {
                "_id": "location",
                "entries": [
                    {"id": "l1", "name": "Cave", "session_name": "S2"}
                ]
            }
        ]
        
        response = client.get("/api/campaigns/c1/technical_diary")
        assert response.status_code == 200
        data = response.json()
        assert data["campaign_id"] == "c1"
        assert "npc" in data["technical_diary"]
        assert len(data["technical_diary"]["npc"]) == 1
        assert data["technical_diary"]["npc"][0]["name"] == "Goblin"

    def test_list_campaign_sessions(self, client, mock_db):
        """Test GET /api/campaigns/{id}/sessions"""
        mock_db.sessions.find.return_value.sort.return_value.to_list.return_value = [
            {"id": "s1", "campaign_id": "c1", "name": "Session 1", "created_at": "2024-01-01T00:00:00Z", "status": "completed"}
        ]
        
        response = client.get("/api/campaigns/c1/sessions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "s1"
