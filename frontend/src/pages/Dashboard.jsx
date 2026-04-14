import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Building2, Mail, MapPin, ShieldCheck, UserRound, Users, Settings2, X, Loader2, AlertTriangle, Car, Activity, Calendar, ChevronRight, TrendingUp, Zap, Star } from 'lucide-react';
import CityHeatmap from '../components/CityHeatmap';
import FleetAllocation from '../components/FleetAllocation';
import SmartDispatch from '../components/SmartDispatch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ZoneMap from '../components/ZoneMap';

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
        fleet_size: user?.role === 'operator' ? Number(fleetSize) : undefined
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
      <div className="absolute inset-0 bg-[#000]/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
        <div className="rounded-[32px] border border-[#222] bg-[#0a0a0a] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Account Management</p>
                <h3 className="text-2xl font-black text-white">Configure Profile</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-slate-500 hover:text-white hover:border-orange-500/50 transition-all"
              >
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                      <UserRound size={18} />
                   </div>
                   <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                    placeholder="Enter full name"
                    required minLength={2}
                  />
                </div>
              </div>

              {user?.role === 'operator' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Fleet Capacity</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                        <Users size={18} />
                    </div>
                    <input
                      type="number"
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      placeholder="Number of vehicles"
                      required min={1}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium ml-1">Update your total deployable vehicle assets.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-[#111] border border-[#222] text-sm font-bold text-slate-400 hover:bg-[#151515] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-4 rounded-2xl bg-orange-500 text-black text-sm font-black hover:bg-orange-400 disabled:opacity-50 shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center translate-y-0 hover:-translate-y-1 active:translate-y-0"
                >
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


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [trends, setTrends] = useState({ top_zones: [], bottom_zones: [] });
  const [health, setHealth] = useState({ api: 'checking', model: 'checking' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  


  const fetchWatchlist = async () => {
    if (user?.role !== 'operator') return;
    setLoadingWatchlist(true);
    try {
      const res = await api.get('/zones/company');
      setWatchlist(res.data);
    } catch (err) {
      console.error("Failed to load watchlist", err);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const toggleWatchlist = async (locationId) => {
    try {
      await api.post('/zones/watchlist/toggle', { location_id: locationId });
      fetchWatchlist();
    } catch (err) {
      console.error("Failed to toggle watchlist", err);
    }
  };



  const { setTheme, defaultAccent } = useOutletContext() || {};

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/');
        setHealth({ api: 'online', model: 'online' });
      } catch (err) {
        setHealth({ api: 'offline', model: 'offline' });
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!setTheme) return;
    const fallback = defaultAccent || 'orange';
    if (activeTab === 'operations' || activeTab === 'analytics') {
      setTheme('orange');
    } else {
      setTheme(fallback);
    }
    
    return () => setTheme(fallback);
  }, [activeTab, setTheme, defaultAccent]);
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const endpoint = user?.role === 'operator' ? '/zones/company' : '/zones/';
        const res = await api.get(endpoint);

        let availableZones = [];
        if (user?.role === 'operator') {
          availableZones = res.data;
        } else {
          Object.values(res.data).forEach((arr) => {
            availableZones = [...availableZones, ...arr];
          });
        }

        setZones(availableZones);
        
        try {
          const trendsRes = await api.get('/zones/trends');
          setTrends(trendsRes.data);
        } catch (err) {
          console.error("Failed to load trends", err);
        }
      } catch (err) {
        console.error('Failed to load dashboard zones', err);
      }
    };

    if (user) {
      fetchZones();
      fetchWatchlist();
    }
  }, [user]);

  const zonePreview = useMemo(() => zones.slice(0, 4), [zones]);

  const profileStats = [
    {
      label: 'Account Type',
      value: user?.role === 'operator' ? 'Fleet Operator' : 'Driver',
      icon: user?.role === 'operator' ? <Building2 size={18} className="text-orange-500" /> : <UserRound size={18} className="text-orange-500" />,
    },
    {
      label: 'Email',
      value: user?.email || 'No email found',
      icon: <Mail size={18} className="text-orange-500" />,
    },
    {
      label: user?.role === 'operator' ? 'Fleet Size' : 'Available Zones',
      value: user?.role === 'operator' ? `${user?.fleet_size ?? 0} vehicles` : `${zones.length} zones`,
      icon: user?.role === 'operator' ? <Users size={18} className="text-orange-500" /> : <MapPin size={18} className="text-orange-500" />,
    },
  ];



  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      

      {/* Tab Navigation Menu */}
      <div className="flex p-1 bg-[#151515] rounded-2xl border border-[#222] shadow-sm w-fit mx-auto mb-2">
        {(user?.role === 'operator' ? ['profile', 'operations', 'analytics'] : ['profile', 'analytics']).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all capitalize ${
              activeTab === tab 
                ? 'bg-[#252525] text-white shadow-sm border border-[#333]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'analytics' ? 'Market Analytics' : tab === 'profile' ? 'Profile' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
          {/* Identity Hero Banner */}
          <div className="relative overflow-hidden rounded-[32px] border border-[#222] bg-[#0a0a0a] p-8 shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
             
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex flex-col md:flex-row items-center gap-6">
                 {/* Precision Avatar */}
                 <div className="relative">
                   <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] group transition-all">
                      <div className="text-3xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        {user?.name?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center border-2 border-[#0a0a0a] shadow-lg">
                        <ShieldCheck size={12} className="text-black" />
                      </div>
                   </div>
                 </div>
                 
                 <div className="text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                     <h2 className="text-3xl font-extrabold text-white tracking-tight">{user?.name}</h2>
                     <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                       {user?.role === 'operator' ? 'Enterprise' : 'Fleet Pro'}
                     </span>
                   </div>
                   <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                     <Mail size={14} /> {user?.email}
                   </p>
                 </div>
               </div>

               <button 
                 onClick={() => setIsEditingProfile(true)}
                 className="px-6 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5 text-orange-400 text-sm font-bold hover:bg-orange-500/10 hover:border-orange-500/50 transition-all flex items-center gap-2 group"
               >
                 <Settings2 size={16} className="group-hover:rotate-45 transition-transform" /> 
                 Configure Account
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Identity Details Card */}
            <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <UserRound size={18} />
                </div>
                <h3 className="text-white font-bold text-lg">Identity Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                  <span className="text-sm text-slate-500 font-medium">Borough Office</span>
                  <span className="text-sm text-white font-bold">New York City</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                  <span className="text-sm text-slate-500 font-medium">Joined</span>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-orange-500/50" />
                    <span className="text-sm text-white font-bold">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-slate-500 font-medium">System Role</span>
                  <span className="text-sm text-orange-500 font-bold capitalize">{user?.role}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-6">
                 <div className="rounded-2xl bg-orange-500/5 border border-orange-500/10 p-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Status Intelligence</p>
                    <p className="text-xs text-slate-400 leading-relaxed">Your account is in excellent standing with full API access enabled.</p>
                 </div>
              </div>
            </div>

            {/* Intelligence Summary Row */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fleet Health Widget */}
                <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden group hover:border-orange-500/20 transition-all cursor-default">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                      {user?.role === 'operator' ? <Users size={20} /> : <MapPin size={20} />}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Reach</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user?.role === 'operator' ? 'Fleet Capacity' : 'Available Zones'}</h3>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-3xl font-black text-white">{user?.role === 'operator' ? user?.fleet_size : zones.length}</span>
                    <span className="text-sm font-bold text-slate-500 mb-1">{user?.role === 'operator' ? 'Active Vehicles' : 'Zones Mapped'}</span>
                  </div>
                </div>

                {/* System Intelligence Health Widget */}
                <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden group hover:border-orange-500/20 transition-all cursor-default">
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
                    <span className="text-3xl font-black text-white">
                      {health.api === 'online' 
                        ? (user?.role === 'operator' 
                            ? (user?.fleet_size >= 100 ? 'Tier 1' : user?.fleet_size >= 50 ? 'Tier 2' : 'Tier 3')
                            : 'Tier 3')
                        : 'Offline'}
                    </span>
                    <span className={`text-sm font-bold mb-1 flex items-center gap-1 ${health.api === 'online' ? 'text-orange-500' : 'text-red-500'}`}>
                      {health.api === 'online' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />} 
                      {health.api === 'online' ? 'Protected' : 'Connection Lost'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${health.api === 'online' ? 'bg-orange-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">API: Live</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${health.model === 'online' ? 'bg-orange-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SARIMAX: Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Utility Guide / Quick Actions */}
              <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg">Platform Navigation</h3>
                  <div className="px-2 py-0.5 rounded-lg bg-[#111] border border-[#222] text-[10px] font-bold text-slate-500 uppercase">Quick Access</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#111] border border-[#1f1f1f] hover:bg-[#151515] hover:border-orange-500/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Settings2 size={16} />
                      </div>
                      <span className="text-white font-bold text-sm">Settings</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => navigate('/support')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#111] border border-[#1f1f1f] hover:bg-[#151515] hover:border-orange-500/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Users size={16} />
                      </div>
                      <span className="text-white font-bold text-sm">Operator Support</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-[#1a1a1a]">
            <p className="text-slate-500 font-medium tracking-wide text-xs">
              This terminal is optimized for high-velocity operational decisions. Your session is securely encrypted.
            </p>
          </div>
        </div>
      )}



      {activeTab === 'operations' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Operational Watchlist Feature */}
      {user?.role === 'operator' && (
        <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] overflow-hidden p-6 relative shadow-2xl">
          <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-1">Fleet Watchlist</p>
              <h2 className="text-xl font-black text-white">Priority Zones Monitor</h2>
            </div>
            <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-black text-orange-500 uppercase">
              {watchlist.length} Pinned
            </div>
          </div>

          <div className="relative z-10">
            {loadingWatchlist ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[#1a1a1a] rounded-2xl">
                <p className="text-slate-500 font-medium">No zones pinned to your watchlist yet.</p>
                <p className="text-[10px] text-slate-600 uppercase mt-2">Pin zones from the analytics tab to monitor them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlist.map(item => (
                  <div key={item.location_id} className="p-4 rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] hover:border-orange-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div>
                        <h4 className="text-white font-bold text-sm leading-tight group-hover:text-orange-500 transition-colors line-clamp-1">{item.zone_name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{item.borough}</p>
                      </div>
                      <button 
                        onClick={() => toggleWatchlist(item.location_id)}
                        className="p-1.5 rounded-lg bg-[#151515] text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all ml-2"
                        title="Remove from watchlist"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">7D Traffic Balance</p>
                        <p className="text-xl font-black text-white">{item.current_pickups.toLocaleString()}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.current_pickups > 10000 ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-500/10 text-slate-400'}`}>
                        {item.current_pickups > 10000 ? 'HIGH SURGE' : 'STABLE'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Driver AI Dispatch Feature */}
      <section>
        <SmartDispatch />
      </section>

      {/* Mount operational algorithm only for Company/Operators who actually own fleet sizes */}
      {user?.role === 'operator' && (
        <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] overflow-hidden p-6 relative shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Fleet Operations</p>
          <FleetAllocation fleetSize={user.fleet_size} hotspots={trends.top_zones} />
        </section>
      )}
      </div>
      )}

      {activeTab === 'analytics' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Trends Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Surging Demand</p>
          <h2 className="text-2xl font-extrabold text-white">Top 5 Hotspots (Past 7 Days)</h2>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed mb-6">
            City-wide zones with the highest volume of pickups. Use this to position fleets dynamically for maximum revenue.
          </p>
          <div className="space-y-3">
            {trends.top_zones.map((tz, i) => (
              <div key={tz.location_id} className="flex flex-row justify-between items-center bg-[#111] border border-[#252525] rounded-2xl p-4 group">
                <div className="flex items-center gap-4">
                  {user?.role === 'operator' && (
                    <button 
                      onClick={() => toggleWatchlist(tz.location_id)}
                      className={`transition-all ${watchlist.some(w => w.location_id === tz.location_id) ? 'text-orange-500' : 'text-slate-600 hover:text-orange-400'}`}
                    >
                      <Star size={18} fill={watchlist.some(w => w.location_id === tz.location_id) ? "currentColor" : "none"} />
                    </button>
                  )}
                  <div>
                    <p className="text-white font-bold">{i + 1}. {tz.zone_name}</p>
                    <p className="text-slate-400 text-sm">{tz.borough}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">{tz.pickups.toLocaleString()} rides</p>
                </div>
              </div>
            ))}
            {trends.top_zones.length === 0 && <p className="text-slate-500 text-sm mt-4">Loading trends...</p>}
          </div>

        </div>

        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Idle Areas</p>
          <h2 className="text-2xl font-extrabold text-white">Lowest Traffic (Past 7 Days)</h2>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed mb-6">
            Zones suffering from coverage gaps or naturally dead demand. Instruct fleets to keep moving if idle here.
          </p>
          <div className="space-y-3">
            {trends.bottom_zones.map((bz, i) => (
              <div key={bz.location_id} className="flex flex-row justify-between items-center bg-[#111] border border-[#252525] rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  {user?.role === 'operator' && (
                    <button 
                       onClick={() => toggleWatchlist(bz.location_id)}
                       className={`transition-all ${watchlist.some(w => w.location_id === bz.location_id) ? 'text-orange-500' : 'text-slate-600 hover:text-orange-400'}`}
                    >
                      <Star size={18} fill={watchlist.some(w => w.location_id === bz.location_id) ? "currentColor" : "none"} />
                    </button>
                  )}
                  <div>
                    <p className="text-white font-bold">{i + 1}. {bz.zone_name}</p>
                    <p className="text-slate-400 text-sm">{bz.borough}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">{bz.pickups.toLocaleString()} rides</p>
                </div>
              </div>
            ))}
            {trends.bottom_zones.length === 0 && <p className="text-slate-500 text-sm mt-4">Loading trends...</p>}
          </div>
        </div>
      </section>

      {/* Interactive Zone Map */}
      <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 md:p-8">
        <div className="mb-6">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Geographic Intelligence</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Live Zone Map</h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl leading-relaxed">
            Interactive map of all NYC taxi zones. Circle size and color reflect demand volume — hover over zones for details. Red = very high demand, Gold = low demand.
          </p>
        </div>
        <ZoneMap />
      </section>

      {/* Global Heatmap Section */}
      <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 md:p-8">
        <div className="mb-8">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Global Macro Tracking</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">City Demand Heatmap</h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl leading-relaxed">
            A proportional geographic footprint of every New York City zone simultaneously. Larger, brighter blocks represent zones dictating the absolute highest physical traffic gravity over the last 7 days.
          </p>
        </div>
        
        <div className="border border-[#222] rounded-[24px] bg-[#050505] overflow-hidden p-2">
          <CityHeatmap />
        </div>
      </section>
      </div>
      )}

      {isEditingProfile && (
        <EditProfileModal user={user} onClose={() => setIsEditingProfile(false)} />
      )}
    </div>
  );
}
