import pytest
from app.core.security import (
    hash_phone_number, encrypt_phone_number, decrypt_phone_number,
    create_access_token, decode_access_token
)
from app.schemas.all_schemas import UserPublic
from uuid import uuid4
from datetime import datetime, timezone

def test_phone_hashing_is_deterministic():
    phone1 = "+1234567890"
    phone2 = "+1 234-567-890"
    assert hash_phone_number(phone1) == hash_phone_number(phone2)

def test_phone_encryption_and_decryption():
    phone = "+19876543210"
    encrypted = encrypt_phone_number(phone)
    assert encrypted != phone
    decrypted = decrypt_phone_number(encrypted)
    assert decrypted == phone

def test_jwt_token_does_not_contain_phone_number():
    user_id = str(uuid4())
    token = create_access_token(subject=user_id, role="REGULAR_USER")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "REGULAR_USER"
    assert "phone" not in payload
    assert "phone_number" not in payload

def test_user_public_schema_excludes_phone_number():
    user_data = {
        "id": uuid4(),
        "display_name": "FriendlyAlex",
        "avatar_url": "https://example.com/avatar.jpg",
        "bio": "Excited to meet new friends!",
        "role": "REGULAR_USER",
        "status": "ACTIVE",
        "created_at": datetime.now(timezone.utc)
    }
    public_user = UserPublic(**user_data)
    dumped = public_user.model_dump()
    assert "phone" not in dumped
    assert "phone_number" not in dumped
    assert "phone_encrypted" not in dumped
    assert dumped["display_name"] == "FriendlyAlex"
