from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings

def create_livekit_token(
    room_name: str,
    participant_identity: str,
    participant_name: str,
    can_publish: bool = True,
    can_subscribe: bool = True,
    duration_minutes: int = 120
) -> str:
    """
    Generates a LiveKit-compatible WebRTC Access Token signed with LIVEKIT_API_SECRET.
    Grants video and audio publish/subscribe access to room_name.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=duration_minutes)

    claims = {
        "exp": expire,
        "nbf": now,
        "sub": participant_identity,
        "name": participant_name,
        "iss": settings.LIVEKIT_API_KEY,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": can_subscribe,
            "canPublishData": True
        }
    }

    token = jwt.encode(claims, settings.LIVEKIT_API_SECRET, algorithm="HS256")
    return token
