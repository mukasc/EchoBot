import base64
import os
from typing import Optional
from cryptography.fernet import Fernet
from app.config import get_settings

class SecurityManager:
    """Handles encryption and decryption of sensitive data using Fernet (AES)."""
    
    _fernet: Optional[Fernet] = None

    @classmethod
    def _get_fernet(cls) -> Fernet:
        if cls._fernet is None:
            settings = get_settings()
            key = settings.master_key
            
            if not key:
                # Fallback to a development key if MASTER_KEY is missing
                # In production, this should probably raise an error
                print("WARNING: MASTER_KEY not found in environment. Using insecure fallback.")
                key = base64.urlsafe_b64encode(b"insecure-fallback-key-32-bytes-!")
            
            try:
                cls._fernet = Fernet(key)
            except Exception as e:
                print(f"ERROR: Invalid MASTER_KEY format. {e}")
                # If key is invalid, we might need to handle it or re-raise
                raise
        return cls._fernet

    @classmethod
    def encrypt(cls, text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        f = cls._get_fernet()
        return f.encrypt(text.encode()).decode()

    @classmethod
    def decrypt(cls, token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        f = cls._get_fernet()
        try:
            return f.decrypt(token.encode()).decode()
        except Exception:
            # If decryption fails (e.g. text is not encrypted or key changed)
            # return the original text as a fallback to avoid breaking existing data
            return token

# Singleton-like usage
encrypt = SecurityManager.encrypt
decrypt = SecurityManager.decrypt
