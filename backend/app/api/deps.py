from typing import Optional, List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import get_db
from app.core.security import decode_access_token
from app.models.entities import User, DeviceBlacklist

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    if user.status == "BANNED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been permanently suspended for violating platform policies."
        )

    # Check device blacklist
    if user.device_fingerprint:
        bl_result = await db.execute(
            select(DeviceBlacklist).where(DeviceBlacklist.device_fingerprint == user.device_fingerprint)
        )
        if bl_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This device has been permanently blocked from Friend App."
            )

    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: required role in {allowed_roles}"
            )
        return current_user
    return role_checker

def require_no_restriction(restriction_name: str):
    def restriction_checker(current_user: User = Depends(get_current_user)) -> User:
        user_restrictions = current_user.restrictions or []
        if restriction_name in user_restrictions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action restricted: Your account has restriction '{restriction_name}' applied by moderators."
            )
        return current_user
    return restriction_checker
