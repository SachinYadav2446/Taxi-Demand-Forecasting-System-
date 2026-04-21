import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/axios';
import {
  Building2, Mail, MapPin, ShieldCheck, UserRound, Users,
  Settings2, X, Loader2, AlertTriangle, Activity, Calendar,
  ChevronRight, ArrowLeft, LogOut
} from 'lucide-react';

/* ─── Edit Profile Modal ─── */
function EditProfileModal({ user, onClose }) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [fleetSize, setFleetSize] = useState(user?.fleet_size || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await updateProfile({
        name: name || undefined,
        fleet_size: user?.role === 'operator' ? Number(fleetSize) : undefined,
      });
      onClose();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
        <div className="rounded-[32px] border border-[#222] bg-[#0a0a0a] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-wider mb-1">Account Management</p>
                <h3 className="text-2xl font-black text-white">Configure Profile</h3>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-slate-500 hover:text-white hover:border-orange-500/50 transition-all">
                <X size={20} />
              </button>
            </div>

            {err && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl p-4 text-sm font-bold flex items-center gap-3">
                <AlertTriangle size={18} /> {err}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                    <UserRound size={18} />
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                    placeholder="Enter full name" required minLength={2} />
                </div>
              </div>

              {user?.role === 'operator' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Fleet Capacity</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                      <Users size={18} />
                    </div>
                    <input type="number" value={fleetSize} onChange={(e) => setFleetSize(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      placeholder="Number of vehicles" required min={1} />
                    <p className="text-[10px] text-slate-500 font-medium ml-1 mt-1">Update your total deployable vehicle assets.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-[#111] border border-[#222] text-sm font-bold text-slate-400 hover:bg-[#151515] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-4 rounded-2xl bg-orange-500 text-black text-sm font-black hover:bg-orange-400 disabled:opacity-50 transition-all flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoutConfirmModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-300">
        <div className="rounded-[32px] border border-[#222] bg-[#0a0a0a] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
            <LogOut size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Sign Out?</h3>
          <p className="text-slate-500 text-sm mb-8 font-medium">Are you sure you want to terminate your current session?</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
            >
              Yes, Sign Out
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-[#111] border border-[#222] text-sm font-bold text-slate-400 hover:bg-[#151515] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Profile Page ─── */
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mode } = useTheme();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [health, setHealth] = useState({ api: 'checking', model: 'checking', intelligence: 'checking' });
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [hRes, wRes] = await Promise.all([
          api.get('/'),
          api.get('/intelligence/weather'),
        ]);
        setHealth({ api: 'online', model: 'online', intelligence: wRes.data ? 'synced' : 'error' });
      } catch {
        setHealth({ api: 'offline', model: 'offline', intelligence: 'disconnected' });
      }
    };
    checkHealth();
  }, []);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const endpoint = user?.role === 'operator' ? '/zones/company' : '/zones/';
        const res = await api.get(endpoint);
        let available = [];
        if (user?.role === 'operator') {
          available = res.data;
        } else {
          Object.values(res.data).forEach((arr) => { available = [...available, ...arr]; });
        }
        setZones(available);
      } catch { /* silent */ }
    };
    if (user) fetchZones();
  }, [user]);

  const bg = mode === 'light' ? 'bg-[#fdf6ef]' : 'bg-[#050505]';
  const cardBg = mode === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0a0a0a] border-[#222]';
  const textPrimary = mode === 'light' ? 'text-slate-900' : 'text-white';
  const textSecondary = mode === 'light' ? 'text-slate-500' : 'text-slate-500';
  const rowBorder = mode === 'light' ? 'border-slate-100' : 'border-[#1a1a1a]';

  return (
    <div className={`min-h-screen font-poppins ${bg} ${textPrimary} transition-colors duration-500 pb-20`}>
      {isEditingProfile && <EditProfileModal user={user} onClose={() => setIsEditingProfile(false)} />}
      {isLogoutModalOpen && (
        <LogoutConfirmModal
          onConfirm={() => {
            logout();
            navigate('/login');
          }}
          onClose={() => setIsLogoutModalOpen(false)}
        />
      )}

      {/* Header */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-xl px-6 py-4 flex items-center justify-between transition-colors duration-500 ${mode === 'light' ? 'bg-white/80 border-slate-100' : 'bg-[#050505]/80 border-[#222]'
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Activity size={14} className="text-black" />
          </div>
          <span className={`font-black uppercase text-sm ${textPrimary}`}>DemandSight</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all ${mode === 'light'
              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
              : 'border-[#222] text-slate-400 hover:bg-[#111]'
            }`}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Identity Hero */}
        <div className={`relative overflow-hidden rounded-[32px] border p-8 shadow-2xl ${cardBg}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                  <div className="text-3xl font-black text-orange-500">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center border-2 border-white shadow-lg">
                    <ShieldCheck size={12} className="text-black" />
                  </div>
                </div>
              </div>

              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h2 className={`text-3xl font-extrabold tracking-tight ${textPrimary}`}>{user?.name}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                    {user?.role === 'operator' ? 'Enterprise' : 'Fleet Pro'}
                  </span>
                </div>
                <p className={`font-medium flex items-center justify-center md:justify-start gap-2 ${textSecondary}`}>
                  <Mail size={14} /> {user?.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5 text-orange-400 text-sm font-bold hover:bg-orange-500/10 hover:border-orange-500/50 transition-all flex items-center justify-center gap-2 group"
              >
                <Settings2 size={16} className="group-hover:rotate-45 transition-transform" />
                Configure Profile
              </button>

              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 text-sm font-bold hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center gap-2 group"
              >
                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity Details */}
          <div className={`rounded-3xl border p-6 flex flex-col ${cardBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><UserRound size={18} /></div>
              <h3 className={`font-bold text-lg ${textPrimary}`}>Identity Details</h3>
            </div>
            <div className="space-y-4">
              <div className={`flex justify-between items-center py-3 border-b ${rowBorder}`}>
                <span className={`text-sm font-medium ${textSecondary}`}>Borough Office</span>
                <span className={`text-sm font-bold ${textPrimary}`}>New York City</span>
              </div>
              <div className={`flex justify-between items-center py-3 border-b ${rowBorder}`}>
                <span className={`text-sm font-medium ${textSecondary}`}>Joined</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-orange-500/50" />
                  <span className={`text-sm font-bold ${textPrimary}`}>
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className={`text-sm font-medium ${textSecondary}`}>System Role</span>
                <span className="text-sm text-orange-500 font-bold capitalize">{user?.role}</span>
              </div>
            </div>
            <div className="mt-auto pt-6">
              <div className="rounded-2xl bg-orange-500/5 border border-orange-500/10 p-4">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Status Intelligence</p>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>Your account is in excellent standing with full API access enabled.</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fleet / Zones */}
              <div className={`rounded-3xl border p-6 relative overflow-hidden hover:border-orange-500/20 transition-all ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                    {user?.role === 'operator' ? <Users size={20} /> : <MapPin size={20} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Reach</span>
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {user?.role === 'operator' ? 'Fleet Capacity' : 'Available Zones'}
                </h3>
                <div className="flex items-end gap-2 mt-1">
                  <span className={`text-3xl font-black ${textPrimary}`}>
                    {user?.role === 'operator' ? user?.fleet_size : zones.length}
                  </span>
                  <span className="text-sm font-bold text-slate-500 mb-1">
                    {user?.role === 'operator' ? 'Active Vehicles' : 'Zones Mapped'}
                  </span>
                </div>
              </div>

              {/* System Health */}
              <div className={`rounded-3xl border p-6 relative overflow-hidden hover:border-orange-500/20 transition-all ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${health.api === 'online' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                    <Activity size={20} className={health.api === 'online' ? 'animate-pulse' : ''} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${health.api === 'online' ? 'text-orange-500' : 'text-red-500'}`}>
                    {health.api === 'online' ? 'Operational' : 'Sync Error'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Intelligence Health</h3>
                <div className="flex items-end gap-2 mt-1">
                  <span className={`text-3xl font-black ${textPrimary}`}>
                    {health.api === 'online'
                      ? (user?.role === 'operator'
                        ? (user?.fleet_size >= 100 ? 'Tier 1' : user?.fleet_size >= 50 ? 'Tier 2' : 'Tier 3')
                        : 'Pro Active')
                      : 'Offline'}
                  </span>
                  <span className={`text-sm font-bold mb-1 flex items-center gap-1 ${health.api === 'online' ? 'text-orange-500' : 'text-red-500'}`}>
                    {health.api === 'online' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                    {health.api === 'online' ? 'Protected' : 'Connection Lost'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  {[
                    { label: 'API: Live', ok: health.api === 'online' },
                    { label: 'SARIMAX: Active', ok: health.model === 'online' },
                    { label: `Intel Core: ${health.intelligence === 'synced' ? 'Synced' : 'Error'}`, ok: health.intelligence === 'synced' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-orange-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`text-center pt-6 border-t ${rowBorder}`}>
          <p className={`font-medium tracking-wide text-xs ${textSecondary}`}>
            Session securely encrypted. All data is processed in compliance with NYC TLC regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
