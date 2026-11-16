from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import get_db
from app.models.entities import User, UserReport, CallLog
from app.schemas.all_schemas import MatchmakingJoinRequest, UserPublic
from app.api.deps import get_current_user
from app.services.matchmaking import matchmaking_engine
from app.core.config import settings

router = APIRouter(prefix="/matchmaking", tags=["Random Matchmaking"])

@router.post("/join")
async def join_matchmaking_queue(
    payload: MatchmakingJoinRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Enqueues user for random 1-on-1 voice or video calling.
    Enforces restrictions (e.g. checks if user is restricted from random video).
    If a peer is waiting, immediately forms a WebRTC room and returns tokens.
    """
    call_type = payload.call_type.upper()
    if call_type not in ["RANDOM_VOICE", "RANDOM_VIDEO"]:
        raise HTTPException(status_code=400, detail="call_type must be RANDOM_VOICE or RANDOM_VIDEO")

    if call_type == "RANDOM_VIDEO" and "DISABLE_RANDOM_VIDEO" in (current_user.restrictions or []):
        raise HTTPException(
            status_code=403, 
            detail="Random video has been disabled on your account by moderators. You may still use voice calls."
        )

    match = await matchmaking_engine.enqueue_user(
        user_id=str(current_user.id),
        display_name=current_user.display_name,
        call_type=call_type,
        avatar_url=current_user.avatar_url or ""
    )

    if match:
        return {
            "matched": True,
            "room_id": match["room_id"],
            "peer_user": {
                "id": match["peer_user_id"],
                "display_name": match["peer_display_name"],
                "avatar_url": match["peer_avatar_url"]
            },
            "call_type": match["call_type"],
            "livekit_token": match["livekit_token"],
            "livekit_url": match["livekit_url"]
        }

    return {
        "matched": False,
        "status": "QUEUED",
        "message": "Looking for a random person to connect with..."
    }

@router.get("/poll")
async def poll_matchmaking_status(current_user: User = Depends(get_current_user)):
    """Polls queue status while waiting for a peer."""
    match = await matchmaking_engine.check_match_result(str(current_user.id))
    if match:
        return {
            "matched": True,
            "room_id": match["room_id"],
            "peer_user": {
                "id": match["peer_user_id"],
                "display_name": match["peer_display_name"],
                "avatar_url": match["peer_avatar_url"]
            },
            "call_type": match["call_type"],
            "livekit_token": match["livekit_token"],
            "livekit_url": match["livekit_url"]
        }

    return {"matched": False, "status": "QUEUED"}

@router.post("/leave")
async def leave_matchmaking_queue(
    payload: MatchmakingJoinRequest,
    current_user: User = Depends(get_current_user)
):
    """Cancels search and dequeues user."""
    await matchmaking_engine.dequeue_user(str(current_user.id), payload.call_type.upper())
    return {"success": True, "message": "Left matchmaking queue"}

@router.post("/report")
async def report_peer(
    reported_user_id: str,
    reason: str,
    details: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits an in-call report against a peer for review by Super Admin."""
    report = UserReport(
        reporter_id=current_user.id,
        reported_user_id=reported_user_id,
        reason=reason,
        details=details,
        status="PENDING"
    )
    db.add(report)
    await db.commit()
    return {"success": True, "message": "Report submitted. Thank you for keeping Friend App safe."}
