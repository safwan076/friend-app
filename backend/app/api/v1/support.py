from uuid import UUID
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.models.entities import User, SupportTicket, SupportMessage
from app.schemas.all_schemas import SupportTicketCreate, SupportMessageCreate, SupportTicketResponse
from app.api.deps import get_current_user
from app.services.livekit_token import create_livekit_token
from app.core.config import settings

router = APIRouter(prefix="/support", tags=["Customer Support"])

@router.post("/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Opens a customer support ticket (via Chat or VoIP Voice Call)."""
    channel_clean = payload.channel.upper()
    if channel_clean not in ["CHAT", "VOICE"]:
        raise HTTPException(status_code=400, detail="Channel must be CHAT or VOICE")

    ticket = SupportTicket(
        user_id=current_user.id,
        subject=payload.subject,
        channel=channel_clean,
        status="OPEN"
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # If initial message provided, save it
    if payload.initial_message:
        msg = SupportMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=payload.initial_message,
            is_agent=False
        )
        db.add(msg)
        await db.commit()

    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        channel=ticket.channel,
        subject=ticket.subject,
        status=ticket.status,
        created_at=ticket.created_at
    )

@router.get("/tickets/my", response_model=List[SupportTicketResponse])
async def list_my_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists current user's support requests."""
    res = await db.execute(
        select(SupportTicket).where(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc())
    )
    tickets = res.scalars().all()
    return [
        SupportTicketResponse(
            id=t.id,
            user_id=t.user_id,
            channel=t.channel,
            subject=t.subject,
            status=t.status,
            created_at=t.created_at
        )
        for t in tickets
    ]

@router.post("/tickets/{ticket_id}/messages")
async def send_support_message(
    ticket_id: UUID,
    payload: SupportMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sends a message in an existing support ticket thread."""
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    is_agent = (current_user.role in ["SUPER_ADMIN"])
    msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        message=payload.message,
        is_agent=is_agent
    )
    db.add(msg)
    await db.commit()
    return {"success": True, "message": "Message sent to support team"}

@router.post("/tickets/{ticket_id}/voice-call")
async def start_support_voice_call(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Connects user to customer support voice assistance via WebRTC.
    Generates a secure LiveKit audio room for user and support desk.
    """
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    room_name = f"support_{ticket.id.hex[:12]}"
    user_token = create_livekit_token(room_name, str(current_user.id), f"User_{current_user.display_name}")

    ticket.channel = "VOICE"
    ticket.status = "IN_PROGRESS"
    await db.commit()

    return {
        "success": True,
        "room_name": room_name,
        "livekit_url": settings.LIVEKIT_URL,
        "livekit_token": user_token,
        "message": "Connecting to customer support voice agent..."
    }
