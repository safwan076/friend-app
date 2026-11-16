from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID, ST_Distance
from geoalchemy2.elements import WKTElement
from app.database.session import get_db
from app.models.entities import User, Event, EventRSVP
from app.schemas.all_schemas import EventCreate, EventResponse, UserPublic
from app.api.deps import get_current_user, require_role, require_no_restriction

router = APIRouter(prefix="/events", tags=["Location-Based Events"])

@router.post("", response_model=EventResponse)
async def create_event(
    payload: EventCreate,
    current_user: User = Depends(require_no_restriction("DISABLE_EVENT_HOSTING")),
    db: AsyncSession = Depends(get_db)
):
    """
    Hosts can create an event with geolocation coordinates.
    Stores location in PostGIS geography (Point SRID 4326).
    """
    # Create WKT point (longitude latitude format)
    point_wkt = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"

    event = Event(
        host_id=current_user.id,
        title=payload.title,
        description=payload.description,
        banner_url=payload.banner_url or "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800",
        category=payload.category,
        address_name=payload.address_name,
        location=point_wkt,
        event_start=payload.event_start,
        event_end=payload.event_end,
        max_capacity=payload.max_capacity or 100,
        current_rsvps=0
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return EventResponse(
        id=event.id,
        host=UserPublic(
            id=current_user.id,
            display_name=current_user.display_name,
            avatar_url=current_user.avatar_url,
            bio=current_user.bio,
            role=current_user.role,
            status=current_user.status,
            created_at=current_user.created_at
        ),
        title=event.title,
        description=event.description,
        banner_url=event.banner_url,
        category=event.category,
        address_name=event.address_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        distance_meters=0.0,
        event_start=event.event_start,
        event_end=event.event_end,
        max_capacity=event.max_capacity,
        current_rsvps=event.current_rsvps,
        created_at=event.created_at
    )

@router.get("/nearby", response_model=List[EventResponse])
async def find_nearby_events(
    lat: float = Query(..., ge=-90.0, le=90.0, description="User current latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="User current longitude"),
    radius_km: float = Query(25.0, ge=1.0, le=500.0, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_db)
):
    """
    Discovers events based on user's current GPS location.
    Uses PostGIS ST_Distance on GEOGRAPHY coordinates for accurate meter distance.
    Filters by radius_km and sorts by nearest distance.
    """
    user_location = WKTElement(f"SRID=4326;POINT({lng} {lat})", srid=4326)
    radius_meters = radius_km * 1000.0

    # Calculate distance in meters using PostGIS ST_Distance
    distance_expr = ST_Distance(Event.location, user_location)

    query = (
        select(Event, distance_expr.label("distance_meters"))
        .options(selectinload(Event.host))
        .where(distance_expr <= radius_meters)
        .order_by(distance_expr.asc())
        .limit(50)
    )

    result = await db.execute(query)
    rows = result.all()

    output = []
    for event, dist in rows:
        output.append(EventResponse(
            id=event.id,
            host=UserPublic(
                id=event.host.id,
                display_name=event.host.display_name,
                avatar_url=event.host.avatar_url,
                bio=event.host.bio,
                role=event.host.role,
                status=event.host.status,
                created_at=event.host.created_at
            ),
            title=event.title,
            description=event.description,
            banner_url=event.banner_url,
            category=event.category,
            address_name=event.address_name,
            latitude=lat, # In frontend, coordinates from geometry point can be decoded
            longitude=lng,
            distance_meters=round(float(dist), 1),
            event_start=event.event_start,
            event_end=event.event_end,
            max_capacity=event.max_capacity,
            current_rsvps=event.current_rsvps,
            created_at=event.created_at
        ))

    return output

@router.post("/{event_id}/rsvp")
async def rsvp_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """RSVP to join a nearby event."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if already RSVPed
    rsvp_res = await db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == current_user.id)
    )
    existing = rsvp_res.scalar_one_or_none()
    if existing:
        return {"success": True, "message": "Already RSVPed to this event"}

    if event.current_rsvps >= event.max_capacity:
        raise HTTPException(status_code=400, detail="Event has reached maximum capacity")

    new_rsvp = EventRSVP(event_id=event_id, user_id=current_user.id, status="ATTENDING")
    event.current_rsvps += 1
    db.add(new_rsvp)
    await db.commit()

    return {"success": True, "message": "RSVP confirmed! See you at the event."}
