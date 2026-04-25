import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from pathlib import Path
from app.services.transcription import TranscriptionService, TranscriptionResult, TranscriptionSegmentResult

class TestTranscriptionService:
    @pytest.fixture
    def service(self):
        settings = MagicMock()
        settings.google_api_key = "gemini-key"
        settings.openai_api_key = "openai-key"
        return TranscriptionService(settings)

    @pytest.mark.asyncio
    @patch("app.services.transcription.TranscriptionService._transcribe_local")
    async def test_transcribe_local_priority(self, mock_local, service):
        """Test that local transcription is tried first and returned if successful."""
        mock_local.return_value = TranscriptionResult(raw_text="Local text", method="LocalWhisper")
        
        file_path = Path("test.wav")
        # Ensure path exists for the check in transcribe()
        with patch.object(Path, "exists", return_value=True):
            result = await service.transcribe(b"content" * 20, "test.wav", file_path=file_path)
        
        assert result.raw_text == "Local text"
        assert result.method == "LocalWhisper"
        mock_local.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.transcription.TranscriptionService._transcribe_local")
    @patch("app.services.transcription.TranscriptionService._transcribe_gemini")
    async def test_transcribe_fallback_to_gemini(self, mock_gemini, mock_local, service):
        """Test fallback to Gemini if local fails."""
        mock_local.side_effect = Exception("Local failed")
        mock_gemini.return_value = TranscriptionResult(raw_text="Gemini text", method="Gemini")
        
        file_path = Path("test.wav")
        with patch.object(Path, "exists", return_value=True):
            result = await service.transcribe(b"content" * 20, "test.wav", file_path=file_path)
            
        assert result.raw_text == "Gemini text"
        assert result.method == "Gemini"
        mock_local.assert_called_once()
        mock_gemini.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.transcription.TranscriptionService._transcribe_local")
    @patch("app.services.transcription.TranscriptionService._transcribe_gemini")
    @patch("app.services.transcription.TranscriptionService._transcribe_openai")
    async def test_transcribe_fallback_to_openai(self, mock_openai, mock_gemini, mock_local, service):
        """Test fallback to OpenAI if local and Gemini fail."""
        mock_local.side_effect = Exception("Local failed")
        mock_gemini.side_effect = Exception("Gemini failed")
        mock_openai.return_value = TranscriptionResult(raw_text="OpenAI text", method="OpenAIWhisper")
        
        result = await service.transcribe(b"content" * 20, "test.wav", file_path=None)
            
        assert result.raw_text == "OpenAI text"
        assert result.method == "OpenAIWhisper"
        mock_openai.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.transcription.TranscriptionService._transcribe_gemini")
    @patch("app.services.transcription.TranscriptionService._transcribe_openai")
    async def test_transcribe_all_fail(self, mock_openai, mock_gemini, service):
        """Test that the last exception is re-raised if all methods fail."""
        mock_gemini.side_effect = Exception("Gemini fail")
        mock_openai.side_effect = Exception("OpenAI fail")
        
        with pytest.raises(Exception, match="OpenAI fail"):
            await service.transcribe(b"content" * 20, "test.wav")

    def test_detect_mime(self):
        """Test MIME type detection for various extensions."""
        assert TranscriptionService._detect_mime("test.mp3") == "audio/mpeg"
        assert TranscriptionService._detect_mime("test.webm") == "audio/webm"
        assert TranscriptionService._detect_mime("test.ogg") == "audio/ogg"
        assert TranscriptionService._detect_mime("test.opus") == "audio/ogg"
        assert TranscriptionService._detect_mime("test.m4a") == "audio/mp4"
        assert TranscriptionService._detect_mime("test.wav") == "audio/wav"
        assert TranscriptionService._detect_mime("test.unknown") == "audio/wav"

    @pytest.mark.asyncio
    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    async def test_transcribe_gemini_internal(self, mock_conf, mock_gen_model, service):
        """Test internal Gemini transcription logic and model selection."""
        mock_model = mock_gen_model.return_value
        mock_response = MagicMock()
        mock_response.text = "Gemini raw text"
        # Since it's an async call in the service, we mock it appropriately
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        
        result = await service._transcribe_gemini(b"content", "test.wav", "fake-key")
        
        assert result.raw_text == "Gemini raw text"
        assert result.method == "Gemini"
        mock_conf.assert_called_once_with(api_key="fake-key")
        mock_gen_model.assert_called_with("gemini-2.0-flash")

    @pytest.mark.asyncio
    @patch("openai.AsyncOpenAI")
    async def test_transcribe_openai_internal(self, mock_openai_class, service):
        """Test internal OpenAI transcription logic."""
        mock_client = mock_openai_class.return_value.__aenter__.return_value
        
        mock_response = MagicMock()
        mock_response.text = "OpenAI raw text"
        mock_response.segments = [
            MagicMock(text="Hello", start=0.0, end=1.0),
            MagicMock(text="World", start=1.0, end=2.0)
        ]
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)
        
        result = await service._transcribe_openai(b"content", "test.wav", "fake-key")
        
        assert result.raw_text == "OpenAI raw text"
        assert len(result.segments) == 2
        assert result.segments[0].text == "Hello"
        assert result.method == "OpenAIWhisper"
