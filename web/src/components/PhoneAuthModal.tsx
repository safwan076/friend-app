'use client';

import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { UserSelf } from '../types';
import { ShieldCheck, Phone, KeyRound, User, Lock, CheckCircle2 } from 'lucide-react';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserSelf) => void;
  onClose?: () => void;
}

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('+1');
  const [otp, setOtp] = useState('123456');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await ApiService.requestOtp(phone);
      setInfoMsg(res.message);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await ApiService.verifyOtp(phone, otp, displayName || undefined);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Welcome to Friend App</h2>
            <p className="text-xs text-slate-400">Secure & Anonymous Phone Login</p>
          </div>
        </div>

        {/* Privacy Promise Banner */}
        <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 mb-5 text-xs text-emerald-300">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">Privacy Guaranteed:</strong> Your mobile number is encrypted at rest and will <strong>never</strong> be visible to other users, callers, or celebrities. Only your display name is public.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 bg-blue-950/50 border border-blue-800 text-blue-300 rounded-xl text-sm mb-4">
            {infoMsg}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number (E.164 with Country Code)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Example: +14155552671 (US), +447911123456 (UK)</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Sending Verification...' : 'Send SMS Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Default test code in development: <strong>123456</strong></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Public Display Name (Visible to others)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Jordan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Complete Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
