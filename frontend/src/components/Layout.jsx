import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, MapPinned, Activity, LogOut, Home, Settings } from 'lucide-react';

const ACCENT_CSS_MAP = {
  orange:  { '400': '#fb923c', '500': '#f97316', '600': '#ea580c', glow: '249,115,22' },
  amber:   { '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', glow: '245,158,11' },
  emerald: { '400': '#34d399', '500': '#10b981', '600': '#059669', glow: '16,185,129' },
  blue:    { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', glow: '59,130,246' },
  violet:  { '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', glow: '139,92,246' },
  rose:    { '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', glow: '244,63,94' },
  cyan:    { '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', glow: '6,182,212' },
  maroon:  { '400': '#8e2b4b', '500': '#6e1a37', '600': '#521329', glow: '110,26,55' },
};

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();

  const [defaultAccent, setDefaultAccent] = useState(() => localStorage.getItem('ds_accent') || 'orange');
  const [theme, setTheme] = useState(defaultAccent);

  // Sync CSS custom properties to :root whenever the default accent changes
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

  // Apply saved theme mode on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('ds_mode') || 'dark';
    document.documentElement.setAttribute('data-mode', savedMode);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  ];

  if (user.role === 'operator') {
    navItems.push({ label: 'Zone Management', path: '/zones', icon: <MapPinned size={20} /> });
  }

  navItems.push({ label: 'Demand Forecast', path: '/forecast', icon: <Activity size={20} /> });



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
  const ui = themeColors[theme] || themeColors.orange;

  return (
    <div className={`min-h-screen bg-[#050505] flex font-sans ${ui.ring} text-slate-300`}>
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0a0a] border-r border-[#222] flex flex-col hidden md:flex z-10 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <Link to="/" className="p-6 flex items-center gap-3 border-b border-[#222] hover:bg-[#111] transition-colors">
          <div className={`p-2 ${ui.bg} border ${ui.border} rounded-lg ${ui.glow}`}>
            <Activity size={20} className={ui.main} />
          </div>
          <span className="font-bold text-lg text-white">DemandSight</span>
        </Link>
        
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-3">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? `${ui.bg} ${ui.main} border ${ui.border} shadow-sm` 
                    : 'text-slate-400 hover:bg-[#151515] border border-transparent hover:border-[#333] hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-[#222] bg-[#0a0a0a]">
          <div className="flex items-center justify-between px-3 py-3 bg-[#111] border border-[#222] rounded-xl hover:bg-[#141414] transition-colors">
            <div className="truncate flex-1">
              <p className="text-sm font-bold text-white truncate">{user.name || user.sub}</p>
              <p className={`text-xs ${ui.textSm} font-medium uppercase tracking-wider mt-0.5`}>{user.role}</p>
            </div>
            <button 
              onClick={logout} 
              className="p-2.5 ml-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050505]">
        <header className="bg-[#0a0a0a] border-b border-[#222] p-4 flex items-center justify-between md:hidden shadow-md relative z-20">
           <Link to="/" className="flex items-center gap-3">
            <div className={`p-1.5 ${ui.bg} border ${ui.border} rounded-md`}>
               <Activity size={20} className={ui.main} />
            </div>
            <span className="font-bold text-lg text-white">DemandSight</span>
          </Link>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors">
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {/* Subtle background glow for all inner pages */}
          <div className={`absolute top-0 right-0 w-[600px] h-[600px] ${ui.bgStrong} rounded-full blur-[120px] pointer-events-none`} />
          <div className="relative z-10 h-full">
            <Outlet context={{ setTheme, defaultAccent, setDefaultAccent }} />
          </div>
        </main>
      </div>
    </div>
  );
}
