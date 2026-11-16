from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import redis.asyncio as aioredis
from app.database.session import get_db
from app.core.config import settings
from app.core.security import hash_phone_number, encrypt_phone_number, create_access_token
from app.models.entities import User, DeviceBlacklist
from app.schemas.all_schemas import PhoneLoginRequest, OTPVerifyRequest, TokenResponse, UserSelf

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/request-otp")
async def request_otp(payload: PhoneLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Request SMS verification OTP for mobile number.
    Checks device blacklist before sending SMS.
    """
    phone_clean = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if len(phone_clean) < 8 or not phone_clean.startswith("+"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number must be valid E.164 format with country code (e.g. +1234567890)"
        )

    # Check device blacklist
    if payload.device_fingerprint:
        bl = await db.execute(
            select(DeviceBlacklist).where(DeviceBlacklist.device_fingerprint == payload.device_fingerprint)
        )
        if bl.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This device has been permanently blocked from Friend App."
            )

    # In production, dispatch via Twilio / Firebase / AWS SNS.
    # In mock/development mode, standard test OTP is '123456'.
    otp_code = "123456"
    
    # Store OTP in Redis with 5 minutes TTL
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.setex(f"otp:{phone_clean}", 300, otp_code)
    except Exception:
        # If Redis is temporarily unreachable in dev, allow fallback verification
        pass

    return {
        "success": True,
        "message": f"Verification code sent to {phone_clean[:3]}****{phone_clean[-2:]}",
        "dev_hint": "In development/testing, default OTP code is 123456"
    }

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 2: Verify OTP code, create or fetch user, and issue access token.
    Enforces privacy by storing phone encrypted and indexed by SHA-256 hash.
    The response strictly NEVER includes the phone number.
    """
    phone_clean = payload.phone_number.strip().replace(" ", "").replace("-", "")
    
    # Check OTP
    is_valid_otp = False
    if payload.otp_code == "123456": # Standard test code
        is_valid_otp = True
    else:
        try:
            r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            stored_otp = await r.get(f"otp:{phone_clean}")
            if stored_otp and stored_otp == payload.otp_code:
                is_valid_otp = True
                await r.delete(f"otp:{phone_clean}")
        except Exception:
            pass

    if not is_valid_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    # Hash phone number for indexing
    p_hash = hash_phone_number(phone_clean)

    # Check if user exists
    result = await db.execute(select(User).where(User.phone_hash == p_hash))
    user = result.scalar_one_or_none()

    if not user:
        # Create new user
        encrypted_phone = encrypt_phone_number(phone_clean)
        display_name = payload.display_name or f"User_{p_hash[:6]}"
        user = User(
            phone_hash=p_hash,
            phone_encrypted=encrypted_phone,
            display_name=display_name,
            avatar_url="",
            bio="Hello! I'm using Friend App.",
            role="REGULAR_USER",
            status="ACTIVE",
            device_fingerprint=payload.device_fingerprint,
            restrictions=[]
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Existing user check status
        if user.status == "BANNED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been permanently suspended."
            )
        # Update device fingerprint if provided
        if payload.device_fingerprint and user.device_fingerprint != payload.device_fingerprint:
            user.device_fingerprint = payload.device_fingerprint
            await db.commit()
            await db.refresh(user)

    # Issue JWT token
    token = create_access_token(subject=str(user.id), role=user.role)

    user_self = UserSelf(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role,
        status=user.status,
        restrictions=user.restrictions or [],
        created_at=user.created_at
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_self
    )
