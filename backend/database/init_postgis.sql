-- Enable PostGIS extension for Location-Based Events
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Strict Privacy: Phone number stored encrypted/hashed; never exposed publicly)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash for fast indexing and duplicate check
    phone_encrypted TEXT NOT NULL,          -- AES-256-GCM encrypted E.164 phone number
    display_name VARCHAR(50) NOT NULL,
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'REGULAR_USER', -- REGULAR_USER, CELEBRITY, EVENT_HOST, SUPER_ADMIN
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',     -- ACTIVE, RESTRICTED, BANNED
    restrictions JSONB DEFAULT '[]'::jsonb,           -- e.g. ["DISABLE_RANDOM_VIDEO", "DISABLE_EVENT_HOSTING"]
    device_fingerprint VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);

-- 2. CELEBRITY PROFILES TABLE
CREATE TABLE IF NOT EXISTS celebrity_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    monthly_subscription_price NUMERIC(10, 2) NOT NULL DEFAULT 9.99,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE', -- ONLINE, BUSY, OFFLINE
    is_verified BOOLEAN NOT NULL DEFAULT true,
    bio_verified TEXT DEFAULT '',
    subscriber_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_celebrity_availability ON celebrity_profiles(availability_status);

-- 3. CELEBRITY POSTS TABLE (Photos & Content)
CREATE TABLE IF NOT EXISTS celebrity_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    celebrity_id UUID REFERENCES celebrity_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    is_subscribers_only BOOLEAN NOT NULL DEFAULT true,
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_celebrity_posts_celeb_id ON celebrity_posts(celebrity_id);

-- 4. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
    celebrity_id UUID REFERENCES celebrity_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'STRIPE', -- STRIPE, APPLE_IAP, GOOGLE_PLAY
    payment_reference VARCHAR(255),
    CONSTRAINT unique_active_subscription UNIQUE (subscriber_id, celebrity_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 5. LOCATION-BASED EVENTS TABLE (PostGIS Geography)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'Social',
    address_name TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- Longitude/Latitude 4326 projection
    event_start TIMESTAMP WITH TIME ZONE NOT NULL,
    event_end TIMESTAMP WITH TIME ZONE,
    max_capacity INT DEFAULT 100,
    current_rsvps INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST index for high-speed radius queries
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(event_start);

-- 6. EVENT RSVPS TABLE
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ATTENDING', -- ATTENDING, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_event_rsvp UNIQUE(event_id, user_id)
);

-- 7. CALL SESSIONS & LOGS
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    callee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    call_type VARCHAR(30) NOT NULL, -- RANDOM_VOICE, RANDOM_VIDEO, CELEB_VOICE, CELEB_VIDEO, SUPPORT_VOICE
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED', -- INITIATED, CONNECTED, ENDED, REJECTED, MISSED
    duration_seconds INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_callee ON call_logs(callee_id);

-- 8. CUSTOMER SUPPORT TICKETS & MESSAGES
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'CHAT', -- CHAT, VOICE
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_agent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. USER REPORTS & AUDIT LOGS (Super Admin)
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT DEFAULT '',
    evidence_url TEXT DEFAULT '',
    call_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, INVESTIGATING, RESOLVED, DISMISSED
    resolution_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- BAN_USER, UNBAN_USER, RESTRICT_FEATURE, RESOLVE_REPORT
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_fingerprint VARCHAR(128) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
