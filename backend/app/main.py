from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, users, celebrities, events, matchmaking, support, admin
from app.database.session import async_session_maker
from app.models.entities import User
from app.core.security import hash_phone_number, encrypt_phone_number
from sqlalchemy.future import select

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Friend App: Random Video/Voice Calls, Celebrity Subscriptions, Location Events, Privacy Masking, and Super Admin Moderation."
)

# CORS configuration to support Web, Android, iOS, and development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(celebrities.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(matchmaking.router, prefix=settings.API_V1_STR)
app.include_router(support.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "privacy_engine": "ACTIVE (AES-256-GCM + SHA-256)"
    }

@app.on_event("startup")
async def seed_initial_admin():
    """
    Seeds a default Super Admin account on first start if not present.
    Admin Phone: +19998887777 (Test Super Admin)
    """
    try:
        async with async_session_maker() as db:
            admin_phone = "+19998887777"
            p_hash = hash_phone_number(admin_phone)
            res = await db.execute(select(User).where(User.phone_hash == p_hash))
            admin_user = res.scalar_one_or_none()
            if not admin_user:
                admin_user = User(
                    phone_hash=p_hash,
                    phone_encrypted=encrypt_phone_number(admin_phone),
                    display_name="SuperAdmin",
                    role="SUPER_ADMIN",
                    status="ACTIVE",
                    bio="Friend App System Administrator"
                )
                db.add(admin_user)
                await db.commit()
    except Exception:
        # DB might not be connected yet during initial container boot
        pass
