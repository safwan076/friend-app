'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { UserSelf, UserReport } from '../types';
import { Shield, Users, AlertTriangle, Ban, CheckCircle, ShieldAlert, Star, Search, RefreshCw } from 'lucide-react';

interface SuperAdminConsoleProps {
  currentUser: UserSelf | null;
}

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserSelf[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'USERS' | 'REPORTS'>('USERS');

  // Action Modal State
  const [selectedUser, setSelectedUser] = useState<UserSelf | null>(null);
  const [actionType, setActionType] = useState<'BAN' | 'RESTRICT' | 'UNBAN' | 'PROMOTE_CELEBRITY'>('BAN');
  const [actionReason, setActionReason] = useState('');
  const [banDevice, setBanDevice] = useState(true);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, roleFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        ApiService.listAdminUsers(statusFilter || undefined, roleFilter || undefined, search || undefined),
        ApiService.listAdminReports()
      ]);
      setUsers(u);
      setReports(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (user: UserSelf, type: 'BAN' | 'RESTRICT' | 'UNBAN' | 'PROMOTE_CELEBRITY') => {
    setSelectedUser(user);
    setActionType(type);
    setActionReason(type === 'BAN' ? 'Violation of community safety terms' : '');
    setSelectedRestrictions(user.restrictions || []);
    setModalOpen(true);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await ApiService.executeAdminUserAction({
        user_id: selectedUser.id,
        action: actionType,
        reason: actionReason || 'Admin action executed',
        restrictions: actionType === 'RESTRICT' ? selectedRestrictions : undefined,
        ban_device: actionType === 'BAN' ? banDevice : false
      });
      setModalOpen(false);
      alert(`Action ${actionType} completed successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleResolveReport = async (reportId: string, actionTaken: 'ACTION_TAKEN' | 'DISMISSED') => {
    try {
      await ApiService.resolveAdminReport(reportId, 'Reviewed and resolved by Super Admin', actionTaken);
      alert('Report resolved');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report');
    }
  };

  const toggleRestriction = (code: string) => {
    setSelectedRestrictions(prev =>
      prev.includes(code) ? prev.filter(r => r !== code) : [...prev, code]
    );
  };

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl mt-12 text-white">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-xs text-slate-400 mt-1">This console is reserved exclusively for Super Administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Super Admin Command Center</h1>
          </div>
          <p className="text-xs text-slate-400">
            Platform governance, user restrictions, device blacklists, and incident investigation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab('USERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'USERS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'REPORTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Reports ({reports.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by display name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RESTRICTED">Restricted</option>
              <option value="BANNED">Banned</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
            >
              <option value="">All Roles</option>
              <option value="REGULAR_USER">Regular User</option>
              <option value="CELEBRITY">Celebrity</option>
              <option value="EVENT_HOST">Event Host</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Restrictions</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase text-xs">
                        {u.display_name.slice(0, 2)}
                      </div>
                      <div>
                        <strong className="text-white block">{u.display_name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {u.id.slice(0, 8)}...</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : u.status === 'RESTRICTED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.restrictions && u.restrictions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.restrictions.map((r) => (
                            <span key={r} className="text-[9px] bg-red-950/80 text-red-300 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status === 'BANNED' ? (
                          <button
                            onClick={() => handleOpenActionModal(u, 'UNBAN')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-medium"
                          >
                            Unban
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenActionModal(u, 'RESTRICT')}
                              className="px-2 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-[11px]"
                              title="Limit features"
                            >
                              Limit
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(u, 'BAN')}
                              className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-[11px]"
                              title="Ban user & device"
                            >
                              Ban
                            </button>
                          </>
                        )}
                        {u.role !== 'CELEBRITY' && (
                          <button
                            onClick={() => handleOpenActionModal(u, 'PROMOTE_CELEBRITY')}
                            className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-[11px]"
                            title="Promote to Celebrity"
                          >
                            Promote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Reports Queue Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">User Incident Reports</h2>
          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">All reports are clear. No pending incidents!</div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-400">{rep.reason}</span>
                      <span className="text-[10px] text-slate-500">• {new Date(rep.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Reported User: <strong className="text-white">{rep.reported_user.display_name}</strong> (ID: {rep.reported_user.id})
                    </p>
                    {rep.details && <p className="text-xs text-slate-400 mt-1 italic">"{rep.details}"</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'DISMISSED')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleOpenActionModal(rep.reported_user as any, 'BAN')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl text-xs flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Ban User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation Action Modal */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold mb-1">
              {actionType === 'BAN' && '🛑 Ban User & Terminate Access'}
              {actionType === 'RESTRICT' && '⚠️ Apply Feature Restrictions'}
              {actionType === 'UNBAN' && '✅ Restore User Account'}
              {actionType === 'PROMOTE_CELEBRITY' && '⭐ Promote to Verified Celebrity'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Target: {selectedUser.display_name}</p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Reason / Note</label>
                <textarea
                  rows={2}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain why this action is being taken..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              {actionType === 'BAN' && (
                <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 p-3 rounded-xl">
                  <input
                    type="checkbox"
                    id="banDev"
                    checked={banDevice}
                    onChange={(e) => setBanDevice(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="banDev" className="text-xs text-red-200">
                    <strong>Blacklist Device Hardware Fingerprint</strong> (Prevents re-registering on this phone)
                  </label>
                </div>
              )}

              {actionType === 'RESTRICT' && (
                <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs">
                  <span className="block font-semibold text-slate-300 mb-1">Toggle Granular Restrictions:</span>
                  {[
                    { code: 'DISABLE_RANDOM_VIDEO', label: 'Disable Random Video (Voice Only)' },
                    { code: 'DISABLE_EVENT_HOSTING', label: 'Block from Hosting Events' },
                    { code: 'DISABLE_CALLS', label: 'Disable Outgoing Voice/Video Calls' }
                  ].map((item) => (
                    <label key={item.code} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRestrictions.includes(item.code)}
                        onChange={() => toggleRestriction(item.code)}
                        className="w-4 h-4 text-amber-500 rounded"
                      />
                      <span className="text-slate-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition"
                >
                  Confirm & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
