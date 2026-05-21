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
            result = await service.transcribe(
                b"content" * 20, 
                "test.wav", 
                file_path=file_path,
                glossary="Test Glossary"
            )
        
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
        
        result = await service._transcribe_gemini(b"content", "test.wav", "fake-key", "pt-BR")
        
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
        
        result = await service._transcribe_openai(b"content", "test.wav", "fake-key", "pt-BR", glossary="My Glossary")
        
        # Verify glossary was passed as prompt to OpenAI
        call_kwargs = mock_client.audio.transcriptions.create.call_args.kwargs
        assert call_kwargs["prompt"] == "My Glossary"
        
        assert result.raw_text == "OpenAI raw text"
        assert len(result.segments) == 2
        assert result.segments[0].text == "Hello"
        assert result.method == "OpenAIWhisper"

    @pytest.mark.asyncio
    @patch("faster_whisper.WhisperModel")
    async def test_get_local_model_reload_on_settings_change(self, mock_whisper_model):
        """Test that the local model is reloaded when whisper settings change."""
        from app.models.settings import AppSettings
        
        # Reset cls states
        TranscriptionService._model_instance = None
        TranscriptionService._current_whisper_model = None
        TranscriptionService._current_whisper_device = None
        TranscriptionService._current_whisper_compute_type = None
        TranscriptionService._current_whisper_cpu_threads = None
        
        settings_1 = AppSettings(
            whisper_model="tiny",  # Will be forced to "medium"
            whisper_device="cpu",
            whisper_compute_type="int8",
            whisper_cpu_threads=2
        )
        
        # First load
        model_1 = TranscriptionService._get_local_model(settings_1)
        assert model_1 is not None
        mock_whisper_model.assert_called_with("medium", device="cpu", compute_type="int8", cpu_threads=2)
        
        # Second load with same settings - should not call constructor again
        mock_whisper_model.reset_mock()
        model_2 = TranscriptionService._get_local_model(settings_1)
        assert model_2 is model_1
        mock_whisper_model.assert_not_called()
        
        # Load with different settings (changing CPU threads to trigger reload) - should reload model
        settings_2 = AppSettings(
            whisper_model="tiny",
            whisper_device="cpu",
            whisper_compute_type="int8",
            whisper_cpu_threads=4
        )
        model_3 = TranscriptionService._get_local_model(settings_2)
        assert model_3 is not None
        mock_whisper_model.assert_called_once_with("medium", device="cpu", compute_type="int8", cpu_threads=4)

    @pytest.mark.asyncio
    @patch("app.services.transcription.TranscriptionService._get_local_model")
    @patch("fastapi.concurrency.run_in_threadpool")
    async def test_transcribe_local_cuda_error_fallback_to_cpu(self, mock_run, mock_get_model, service):
        """Test that if Whisper raises a CUDA error mid-transcription, it falls back to CPU."""
        from app.models.settings import AppSettings
        
        TranscriptionService._cuda_available = True
        mock_model_cuda = MagicMock()
        mock_model_cpu = MagicMock()
        
        mock_model_cuda.transcribe.side_effect = Exception("Cuda/Cublas runtime error: cublas64_12.dll not found")
        
        mock_info = MagicMock(language="pt", language_probability=0.99)
        mock_segment = MagicMock(text="Texto recuperado no CPU", start=0.0, end=1.0)
        mock_model_cpu.transcribe.return_value = ([mock_segment], mock_info)
        
        mock_get_model.side_effect = [mock_model_cuda, mock_model_cpu]
        
        async def mock_run_impl(func, *args, **kwargs):
            return func(*args, **kwargs)
        mock_run.side_effect = mock_run_impl
        
        app_settings = AppSettings(whisper_device="cuda", whisper_compute_type="float16")
        
        result = await service._transcribe_local(
            file_path=Path("dummy.wav"),
            target_language="pt-BR",
            app_settings=app_settings
        )
        
        assert result.raw_text == "Texto recuperado no CPU"
        assert result.method == "LocalWhisper"
        assert TranscriptionService._cuda_available is False
        assert mock_get_model.call_count == 2

    @patch("ctranslate2.get_supported_compute_types")
    def test_probe_cuda_exception_handling(self, mock_get_types, service):
        """Test that _probe_cuda handles exceptions gracefully and sets available to False."""
        TranscriptionService._cuda_probed = False
        TranscriptionService._cuda_available = True
        
        mock_get_types.side_effect = RuntimeError("Failed to initialize CUDA context")
        
        available = TranscriptionService._probe_cuda()
        
        assert available is False
        assert TranscriptionService._cuda_available is False
        assert TranscriptionService._cuda_probed is True