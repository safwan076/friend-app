from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.models.entities import User, UserReport, AdminAuditLog, DeviceBlacklist, CelebrityProfile
from app.schemas.all_schemas import (
    UserPublic, UserSelf, AdminUserActionRequest, AdminReportResponse
)
from app.api.deps import require_role

router = APIRouter(prefix="/admin", tags=["Super Admin & Moderation"])

@router.get("/users", response_model=List[UserSelf])
async def list_all_users(
    status_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(require_role(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin: View and search all registered users and their restriction status."""
    query = select(User).order_by(User.created_at.desc())

    if status_filter:
        query = query.where(User.status == status_filter.upper())
    if role_filter:
        query = query.where(User.role == role_filter.upper())
    if search:
        query = query.where(User.display_name.ilike(f"%{search}%"))

    result = await db.execute(query.limit(100))
    users = result.scalars().all()

    return [
        UserSelf(
            id=u.id,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            bio=u.bio,
            role=u.role,
            status=u.status,
            restrictions=u.restrictions or [],
            created_at=u.created_at
        )
        for u in users
    ]

@router.post("/users/action")
async def execute_user_action(
    payload: AdminUserActionRequest,
    current_admin: User = Depends(require_role(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin: Completely control user status, ban/unban users, limit features,
    or blacklist hardware devices.
    """
    u_res = await db.execute(select(User).where(User.id == payload.user_id))
    user = u_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found")

    action = payload.action.upper()
    audit_details = {"reason": payload.reason}

    if action == "BAN":
        user.status = "BANNED"
        audit_details["banned"] = True
        # Blacklist device if requested and available
        if payload.ban_device and user.device_fingerprint:
            bl_entry = DeviceBlacklist(
                device_fingerprint=user.device_fingerprint,
                reason=f"Banned due to user violation: {payload.reason}",
                banned_by=current_admin.id
            )
            db.add(bl_entry)
            audit_details["device_fingerprint_blacklisted"] = user.device_fingerprint

    elif action == "UNBAN":
        user.status = "ACTIVE"
        audit_details["unbanned"] = True
        # Remove from device blacklist if present
        if user.device_fingerprint:
            bl_res = await db.execute(
                select(DeviceBlacklist).where(DeviceBlacklist.device_fingerprint == user.device_fingerprint)
            )
            bl_item = bl_res.scalar_one_or_none()
            if bl_item:
                await db.delete(bl_item)

    elif action == "RESTRICT":
        # Apply restrictions (e.g. ["DISABLE_RANDOM_VIDEO", "DISABLE_EVENT_HOSTING"])
        user.status = "RESTRICTED"
        user.restrictions = payload.restrictions or []
        audit_details["restrictions"] = user.restrictions

    elif action == "PROMOTE_CELEBRITY":
        user.role = "CELEBRITY"
        # Check or create celebrity profile
        c_res = await db.execute(select(CelebrityProfile).where(CelebrityProfile.user_id == user.id))
        if not c_res.scalar_one_or_none():
            celeb_prof = CelebrityProfile(
                user_id=user.id,
                is_verified=True,
                monthly_subscription_price=9.99,
                availability_status="OFFLINE"
            )
            db.add(celeb_prof)
        audit_details["role_changed"] = "CELEBRITY"

    else:
        raise HTTPException(status_code=400, detail="Action must be BAN, UNBAN, RESTRICT, or PROMOTE_CELEBRITY")

    # Record audit log
    audit = AdminAuditLog(
        admin_id=current_admin.id,
        target_user_id=user.id,
        action=f"{action}_USER",
        details=audit_details
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Action {action} successfully executed for user {user.display_name}.",
        "new_status": user.status,
        "restrictions": user.restrictions or []
    }

@router.get("/reports", response_model=List[AdminReportResponse])
async def list_pending_reports(
    current_admin: User = Depends(require_role(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin: View pending reports submitted by users."""
    query = (
        select(UserReport)
        .options(selectinload(UserReport.reporter), selectinload(UserReport.reported_user))
        .where(UserReport.status == "PENDING")
        .order_by(UserReport.created_at.desc())
    )
    res = await db.execute(query)
    reports = res.scalars().all()

    output = []
    for r in reports:
        reporter_public = None
        if r.reporter:
            reporter_public = UserPublic(
                id=r.reporter.id,
                display_name=r.reporter.display_name,
                avatar_url=r.reporter.avatar_url,
                bio=r.reporter.bio,
                role=r.reporter.role,
                status=r.reporter.status,
                created_at=r.reporter.created_at
            )

        reported_public = UserPublic(
            id=r.reported_user.id,
            display_name=r.reported_user.display_name,
            avatar_url=r.reported_user.avatar_url,
            bio=r.reported_user.bio,
            role=r.reported_user.role,
            status=r.reported_user.status,
            created_at=r.reported_user.created_at
        )

        output.append(AdminReportResponse(
            id=r.id,
            reporter=reporter_public,
            reported_user=reported_public,
            reason=r.reason,
            details=r.details,
            evidence_url=r.evidence_url,
            status=r.status,
            created_at=r.created_at
        ))

    return output

@router.post("/reports/{report_id}/resolve")
async def resolve_report(
    report_id: UUID,
    resolution_notes: str,
    action_taken: str = "DISMISSED", # DISMISSED, ACTION_TAKEN
    current_admin: User = Depends(require_role(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin resolves a reported incident."""
    r_res = await db.execute(select(UserReport).where(UserReport.id == report_id))
    report = r_res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = "RESOLVED" if action_taken == "ACTION_TAKEN" else "DISMISSED"
    report.resolution_notes = resolution_notes
    await db.commit()

    return {"success": True, "message": "Report resolution saved"}
