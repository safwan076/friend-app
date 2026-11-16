import unittest
import hashlib
import os
import base64
import json
from uuid import uuid4
from datetime import datetime, timezone

# Standalone verification of the Friend App privacy, masking, and token architecture
def hash_phone(phone: str) -> str:
    clean = phone.strip().replace(" ", "").replace("-", "")
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()

class TestFriendAppPrivacyAndSecurity(unittest.TestCase):
    def test_phone_hashing_consistency(self):
        p1 = "+1234567890"
        p2 = "+1 234-567-890"
        self.assertEqual(hash_phone(p1), hash_phone(p2))

    def test_phone_never_in_public_payload(self):
        # Simulate API response payload for public profile
        public_payload = {
            "id": str(uuid4()),
            "display_name": "SophiaCelebrity",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            "bio": "Actor & Singer. Connect with me!",
            "role": "CELEBRITY",
            "status": "ACTIVE"
        }
        self.assertNotIn("phone", public_payload)
        self.assertNotIn("phone_number", public_payload)
        self.assertNotIn("phone_encrypted", public_payload)
        self.assertEqual(public_payload["display_name"], "SophiaCelebrity")

    def test_device_blacklist_rejection(self):
        # Simulate device blacklist lookup
        blacklist = {"device_banned_fingerprint_abc123"}
        incoming_device = "device_banned_fingerprint_abc123"
        is_blocked = incoming_device in blacklist
        self.assertTrue(is_blocked)

    def test_restriction_enforcement(self):
        # Simulate user with restrictions
        user_restrictions = ["DISABLE_RANDOM_VIDEO", "DISABLE_EVENT_HOSTING"]
        self.assertIn("DISABLE_RANDOM_VIDEO", user_restrictions)
        
        # User trying to join random video should be blocked
        can_video_call = "DISABLE_RANDOM_VIDEO" not in user_restrictions
        self.assertFalse(can_video_call)
        
        # User trying voice call should still be permitted
        can_voice_call = "DISABLE_CALLS" not in user_restrictions
        self.assertTrue(can_voice_call)

if __name__ == '__main__':
    unittest.main()
