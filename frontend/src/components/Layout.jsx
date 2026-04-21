import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPinned, Activity, LogOut, Home, Zap, TrendingUp,
  Building2, ChevronLeft, ChevronRight, Sparkles, User
} from 'lucide-react';

const ACCENT_CSS_MAP = {
  orange: { '400': '#fb923c', '500': '#f97316', '600': '#ea580c', glow: '249,115,22' },
  amber: { '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', glow: '245,158,11' },
  emerald: { '400': '#34d399', '500': '#10b981', '600': '#059669', glow: '16,185,129' },
  blue: { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', glow: '59,130,246' },
  violet: { '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', glow: '139,92,246' },
  rose: { '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', glow: '244,63,94' },
  cyan: { '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', glow: '6,182,212' },
  maroon: { '400': '#8e2b4b', '500': '#6e1a37', '600': '#521329', glow: '110,26,55' },
};

const themeColors = {
  orange: { main: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', textSm: 'text-orange-400', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.1)]', bgStrong: 'bg-orange-600/5', ring: 'selection:bg-orange-500/30 selection:text-orange-200' },
  amber: { main: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', textSm: 'text-amber-400', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.1)]', bgStrong: 'bg-amber-600/5', ring: 'selection:bg-amber-500/30 selection:text-amber-200' },
  emerald: { main: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', textSm: 'text-emerald-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.1)]', bgStrong: 'bg-emerald-600/5', ring: 'selection:bg-emerald-500/30 selection:text-emerald-200' },
  green: { main: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', textSm: 'text-emerald-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.1)]', bgStrong: 'bg-emerald-600/5', ring: 'selection:bg-emerald-500/30 selection:text-emerald-200' },
  blue: { main: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', textSm: 'text-blue-400', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.1)]', bgStrong: 'bg-blue-600/5', ring: 'selection:bg-blue-500/30 selection:text-blue-200' },
  violet: { main: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', textSm: 'text-violet-400', glow: 'shadow-[0_0_10px_rgba(139,92,246,0.1)]', bgStrong: 'bg-violet-600/5', ring: 'selection:bg-violet-500/30 selection:text-violet-200' },
  rose: { main: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', textSm: 'text-rose-400', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.1)]', bgStrong: 'bg-rose-600/5', ring: 'selection:bg-rose-500/30 selection:text-rose-200' },
  cyan: { main: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', textSm: 'text-cyan-400', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.1)]', bgStrong: 'bg-cyan-600/5', ring: 'selection:bg-cyan-500/30 selection:text-cyan-200' },
  maroon: { main: 'text-maroon-500', bg: 'bg-maroon-500/10', border: 'border-maroon-500/20', textSm: 'text-maroon-400', glow: 'shadow-[0_0_10px_rgba(110,26,55,0.1)]', bgStrong: 'bg-maroon-600/5', ring: 'selection:bg-maroon-500/30 selection:text-maroon-200' },
};

function LogoutConfirmModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-300">
        <div className="rounded-[32px] border border-white/[0.08] bg-[#0a0a0a] overflow-hidden p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
            <LogOut size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Terminate Session?</h3>
          <p className="text-slate-500 text-sm mb-8 font-medium">Are you sure you want to sign out of your dashboard?</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)] uppercase tracking-widest"
            >
              Yes, Sign Out
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-[#111] border border-white/[0.05] text-sm font-bold text-slate-400 hover:bg-[#151515] transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper: check if a nav item is the active route ─── */
function isNavActive(item, location) {
  const basePath = item.path.split('?')[0];
  const hasParam = item.path.includes('?');
  const activeQueryParam = hasParam ? item.path.split('?')[1] : null;

  if (location.pathname !== basePath) return false;
  if (activeQueryParam) return location.search.includes(activeQueryParam);
  return !location.search.includes('tab=');
}

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const { mode } = useTheme();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [defaultAccent, setDefaultAccent] = useState(() => localStorage.getItem('ds_accent') || 'orange');
  const [theme, setTheme] = useState(defaultAccent);

  /* ── Intelligent Collapsible Sidebar Logic ── */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const autoCloseTimerRef = useRef(null);

  const startAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 60000); // 60 seconds of focus time
  }, []);

  useEffect(() => {
    const resetTimer = () => {
      if (isSidebarOpen) startAutoCloseTimer();
    };

    if (isSidebarOpen) {
      startAutoCloseTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('mousedown', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer, true);
    } else {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    }

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer, true);
    };
  }, [isSidebarOpen, startAutoCloseTimer]);

  // Sync CSS custom properties
  useEffect(() => {
    const colors = ACCENT_CSS_MAP[defaultAccent] || ACCENT_CSS_MAP.emerald;
    const root = document.documentElement.style;
    root.setProperty('--accent-400', colors['400']);
    root.setProperty('--accent-500', colors['500']);
    root.setProperty('--accent-600', colors['600']);
    root.setProperty('--accent-glow', colors.glow);
    root.setProperty('--accent-muted', `rgba(${colors.glow}, 0.1)`);
    root.setProperty('--accent-border', `rgba(${colors.glow}, 0.2)`);
  }, [defaultAccent]);

  const navItems = [];
  if (user) {
    navItems.push({ label: 'Platform Home', path: '/', icon: <Home size={16} /> });
    navItems.push({ label: 'Market Analytics', path: '/dashboard', icon: <TrendingUp size={16} /> });
    if (user.role === 'operator') {
      navItems.push({ label: 'Operations', path: '/dashboard?tab=operations', icon: <Zap size={16} /> });
      navItems.push({ label: 'Zone Management', path: '/zones', icon: <MapPinned size={16} /> });
    }
    navItems.push({ label: 'Demand Forecast', path: '/forecast', icon: <Activity size={16} /> });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }



  const isDark = mode !== 'light';
  const textPrimary = 'text-white';
  const textMuted = 'text-slate-500';

  return (
    <div className="min-h-screen bg-[#020202] text-white flex font-poppins selection:bg-orange-500/30 overflow-hidden relative">
      {isLogoutModalOpen && (
        <LogoutConfirmModal
          onConfirm={() => {
            logout();
          }}
          onClose={() => setIsLogoutModalOpen(false)}
        />
      )}

      {/* Floating Toggle (Visible when sidebar is closed) */}
      <div className="fixed top-1/2 -translate-y-1/2 left-0 z-[60] flex items-center pointer-events-none">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`pointer-events-auto ml-2 p-3.5 rounded-2xl bg-[#0a0a0b]/90 border border-white/[0.08] backdrop-blur-3xl text-slate-400 hover:text-orange-500 hover:border-orange-500/30 transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)] ${isSidebarOpen ? 'opacity-0 scale-75 -translate-x-12' : 'opacity-100 scale-100 translate-x-0'} duration-[800ms] flex flex-col items-center gap-4 py-8 group overflow-hidden`}
        >
          <ChevronRight size={20} className="animate-pulse group-hover:text-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] [writing-mode:vertical-lr] rotate-180 group-hover:text-white transition-colors">Workspace</span>
        </button>
      </div>


      {/* ══════════════════════════════════════════
          SIDEBAR NAVIGATION (Desktop)
         ══════════════════════════════════════════ */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-[260px] hidden lg:flex flex-col border-r border-white/[0.05] bg-[#080808] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center px-6 py-8 shrink-0 border-b border-white/[0.03]">
          <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-500">
              <Activity size={20} className="text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[17px] tracking-tight text-white leading-none uppercase">DemandSight</span>
              <span className="text-[9px] font-semibold tracking-[0.25em] text-orange-500/60 uppercase mt-1">Intelligence</span>
            </div>
          </div>
        </div>

        {/* Retractable Close Button (Vertically Centered on edge) */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className={`absolute top-1/2 -translate-y-1/2 -right-4 z-50 w-8 h-12 flex items-center justify-center rounded-r-xl bg-[#080808] border border-white/[0.05] border-l-0 text-slate-500 hover:text-orange-500 hover:w-10 transition-all group ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Navigation Area */}
        <nav className="flex-1 w-full px-4 py-8 space-y-3 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500/50 mb-5">Command Deck</p>
          {navItems.map((item) => {
            const active = isNavActive(item, location);
            return (
              <Link
                key={item.label}
                to={item.path}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden ${active ? 'text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.02]'
                  }`}
              >
                {active && (
                  <motion.div

                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/[0.01] border border-orange-500/20 shadow-inner"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                {active && (
                  <motion.div

                    className="absolute left-0 top-1/4 bottom-1/4 w-[3.5px] bg-orange-500 rounded-r-xl shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div className={`relative z-10 flex items-center justify-center ${active ? 'text-orange-500' : 'group-hover:text-orange-400 transition-colors'}`}>
                  {item.icon}
                </div>

                <span className="relative z-10 text-[13px] font-bold tracking-wide uppercase">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Terminate Session */}
        <div className="p-4 border-t border-white/[0.05] shrink-0 bg-black/40 backdrop-blur-3xl">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center group overflow-hidden relative">
              <User size={18} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[13px] font-bold text-white truncate">{user.name || user.email}</span>
              <span className="text-[9px] text-orange-500/60 font-bold uppercase tracking-widest">{user.role}</span>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-white/[0.05] text-slate-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 bg-black/40"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header (Fixed Top) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 px-5 py-4 border-b border-white/[0.05] flex justify-between items-center backdrop-blur-3xl bg-black/80">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
            <Activity size={18} className="text-black" />
          </div>
          <span className="font-bold uppercase tracking-tight text-white text-sm">DemandSight</span>
        </Link>
        <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 rounded-xl bg-red-500/10 text-red-500">
          <LogOut size={16} />
        </button>
      </header>

      {/* Mobile Nav (Fixed Bottom) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.05] flex justify-around items-center px-4 py-4 backdrop-blur-3xl bg-black/90 pb-safe">
        {navItems.map((item) => {
          const active = isNavActive(item, location);
          return (
            <Link key={item.label} to={item.path} className={`relative flex flex-col items-center gap-1.5 p-2 transition-all ${active ? 'text-orange-500' : 'text-slate-600'}`}>
              {active && <motion.div layoutId="mobileIndicator" className="absolute -top-[17px] w-full h-[3px] bg-orange-500 rounded-b-full shadow-[0_0_15px_rgba(249,115,22,0.8)]" />}
              {item.icon}
              <span className="text-[9px] font-bold uppercase">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* ══════════════════════════════════════════
          MAIN CONTENT AREA
         ══════════════════════════════════════════ */}
      <main
        className={`flex-1 relative h-screen overflow-y-auto scroll-smooth custom-scrollbar transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}
      >
        <div className="pt-24 lg:pt-10 px-4 md:px-10 pb-32 lg:pb-16 max-w-[1600px] mx-auto min-h-full">
          <Outlet context={{ setTheme, defaultAccent, setDefaultAccent }} />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(249, 115, 22, 0.2); }
      `}} />
    </div>
  );
}
