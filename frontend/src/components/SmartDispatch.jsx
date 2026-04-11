import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/axios';
import { MapPin, Navigation, TrendingUp, Zap, Search } from 'lucide-react';

export default function SmartDispatch() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/zones/');
        let availableZones = [];
        Object.values(res.data).forEach((arr) => {
          availableZones = [...availableZones, ...arr];
        });
        availableZones.sort((a, b) => a.zone_name.localeCompare(b.zone_name));
        setZones(availableZones);
      } catch (err) {
        console.error('Failed to load zones', err);
      }
    };
    fetchZones();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredZones = zones.filter(z =>
    z.zone_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (z.borough && z.borough.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone.location_id);
    setSearchQuery(zone.zone_name);
    setIsDropdownOpen(false);
  };

  const fetchRecommendations = async () => {
    if (!selectedZone) return;
    setLoading(true);
    setError('');
    setRecommendations([]);
    
    try {
      const res = await api.get(`/zones/${selectedZone}/recommendations`);
      setRecommendations(res.data);
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
      setError('Unable to fetch recommendations at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] border border-[#1f1f1f] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_50%),#090909] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <Zap size={20} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI Smart Dispatch</h2>
          <p className="text-sm text-slate-400">Find the most profitable nearby zones.</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end mb-8">
        <div ref={dropdownRef} className="relative">
           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Your Current Zone</label>
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
               <Search size={16} />
             </div>
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 setSelectedZone('');
                 setIsDropdownOpen(true);
               }}
               onFocus={() => setIsDropdownOpen(true)}
               placeholder="Search zones..."
               className="block w-full pl-10 pr-4 py-3 border border-[#333] rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#111] font-medium placeholder:text-slate-600"
             />
           </div>

           {isDropdownOpen && (
             <div className="absolute z-40 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-[#333] bg-[#111] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
               {filteredZones.length > 0 ? filteredZones.map((z) => (
                 <button
                   key={z.location_id}
                   onClick={() => handleZoneSelect(z)}
                   className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition-colors flex justify-between items-center border-b border-[#1a1a1a] last:border-0 cursor-pointer"
                 >
                   <span className="text-white font-medium text-sm">{z.zone_name}</span>
                   <span className="text-slate-500 text-xs">{z.borough}</span>
                 </button>
               )) : (
                 <div className="px-4 py-3 text-slate-500 text-sm">No zones found</div>
               )}
             </div>
           )}
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={!selectedZone || loading}
          className="h-[48px] px-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 to-emerald-500 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(16,185,129,0.2)] hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
             <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Navigation size={16} /> Get Recommendations
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 mb-6">
          {error}
        </div>
      )}

      {recommendations.length === 0 && !loading && !error && selectedZone && (
         <div className="text-center py-6 text-slate-500 text-sm">
           Click "Get Recommendations" to see nearby hotspots.
         </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">🔥 Top 3 Nearby Hotspots</p>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.map((rec, index) => (
              <div key={rec.location_id} className={`rounded-2xl border p-5 transition-all ${index === 0 ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-[#222] bg-[#0c0c0c]'}`}>
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center justify-center w-6 h-6 rounded-full bg-black border border-[#333] text-xs font-bold text-slate-300">
                     #{index + 1}
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{rec.borough}</span>
                </div>
                <h3 className="font-bold text-lg text-white leading-tight mb-4">{rec.zone_name}</h3>
                
                <div className="flex items-center justify-between mt-auto">
                   <span className="text-sm text-slate-400">Next Hour</span>
                   <div className="flex items-center gap-1.5 text-emerald-400">
                     <TrendingUp size={16} />
                     <span className="font-black text-lg">{rec.forecasted_pickups}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
