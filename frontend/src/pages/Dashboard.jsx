import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/axios';
import { Building2, Mail, MapPin, ShieldCheck, UserRound, Users, Settings2, X, Loader2, AlertTriangle, Car, Activity, Calendar, ChevronRight, TrendingUp, Zap, Star } from 'lucide-react';
import FleetAllocation from '../components/FleetAllocation';
import SmartDispatch from '../components/SmartDispatch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ZoneMap from '../components/ZoneMap';
import { motion } from 'framer-motion';

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
                <p className="text-orange-500 text-[10px] font-bold uppercase tracking-wider mb-1">Account Management</p>
                <h3 className="text-2xl font-bold text-white">Configure Profile</h3>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-slate-500 hover:text-white hover:border-orange-500/50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {err && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl p-4 text-sm font-semibold flex items-center gap-3">
                <AlertTriangle size={18} /> {err}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                    <UserRound size={18} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                    placeholder="Enter full name"
                    required minLength={2}
                  />
                </div>
              </div>

              {user?.role === 'operator' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Fleet Capacity</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
                      <Users size={18} />
                    </div>
                    <input
                      type="number"
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-2xl py-3.5 pl-11 pr-4 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
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
                  className="flex-1 py-4 rounded-2xl bg-[#111] border border-[#222] text-sm font-semibold text-slate-400 hover:bg-[#151515] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-4 rounded-2xl bg-orange-500 text-black text-sm font-bold hover:bg-orange-400 disabled:opacity-50 shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center translate-y-0 hover:-translate-y-1 active:translate-y-0"
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
  const location = useLocation();
  const { mode } = useTheme();
  const isDark = mode !== 'light';
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'analytics';

  const [zones, setZones] = useState([]);
  const [trends, setTrends] = useState({ top_zones: [], bottom_zones: [] });
  const [health, setHealth] = useState({ api: 'checking', model: 'checking' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [showAllWatchlist, setShowAllWatchlist] = useState(false);



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
        const [hRes, wRes] = await Promise.all([
          api.get('/'),
          api.get('/intelligence/weather')
        ]);
        setHealth({
          api: 'online',
          model: 'online',
          intelligence: wRes.data ? 'synced' : 'error'
        });
      } catch (err) {
        setHealth({ api: 'offline', model: 'offline', intelligence: 'disconnected' });
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




      {activeTab === 'operations' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

          {/* Operational Watchlist Feature */}
          {user?.role === 'operator' && (
            <section className={`rounded-3xl border backdrop-blur-2xl overflow-hidden p-6 relative shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
              <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <p className="text-orange-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Fleet Monitor</p>
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Priority Watchlist</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-orange-500/5 border border-orange-500/10 text-[9px] font-bold text-orange-400 uppercase tracking-widest">
                    {watchlist.length} ACTIVE ZONES
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                {loadingWatchlist ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>
                ) : watchlist.length === 0 ? (
                  <div className={`text-center py-20 border-2 border-dashed rounded-[40px] ${isDark ? 'border-white/[0.05] bg-white/[0.01]' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-slate-500 font-semibold uppercase tracking-[0.2em] text-[10px]">No Pinned Zones</p>
                    <p className="text-[10px] text-slate-600 uppercase mt-4 font-bold tracking-tight">Pin target neighborhoods from the analytics deck to track live flux.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(showAllWatchlist ? watchlist : watchlist.slice(0, 3)).map(item => {
                        const isHighSurge = item.current_pickups > 10000;
                        return (
                          <motion.div
                            key={item.location_id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5 }}
                            className={`group relative p-6 rounded-[32px] border transition-all duration-500 overflow-hidden ${isHighSurge
                              ? (isDark ? 'bg-[#0a0a0a] border-orange-500/20 shadow-2xl' : 'bg-white border-orange-500/30 shadow-xl')
                              : (isDark ? 'bg-black/40 border-white/[0.04] hover:border-white/[0.1] hover:bg-black/60' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white')
                              }`}
                          >
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] transition-all duration-700 ${isHighSurge ? 'bg-orange-500/[0.08] opacity-100' : 'bg-slate-500/[0.02] opacity-0 group-hover:opacity-100'
                              }`} />

                            <div className="relative z-10 h-full flex flex-col">
                              <div className="flex items-start justify-between mb-8">
                                <div>
                                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 block ${isHighSurge ? 'text-orange-400/60' : 'text-slate-600'}`}>
                                    {item.borough}
                                  </span>
                                  <h4 className={`text-[16px] font-bold tracking-tight leading-tight group-hover:text-orange-500/90 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {item.zone_name}
                                  </h4>
                                </div>
                                <button
                                  onClick={(e) => { e.preventDefault(); toggleWatchlist(item.location_id); }}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-sans ${isDark ? 'bg-black/40 border-white/[0.05]' : 'bg-white border-slate-200'}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              <div className="mt-auto space-y-4">
                                <div>
                                  <p className="text-[9px] text-slate-600 uppercase font-bold tracking-[0.15em] mb-2 flex items-center gap-2">
                                    <Activity size={10} className={isHighSurge ? 'text-orange-500/60' : 'text-slate-700'} />
                                    Flux Intensity
                                  </p>
                                  <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-bold tracking-tighter tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                      {item.current_pickups.toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-orange-500/70">
                                      <TrendingUp size={11} />
                                      <span>+{((item.current_pickups % 5) + 2).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                  <div className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest ${isHighSurge
                                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                    : 'bg-white/5 text-slate-500'
                                    }`}>
                                    {isHighSurge ? 'High Demand' : 'Stable'}
                                  </div>

                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                      <div
                                        key={i}
                                        className={`h-2 w-1.5 rounded-full ${i <= (isHighSurge ? 5 : 2) ? 'bg-orange-500/60' : 'bg-white/5'
                                          }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {watchlist.length > 3 && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => setShowAllWatchlist(!showAllWatchlist)}
                          className={`group flex items-center gap-3 px-8 py-3 border hover:border-orange-500/30 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-xl backdrop-blur-xl ${isDark ? 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'}`}
                        >
                          {showAllWatchlist ? 'Collapse Monitor' : `View Full Watchlist (${watchlist.length - 3} More)`}
                          <ChevronRight className={`transition-transform duration-500 ${showAllWatchlist ? '-rotate-90' : 'rotate-90'}`} size={16} />
                        </button>
                      </div>
                    )}
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
            <section className={`rounded-3xl border backdrop-blur-2xl overflow-hidden p-6 relative shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">Fleet Operations</p>
              <FleetAllocation fleetSize={user.fleet_size} hotspots={trends.top_zones} />
            </section>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Integrated Geographic Intelligence Map */}
          <section className={`rounded-3xl border backdrop-blur-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
            <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="mb-8 relative z-10">
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">Spatial Intelligence</p>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Operations Map</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mt-3 text-sm max-w-2xl leading-relaxed`}>
                    Switch between <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Zone Map</span> for precise geographic pickup density or <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Area Map</span> for a proportional footprint of borough-wide demand gravity.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                    Multi-View Enabled
                  </div>
                </div>
              </div>
            </div>
            <ZoneMap />
          </section>

          {/* Trends Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-3xl border backdrop-blur-2xl p-6 relative overflow-hidden shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">Surging Demand</p>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top 5 Hotspots (Past 7 Days)</h2>
              <p className={`mt-2 text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                City-wide zones with the highest volume of pickups. Use this to position fleets dynamically for maximum revenue.
              </p>
              <div className="space-y-3">
                {trends.top_zones.map((tz, i) => (
                  <div key={tz.location_id} className={`flex flex-row justify-between items-center border backdrop-blur-md rounded-2xl p-4 group transition-colors ${isDark ? 'bg-black/40 border-white/[0.04] hover:bg-black/80' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
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
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{i + 1}. {tz.zone_name}</p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tz.borough}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-semibold">{tz.pickups.toLocaleString()} rides</p>
                    </div>
                  </div>
                ))}
                {trends.top_zones.length === 0 && <p className="text-slate-500 text-sm mt-4">Loading trends...</p>}
              </div>

            </div>

            <div className={`rounded-3xl border backdrop-blur-2xl p-6 relative overflow-hidden shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">Idle Areas</p>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Lowest Traffic (Past 7 Days)</h2>
              <p className={`mt-2 text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Zones suffering from coverage gaps or naturally dead demand. Instruct fleets to keep moving if idle here.
              </p>
              <div className="space-y-3">
                {trends.bottom_zones.map((bz, i) => (
                  <div key={bz.location_id} className={`flex flex-row justify-between items-center border backdrop-blur-md rounded-2xl p-4 transition-colors ${isDark ? 'bg-black/40 border-white/[0.04] hover:bg-black/80' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
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
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{i + 1}. {bz.zone_name}</p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{bz.borough}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-semibold">{bz.pickups.toLocaleString()} rides</p>
                    </div>
                  </div>
                ))}
                {trends.bottom_zones.length === 0 && <p className="text-slate-500 text-sm mt-4">Loading trends...</p>}
              </div>
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
