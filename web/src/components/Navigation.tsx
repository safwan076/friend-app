'use client';

import React from 'react';
import { UserSelf } from '../types';
import { Sparkles, Star, MapPin, Headphones, Shield, LogIn, LogOut, User } from 'lucide-react';

interface NavigationProps {
  activeTab: 'RANDOM' | 'CELEBRITY' | 'EVENTS' | 'SUPPORT' | 'ADMIN';
  onTabChange: (tab: 'RANDOM' | 'CELEBRITY' | 'EVENTS' | 'SUPPORT' | 'ADMIN') => void;
  currentUser: UserSelf | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('RANDOM')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">Friend App</span>
            <span className="text-[10px] text-slate-400 font-medium">Anonymous Calls & Local Events</span>
          </div>
        </div>

        {/* Center Nav Items */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => onTabChange('RANDOM')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'RANDOM' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Random Match
          </button>

          <button
            onClick={() => onTabChange('CELEBRITY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'CELEBRITY' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Celebrities
          </button>

          <button
            onClick={() => onTabChange('EVENTS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'EVENTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Local Events
          </button>

          <button
            onClick={() => onTabChange('SUPPORT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'SUPPORT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" /> Support
          </button>

          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => onTabChange('ADMIN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'ADMIN' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Super Admin
            </button>
          )}
        </nav>

        {/* User Auth Info */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block">{currentUser.display_name}</span>
                <span className="text-[10px] text-emerald-400 capitalize">{currentUser.role.replace('_', ' ').toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500 flex items-center justify-center font-bold text-xs text-indigo-300">
                {currentUser.display_name.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-900 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
            >
              <LogIn className="w-3.5 h-3.5" /> Phone Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
