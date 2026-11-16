package com.friendapp.data.models

data class UserPublic(
    val id: String,
    val display_name: String,
    val avatar_url: String? = "",
    val bio: String? = "",
    val role: String,
    val status: String,
    val created_at: String
)

data class UserSelf(
    val id: String,
    val display_name: String,
    val avatar_url: String? = "",
    val bio: String? = "",
    val role: String,
    val status: String,
    val restrictions: List<String> = emptyList(),
    val created_at: String
)

data class Celebrity(
    val id: String,
    val user: UserPublic,
    val monthly_subscription_price: Double,
    val availability_status: String, // ONLINE, BUSY, OFFLINE
    val is_verified: Boolean,
    val bio_verified: String? = "",
    val subscriber_count: Int
)

data class CelebrityPost(
    val id: String,
    val celebrity_id: String,
    val image_url: String,
    val caption: String? = "",
    val is_subscribers_only: Boolean,
    val likes_count: Int,
    val created_at: String
)

data class LocationEvent(
    val id: String,
    val host: UserPublic,
    val title: String,
    val description: String,
    val banner_url: String? = "",
    val category: String,
    val address_name: String,
    val latitude: Double,
    val longitude: Double,
    val distance_meters: Double? = null,
    val event_start: String,
    val event_end: String? = null,
    val max_capacity: Int,
    val current_rsvps: Int,
    val created_at: String
)

data class MatchResult(
    val matched: Boolean,
    val room_id: String? = null,
    val peer_user: UserPublic? = null,
    val call_type: String? = null,
    val livekit_token: String? = null,
    val livekit_url: String? = null,
    val status: String? = null
)
