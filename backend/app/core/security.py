import hashlib
import os
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def hash_phone_number(phone_e164: str) -> str:
    """
    Produces a deterministic SHA-256 hash of the sanitized phone number.
    Used for unique lookup without storing plaintext phone in index.
    """
    clean_phone = phone_e164.strip().replace(" ", "").replace("-", "")
    return hashlib.sha256(clean_phone.encode("utf-8")).hexdigest()

def encrypt_phone_number(phone_e164: str) -> str:
    """
    Encrypts phone number using AES-256-GCM.
    Returns base64 encoded nonce + ciphertext + tag.
    """
    key = settings.ENCRYPTION_KEY.encode("utf-8")[:32]
    # Pad key to 32 bytes if shorter
    key = key.ljust(32, b'0')
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, phone_e164.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")

def decrypt_phone_number(encrypted_data: str) -> str:
    """
    Decrypts AES-256-GCM encrypted phone number.
    Only internal system tasks (SMS OTP, legal compliance) ever decrypt this.
    """
    key = settings.ENCRYPTION_KEY.encode("utf-8")[:32].ljust(32, b'0')
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted_data.encode("utf-8"))
    nonce = raw[:12]
    ciphertext = raw[12:]
    decrypted = aesgcm.decrypt(nonce, ciphertext, None)
    return decrypted.decode("utf-8")

def create_access_token(subject: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates signed JWT token containing user UUID and role.
    Strictly NO phone number is placed inside the JWT token claims.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
