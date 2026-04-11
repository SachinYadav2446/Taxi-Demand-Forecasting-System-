import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Building2, Mail, MapPin, ShieldCheck, UserRound, Users, Settings2, X, Loader2, AlertTriangle, Car } from 'lucide-react';
import CityHeatmap from '../components/CityHeatmap';
import FleetAllocation from '../components/FleetAllocation';
import SmartDispatch from '../components/SmartDispatch';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-[#333] bg-[#0f0f0f] p-6 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6">Edit Profile Settings</h2>
        
        {err && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg p-3 text-sm font-medium">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
              required minLength={2}
            />
          </div>

          {user?.role === 'operator' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Fleet Size</label>
              <input 
                type="number" 
                value={fleetSize} 
                onChange={e => setFleetSize(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                required min={1}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#333] text-white font-bold hover:bg-[#222] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center min-w-[120px] transition-colors"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [trends, setTrends] = useState({ top_zones: [], bottom_zones: [] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const { setTheme, defaultAccent } = useOutletContext() || {};
  
  useEffect(() => {
    if (!setTheme) return;
    const fallback = defaultAccent || 'orange';
    if (activeTab === 'overview') setTheme('amber');
    else if (activeTab === 'operations') setTheme('emerald');
    else if (activeTab === 'analytics') setTheme('blue');
    else setTheme(fallback);
    
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
    }
  }, [user]);

  const zonePreview = useMemo(() => zones.slice(0, 4), [zones]);

  const profileStats = [
    {
      label: 'Account Type',
      value: user?.role === 'operator' ? 'Fleet Operator' : 'Driver',
      icon: user?.role === 'operator' ? <Building2 size={18} className="text-amber-500" /> : <UserRound size={18} className="text-amber-500" />,
    },
    {
      label: 'Email',
      value: user?.email || 'No email found',
      icon: <Mail size={18} className="text-amber-500" />,
    },
    {
      label: user?.role === 'operator' ? 'Fleet Size' : 'Available Zones',
      value: user?.role === 'operator' ? `${user?.fleet_size ?? 0} vehicles` : `${zones.length} zones`,
      icon: user?.role === 'operator' ? <Users size={18} className="text-amber-500" /> : <MapPin size={18} className="text-amber-500" />,
    },
  ];



  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      

      {/* Tab Navigation Menu */}
      <div className="flex p-1 bg-[#151515] rounded-2xl border border-[#222] shadow-sm w-fit mx-auto mb-2">
        {['profile', 'overview', 'operations', 'analytics'].map((tab) => (
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
        <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative w-full max-w-2xl rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#1a0f05] via-[#050505] to-[#050505] overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.1)] p-1 justify-center z-10">
            <div className="absolute top-0 right-0 w-full h-[120px] opacity-10 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 20 20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\\' fill=\\'%23f97316\\' fill-opacity=\\'1\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')" }}></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            <div className="bg-[#0b0b0b] rounded-[26px] p-8 md:p-12 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative hidden sm:block">
                   <div className="w-32 h-32 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center relative shadow-[0_0_40px_rgba(249,115,22,0.3)] group hover:scale-105 transition-transform duration-300">
                      <div className="absolute inset-0 rounded-full border-t border-orange-400 mix-blend-overlay animate-spin-slow" />
                      <Car size={56} className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] group-hover:text-yellow-400 transition-colors" />
                   </div>
                   <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-[#0b0b0b]">
                     {user?.role === 'operator' ? 'Operator' : 'Driver'}
                   </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-2 sm:hidden">
                    <Car size={32} className="text-orange-500" />
                    <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-[#0b0b0b]">{user?.role === 'operator' ? 'Operator' : 'Driver'}</span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">{user?.name || 'Driver Unknown'}</h2>
                  <p className="text-slate-400 mt-2 font-medium">{user?.email}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
                       <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Status</p>
                       <p className="text-emerald-400 font-bold flex items-center gap-2 justify-center md:justify-start">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Duty
                       </p>
                    </div>
                    <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
                       <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                         {user?.role === 'operator' ? 'Fleet Size' : 'Zones'}
                       </p>
                       <p className="text-white font-bold">
                         {user?.role === 'operator' ? `${user?.fleet_size ?? 0} Vehicles` : `${zones.length} Active`}
                       </p>
                    </div>
                  </div>
                  
                  <button 
                     onClick={() => setIsEditingProfile(true)}
                     className="mt-6 w-full py-3 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 font-bold rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Configure Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-slate-500 mt-8 font-medium tracking-wide text-sm">Select a module above to enter the command center.</p>
        </div>
      )}

      {activeTab === 'overview' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="relative overflow-hidden rounded-[32px] border border-[#222] bg-[linear-gradient(135deg,#111_0%,#0c0c0c_58%,#1c1108_100%)] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-[360px] h-[360px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Dashboard</p>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 mt-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-bold hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors flex items-center gap-2"
              >
                <Settings2 size={16} /> Edit Profile
              </button>
            </div>
            <p className="text-slate-400 mt-3 max-w-2xl leading-relaxed">
              This is your signed-in home. Review your account details, current zone coverage, and get ready to jump into demand forecasting or zone management.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {profileStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#262626] bg-[#0d0d0d]/90 p-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="text-white font-bold text-lg mt-2 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#262626] bg-[#0b0b0b]/90 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Account Summary</p>
                <h2 className="text-xl font-extrabold text-white mt-2">Signed-in overview</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldCheck size={20} className="text-amber-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Primary User</p>
                <p className="text-white text-lg font-bold mt-2">{user?.name}</p>
                <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
              </div>

              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Zone Coverage</p>
                <p className="text-white text-3xl font-black mt-2">{zones.length}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {user?.role === 'operator' ? 'Zones mapped to your fleet operations.' : 'Zones available for your demand exploration.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Quick Next Step</p>
                <p className="text-white text-lg font-bold mt-2">
                  {user?.role === 'operator' ? 'Manage zones or open forecasts' : 'Open demand forecast'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Use the sidebar to move between your operational tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Zone Snapshot</p>
          <h2 className="text-2xl font-extrabold text-white">Your current zone visibility</h2>
          <p className="text-slate-400 mt-3 leading-relaxed">
            {user?.role === 'operator'
              ? 'These are the zones currently tied to your fleet account. Update them anytime from Zone Management.'
              : 'These are sample zones you can inspect in the demand forecast workspace.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {zonePreview.length > 0 ? zonePreview.map((zone) => (
              <div key={zone.location_id} className="rounded-2xl border border-[#252525] bg-[#111] p-4">
                <p className="text-white font-bold">{zone.zone_name}</p>
                <p className="text-slate-400 text-sm mt-1">{zone.borough}</p>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-3">
                  Zone {zone.location_id}
                </p>
              </div>
            )) : (
              <div className="sm:col-span-2 rounded-2xl border border-[#252525] bg-[#111] p-6 text-center">
                <p className="text-white font-bold">No zones available yet</p>
                <p className="text-slate-400 text-sm mt-2">
                  {user?.role === 'operator'
                    ? 'Map your zones from Zone Management to start building your dashboard context.'
                    : 'Zone data will appear here once available.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Workspace Guide</p>
          <h2 className="text-2xl font-extrabold text-white">How your app is now organized</h2>
          <div className="space-y-4 mt-6">
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Dashboard</p>
              <p className="text-slate-400 text-sm mt-2">Your signed-in home with account details, zone coverage, and quick context.</p>
            </div>
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Zone Management</p>
              <p className="text-slate-400 text-sm mt-2">Operator-only workspace for selecting and saving operating zones.</p>
            </div>
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Demand Forecast</p>
              <p className="text-slate-400 text-sm mt-2">Dedicated forecasting area with zone selection, peak windows, and the chart view.</p>
            </div>
          </div>
        </div>
      </section>
      </div>
      )}

      {activeTab === 'operations' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      

      {/* Driver AI Dispatch Feature */}
      <section>
        <SmartDispatch />
      </section>

      {/* Mount operational algorithm only for Company/Operators who actually own fleet sizes */}
      {user?.role === 'operator' && (
        <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] overflow-hidden p-6 relative shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Fleet Operations</p>
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Surging Demand</p>
          <h2 className="text-2xl font-extrabold text-white">Top 5 Hotspots (Past 7 Days)</h2>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed mb-6">
            City-wide zones with the highest volume of pickups. Use this to position fleets dynamically for maximum revenue.
          </p>
          <div className="space-y-3">
            {trends.top_zones.map((tz, i) => (
              <div key={tz.location_id} className="flex flex-row justify-between items-center bg-[#111] border border-[#252525] rounded-2xl p-4">
                <div>
                  <p className="text-white font-bold">{i + 1}. {tz.zone_name}</p>
                  <p className="text-slate-400 text-sm">{tz.borough}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold">{tz.pickups.toLocaleString()} rides</p>
                </div>
              </div>
            ))}
            {trends.top_zones.length === 0 && <p className="text-slate-500 text-sm mt-4">Loading trends...</p>}
          </div>

        </div>

        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />
          <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Idle Areas</p>
          <h2 className="text-2xl font-extrabold text-white">Lowest Traffic (Past 7 Days)</h2>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed mb-6">
            Zones suffering from coverage gaps or naturally dead demand. Instruct fleets to keep moving if idle here.
          </p>
          <div className="space-y-3">
            {trends.bottom_zones.map((bz, i) => (
              <div key={bz.location_id} className="flex flex-row justify-between items-center bg-[#111] border border-[#252525] rounded-2xl p-4">
                <div>
                  <p className="text-white font-bold">{i + 1}. {bz.zone_name}</p>
                  <p className="text-slate-400 text-sm">{bz.borough}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold">{bz.pickups.toLocaleString()} rides</p>
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
          <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Geographic Intelligence</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Live Zone Map</h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl leading-relaxed">
            Interactive map of all NYC taxi zones. Circle size and color reflect demand volume — hover over zones for details. Red = very high demand, Blue = low demand.
          </p>
        </div>
        <ZoneMap />
      </section>

      {/* Global Heatmap Section */}
      <section className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 md:p-8">
        <div className="mb-8">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Global Macro Tracking</p>
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
