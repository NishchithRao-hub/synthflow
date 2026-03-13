# backend/app/core/encryption.py

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_fernet() -> Fernet:
    """
    Create a Fernet instance from the JWT_SECRET_KEY.

    Fernet requires a 32-byte base64-encoded key. We derive one
    from the JWT secret using SHA-256.
    """
    key_bytes = hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns a base64-encoded encrypted string."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    """Decrypt an encrypted string. Returns the original plaintext."""
    try:
        f = _get_fernet()
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt value — key may have changed")
