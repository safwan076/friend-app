'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { UserSelf } from '../types';
import { Navigation } from '../components/Navigation';
import { RandomCall } from '../components/RandomCall';
import { CelebrityHub } from '../components/CelebrityHub';
import { LocationEvents } from '../components/LocationEvents';
import { CustomerSupport } from '../components/CustomerSupport';
import { SuperAdminConsole } from '../components/SuperAdminConsole';
import { PhoneAuthModal } from '../components/PhoneAuthModal';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'RANDOM' | 'CELEBRITY' | 'EVENTS' | 'SUPPORT' | 'ADMIN'>('RANDOM');
  const [currentUser, setCurrentUser] = useState<UserSelf | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    const token = ApiService.getToken();
    if (token) {
      try {
        const user = await ApiService.getMyProfile();
        setCurrentUser(user);
      } catch (e) {
        ApiService.clearToken();
      }
    }
  };

  const handleAuthSuccess = (user: UserSelf) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    ApiService.clearToken();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 py-6">
        {activeTab === 'RANDOM' && (
          <RandomCall
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'CELEBRITY' && (
          <CelebrityHub
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'EVENTS' && (
          <LocationEvents
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'SUPPORT' && (
          <CustomerSupport
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'ADMIN' && (
          <SuperAdminConsole currentUser={currentUser} />
        )}
      </main>

      {/* Mobile Tab Bar */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-2 z-40">
        <div className="flex justify-around text-[10px]">
          <button
            onClick={() => setActiveTab('RANDOM')}
            className={`flex flex-col items-center py-1 ${activeTab === 'RANDOM' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Random
          </button>
          <button
            onClick={() => setActiveTab('CELEBRITY')}
            className={`flex flex-col items-center py-1 ${activeTab === 'CELEBRITY' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Celebrities
          </button>
          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`flex flex-col items-center py-1 ${activeTab === 'EVENTS' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('SUPPORT')}
            className={`flex flex-col items-center py-1 ${activeTab === 'SUPPORT' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Support
          </button>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`flex flex-col items-center py-1 ${activeTab === 'ADMIN' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
            >
              Admin
            </button>
          )}
        </div>
      </footer>

      {/* Phone OTP Modal */}
      <PhoneAuthModal
        isOpen={authModalOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
