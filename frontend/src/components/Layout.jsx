import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, MapPinned, Activity, LogOut } from 'lucide-react';

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans selection:bg-orange-500/30 selection:text-orange-200 text-slate-300">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0a0a] border-r border-[#222] flex flex-col hidden md:flex z-10 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <Link to="/" className="p-6 flex items-center gap-3 border-b border-[#222] hover:bg-[#111] transition-colors">
          <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg shadow-[0_0_10px_rgba(249,115,22,0.1)]">
            <Activity size={20} className="text-orange-500" />
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
                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm' 
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
              <p className="text-xs text-orange-400 font-medium uppercase tracking-wider mt-0.5">{user.role}</p>
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
            <div className="p-1.5 bg-orange-500/10 border border-orange-500/20 rounded-md">
               <Activity size={20} className="text-orange-500" />
            </div>
            <span className="font-bold text-lg text-white">DemandSight</span>
          </Link>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors">
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {/* Subtle background glow for all inner pages */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
