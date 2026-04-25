import asyncio
import threading
import time
import sys
from unittest.mock import MagicMock, patch, AsyncMock
from pathlib import Path

# Fix the sys.path to ensure 'app' is findable
sys.path.append(".")

# Now we can import the service normally since we are in the venv
from app.services.transcription import TranscriptionService, TranscriptionResult

# Mock Settings
class MockSettings:
    google_api_key = "mock_key"
    openai_api_key = "mock_key"

async def test_concurrency():
    settings = MockSettings()
    service = TranscriptionService(settings)
    
    # Trackers
    load_count = 0
    local_concurrent_count = 0
    max_local_concurrency = 0
    
    # Mocking behaviors
    def mock_whisper_init(*args, **kwargs):
        nonlocal load_count
        time.sleep(0.5) 
        load_count += 1
        m = MagicMock()
        # Ensure transcribe returns the expected tuple of 2 items
        m.transcribe.return_value = ([], MagicMock(language="pt", language_probability=1.0))
        return m

    def mock_transcribe_call(*args, **kwargs):
        nonlocal local_concurrent_count, max_local_concurrency
        local_concurrent_count += 1
        max_local_concurrency = max(max_local_concurrency, local_concurrent_count)
        time.sleep(0.2)
        local_concurrent_count -= 1
        return [], MagicMock(language="pt", language_probability=1.0)

    async def mock_run_in_threadpool(func, *args, **kwargs):
        # Run it in a real thread to test our semaphore
        return await asyncio.to_thread(func, *args, **kwargs)

    print("\n--- Starting Concurrency Tests ---")
    
    with patch("faster_whisper.WhisperModel", side_effect=mock_whisper_init), \
         patch("fastapi.concurrency.run_in_threadpool", side_effect=mock_run_in_threadpool), \
         patch.object(TranscriptionService, "_detect_mime", return_value="audio/wav"), \
         patch("pathlib.Path.exists", return_value=True):
        
        # TEST 1: Singleton Loading Lock
        print("Testing Singleton Loading Lock...")
        TranscriptionService._model_instance = None
        load_count = 0
        tasks = [service._transcribe_local(Path("test.wav")) for _ in range(3)]
        await asyncio.gather(*tasks)
        print(f"Model load count: {load_count} (Expected: 1)")
        assert load_count == 1

        # TEST 2: Local Semaphore (Sequential)
        print("Testing Local Semaphore (Sequential execution)...")
        with patch.object(TranscriptionService, "_get_local_model") as mock_get_model:
            m = MagicMock()
            m.transcribe.side_effect = mock_transcribe_call
            mock_get_model.return_value = m
            
            tasks = [service._transcribe_local(Path("test.wav")) for _ in range(3)]
            start_time = time.perf_counter()
            await asyncio.gather(*tasks)
            duration = time.perf_counter() - start_time
            print(f"Max Local Concurrency: {max_local_concurrency} (Expected: 1)")
            print(f"Total duration: {duration:.2f}s (Expected: >= 0.6s)")
            assert max_local_concurrency == 1
            assert duration >= 0.6

        # TEST 3: Cloud Async (Parallel)
        print("\nTesting Cloud Async (Gemini parallel calls)...")
        async def mock_gemini_call(*args, **kwargs):
            await asyncio.sleep(0.4)
            resp = MagicMock()
            resp.text = "OK"
            return resp

        with patch("google.generativeai.GenerativeModel.google_generativeai.GenerativeModel.generate_content_async", side_effect=mock_gemini_call):
            # Correction: the patch path for Gemini async was slightly off in the previous run, fixed here
            with patch("google.generativeai.GenerativeModel.generate_content_async", side_effect=mock_gemini_call):
                tasks = [service._transcribe_gemini(b"d", "t.wav", "k") for _ in range(3)]
                start_time = time.perf_counter()
                await asyncio.gather(*tasks)
                duration = time.perf_counter() - start_time
                print(f"Cloud duration: {duration:.2f}s (Expected: ~0.4s)")
                assert duration < 0.6

    print("\n--- ALL TESTS PASSED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(test_concurrency())
