import os
import requests
from kokoro_onnx import Kokoro
import soundfile as sf
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class KokoroLocalEngine:
    _instance = None
    _kokoro = None

    def __init__(self):
        self.model_dir = Path("models/kokoro")
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.model_path = self.model_dir / "kokoro-v1.0.onnx"
        self.voices_path = self.model_dir / "voices-v1.0.bin"
        
        # URLs for the models (v1.0 is the latest stable)
        self.model_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
        self.voices_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _download_file(self, url, path):
        if not path.exists():
            logger.info(f"Downloading {path.name} from {url}...")
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            logger.info(f"Downloaded {path.name} successfully.")

    def initialize(self):
        if self._kokoro is not None:
            return
            
        try:
            self._download_file(self.model_url, self.model_path)
            self._download_file(self.voices_url, self.voices_path)
            
            self._kokoro = Kokoro(str(self.model_path), str(self.voices_path))
            logger.info("Kokoro Local Engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Kokoro Local Engine: {e}")
            raise

    def generate(self, text: str, voice: str = "af_heart", speed: float = 1.0):
        self.initialize()
        
        # Map Kokoro single-letter codes to standard espeak-ng language codes
        lang_map = {
            "a": "en-us",
            "b": "en-gb",
            "e": "es",
            "f": "fr-fr",
            "h": "hi",
            "i": "it",
            "j": "ja",
            "p": "pt-br",
            "z": "zh-hans",
        }
        
        kokoro_lang = voice[0] if voice and len(voice) > 0 else "a"
        lang = lang_map.get(kokoro_lang, "en-us")
        
        logger.info(f"Generating audio with Kokoro: voice={voice}, lang={lang} (from {kokoro_lang}), speed={speed}")
        
        # Kokoro-onnx uses the 'lang' parameter to choose the correct phonemizer
        samples, sample_rate = self._kokoro.create(
            text, 
            voice=voice, 
            speed=speed, 
            lang=lang
        )
        return samples, sample_rate

    def get_voices(self):
        self.initialize()
        return self._kokoro.get_voices()

kokoro_local_engine = KokoroLocalEngine.get_instance()
