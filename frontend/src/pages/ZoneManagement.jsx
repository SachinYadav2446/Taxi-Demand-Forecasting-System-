import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { MapPin, Search, Check, Save, Layers } from 'lucide-react';

export default function ZoneManagement() {
  const { user } = useAuth();
  const [zonesByBorough, setZonesByBorough] = useState({});
  const [selectedZones, setSelectedZones] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesRes, myZonesRes] = await Promise.all([
          api.get('/zones/'),
          api.get('/zones/company')
        ]);
        
        setZonesByBorough(zonesRes.data);
        const myZoneIds = new Set(myZonesRes.data.map(z => z.location_id));
        setSelectedZones(myZoneIds);
      } catch (err) {
        console.error("Failed to load zones", err);
        setMessage({ text: "Failed to load zone data", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleZone = (location_id) => {
    const next = new Set(selectedZones);
    if (next.has(location_id)) {
      next.delete(location_id);
    } else {
      next.add(location_id);
    }
    setSelectedZones(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await api.post('/zones/company', {
        location_ids: Array.from(selectedZones)
      });
      setMessage({ text: 'Operating zones saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: 'Failed to save zones. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredBoroughs = Object.entries(zonesByBorough).reduce((acc, [borough, zones]) => {
    const filtered = zones.filter(z => 
      z.zone_name.toLowerCase().includes(search.toLowerCase()) || 
      borough.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) acc[borough] = filtered;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="animate-pulse flex flex-col items-center relative z-10 p-12 rounded-3xl border border-white/[0.05] bg-black/40 backdrop-blur-3xl shadow-2xl">
          <Layers size={48} className="text-orange-500/70 mb-5" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aggregating Zone Topology...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 relative xl:px-4">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center gap-10 mb-16 mt-4">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-3.5 py-1.5 shadow-[0_0_15px_rgba(249,115,22,0.1)] mb-5">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">Fleet Operations</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-orange-500 tracking-tight leading-none">
            Zone Management
          </h1>
          <p className="text-slate-400 mt-5 font-medium max-w-xl text-[15px] leading-relaxed">
            Configure geographic operating boundaries and manage precision fleet targeting to optimize localized demand capture across the city.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 bg-white/[0.03] p-2 rounded-[28px] border border-white/[0.08] backdrop-blur-3xl w-full max-w-4xl shadow-2xl">
          <div className="relative flex-[3] group w-full">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-orange-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search zones or boroughs..."
              className="pl-13 pr-6 py-4 border border-transparent rounded-[22px] focus:outline-none focus:ring-1 focus:ring-orange-500/50 text-base w-full bg-black/40 text-white placeholder-slate-400 transition-all font-medium"
            />
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-[12px] font-black uppercase tracking-widest rounded-[22px] shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-orange-400/30 shrink-0 min-w-[200px]"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
            <span>Save My Zones</span>
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-8 p-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4 shadow-2xl backdrop-blur-xl border relative z-10 ${
          message.type === 'error' ? 'bg-red-950/60 text-red-200 border-red-500/40' : 'bg-orange-950/40 text-orange-300 border-orange-500/30'
        }`}>
          {message.type === 'success' && <Check size={20} className="text-orange-400" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
        {Object.entries(filteredBoroughs).map(([borough, zones]) => (
          <div key={borough} className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#050505]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[520px]">
            <div className="px-6 py-5 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between sticky top-0 z-10 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                  <MapPin size={18} className="text-orange-500" />
                </div>
                <h3 className="font-extrabold text-white text-lg tracking-wide">{borough}</h3>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest bg-black/40 border border-white/10 px-3 py-1.5 rounded-full text-slate-300 shadow-inner">
                <span className="text-orange-400">{zones.filter(z => selectedZones.has(z.location_id)).length}</span> / {zones.length} selected
              </span>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2 relative custom-scrollbar">
              {zones.map(zone => {
                const isSelected = selectedZones.has(zone.location_id);
                return (
                  <button
                    key={zone.location_id}
                    onClick={() => toggleZone(zone.location_id)}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-300 border flex items-center justify-between group relative overflow-hidden ${
                      isSelected 
                        ? 'bg-orange-500/10 border-orange-500/30 shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]' 
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/[0.08] hover:shadow-md'
                    }`}
                  >
                    {/* Glowing background hint on hover for unselected */}
                    {!isSelected && <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                    
                    <div className="flex flex-col relative z-10">
                      <span className={`text-[15px] font-bold tracking-tight mb-0.5 ${isSelected ? 'text-orange-300' : 'text-slate-200 group-hover:text-white'}`}>
                        {zone.zone_name}
                      </span>
                      <span className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Zone {zone.location_id}</span>
                    </div>
                    
                    <div className="relative z-10 ml-4 flex-shrink-0">
                      {isSelected ? (
                        <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-black rounded-full p-1.5 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-in zoom-in duration-200">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-[2.5px] border-white/10 group-hover:border-orange-500/30 transition-colors bg-black/20"></div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(filteredBoroughs).length === 0 && (
           <div className="col-span-full py-32 text-center text-slate-500 bg-gradient-to-br from-[#1a1a1a]/40 to-[#0a0a0a]/40 backdrop-blur-2xl rounded-[32px] border border-white/[0.05] shadow-2xl relative z-10">
             <div className="w-20 h-20 bg-black/40 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                <Search size={32} className="text-slate-600" />
             </div>
             <p className="text-xl font-bold text-slate-300 mb-2">Topology not found</p>
             <p className="text-slate-500 max-w-sm mx-auto">No operating zones match your current geographic search query.</p>
           </div>
        )}
      </div>
      
      {/* Hide native scrollbar but allow scrolling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

