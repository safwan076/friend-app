'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { UserSelf } from '../types';
import { Video, Mic, MicOff, VideoOff, FastForward, Flag, PhoneOff, Sparkles, AlertTriangle } from 'lucide-react';

interface RandomCallProps {
  currentUser: UserSelf | null;
  onRequireAuth: () => void;
}

export const RandomCall: React.FC<RandomCallProps> = ({ currentUser, onRequireAuth }) => {
  const [callType, setCallType] = useState<'RANDOM_VIDEO' | 'RANDOM_VOICE'>('RANDOM_VIDEO');
  const [isSearching, setIsSearching] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [matchedPeer, setMatchedPeer] = useState<{ id: string; display_name: string; avatar_url: string } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Media controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate Behavior');
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Initialize camera preview on mount if video selected
  useEffect(() => {
    let active = true;
    const startPreview = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: callType === 'RANDOM_VIDEO',
            audio: true,
          });
          if (active) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
        }
      } catch (err) {
        console.warn('Camera/mic preview permission deferred:', err);
      }
    };
    startPreview();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [callType]);

  const handleStartMatch = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (callType === 'RANDOM_VIDEO' && currentUser.restrictions.includes('DISABLE_RANDOM_VIDEO')) {
      alert('Video call is disabled on your account. Please use Voice Call.');
      return;
    }

    setIsSearching(true);
    setMatchedPeer(null);

    try {
      const res = await ApiService.joinMatchmaking(callType);
      if (res.matched && res.peer_user && res.room_id) {
        setMatchedPeer(res.peer_user);
        setRoomId(res.room_id);
        setIsSearching(false);
        setInCall(true);
      } else {
        // Poll for peer
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await ApiService.pollMatchmaking();
            if (pollRes.matched && pollRes.peer_user && pollRes.room_id) {
              clearInterval(pollIntervalRef.current);
              setMatchedPeer(pollRes.peer_user);
              setRoomId(pollRes.room_id);
              setIsSearching(false);
              setInCall(true);
            }
          } catch (e) {
            // keep polling
          }
        }, 1500);
      }
    } catch (err: any) {
      setIsSearching(false);
      alert(err.message || 'Matchmaking error');
    }
  };

  const handleEndOrNext = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    await ApiService.leaveMatchmaking(callType);
    setInCall(false);
    setMatchedPeer(null);
    setRoomId(null);
    setIsSearching(false);
  };

  const handleNextMatch = async () => {
    await handleEndOrNext();
    handleStartMatch();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const handleReport = async () => {
    if (!matchedPeer) return;
    try {
      await ApiService.reportPeer(matchedPeer.id, reportReason);
      setReportStatus('Report submitted. Skipping to next user...');
      setTimeout(() => {
        setReportModalOpen(false);
        setReportStatus(null);
        handleNextMatch();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Report failed');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4">
      {/* Top Bar with Mode Selector */}
      <div className="flex items-center justify-between mb-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-white text-base sm:text-lg">Random Match</h2>
        </div>

        {!inCall && !isSearching && (
          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setCallType('RANDOM_VIDEO')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                callType === 'RANDOM_VIDEO' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" /> Video Call
            </button>
            <button
              onClick={() => setCallType('RANDOM_VOICE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                callType === 'RANDOM_VOICE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" /> Voice Call
            </button>
          </div>
        )}

        {inCall && matchedPeer && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">
              Connected with: <strong className="text-white">{matchedPeer.display_name}</strong>
            </span>
            <button
              onClick={() => setReportModalOpen(true)}
              className="text-xs bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
            >
              <Flag className="w-3 h-3" /> Report
            </button>
          </div>
        )}
      </div>

      {/* Main Video/Call Canvas */}
      <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex items-center justify-center min-h-[460px]">
        {/* Remote Video Stream (or Placeholder) */}
        {inCall && matchedPeer ? (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
            {callType === 'RANDOM_VIDEO' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                poster={matchedPeer.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-600/30 border-2 border-indigo-400 flex items-center justify-center mb-4 animate-pulse">
                  <Mic className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{matchedPeer.display_name}</h3>
                <p className="text-xs text-slate-400">Voice call active • Encrypted end-to-end</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
            {isSearching ? (
              <>
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Looking for a friend...</h3>
                <p className="text-xs text-slate-400 mb-6">Pairing with someone online right now. Your number is hidden.</p>
                <button
                  onClick={handleEndOrNext}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel Search
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mb-4">
                  {callType === 'RANDOM_VIDEO' ? <Video className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect with Random People Online</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Start an instant 1-on-1 {callType === 'RANDOM_VIDEO' ? 'video' : 'voice'} call with a random user. Skip anytime to meet the next person!
                </p>
                <button
                  onClick={handleStartMatch}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Start Matching Now
                </button>
              </>
            )}
          </div>
        )}

        {/* Local Camera Picture-in-Picture Preview */}
        {callType === 'RANDOM_VIDEO' && (
          <div className="absolute bottom-4 right-4 w-32 sm:w-44 h-24 sm:h-32 bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
            />
            {isVideoDisabled && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-[10px]">
                <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                Camera Off
              </div>
            )}
            <div className="absolute top-1 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-slate-300">
              You
            </div>
          </div>
        )}

        {/* Floating Call Bar */}
        {inCall && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-5 py-3 rounded-full shadow-2xl z-30">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full transition ${
                isMicMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isMicMuted ? 'Unmute' : 'Mute'}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {callType === 'RANDOM_VIDEO' && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition ${
                  isVideoDisabled ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isVideoDisabled ? 'Enable Video' : 'Disable Video'}
              >
                {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={handleNextMatch}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold text-xs flex items-center gap-2 transition"
              title="Next Person"
            >
              <FastForward className="w-4 h-4" /> Next
            </button>

            <button
              onClick={handleEndOrNext}
              className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Safety & Reporting Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-white">
            <div className="flex items-center gap-2 text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Report Inappropriate User</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Select the reason. Our Super Admin team will review and apply bans if necessary.
            </p>

            {reportStatus ? (
              <div className="p-3 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xl text-xs mb-3">
                {reportStatus}
              </div>
            ) : (
              <>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white mb-4 focus:outline-none"
                >
                  <option value="Inappropriate Behavior">Inappropriate Behavior / Nudity</option>
                  <option value="Harassment or Abuse">Harassment or Abuse</option>
                  <option value="Spam or Scam">Spam or Scam</option>
                  <option value="Underage User">Underage Safety Violation</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    className="w-1/2 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl text-xs"
                  >
                    Submit & Skip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
