import base64
import pytest
from unittest.mock import patch, MagicMock
from app.utils.security import SecurityManager, encrypt, decrypt

class TestSecurityManager:
    
    def test_encrypt_decrypt_roundtrip(self):
        """Test that encrypting and then decrypting returns the original text."""
        original_text = "Secret Message 123"
        encrypted = encrypt(original_text)
        assert encrypted != original_text
        
        decrypted = decrypt(encrypted)
        assert decrypted == original_text

    def test_encrypt_none(self):
        """Test that encrypting None returns None."""
        assert encrypt(None) is None
        assert encrypt("") is None

    def test_decrypt_none(self):
        """Test that decrypting None returns None."""
        assert decrypt(None) is None
        assert decrypt("") is None

    def test_decrypt_plain_text(self):
        """Test that decrypting plain text returns the original text (graceful fallback)."""
        plain_text = "Not Encrypted"
        assert decrypt(plain_text) == plain_text

    @patch("app.utils.security.get_settings")
    def test_custom_master_key(self, mock_get_settings):
        """Test that a custom MASTER_KEY works correctly."""
        # Reset the singleton state for this test
        SecurityManager._fernet = None
        
        # Generate a valid Fernet key
        from cryptography.fernet import Fernet
        custom_key = Fernet.generate_key().decode()
        
        mock_settings = MagicMock()
        mock_settings.master_key = custom_key
        mock_get_settings.return_value = mock_settings
        
        test_text = "Custom Key Test"
        encrypted = SecurityManager.encrypt(test_text)
        decrypted = SecurityManager.decrypt(encrypted)
        
        assert decrypted == test_text
        
        # Reset again for other tests
        SecurityManager._fernet = None

    @patch("app.utils.security.get_settings")
    def test_fallback_key_when_missing(self, mock_get_settings, capsys):
        """Test that missing MASTER_KEY triggers a warning and use fallback."""
        SecurityManager._fernet = None
        
        mock_settings = MagicMock()
        mock_settings.master_key = None
        mock_get_settings.return_value = mock_settings
        
        test_text = "Fallback Test"
        encrypted = SecurityManager.encrypt(test_text)
        
        captured = capsys.readouterr()
        assert "WARNING: MASTER_KEY not found" in captured.out
        
        decrypted = SecurityManager.decrypt(encrypted)
        assert decrypted == test_text
        
        SecurityManager._fernet = None
