import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Friend App API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database (PostgreSQL + PostGIS)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://friend_user:friend_secure_password_2026@localhost:5432/friend_app_db"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security & Tokens
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secure_friend_app_jwt_secret_key_9876543210")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30 # 30 days
    
    # Phone Encryption (AES-256-GCM, 32 bytes key)
    # Never share this key; it keeps phone numbers cryptographically hidden
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "friend_app_32byte_aes_gcm_secret_key!")
    
    # LiveKit WebRTC SFU
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "http://localhost:7880")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "devkey")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "secret")
    
    # SMS / OTP Simulation / Provider
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "MOCK") # MOCK, TWILIO, AWS_SNS
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    class Config:
        case_sensitive = True

settings = Settings()
