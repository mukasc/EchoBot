import pytest
import respx
import re
from httpx import Response
from unittest.mock import MagicMock, patch
from app.services.kokoro import KokoroService
from app.services.deepgram import DeepgramService
from app.services.elevenlabs import ElevenLabsService
from app.models.settings import AppSettings

class TestTTSProviders:
    @pytest.fixture
    def settings(self):
        return AppSettings(
            kokoro_base_url="http://kokoro:8888",
            kokoro_api_key="k-key",
            deepgram_api_key="d-key",
            elevenlabs_api_key="e-key"
        )

    @pytest.mark.asyncio
    @respx.mock
    async def test_kokoro_generate_narration(self, settings):
        """Test Kokoro narration generation with mocked HTTP response."""
        service = KokoroService(settings)
        route = respx.post("http://kokoro:8888/audio/speech").mock(return_value=Response(200, content=b"audio-data"))
        
        # Mock file operations
        with patch("builtins.open", MagicMock()):
            with patch("pathlib.Path.mkdir", MagicMock()):
                filename = await service.generate_narration("Hello world")
        
        assert filename.startswith("narration_ko_")
        assert route.called
        assert route.calls.last.request.headers["Authorization"] == "Bearer k-key"

    @pytest.mark.asyncio
    @respx.mock
    async def test_kokoro_get_voices_fallback(self, settings):
        """Test Kokoro voice list fallback when endpoints fail."""
        service = KokoroService(settings)
        # Mock all possible endpoints to 404
        respx.get("http://kokoro:8888/voices").mock(return_value=Response(404))
        respx.get("http://kokoro:8888/v1/voices").mock(return_value=Response(404))
        respx.get("http://kokoro:8888/audio/voices").mock(return_value=Response(404))
        
        voices = await service.get_voices()
        assert len(voices) > 0
        assert voices[0]["voice_id"] == "af_heart"

    @pytest.mark.asyncio
    @respx.mock
    async def test_deepgram_generate_narration(self, settings):
        """Test Deepgram narration generation."""
        service = DeepgramService(settings)
        route = respx.post(url__regex=r"https://api.deepgram.com/v1/speak.*").mock(return_value=Response(200, content=b"audio-data"))
        
        with patch("builtins.open", MagicMock()):
            with patch("pathlib.Path.mkdir", MagicMock()):
                filename = await service.generate_narration("Hello deepgram")
        
        assert filename.startswith("narration_dg_")
        assert route.called
        assert route.calls.last.request.headers["Authorization"] == "Token d-key"

    @pytest.mark.asyncio
    @respx.mock
    async def test_elevenlabs_generate_narration(self, settings):
        """Test ElevenLabs narration generation."""
        service = ElevenLabsService(settings)
        # Match URL using regex for the voice ID part
        route = respx.post(url__regex=r"https://api.elevenlabs.io/v1/text-to-speech/.*").mock(return_value=Response(200, content=b"audio-data"))
        
        with patch("builtins.open", MagicMock()):
            with patch("pathlib.Path.mkdir", MagicMock()):
                filename = await service.generate_narration("Hello eleven", api_key="e-key")
        
        assert filename.startswith("narration_")
        assert route.called
        assert route.calls.last.request.headers["xi-api-key"] == "e-key"

    @pytest.mark.asyncio
    @respx.mock
    async def test_tts_api_error_handling(self, settings):
        """Test that TTS services raise appropriate exceptions on API failure."""
        # Kokoro error
        service_ko = KokoroService(settings)
        respx.post("http://kokoro:8888/audio/speech").mock(return_value=Response(500, text="Internal Server Error"))
        with pytest.raises(Exception, match=r"Erro Kokoro \(500\)"):
            await service_ko.generate_narration("Fail")

        # Deepgram error
        service_dg = DeepgramService(settings)
        respx.post(url__regex=r"https://api.deepgram.com/v1/speak.*").mock(return_value=Response(401, json={"err_code": "AUTH_FAILURE"}))
        with pytest.raises(Exception, match=r"Erro Deepgram \(401\)"):
            await service_dg.generate_narration("Fail")

    @pytest.mark.asyncio
    @respx.mock
    async def test_elevenlabs_get_voices(self, settings):
        """Test ElevenLabs fetching voices."""
        service = ElevenLabsService(settings)
        respx.get("https://api.elevenlabs.io/v1/voices").mock(return_value=Response(200, json={"voices": [{"voice_id": "v1", "name": "Voice 1"}]}))
        
        voices = await service.get_voices(api_key="e-key")
        assert len(voices) == 1
        assert voices[0]["voice_id"] == "v1"

    @pytest.mark.asyncio
    @respx.mock
    async def test_deepgram_get_subscription(self, settings):
        """Test Deepgram fetching subscription info."""
        service = DeepgramService(settings)
        # Mock projects call
        respx.get("https://api.deepgram.com/v1/projects").mock(return_value=Response(200, json={"projects": [{"project_id": "p1", "name": "Proj 1"}]}))
        # Mock balances call
        respx.get("https://api.deepgram.com/v1/projects/p1/balances").mock(return_value=Response(200, json={"balances": [{"amount": 10.0, "units": "USD"}]}))
        
        info = await service.get_subscription_info(api_key="d-key")
        assert info["balance"] == 10.0
        assert info["project_name"] == "Proj 1"
