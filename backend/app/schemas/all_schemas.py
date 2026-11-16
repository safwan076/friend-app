from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# --- AUTH & USER SCHEMAS (STRICT PRIVACY: NO PHONE EXPOSURE) ---

class PhoneLoginRequest(BaseModel):
    phone_number: str = Field(..., example="+1234567890", description="E.164 phone number")
    device_fingerprint: Optional[str] = Field(None, example="device-uuid-hash-1234")

class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(..., example="+1234567890")
    otp_code: str = Field(..., example="123456")
    device_fingerprint: Optional[str] = None
    display_name: Optional[str] = Field(None, example="Alex")

class UserPublic(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = ""
    bio: Optional[str] = ""
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserSelf(UserPublic):
    restrictions: List[str] = []

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSelf

class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

# --- CELEBRITY SCHEMAS ---

class CelebrityPublic(BaseModel):
    id: UUID
    user: UserPublic
    monthly_subscription_price: float
    availability_status: str # ONLINE, BUSY, OFFLINE
    is_verified: bool
    bio_verified: Optional[str] = ""
    subscriber_count: int

    class Config:
        from_attributes = True

class CelebrityPostCreate(BaseModel):
    image_url: str
    caption: Optional[str] = ""
    is_subscribers_only: bool = True

class CelebrityPostResponse(BaseModel):
    id: UUID
    celebrity_id: UUID
    image_url: str
    caption: Optional[str] = ""
    is_subscribers_only: bool
    likes_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CelebrityAvailabilityUpdate(BaseModel):
    availability_status: str = Field(..., example="ONLINE") # ONLINE, BUSY, OFFLINE

class SubscriptionCreate(BaseModel):
    celebrity_id: UUID
    payment_provider: str = Field("STRIPE", example="STRIPE") # STRIPE, APPLE_IAP, GOOGLE_PLAY
    payment_token: str

# --- EVENT SCHEMAS (LOCATION-BASED) ---

class EventCreate(BaseModel):
    title: str = Field(..., max_length=150)
    description: str
    banner_url: Optional[str] = ""
    category: str = "Social"
    address_name: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    event_start: datetime
    event_end: Optional[datetime] = None
    max_capacity: Optional[int] = 100

class EventResponse(BaseModel):
    id: UUID
    host: UserPublic
    title: str
    description: str
    banner_url: Optional[str] = ""
    category: str
    address_name: str
    latitude: float
    longitude: float
    distance_meters: Optional[float] = None
    event_start: datetime
    event_end: Optional[datetime] = None
    max_capacity: int
    current_rsvps: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- MATCHMAKING & CALLING SCHEMAS ---

class MatchmakingJoinRequest(BaseModel):
    call_type: str = Field(..., example="RANDOM_VIDEO") # RANDOM_VOICE, RANDOM_VIDEO

class MatchmakingMatchedResponse(BaseModel):
    room_id: str
    peer_user: UserPublic
    call_type: str
    livekit_token: str
    livekit_url: str

class CelebrityCallRequest(BaseModel):
    celebrity_id: UUID
    call_type: str = Field(..., example="CELEB_VIDEO") # CELEB_VOICE, CELEB_VIDEO

# --- CUSTOMER SUPPORT SCHEMAS ---

class SupportTicketCreate(BaseModel):
    subject: str
    channel: str = Field("CHAT", example="CHAT") # CHAT, VOICE
    initial_message: Optional[str] = None

class SupportMessageCreate(BaseModel):
    message: str

class SupportTicketResponse(BaseModel):
    id: UUID
    user_id: UUID
    channel: str
    subject: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- SUPER ADMIN & MODERATION SCHEMAS ---

class AdminUserActionRequest(BaseModel):
    user_id: UUID
    action: str = Field(..., example="BAN") # BAN, UNBAN, RESTRICT
    reason: str
    restrictions: Optional[List[str]] = []
    ban_device: bool = False

class AdminReportResponse(BaseModel):
    id: UUID
    reporter: Optional[UserPublic] = None
    reported_user: UserPublic
    reason: str
    details: Optional[str] = ""
    evidence_url: Optional[str] = ""
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
