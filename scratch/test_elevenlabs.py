import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(r"c:\Users\mukas\.gemini\antigravity\scratch\EchoBot\backend")))

from app.services.elevenlabs import ElevenLabsService
from app.config import Settings

async def test():
    settings = Settings()
    # Mock settings if needed
    svc = ElevenLabsService(settings)
    try:
        # We don't want to actually call the API if we don't have a key,
        # but we can check if it even starts.
        print("Starting test...")
        # If we had a key, we'd test it.
        # Let's just check if it can create the directory.
        upload_dir = Path(r"c:\Users\mukas\.gemini\antigravity\scratch\EchoBot\backend\uploads\narrations")
        upload_dir.mkdir(parents=True, exist_ok=True)
        print(f"Directory {upload_dir} created/exists.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
