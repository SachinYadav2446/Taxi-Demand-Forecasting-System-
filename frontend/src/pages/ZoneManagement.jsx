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
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <Layers size={48} className="text-orange-500/40 mb-4" />
          <p className="text-slate-500 font-medium">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Zone Management</h1>
          <p className="text-slate-400 mt-2 font-medium">Assign operating zones to your fleet for targeted demand insights.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search zones..."
              className="pl-9 pr-4 py-3 sm:py-2.5 border border-[#333] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm w-full sm:w-64 bg-[#111] text-white placeholder-slate-600 transition-all focus:bg-[#1a1a1a]"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex justify-center items-center gap-2 px-6 py-3 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.3)] hover:shadow-[0_0_20px_rgba(5,150,105,0.5)] transition-all disabled:opacity-70"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 shadow-lg border ${
          message.type === 'error' ? 'bg-red-950/40 text-red-400 border-red-500/30' : 'bg-green-950/40 text-green-400 border-green-500/30'
        }`}>
          {message.type === 'success' && <Check size={18} className="text-green-500" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(filteredBoroughs).map(([borough, zones]) => (
          <div key={borough} className="bg-[#0a0a0a] rounded-2xl border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-[450px]">
            <div className="px-5 py-4 bg-[#111] border-b border-[#222] flex items-center justify-between sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-orange-500" />
                <h3 className="font-bold text-white text-lg">{borough}</h3>
              </div>
              <span className="text-xs font-semibold bg-[#1a1a1a] border border-[#333] px-2.5 py-1 rounded-full text-slate-400 shadow-inner">
                {zones.filter(z => selectedZones.has(z.location_id)).length} / {zones.length} selected
              </span>
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 space-y-2 bg-[#0a0a0a]">
              {zones.map(zone => {
                const isSelected = selectedZones.has(zone.location_id);
                return (
                  <button
                    key={zone.location_id}
                    onClick={() => toggleZone(zone.location_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]' 
                        : 'bg-[#111] border-transparent hover:bg-[#151515] text-slate-400 hover:text-slate-300 hover:border-[#333]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-orange-400' : 'text-slate-300'}`}>
                        {zone.zone_name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Zone {zone.location_id}</span>
                    </div>
                    {isSelected ? (
                      <div className="bg-orange-500 text-slate-900 rounded-full p-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#333] group-hover:border-[#555] transition-colors"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(filteredBoroughs).length === 0 && (
           <div className="col-span-full py-24 text-center text-slate-500 bg-[#0a0a0a] rounded-2xl border border-[#222]">
             <div className="w-16 h-16 bg-[#111] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#333]">
                <Search size={24} className="text-slate-600" />
             </div>
             <p className="text-lg font-medium text-slate-400">No zones match your search query.</p>
           </div>
        )}
      </div>
    </div>
  );
}
