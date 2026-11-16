import json
import uuid
import asyncio
from typing import Optional, Tuple, Dict, Any
import redis.asyncio as aioredis
from app.core.config import settings
from app.services.livekit_token import create_livekit_token

class MatchmakingEngine:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None

    async def get_redis(self) -> aioredis.Redis:
        if self.redis is None:
            self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self.redis

    def _queue_key(self, call_type: str) -> str:
        return f"match:queue:{call_type.lower()}"

    def _user_state_key(self, user_id: str) -> str:
        return f"match:user:{user_id}"

    async def enqueue_user(
        self, 
        user_id: str, 
        display_name: str, 
        call_type: str, 
        avatar_url: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Enqueues user for random matching.
        If another peer is waiting, pops peer and forms an immediate match.
        Returns match payload if matched immediately, else None (user is waiting).
        """
        r = await self.get_redis()
        q_key = self._queue_key(call_type)

        user_info = {
            "user_id": user_id,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "call_type": call_type
        }

        # Try to pop an existing waiting user
        while True:
            peer_data_raw = await r.rpop(q_key)
            if not peer_data_raw:
                break
            
            peer_info = json.loads(peer_data_raw)
            # Avoid matching user with themselves
            if peer_info["user_id"] != user_id:
                # We have a valid peer match!
                room_id = f"rand_{uuid.uuid4().hex[:12]}"
                
                # Generate WebRTC tokens
                token_user = create_livekit_token(room_id, user_id, display_name)
                token_peer = create_livekit_token(room_id, peer_info["user_id"], peer_info["display_name"])

                match_result_user = {
                    "room_id": room_id,
                    "peer_user_id": peer_info["user_id"],
                    "peer_display_name": peer_info["display_name"],
                    "peer_avatar_url": peer_info.get("avatar_url", ""),
                    "call_type": call_type,
                    "livekit_token": token_user,
                    "livekit_url": settings.LIVEKIT_URL
                }

                match_result_peer = {
                    "room_id": room_id,
                    "peer_user_id": user_id,
                    "peer_display_name": display_name,
                    "peer_avatar_url": avatar_url,
                    "call_type": call_type,
                    "livekit_token": token_peer,
                    "livekit_url": settings.LIVEKIT_URL
                }

                # Store match result in Redis for the waiting peer to retrieve
                await r.setex(f"match:result:{peer_info['user_id']}", 45, json.dumps(match_result_peer))
                # Publish event to peer's PubSub channel
                await r.publish(f"channel:user:{peer_info['user_id']}", json.dumps({
                    "event": "MATCHED",
                    "data": match_result_peer
                }))

                return match_result_user

        # No peer waiting: push current user into queue
        await r.lpush(q_key, json.dumps(user_info))
        await r.setex(self._user_state_key(user_id), 60, "QUEUED")
        return None

    async def dequeue_user(self, user_id: str, call_type: str):
        """Removes a user from the queue if they cancel or disconnect"""
        r = await self.get_redis()
        q_key = self._queue_key(call_type)
        items = await r.lrange(q_key, 0, -1)
        for item in items:
            data = json.loads(item)
            if data.get("user_id") == user_id:
                await r.lrem(q_key, 0, item)
        await r.delete(self._user_state_key(user_id))

    async def check_match_result(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Checks if a waiting user has been matched by an incoming peer"""
        r = await self.get_redis()
        result_raw = await r.get(f"match:result:{user_id}")
        if result_raw:
            await r.delete(f"match:result:{user_id}")
            return json.loads(result_raw)
        return None

matchmaking_engine = MatchmakingEngine()
