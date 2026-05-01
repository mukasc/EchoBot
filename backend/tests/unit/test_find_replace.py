import pytest
from unittest.mock import MagicMock

def test_find_replace_logic(client, mock_db):
    """
    Test the find-replace endpoint logic with different scenarios.
    """
    session_id = "test-session"
    mock_session = {
        "id": session_id,
        "name": "Test Session",
        "raw_transcription": "Orcs are coming. The Orc is here.",
        "transcription_segments": [
            {"id": "1", "text": "Orcs are coming."},
            {"id": "2", "text": "The Orc is here."}
        ],
        "technical_diary": [
            {"id": "d1", "name": "Orc Scout", "description": "A green Orc."}
        ],
        "review_script": "The Orc was defeated by Orcs.",
        "game_system": "D&D 5e"
    }
    
    import copy
    mock_db.sessions.find_one.side_effect = lambda filter, projection=None: copy.deepcopy(mock_session)
    
    # 1. Simple replace (case insensitive, not whole word)
    payload = {
        "find_term": "orc",
        "replace_term": "Uruk",
        "match_case": False,
        "whole_word": False
    }
    
    response = client.post(f"/api/sessions/{session_id}/find-replace", json=payload)
    assert response.status_code == 200
    
    # Verify update_one was called
    args, _ = mock_db.sessions.update_one.call_args
    set_data = args[1]["$set"]
    
    assert "Uruk" in set_data["raw_transcription"]
    assert "Uruks" in set_data["raw_transcription"] # because it wasn't whole word
    assert set_data["transcription_segments"][0]["text"] == "Uruks are coming."
    assert set_data["technical_diary"][0]["name"] == "Uruk Scout"

    # 2. Match Case ON
    mock_db.sessions.update_one.reset_mock()
    payload["match_case"] = True
    payload["find_term"] = "Orc"
    
    response = client.post(f"/api/sessions/{session_id}/find-replace", json=payload)
    assert response.status_code == 200
    args, _ = mock_db.sessions.update_one.call_args
    set_data = args[1]["$set"]
    assert "Orc" not in set_data["raw_transcription"] # "Orc" should be replaced
    # If we had "orc" (lowercase), it would remain. But our mock only had "Orc".

    # 3. Whole Word ON
    mock_db.sessions.update_one.reset_mock()
    payload["match_case"] = False
    payload["whole_word"] = True
    payload["find_term"] = "Orc"
    payload["replace_term"] = "Warrior"
    
    response = client.post(f"/api/sessions/{session_id}/find-replace", json=payload)
    assert response.status_code == 200
    args, _ = mock_db.sessions.update_one.call_args
    set_data = args[1]["$set"]
    
    # "Orcs" should remain "Orcs" because "Orc" was searched as whole word
    assert "Orcs" in set_data["raw_transcription"]
    assert "Warrior" in set_data["raw_transcription"]
    assert set_data["transcription_segments"][0]["text"] == "Orcs are coming."
    assert set_data["transcription_segments"][1]["text"] == "The Warrior is here."
