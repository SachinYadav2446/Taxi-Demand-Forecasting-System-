import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Settings, Palette, Lock, Sun, Moon, Check, AlertTriangle, Eye, EyeOff, ChevronRight, Shield, User, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { setTheme } = useOutletContext() || {};
  const navigate = useNavigate();

  const [mode, setMode] = useState(() => localStorage.getItem('ds_mode') || 'dark');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (setTheme) setTheme('orange');
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('ds_mode', mode);
  }, [mode]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setPwSuccess('Password updated successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to update password.');
    } finally { setPwLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Settings size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-slate-500 text-xs">Manage your preferences</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-slate-400 hover:text-white transition-all text-xs font-bold cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      {/* ===== APPEARANCE ===== */}
      <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#222] flex items-center gap-2">
          <Palette size={15} className="text-orange-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appearance</span>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <button
              onClick={() => setMode('dark')}
              className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer group ${
                mode === 'dark'
                  ? 'border-orange-500/60 bg-orange-500/5'
                  : 'border-[#222] hover:border-[#333] bg-[#111]'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'dark' ? 'bg-orange-500/15' : 'bg-[#1a1a1a]'}`}>
                <Moon size={18} className={mode === 'dark' ? 'text-orange-400' : 'text-slate-500'} />
              </div>
              <div className="text-left flex-1">
                <p className={`text-sm font-semibold ${mode === 'dark' ? 'text-white' : 'text-slate-400'}`}>Dark Mode</p>
                <p className="text-xs text-slate-500">Easy on the eyes</p>
              </div>
              {mode === 'dark' && <Check size={16} className="text-orange-400" />}
            </button>

            <button
              onClick={() => setMode('light')}
              className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer group ${
                mode === 'light'
                  ? 'border-orange-500/60 bg-orange-500/5'
                  : 'border-[#222] hover:border-[#333] bg-[#111]'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'light' ? 'bg-orange-500/15' : 'bg-[#1a1a1a]'}`}>
                <Sun size={18} className={mode === 'light' ? 'text-orange-400' : 'text-slate-500'} />
              </div>
              <div className="text-left flex-1">
                <p className={`text-sm font-semibold ${mode === 'light' ? 'text-white' : 'text-slate-400'}`}>Light Mode</p>
                <p className="text-xs text-slate-500">Warm cream theme</p>
              </div>
              {mode === 'light' && <Check size={16} className="text-orange-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== SECURITY ===== */}
      <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#222] flex items-center gap-2">
          <Shield size={15} className="text-orange-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security</span>
        </div>
        <div className="p-4">
          {pwSuccess && (
            <div className="mb-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg px-3 py-2 text-xs font-medium">
              <Check size={14} /> {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs font-medium">
              <AlertTriangle size={14} /> {pwError}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Current Password</label>
                <div className="relative">
                  <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 pr-9 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 pr-9 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={pwLoading}
              className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white text-sm font-bold transition-all disabled:opacity-50 cursor-pointer">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* ===== ACCOUNT INFO ===== */}
      <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#222] flex items-center gap-2">
          <User size={15} className="text-orange-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</span>
        </div>
        <div className="divide-y divide-[#222]">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role, capitalize: true },
            { label: 'User ID', value: `#${user?.id}`, mono: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
              <span className="text-slate-500 text-sm">{item.label}</span>
              <span className={`text-sm font-medium text-white ${item.capitalize ? 'capitalize' : ''} ${item.mono ? 'font-mono text-slate-400' : ''}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
