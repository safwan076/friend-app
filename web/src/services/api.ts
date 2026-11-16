import { UserPublic, UserSelf, Celebrity, CelebrityPost, LocationEvent, SupportTicket, UserReport } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiService {
  private static token: string | null = null;

  static setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('friend_app_token', token);
    }
  }

  static getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('friend_app_token');
    }
    return this.token;
  }

  static clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('friend_app_token');
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: 'Network error occurred' }));
      throw new Error(errData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // --- AUTH ---
  static async requestOtp(phoneNumber: string, deviceFingerprint?: string) {
    return this.request<{ success: boolean; message: string; dev_hint?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, device_fingerprint: deviceFingerprint }),
    });
  }

  static async verifyOtp(phoneNumber: string, otpCode: string, displayName?: string, deviceFingerprint?: string) {
    const res = await this.request<{ access_token: string; token_type: string; user: UserSelf }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        otp_code: otpCode,
        display_name: displayName,
        device_fingerprint: deviceFingerprint,
      }),
    });
    this.setToken(res.access_token);
    return res;
  }

  // --- USER ---
  static async getMyProfile(): Promise<UserSelf> {
    return this.request<UserSelf>('/users/me');
  }

  static async updateMyProfile(data: { display_name?: string; avatar_url?: string; bio?: string }): Promise<UserSelf> {
    return this.request<UserSelf>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async getPublicUser(userId: string): Promise<UserPublic> {
    return this.request<UserPublic>(`/users/${userId}`);
  }

  // --- RANDOM MATCHMAKING ---
  static async joinMatchmaking(callType: 'RANDOM_VOICE' | 'RANDOM_VIDEO') {
    return this.request<{
      matched: boolean;
      room_id?: string;
      peer_user?: { id: string; display_name: string; avatar_url: string };
      call_type?: string;
      livekit_token?: string;
      livekit_url?: string;
      status?: string;
    }>('/matchmaking/join', {
      method: 'POST',
      body: JSON.stringify({ call_type: callType }),
    });
  }

  static async pollMatchmaking() {
    return this.request<{
      matched: boolean;
      room_id?: string;
      peer_user?: { id: string; display_name: string; avatar_url: string };
      call_type?: string;
      livekit_token?: string;
      livekit_url?: string;
      status?: string;
    }>('/matchmaking/poll');
  }

  static async leaveMatchmaking(callType: 'RANDOM_VOICE' | 'RANDOM_VIDEO') {
    return this.request<{ success: boolean }>('/matchmaking/leave', {
      method: 'POST',
      body: JSON.stringify({ call_type: callType }),
    });
  }

  static async reportPeer(reportedUserId: string, reason: string, details?: string) {
    return this.request<{ success: boolean; message: string }>('/matchmaking/report', {
      method: 'POST',
      body: JSON.stringify({ reported_user_id: reportedUserId, reason, details }),
    });
  }

  // --- CELEBRITIES ---
  static async getCelebrities(): Promise<Celebrity[]> {
    return this.request<Celebrity[]>('/celebrities');
  }

  static async getCelebrityPosts(celebrityId: string): Promise<CelebrityPost[]> {
    return this.request<CelebrityPost[]>(`/celebrities/${celebrityId}/posts`);
  }

  static async subscribeToCelebrity(celebrityId: string, paymentToken: string = 'tok_mock_pass') {
    return this.request<{ success: boolean; message: string; expires_at: string }>('/celebrities/subscribe', {
      method: 'POST',
      body: JSON.stringify({ celebrity_id: celebrityId, payment_provider: 'STRIPE', payment_token: paymentToken }),
    });
  }

  static async updateCelebrityAvailability(status: 'ONLINE' | 'BUSY' | 'OFFLINE') {
    return this.request<{ success: boolean; availability_status: string }>('/celebrities/me/status', {
      method: 'PUT',
      body: JSON.stringify({ availability_status: status }),
    });
  }

  static async createCelebrityPost(imageUrl: string, caption: string, isSubscribersOnly: boolean) {
    return this.request<CelebrityPost>('/celebrities/me/posts', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl, caption, is_subscribers_only: isSubscribersOnly }),
    });
  }

  static async callCelebrity(celebrityId: string, callType: 'CELEB_VOICE' | 'CELEB_VIDEO') {
    return this.request<{
      success: boolean;
      room_id: string;
      livekit_url: string;
      caller_token: string;
      celebrity_id: string;
      celebrity_name: string;
    }>(`/celebrities/${celebrityId}/call?call_type=${callType}`, {
      method: 'POST',
    });
  }

  // --- LOCATION-BASED EVENTS ---
  static async getNearbyEvents(lat: number, lng: number, radiusKm: number = 25): Promise<LocationEvent[]> {
    return this.request<LocationEvent[]>(`/events/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  }

  static async createEvent(data: {
    title: string;
    description: string;
    banner_url?: string;
    category: string;
    address_name: string;
    latitude: number;
    longitude: number;
    event_start: string;
    event_end?: string;
    max_capacity?: number;
  }): Promise<LocationEvent> {
    return this.request<LocationEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async rsvpEvent(eventId: string) {
    return this.request<{ success: boolean; message: string }>(`/events/${eventId}/rsvp`, {
      method: 'POST',
    });
  }

  // --- CUSTOMER SUPPORT ---
  static async createSupportTicket(subject: string, channel: 'CHAT' | 'VOICE', initialMessage?: string): Promise<SupportTicket> {
    return this.request<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, channel, initial_message: initialMessage }),
    });
  }

  static async sendSupportMessage(ticketId: string, message: string) {
    return this.request<{ success: boolean; message: string }>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  static async startSupportVoiceCall(ticketId: string) {
    return this.request<{
      success: boolean;
      room_name: string;
      livekit_url: string;
      livekit_token: string;
    }>(`/support/tickets/${ticketId}/voice-call`, {
      method: 'POST',
    });
  }

  // --- SUPER ADMIN ---
  static async listAdminUsers(statusFilter?: string, roleFilter?: string, search?: string): Promise<UserSelf[]> {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (roleFilter) params.append('role_filter', roleFilter);
    if (search) params.append('search', search);
    return this.request<UserSelf[]>(`/admin/users?${params.toString()}`);
  }

  static async executeAdminUserAction(data: {
    user_id: string;
    action: 'BAN' | 'UNBAN' | 'RESTRICT' | 'PROMOTE_CELEBRITY';
    reason: string;
    restrictions?: string[];
    ban_device?: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      new_status: string;
      restrictions: string[];
    }>('/admin/users/action', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async listAdminReports(): Promise<UserReport[]> {
    return this.request<UserReport[]>('/admin/reports');
  }

  static async resolveAdminReport(reportId: string, resolutionNotes: string, actionTaken: 'ACTION_TAKEN' | 'DISMISSED') {
    return this.request<{ success: boolean; message: string }>(`/admin/reports/${reportId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: resolutionNotes, action_taken: actionTaken }),
    });
  }
}
