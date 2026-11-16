'use client';

import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { UserSelf, SupportTicket } from '../types';
import { Headphones, MessageSquare, PhoneCall, Send, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CustomerSupportProps {
  currentUser: UserSelf | null;
  onRequireAuth: () => void;
}

export const CustomerSupport: React.FC<CustomerSupportProps> = ({ currentUser, onRequireAuth }) => {
  const [activeTab, setActiveTab] = useState<'CHAT' | 'VOICE'>('CHAT');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; isAgent: boolean }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [callingState, setCallingState] = useState<'IDLE' | 'CALLING' | 'CONNECTED'>('IDLE');

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!subject || !message) return;

    try {
      const ticket = await ApiService.createSupportTicket(subject, 'CHAT', message);
      setActiveTicket(ticket);
      setChatMessages([
        { sender: currentUser.display_name, text: message, isAgent: false },
        { sender: 'Friend App Support Bot', text: 'Thank you for reaching out! A support specialist will respond shortly.', isAgent: true }
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to start support ticket');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: currentUser?.display_name || 'You', text: userText, isAgent: false }]);

    try {
      await ApiService.sendSupportMessage(activeTicket.id, userText);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartVoiceSupport = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setCallingState('CALLING');
    try {
      const ticket = await ApiService.createSupportTicket('Voice Assistance Request', 'VOICE');
      const callData = await ApiService.startSupportVoiceCall(ticket.id);
      setCallingState('CONNECTED');
    } catch (err: any) {
      alert(err.message || 'Voice call connection failed');
      setCallingState('IDLE');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Headphones className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">24/7 Customer Support Desk</h1>
          </div>
          <p className="text-xs text-slate-400">
            Need help with verification, account restrictions, billing, or safety? Connect directly with our helpdesk.
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'CHAT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat Support
          </button>
          <button
            onClick={() => setActiveTab('VOICE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'VOICE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" /> Voice Call Support
          </button>
        </div>
      </div>

      {activeTab === 'CHAT' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          {!activeTicket ? (
            <form onSubmit={handleStartChat} className="space-y-4 max-w-lg mx-auto">
              <h2 className="text-base font-bold text-white mb-2">Open a Support Ticket</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue with celebrity subscription / report an incident"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">How can we help?</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your question or issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition"
              >
                Start Live Chat Ticket
              </button>
            </form>
          ) : (
            <div className="flex flex-col h-[480px]">
              <div className="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{activeTicket.subject}</h3>
                  <span className="text-[10px] text-emerald-400">Status: {activeTicket.status}</span>
                </div>
                <button
                  onClick={() => setActiveTicket(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close Thread
                </button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.isAgent ? 'items-start' : 'items-end'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5">{msg.sender}</span>
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                        msg.isAgent
                          ? 'bg-slate-800 text-slate-200 rounded-tl-none'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* Voice Call Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          {callingState === 'IDLE' && (
            <>
              <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <PhoneCall className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Speak Directly with Support</h2>
              <p className="text-xs text-slate-400 mb-6">
                Connect via crystal-clear in-app WebRTC VoIP. No phone charges or telephone numbers required.
              </p>
              <button
                onClick={handleStartVoiceSupport}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-xs transition shadow-lg shadow-indigo-600/30"
              >
                Call Customer Support Agent
              </button>
            </>
          )}

          {callingState === 'CALLING' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto" />
              <h3 className="text-base font-bold text-white">Ringing Customer Support Desk...</h3>
              <p className="text-xs text-slate-400">Connecting audio track and dispatching to available specialist.</p>
            </div>
          )}

          {callingState === 'CONNECTED' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-emerald-600/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-white">Voice Call Connected</h3>
              <p className="text-xs text-slate-400">Speaking with Friend App Helpdesk Specialist.</p>
              <button
                onClick={() => setCallingState('IDLE')}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
              >
                End Support Call
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
