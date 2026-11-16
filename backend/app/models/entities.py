import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, DateTime, 
    ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_hash = Column(String(64), unique=True, nullable=False, index=True)
    phone_encrypted = Column(Text, nullable=False)
    display_name = Column(String(50), nullable=False)
    avatar_url = Column(Text, default="")
    bio = Column(Text, default="")
    role = Column(String(20), default="REGULAR_USER", nullable=False, index=True) # REGULAR_USER, CELEBRITY, EVENT_HOST, SUPER_ADMIN
    status = Column(String(20), default="ACTIVE", nullable=False, index=True) # ACTIVE, RESTRICTED, BANNED
    restrictions = Column(JSONB, default=list) # e.g. ["DISABLE_RANDOM_VIDEO", "DISABLE_EVENT_HOSTING"]
    device_fingerprint = Column(String(128), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    celebrity_profile = relationship("CelebrityProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    events = relationship("Event", back_populates="host", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="subscriber", foreign_keys="Subscription.subscriber_id")
    support_tickets = relationship("SupportTicket", back_populates="user", foreign_keys="SupportTicket.user_id")

class CelebrityProfile(Base):
    __tablename__ = "celebrity_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    monthly_subscription_price = Column(Numeric(10, 2), default=9.99, nullable=False)
    availability_status = Column(String(20), default="OFFLINE", nullable=False) # ONLINE, BUSY, OFFLINE
    is_verified = Column(Boolean, default=True, nullable=False)
    bio_verified = Column(Text, default="")
    subscriber_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="celebrity_profile")
    posts = relationship("CelebrityPost", back_populates="celebrity", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="celebrity", cascade="all, delete-orphan")

class CelebrityPost(Base):
    __tablename__ = "celebrity_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    celebrity_id = Column(UUID(as_uuid=True), ForeignKey("celebrity_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    caption = Column(Text, default="")
    is_subscribers_only = Column(Boolean, default=True, nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    celebrity = relationship("CelebrityProfile", back_populates="posts")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscriber_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    celebrity_id = Column(UUID(as_uuid=True), ForeignKey("celebrity_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True) # ACTIVE, CANCELLED, EXPIRED
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    payment_provider = Column(String(50), default="STRIPE", nullable=False)
    payment_reference = Column(String(255))

    __table_args__ = (
        UniqueConstraint('subscriber_id', 'celebrity_id', name='unique_active_subscription'),
    )

    subscriber = relationship("User", back_populates="subscriptions", foreign_keys=[subscriber_id])
    celebrity = relationship("CelebrityProfile", back_populates="subscriptions", foreign_keys=[celebrity_id])

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    banner_url = Column(Text, default="")
    category = Column(String(50), default="Social", nullable=False)
    address_name = Column(Text, nullable=False)
    # PostGIS Geography Point (Longitude, Latitude)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    event_start = Column(DateTime(timezone=True), nullable=False, index=True)
    event_end = Column(DateTime(timezone=True))
    max_capacity = Column(Integer, default=100)
    current_rsvps = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    host = relationship("User", back_populates="events")
    rsvps = relationship("EventRSVP", back_populates="event", cascade="all, delete-orphan")

class EventRSVP(Base):
    __tablename__ = "event_rsvps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="ATTENDING", nullable=False) # ATTENDING, CANCELLED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', name='unique_user_event_rsvp'),
    )

    event = relationship("Event", back_populates="rsvps")
    user = relationship("User")

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    caller_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    callee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    call_type = Column(String(30), nullable=False) # RANDOM_VOICE, RANDOM_VIDEO, CELEB_VOICE, CELEB_VIDEO, SUPPORT_VOICE
    status = Column(String(20), default="INITIATED", nullable=False) # INITIATED, CONNECTED, ENDED, REJECTED, MISSED
    duration_seconds = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True))

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(20), default="CHAT", nullable=False) # CHAT, VOICE
    subject = Column(String(200), nullable=False)
    status = Column(String(20), default="OPEN", nullable=False) # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="support_tickets", foreign_keys=[user_id])
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=False)
    is_agent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("SupportTicket", back_populates="messages")

class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reported_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(100), nullable=False)
    details = Column(Text, default="")
    evidence_url = Column(Text, default="")
    call_id = Column(UUID(as_uuid=True), ForeignKey("call_logs.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, INVESTIGATING, RESOLVED, DISMISSED
    resolution_notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False) # BAN_USER, UNBAN_USER, RESTRICT_FEATURE, RESOLVE_REPORT
    details = Column(JSONB, default=dict)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class DeviceBlacklist(Base):
    __tablename__ = "device_blacklist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_fingerprint = Column(String(128), unique=True, nullable=False)
    reason = Column(Text, nullable=False)
    banned_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
