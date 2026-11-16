import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.models.entities import User, CelebrityProfile, CelebrityPost, Subscription, CallLog
from app.schemas.all_schemas import (
    CelebrityPublic, CelebrityPostCreate, CelebrityPostResponse,
    CelebrityAvailabilityUpdate, SubscriptionCreate, UserPublic
)
from app.api.deps import get_current_user, require_role
from app.services.livekit_token import create_livekit_token
from app.core.config import settings

router = APIRouter(prefix="/celebrities", tags=["Celebrities & Subscriptions"])

@router.get("", response_model=List[CelebrityPublic])
async def list_celebrities(db: AsyncSession = Depends(get_db)):
    """Browse verified celebrities available for subscription & calls."""
    query = (
        select(CelebrityProfile)
        .options(selectinload(CelebrityProfile.user))
        .where(CelebrityProfile.is_verified == True)
        .order_by(CelebrityProfile.subscriber_count.desc())
    )
    result = await db.execute(query)
    profiles = result.scalars().all()

    return [
        CelebrityPublic(
            id=p.id,
            user=UserPublic(
                id=p.user.id,
                display_name=p.user.display_name,
                avatar_url=p.user.avatar_url,
                bio=p.user.bio,
                role=p.user.role,
                status=p.user.status,
                created_at=p.user.created_at
            ),
            monthly_subscription_price=float(p.monthly_subscription_price),
            availability_status=p.availability_status,
            is_verified=p.is_verified,
            bio_verified=p.bio_verified,
            subscriber_count=p.subscriber_count
        )
        for p in profiles
    ]

@router.get("/{celebrity_id}", response_model=CelebrityPublic)
async def get_celebrity_profile(celebrity_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get single celebrity profile and live calling availability."""
    query = (
        select(CelebrityProfile)
        .options(selectinload(CelebrityProfile.user))
        .where(CelebrityProfile.id == celebrity_id)
    )
    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Celebrity not found")

    return CelebrityPublic(
        id=p.id,
        user=UserPublic(
            id=p.user.id,
            display_name=p.user.display_name,
            avatar_url=p.user.avatar_url,
            bio=p.user.bio,
            role=p.user.role,
            status=p.user.status,
            created_at=p.user.created_at
        ),
        monthly_subscription_price=float(p.monthly_subscription_price),
        availability_status=p.availability_status,
        is_verified=p.is_verified,
        bio_verified=p.bio_verified,
        subscriber_count=p.subscriber_count
    )

@router.put("/me/status")
async def update_celebrity_availability(
    payload: CelebrityAvailabilityUpdate,
    current_user: User = Depends(require_role(["CELEBRITY"])),
    db: AsyncSession = Depends(get_db)
):
    """Celebrity toggles their live status: ONLINE, BUSY, OFFLINE."""
    status_clean = payload.availability_status.upper()
    if status_clean not in ["ONLINE", "BUSY", "OFFLINE"]:
        raise HTTPException(status_code=400, detail="Status must be ONLINE, BUSY, or OFFLINE")

    query = select(CelebrityProfile).where(CelebrityProfile.user_id == current_user.id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CelebrityProfile(user_id=current_user.id, availability_status=status_clean)
        db.add(profile)
    else:
        profile.availability_status = status_clean

    await db.commit()
    return {"success": True, "availability_status": status_clean}

@router.post("/me/posts", response_model=CelebrityPostResponse)
async def create_celebrity_post(
    payload: CelebrityPostCreate,
    current_user: User = Depends(require_role(["CELEBRITY"])),
    db: AsyncSession = Depends(get_db)
):
    """Celebrity publishes a new photo or update to their feed."""
    result = await db.execute(select(CelebrityProfile).where(CelebrityProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity profile not found")

    post = CelebrityPost(
        celebrity_id=profile.id,
        image_url=payload.image_url,
        caption=payload.caption or "",
        is_subscribers_only=payload.is_subscribers_only,
        likes_count=0
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return CelebrityPostResponse(
        id=post.id,
        celebrity_id=post.celebrity_id,
        image_url=post.image_url,
        caption=post.caption,
        is_subscribers_only=post.is_subscribers_only,
        likes_count=post.likes_count,
        created_at=post.created_at
    )

@router.get("/{celebrity_id}/posts", response_model=List[CelebrityPostResponse])
async def get_celebrity_posts(
    celebrity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves celebrity photo feed.
    If the user has an active subscription (or is the celebrity themselves), subscriber-only photos are fully visible.
    Otherwise, subscriber-only posts are blurred or masked.
    """
    # Check subscription
    is_subscribed = False
    sub_query = select(Subscription).where(
        Subscription.subscriber_id == current_user.id,
        Subscription.celebrity_id == celebrity_id,
        Subscription.status == "ACTIVE",
        Subscription.expires_at > datetime.now(timezone.utc)
    )
    sub_res = await db.execute(sub_query)
    if sub_res.scalar_one_or_none():
        is_subscribed = True

    # Check if user is the celebrity
    celeb_prof = await db.execute(select(CelebrityProfile).where(CelebrityProfile.id == celebrity_id))
    prof = celeb_prof.scalar_one_or_none()
    if prof and prof.user_id == current_user.id:
        is_subscribed = True

    posts_res = await db.execute(
        select(CelebrityPost)
        .where(CelebrityPost.celebrity_id == celebrity_id)
        .order_by(CelebrityPost.created_at.desc())
    )
    posts = posts_res.scalars().all()

    output = []
    for post in posts:
        image_to_show = post.image_url
        if post.is_subscribers_only and not is_subscribed:
            # Mask or blur thumbnail for non-subscribers
            image_to_show = "https://images.unsplash.com/photo-1534447677768-be436bb09401?blur=100&w=600"

        output.append(CelebrityPostResponse(
            id=post.id,
            celebrity_id=post.celebrity_id,
            image_url=image_to_show,
            caption=post.caption if (not post.is_subscribers_only or is_subscribed) else "🔒 Exclusive to subscribers. Subscribe to view.",
            is_subscribers_only=post.is_subscribers_only,
            likes_count=post.likes_count,
            created_at=post.created_at
        ))

    return output

@router.post("/subscribe")
async def subscribe_to_celebrity(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Subscribes user to a celebrity, unlocking exclusive posts & call access."""
    # Verify celebrity exists
    celeb_res = await db.execute(select(CelebrityProfile).where(CelebrityProfile.id == payload.celebrity_id))
    profile = celeb_res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")

    if profile.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot subscribe to yourself")

    # In production: Verify Stripe webhook or Apple/Google IAP receipt
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    # Check existing subscription
    sub_res = await db.execute(
        select(Subscription).where(
            Subscription.subscriber_id == current_user.id,
            Subscription.celebrity_id == payload.celebrity_id
        )
    )
    existing_sub = sub_res.scalar_one_or_none()
    if existing_sub:
        existing_sub.status = "ACTIVE"
        existing_sub.expires_at = expires_at
        existing_sub.payment_provider = payload.payment_provider
        existing_sub.payment_reference = payload.payment_token
    else:
        new_sub = Subscription(
            subscriber_id=current_user.id,
            celebrity_id=payload.celebrity_id,
            status="ACTIVE",
            expires_at=expires_at,
            payment_provider=payload.payment_provider,
            payment_reference=payload.payment_token
        )
        db.add(new_sub)
        profile.subscriber_count += 1

    await db.commit()
    return {
        "success": True,
        "message": "Successfully subscribed! You now have access to exclusive posts and calls.",
        "expires_at": expires_at.isoformat()
    }

@router.post("/{celebrity_id}/call")
async def initiate_celebrity_call(
    celebrity_id: UUID,
    call_type: str = "CELEB_VIDEO", # CELEB_VOICE or CELEB_VIDEO
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Subscribers call a celebrity.
    Enforces:
    1. Active subscription
    2. Celebrity availability == ONLINE
    3. User does not have call restrictions
    """
    if "DISABLE_CALLS" in (current_user.restrictions or []):
        raise HTTPException(status_code=403, detail="Calling has been restricted on your account.")

    # 1. Fetch celebrity
    celeb_res = await db.execute(
        select(CelebrityProfile)
        .options(selectinload(CelebrityProfile.user))
        .where(CelebrityProfile.id == celebrity_id)
    )
    profile = celeb_res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")

    # 2. Check availability
    if profile.availability_status != "ONLINE":
        raise HTTPException(
            status_code=400,
            detail=f"Celebrity is currently {profile.availability_status}. Calls can only be placed when status is ONLINE."
        )

    # 3. Check active subscription
    sub_res = await db.execute(
        select(Subscription).where(
            Subscription.subscriber_id == current_user.id,
            Subscription.celebrity_id == celebrity_id,
            Subscription.status == "ACTIVE",
            Subscription.expires_at > datetime.now(timezone.utc)
        )
    )
    if not sub_res.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="Subscription required: You must be an active subscriber to call this celebrity."
        )

    # 4. Generate WebRTC Call Room
    room_id = f"celeb_{uuid.uuid4().hex[:12]}"
    caller_token = create_livekit_token(room_id, str(current_user.id), current_user.display_name)
    callee_token = create_livekit_token(room_id, str(profile.user.id), profile.user.display_name)

    # 5. Record call log
    call_log = CallLog(
        caller_id=current_user.id,
        callee_id=profile.user.id,
        call_type=call_type,
        status="INITIATED"
    )
    db.add(call_log)
    await db.commit()

    return {
        "success": True,
        "room_id": room_id,
        "livekit_url": settings.LIVEKIT_URL,
        "caller_token": caller_token,
        "celebrity_id": str(celebrity_id),
        "celebrity_name": profile.user.display_name
    }
