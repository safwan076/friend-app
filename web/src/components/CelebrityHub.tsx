'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { UserSelf, Celebrity, CelebrityPost } from '../types';
import { BadgeCheck, Lock, Star, Video, Mic, PlusCircle, CheckCircle, Radio, Clock } from 'lucide-react';

interface CelebrityHubProps {
  currentUser: UserSelf | null;
  onRequireAuth: () => void;
}

export const CelebrityHub: React.FC<CelebrityHubProps> = ({ currentUser, onRequireAuth }) => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [selectedCeleb, setSelectedCeleb] = useState<Celebrity | null>(null);
  const [posts, setPosts] = useState<CelebrityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  
  // New Post Form
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [isSubscribersOnly, setIsSubscribersOnly] = useState(true);

  // VIP Call State
  const [activeCallRoom, setActiveCallRoom] = useState<any>(null);

  useEffect(() => {
    loadCelebrities();
  }, []);

  const loadCelebrities = async () => {
    try {
      const data = await ApiService.getCelebrities();
      setCelebrities(data);
      if (data.length > 0 && !selectedCeleb) {
        selectCelebrity(data[0]);
      }
    } catch (e) {
      console.error('Failed to load celebrities', e);
    }
  };

  const selectCelebrity = async (celeb: Celebrity) => {
    setSelectedCeleb(celeb);
    setLoading(true);
    try {
      const p = await ApiService.getCelebrityPosts(celeb.id);
      setPosts(p);
    } catch (e) {
      console.error('Failed to load posts', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!selectedCeleb) return;

    try {
      await ApiService.subscribeToCelebrity(selectedCeleb.id);
      setSubscribeModalOpen(false);
      alert('Subscription active! Exclusive posts and VIP call access unlocked.');
      selectCelebrity(selectedCeleb);
    } catch (err: any) {
      alert(err.message || 'Subscription failed');
    }
  };

  const handleCallCelebrity = async (callType: 'CELEB_VOICE' | 'CELEB_VIDEO') => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!selectedCeleb) return;

    try {
      const res = await ApiService.callCelebrity(selectedCeleb.id, callType);
      setActiveCallRoom(res);
    } catch (err: any) {
      if (err.message && err.message.includes('Subscription required')) {
        setSubscribeModalOpen(true);
      } else {
        alert(err.message || 'Call failed');
      }
    }
  };

  const handleToggleStatus = async (newStatus: 'ONLINE' | 'BUSY' | 'OFFLINE') => {
    try {
      await ApiService.updateCelebrityAvailability(newStatus);
      loadCelebrities();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl) return;
    try {
      await ApiService.createCelebrityPost(newImageUrl, newCaption, isSubscribersOnly);
      setNewPostModalOpen(false);
      setNewImageUrl('');
      setNewCaption('');
      if (selectedCeleb) selectCelebrity(selectedCeleb);
    } catch (err: any) {
      alert(err.message || 'Failed to post photo');
    }
  };

  const isCelebrityUser = currentUser?.role === 'CELEBRITY';

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h1 className="text-xl font-bold text-white">Celebrity Hub & VIP Access</h1>
          </div>
          <p className="text-xs text-slate-400">
            Follow verified creators, unlock subscriber photo feeds, and enjoy 1-on-1 voice & video calls.
          </p>
        </div>

        {isCelebrityUser && (
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-2xl border border-slate-700">
            <span className="text-xs text-slate-300 font-medium px-2">Your Status:</span>
            <button
              onClick={() => handleToggleStatus('ONLINE')}
              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
            >
              Online
            </button>
            <button
              onClick={() => handleToggleStatus('BUSY')}
              className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
            >
              Busy
            </button>
            <button
              onClick={() => handleToggleStatus('OFFLINE')}
              className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Offline
            </button>
            <button
              onClick={() => setNewPostModalOpen(true)}
              className="ml-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Post Photo
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Directory on Left, Profile & Posts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Celebrity List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-2">Verified Celebrities</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {celebrities.map((celeb) => {
              const isSelected = selectedCeleb?.id === celeb.id;
              return (
                <div
                  key={celeb.id}
                  onClick={() => selectCelebrity(celeb)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition border ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={celeb.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt={celeb.user.display_name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-white">{celeb.user.display_name}</span>
                        {celeb.is_verified && <BadgeCheck className="w-4 h-4 text-sky-400" />}
                      </div>
                      <span className="text-[11px] text-slate-400">${celeb.monthly_subscription_price}/month</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        celeb.availability_status === 'ONLINE'
                          ? 'bg-emerald-400 animate-pulse'
                          : celeb.availability_status === 'BUSY'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="capitalize text-slate-300">{celeb.availability_status.toLowerCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Celebrity Showcase */}
        {selectedCeleb && (
          <div className="lg:col-span-2 space-y-6">
            {/* Celebrity Banner & Action Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedCeleb.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                    alt={selectedCeleb.user.display_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl font-bold text-white">{selectedCeleb.user.display_name}</h2>
                      <BadgeCheck className="w-5 h-5 text-sky-400" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedCeleb.user.bio || 'Verified Celebrity on Friend App'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                      <span><strong>{selectedCeleb.subscriber_count}</strong> Subscribers</span>
                      <span className="flex items-center gap-1">
                        Status: <strong className="text-emerald-400">{selectedCeleb.availability_status}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSubscribeModalOpen(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20"
                  >
                    <Star className="w-4 h-4 fill-slate-950" />
                    Subscribe (${selectedCeleb.monthly_subscription_price}/mo)
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCallCelebrity('CELEB_VIDEO')}
                      disabled={selectedCeleb.availability_status !== 'ONLINE'}
                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title={selectedCeleb.availability_status !== 'ONLINE' ? 'Celebrity is not currently online' : 'Video Call'}
                    >
                      <Video className="w-3.5 h-3.5" /> Video Call
                    </button>
                    <button
                      onClick={() => handleCallCelebrity('CELEB_VOICE')}
                      disabled={selectedCeleb.availability_status !== 'ONLINE'}
                      className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Mic className="w-3.5 h-3.5" /> Voice
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Feed */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Photo Gallery & Updates</h3>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
                  No photos uploaded yet by this celebrity.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                    >
                      <div className="relative aspect-video sm:aspect-square bg-slate-950">
                        <img
                          src={post.image_url}
                          alt={post.caption || 'Celebrity Photo'}
                          className="w-full h-full object-cover"
                        />
                        {post.is_subscribers_only && (
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Subscriber Exclusive
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-300 line-clamp-2">{post.caption}</p>
                        <span className="text-[10px] text-slate-500 mt-2 block">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subscription Modal */}
      {subscribeModalOpen && selectedCeleb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-white shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-8 h-8 fill-amber-400" />
              </div>
              <h3 className="text-lg font-bold">Subscribe to {selectedCeleb.user.display_name}</h3>
              <p className="text-xs text-slate-400 mt-1">Unlock VIP perks, exclusive photo drops, and direct calling.</p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 mb-6 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Full access to subscriber-only photo gallery
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> 1-on-1 Voice and Video calling when Online
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Cancel anytime with 1 click
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl mb-6">
              <span className="text-xs text-slate-400">Monthly Tier</span>
              <span className="text-lg font-bold text-amber-400">${selectedCeleb.monthly_subscription_price}/mo</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSubscribeModalOpen(false)}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                className="w-2/3 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Confirm Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Post Modal (Celebrity Creator) */}
      {newPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Post Photo to Your Feed</h3>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/photo.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Caption</label>
                <textarea
                  rows={3}
                  placeholder="Say something to your fans..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="subOnly"
                  checked={isSubscribersOnly}
                  onChange={(e) => setIsSubscribersOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="subOnly" className="text-xs text-slate-300">
                  Subscribers-only exclusive post
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewPostModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
