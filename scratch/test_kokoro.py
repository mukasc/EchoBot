
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.models.settings import AppSettings
from app.services.kokoro import KokoroService
from unittest.mock import AsyncMock, patch

async def test_kokoro_service():
    print("Testing KokoroService...")
    
    settings = AppSettings(
        kokoro_base_url="http://mock-host/api/v1",
        kokoro_api_key="test-key",
        kokoro_model="test-model",
        kokoro_voice="test-voice"
    )
    
    service = KokoroService(settings)
    
    # Mock httpx response
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.content = b"fake-audio-content"
    
    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
        try:
            filename = await service.generate_narration(
                text="Hello world",
                api_key="override-key",
                base_url="http://override-host/api/v1",
                model="override-model",
                voice="override-voice"
            )
            print(f"Success! Generated filename: {filename}")
            
            # Verify call arguments
            args, kwargs = mock_post.call_args
            url = args[0]
            data = kwargs["json"]
            headers = kwargs["headers"]
            
            assert url == "http://override-host/api/v1/audio/speech"
            assert data["input"] == "Hello world"
            assert data["model"] == "override-model"
            assert data["voice"] == "override-voice"
            assert headers["Authorization"] == "Bearer override-key"
            print("Request parameters verified successfully.")
            
        except Exception as e:
            print(f"Test failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_kokoro_service())
