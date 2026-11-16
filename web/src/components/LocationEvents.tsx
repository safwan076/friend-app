'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { UserSelf, LocationEvent } from '../types';
import { MapPin, Calendar, Users, PlusCircle, Compass, CheckCircle2, Navigation } from 'lucide-react';

interface LocationEventsProps {
  currentUser: UserSelf | null;
  onRequireAuth: () => void;
}

export const LocationEvents: React.FC<LocationEventsProps> = ({ currentUser, onRequireAuth }) => {
  const [events, setEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number>(37.7749); // Default San Francisco
  const [longitude, setLongitude] = useState<number>(-122.4194);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting location...');
  const [hostModalOpen, setHostModalOpen] = useState(false);

  // Host Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Social');
  const [addressName, setAddressName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setLocationLabel(`GPS Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
          loadEvents(lat, lng, radiusKm);
        },
        (err) => {
          console.warn('Geolocation denied, using default coordinates', err);
          setLocationLabel('Default City Center');
          loadEvents(latitude, longitude, radiusKm);
        }
      );
    } else {
      loadEvents(latitude, longitude, radiusKm);
    }
  };

  const loadEvents = async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    try {
      const data = await ApiService.getNearbyEvents(lat, lng, radius);
      setEvents(data);
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    loadEvents(latitude, longitude, newRadius);
  };

  const handleRSVP = async (eventId: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    try {
      const res = await ApiService.rsvpEvent(eventId);
      alert(res.message);
      loadEvents(latitude, longitude, radiusKm);
    } catch (err: any) {
      alert(err.message || 'RSVP failed');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (currentUser.restrictions.includes('DISABLE_EVENT_HOSTING')) {
      alert('Event hosting has been restricted on your account by moderators.');
      return;
    }

    try {
      await ApiService.createEvent({
        title,
        description,
        banner_url: bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
        category,
        address_name: addressName,
        latitude,
        longitude,
        event_start: new Date(eventDate).toISOString(),
        max_capacity: Number(maxCapacity),
      });
      setHostModalOpen(false);
      alert('Event successfully created and published on the location map!');
      loadEvents(latitude, longitude, radiusKm);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Banner & Location Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Location-Based Events</h1>
          </div>
          <p className="text-xs text-slate-400">
            Find social gatherings, meetups, and parties happening right around you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Radius selector */}
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
            {[5, 15, 25, 50].map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                  radiusKm === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (!currentUser) onRequireAuth();
              else setHostModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
          >
            <PlusCircle className="w-4 h-4" /> Host an Event
          </button>
        </div>
      </div>

      {/* Location Badge */}
      <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
        <Navigation className="w-4 h-4 text-indigo-400" />
        <span>Current Search Center: <strong>{locationLabel}</strong> within <strong>{radiusKm} km</strong></span>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Searching nearby events in your radius...</div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-md mx-auto">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Events Found Nearby</h3>
          <p className="text-xs text-slate-400 mb-4">
            Try expanding your search radius to 50 km or host the very first meetup in this area!
          </p>
          <button
            onClick={() => handleRadiusChange(50)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl"
          >
            Expand to 50 km
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="relative aspect-video bg-slate-950">
                  <img
                    src={ev.banner_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'}
                    alt={ev.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-semibold text-white">
                    {ev.category}
                  </div>
                  {ev.distance_meters !== undefined && (
                    <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {(ev.distance_meters / 1000).toFixed(1)} km away
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-base text-white line-clamp-1">{ev.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{ev.description}</p>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{ev.address_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{new Date(ev.event_start).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {ev.current_rsvps} / {ev.max_capacity} Attending
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => handleRSVP(ev.id)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> RSVP to Event
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Event Modal */}
      {hostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 text-white shadow-2xl my-8">
            <h3 className="text-lg font-bold mb-1">Host a Location-Based Event</h3>
            <p className="text-xs text-slate-400 mb-5">
              People within your chosen radius will be able to discover and RSVP to your event.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Acoustic Jam & Picnic"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What should attendees know?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                  >
                    <option value="Social">Social</option>
                    <option value="Music">Music & Concerts</option>
                    <option value="Party">Party & Nightlife</option>
                    <option value="Sports">Sports & Fitness</option>
                    <option value="Tech">Tech & Networking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={2}
                    max={5000}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Venue Name / Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marina Green Park, San Francisco"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Banner Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setHostModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
