from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import get_db
from app.models.entities import User
from app.schemas.all_schemas import UserPublic, UserSelf, UserUpdateRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserSelf)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns authenticated user's own profile and restrictions (no phone returned)."""
    return UserSelf(
        id=current_user.id,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        role=current_user.role,
        status=current_user.status,
        restrictions=current_user.restrictions or [],
        created_at=current_user.created_at
    )

@router.patch("/me", response_model=UserSelf)
async def update_my_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates user display name, avatar, or bio."""
    if payload.display_name is not None:
        clean_name = payload.display_name.strip()
        if len(clean_name) < 2:
            raise HTTPException(status_code=400, detail="Display name must be at least 2 characters")
        current_user.display_name = clean_name
    
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    
    if payload.bio is not None:
        current_user.bio = payload.bio

    await db.commit()
    await db.refresh(current_user)

    return UserSelf(
        id=current_user.id,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        role=current_user.role,
        status=current_user.status,
        restrictions=current_user.restrictions or [],
        created_at=current_user.created_at
    )

@router.get("/{user_id}", response_model=UserPublic)
async def get_public_user_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns public user card.
    Strictly verifies that phone number is NEVER returned to other users.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublic(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role,
        status=user.status,
        created_at=user.created_at
    )
