# Friend App 🌟

**Friend App** is a next-generation real-time social platform combining anonymous random 1-on-1 audio/video calling, verified celebrity VIP subscriptions, hyper-local event planning & discovery, customer support desk, and a comprehensive super-admin moderation console.

The application enforces **strict privacy**: mobile numbers are encrypted at rest using AES-256-GCM and indexed via SHA-256 hashes—mobile numbers are **never** exposed to other callers, strangers, or celebrities.

---

## 📱 Supported Platforms

1. **Web App**: Next.js 14, React 19, Tailwind CSS, WebRTC MediaDevices.
2. **Android Native**: Kotlin, Jetpack Compose, CameraX, LiveKit Android SDK, Android Telecom `ConnectionService` (native lock-screen ringing).
3. **iOS Native**: Swift 6, SwiftUI, AVFoundation, Apple CallKit (`CXProvider`) for system lock-screen incoming calls.

---

## 🚀 Key Features

- **Anonymous Random Calls**: Redis-backed matchmaking queue for instant 1-on-1 voice & video pairing via WebRTC with live camera PIP, audio/video toggles, instant "Next Person" skipping, and in-call user reporting.
- **Celebrity VIP Hub**: Verified creator profiles, monthly subscriptions, exclusive subscriber-only photo feeds, and direct 1-on-1 VIP audio/video calls when celebrities are marked `ONLINE`.
- **Location-Based Events**: PostGIS spatial indexing (`GEOGRAPHY(POINT, 4326)`) for discovering nearby events within 5–50 km, event hosting, and RSVP management.
- **Customer Support**: In-app live chat ticketing and crystal-clear WebRTC VoIP voice support without telephone charges.
- **Super Admin Moderation**: Complete platform oversight, search users, ban accounts, permanent hardware device blacklisting, granular restrictions (e.g., disable random video), and incident report resolution.

---

## 🛠️ Tech Stack & Infrastructure

- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0 Async, GeoAlchemy2, Redis 7 (Async/Aioredis), PyJWT, Cryptography (AES-256-GCM).
- **Database**: PostgreSQL 16 with PostGIS spatial extension.
- **Media SFU**: LiveKit WebRTC Server (ports 7880, 7881, 7882).
- **Caching & Queues**: Redis 7.

---

## 🏁 Quickstart

### 1. Launch Backend Infrastructure (Docker)
```bash
docker compose up -d
```
Starts PostgreSQL with PostGIS on `5432`, Redis on `6379`, and LiveKit SFU on `7880`.

### 2. Run the Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Swagger interactive API docs will be live at `http://localhost:8000/docs`.

### 3. Run the Web Application
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Run Automated Tests
```bash
python backend/tests/test_runner.py
```

---

## 🔒 Security & Privacy Notice
All user mobile numbers are strictly confidential:
- Deterministic SHA-256 hashing is used for account lookup without decrypting.
- Symmetric AES-256-GCM encryption is used for data at rest.
- Public API payloads (`UserPublic`) and JWT tokens never include phone numbers.

---

## 📄 License
MIT License.
