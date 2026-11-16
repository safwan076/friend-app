export type UserRole = 'REGULAR_USER' | 'CELEBRITY' | 'EVENT_HOST' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'RESTRICTED' | 'BANNED';

export interface UserPublic {
  id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface UserSelf extends UserPublic {
  restrictions: string[];
}

export interface Celebrity {
  id: string;
  user: UserPublic;
  monthly_subscription_price: number;
  availability_status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  is_verified: boolean;
  bio_verified?: string;
  subscriber_count: number;
}

export interface CelebrityPost {
  id: string;
  celebrity_id: string;
  image_url: string;
  caption?: string;
  is_subscribers_only: boolean;
  likes_count: number;
  created_at: string;
}

export interface LocationEvent {
  id: string;
  host: UserPublic;
  title: string;
  description: string;
  banner_url?: string;
  category: string;
  address_name: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  event_start: string;
  event_end?: string;
  max_capacity: number;
  current_rsvps: number;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  channel: 'CHAT' | 'VOICE';
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_agent: boolean;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter?: UserPublic;
  reported_user: UserPublic;
  reason: string;
  details?: string;
  evidence_url?: string;
  status: string;
  created_at: string;
}
