import pytest
from unittest.mock import patch, AsyncMock, MagicMock, ANY
from pathlib import Path
import subprocess
from fastapi.testclient import TestClient
from fastapi import BackgroundTasks

from app.utils.audio import _sync_convert_to_ogg
from app.models.common import SessionStatus

class TestBulkUpload:

    @patch("app.utils.audio.subprocess.run")
    @patch("app.utils.audio.Path.exists", return_value=True)
    @patch("app.utils.audio.Path.unlink")
    @patch("app.utils.audio.Path.rename")
    def test_sync_convert_to_ogg_success(self, mock_rename, mock_unlink, mock_exists, mock_run):
        """Test that _sync_convert_to_ogg converts files via temp file and atomic swap."""
        input_path = Path("uploads/test_audio.mp3")
        
        # Call the synchronous function
        result_path = _sync_convert_to_ogg(input_path)
        
        # Verify ffmpeg command called with correct arguments (-c:a libopus -b:a 64k and temp path)
        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        cmd = args[0]
        assert "ffmpeg" in cmd
        assert "-c:a" in cmd
        assert "libopus" in cmd
        assert "-b:a" in cmd
        assert "64k" in cmd
        
        # Verify original file deletion (since original suffix was .mp3, it should be unlinked)
        mock_unlink.assert_called()
        
        # Verify temp file rename to final .ogg
        mock_rename.assert_called_once_with(input_path.with_suffix(".ogg"))
        assert result_path == input_path.with_suffix(".ogg")

    def test_upload_audio_legacy_single_file(self, client, mock_db):
        """Test uploading a single audio file (legacy compatibility with 'file')."""
        session_id = "test-session-123"
        
        # Mock session check in DB
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "name": "Test Session",
            "campaign_id": "camp-1",
            "audio_file_id": None
        }
        mock_db.sessions.update_one = AsyncMock()
        
        # Mock app settings & campaign glossary
        mock_db.settings.find_one.return_value = {"id": "app_settings", "language": "pt-BR"}
        mock_db.campaigns.find_one.return_value = {"spelling_glossary": "rpg glossary"}
        
        # Mock convert_to_ogg, Path operations, and TranscriptionService
        with patch("app.routers.sessions.convert_to_ogg", new_callable=AsyncMock) as mock_convert, \
             patch("app.routers.sessions.Path.write_bytes") as mock_write, \
             patch("app.routers.sessions.Path.mkdir") as mock_mkdir, \
             patch("app.routers.sessions.Path.exists", return_value=True) as mock_exists, \
             patch("app.routers.sessions.Path.read_bytes", return_value=b"dummy bytes") as mock_read, \
             patch("app.routers.sessions.TranscriptionService.transcribe", new_callable=AsyncMock) as mock_transcribe:
            
            from app.services.transcription import TranscriptionResult, TranscriptionSegmentResult
            mock_transcribe.return_value = TranscriptionResult(
                raw_text="transcribed text",
                segments=[TranscriptionSegmentResult(text="transcribed text", start=0.0, end=5.0)],
                method="Mock"
            )
            mock_convert.return_value = Path("uploads/session_test-session-123_off_000000_spk_central_converted.ogg")
            
            # Send file via key "file" (single file upload)
            file_data = {"file": ("test.mp3", b"dummy mp3 data content", "audio/mpeg")}
            response = client.post(
                f"/api/sessions/{session_id}/upload-audio",
                files=file_data,
                data={"chunk_offset": 10.0}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "Upload successful" in data["message"]
            assert data["session_id"] == session_id
            assert data["status"] == "transcribing"
            
            # Verify DB was updated to transcribing
            mock_db.sessions.update_one.assert_any_call(
                {"id": session_id},
                {"$set": {"status": "transcribing", "updated_at": ANY}}
            )

    def test_upload_audio_bulk_multiple_files(self, client, mock_db):
        """Test uploading multiple audio files simultaneously using the 'files' field."""
        session_id = "test-session-123"
        
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "name": "Test Session",
            "campaign_id": "camp-1",
            "audio_file_id": None
        }
        mock_db.sessions.update_one = AsyncMock()
        
        mock_db.settings.find_one.return_value = {"id": "app_settings", "language": "pt-BR"}
        mock_db.campaigns.find_one.return_value = {"spelling_glossary": "rpg glossary"}
        
        # Mock convert_to_ogg, Path operations, and TranscriptionService
        with patch("app.routers.sessions.convert_to_ogg", new_callable=AsyncMock) as mock_convert, \
             patch("app.routers.sessions.Path.write_bytes") as mock_write, \
             patch("app.routers.sessions.Path.mkdir") as mock_mkdir, \
             patch("app.routers.sessions.Path.exists", return_value=True) as mock_exists, \
             patch("app.routers.sessions.Path.read_bytes", return_value=b"dummy bytes") as mock_read, \
             patch("app.routers.sessions.TranscriptionService.transcribe", new_callable=AsyncMock) as mock_transcribe:
            
            from app.services.transcription import TranscriptionResult, TranscriptionSegmentResult
            mock_transcribe.return_value = TranscriptionResult(
                raw_text="transcribed text",
                segments=[TranscriptionSegmentResult(text="transcribed text", start=0.0, end=5.0)],
                method="Mock"
            )
            mock_convert.side_effect = lambda path: path.with_suffix(".ogg")
            
            # Send multiple files via key "files"
            file_data = [
                ("files", ("audio1.wav", b"first block", "audio/wav")),
                ("files", ("audio2.mp3", b"second block", "audio/mpeg"))
            ]
            response = client.post(
                f"/api/sessions/{session_id}/upload-audio",
                files=file_data,
                data={"chunk_offset": 0.0}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "Upload successful" in data["message"]
            assert data["session_id"] == session_id
            assert data["status"] == "transcribing"
            
            # Verify that convert_to_ogg was called twice
            assert mock_convert.call_count == 2
            
            # Verify DB was updated
            mock_db.sessions.update_one.assert_any_call(
                {"id": session_id},
                {"$set": {"status": "transcribing", "updated_at": ANY}}
            )

    def test_upload_audio_invalid_type(self, client, mock_db):
        """Test that uploading an unsupported file type returns 400 Bad Request."""
        session_id = "test-session-123"
        
        mock_db.sessions.find_one.return_value = {
            "id": session_id,
            "name": "Test Session",
            "campaign_id": "camp-1",
            "audio_file_id": None
        }
        
        # Mock settings retrieval to avoid coroutine/mock key error
        mock_db.settings.find_one.return_value = {"id": "app_settings", "language": "pt-BR"}
        
        # Send a text file instead of audio
        file_data = {"file": ("malicious.sh", b"rm -rf /", "text/plain")}
        response = client.post(
            f"/api/sessions/{session_id}/upload-audio",
            files=file_data
        )
        
        assert response.status_code == 400
        assert "Invalid audio file type" in response.json()["detail"]
