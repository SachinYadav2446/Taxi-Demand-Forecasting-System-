import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Treemap, ResponsiveContainer, Tooltip as ChartTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { X, Map as MapIcon, Grid3X3, CloudRain, Sun, Zap, Music, Trophy, Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/axios';
import 'leaflet/dist/leaflet.css';

// --- Shared Constants & Helpers ---
const HEATMAP_COLORS = [
  '#fbbf24', // Amber/Yellow (Highest Traffic)
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#8e2b4b', // Maroon (Soft) 
  '#6e1a37'  // Maroon (Lowest Traffic - Primary)
];

function getColor(pickups, maxPickups) {
  const ratio = pickups / (maxPickups || 1);
  if (ratio > 0.7) return '#ef4444'; // Red (Very High)
  if (ratio > 0.4) return '#f97316'; // Orange (High)
  if (ratio > 0.15) return '#f59e0b'; // Amber (Medium)
  return '#fbbf24'; // Yellow (Low)
}

// --- Area Map (Treemap) Components ---
const CustomizedContent = (props) => {
  const { x, y, width, height, name, value, onZoneClick, maxPickups } = props;
  
  if (!name) return null;

  const heatColor = getColor(value, maxPickups);

  return (
    <g onClick={() => onZoneClick && onZoneClick({ name, value })}>
      <rect
        x={x} y={y} width={width} height={height}
        style={{
          fill: heatColor,
          stroke: '#111111',
          strokeWidth: 2,
          transition: 'all 0.3s ease',
        }}
        className="cursor-pointer hover:brightness-110"
      />
      {width > 60 && height > 40 ? (
        <g>
          <text
            x={x + width / 2} y={y + height / 2 - 5}
            textAnchor="middle" fill="#ffffff"
            fontSize={Math.min(width / 10, 22)}
            fontWeight="900"
            style={{ fontFamily: 'Sora, sans-serif', pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.02em' }}
          >
            {name}
          </text>
          <text
            x={x + width / 2} y={y + height / 2 + 18}
            textAnchor="middle" fill="#ffffff"
            fillOpacity={0.9}
            fontSize={Math.min(width / 15, 14)}
            fontWeight="700"
            style={{ fontFamily: 'Sora, sans-serif', pointerEvents: 'none' }}
          >
            {value?.toLocaleString()} rides
          </text>
        </g>
      ) : null}
    </g>
  );
};

const AreaTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-[#333] bg-[#0a0a0a]/95 backdrop-blur-md p-4 shadow-2xl">
        <p className="text-white font-bold text-lg mb-1">{data.name}</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">7-Day Traffic:</p>
          <p className="text-orange-500 font-black text-xl">{data.value.toLocaleString()}</p>
        </div>
      </div>
    );
  }
  return null;
};

// --- Zone Map (Leaflet) Helpers ---
function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[40.49, -74.26], [40.92, -73.68]]);
  }, [map]);
  return null;
}

function ZoomHandler({ zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setZoom(zoom, { animate: true });
  }, [zoom, map]);
  return null;
}

export default function ZoneMap() {
  const [viewMode, setViewMode] = useState('zone'); // 'zone' or 'area'
  const { mode } = useTheme();
  const isDark = mode !== 'light';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState([]);
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/zones/heatmap_data');
        setData(res.data);
      } catch (e) {
        console.error("Map data failed to load", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const fetchIntelligence = async () => {
      try {
        const [wRes, eRes] = await Promise.all([
          api.get('/intelligence/weather'),
          api.get('/intelligence/events')
        ]);
        setWeather(wRes.data);
        setEvents(eRes.data);
      } catch (e) {
        console.error("Intelligence fetch failed", e);
      }
    };
    fetchIntelligence();
    const interval = setInterval(fetchIntelligence, 300000); // Sync every 5 mins
    return () => clearInterval(interval);
  }, []);

  // --- Data Transformations ---
  const zonesWithPositions = useMemo(() => {
    return data
      .filter(z => z.latitude !== null && z.longitude !== null)
      .map(z => ({
        ...z,
        position: [z.latitude, z.longitude],
        pickups: z.value || 0
      }));
  }, [data]);

  const treemapData = useMemo(() => {
    const grouped = data.reduce((acc, curr) => {
      const b = curr.borough || 'Unknown';
      if (!acc[b]) {
        acc[b] = { name: b, value: 0 };
      }
      acc[b].value += (curr.value || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [data]);

  const maxBoroughValue = useMemo(() => {
    return Math.max(...treemapData.map(b => b.value), 1);
  }, [treemapData]);

  const maxPickups = useMemo(() => {
    return Math.max(...data.map(z => z.value || 0), 1);
  }, [data]);

  const getSimulatedHourlyData = (baseValue) => {
    const hours = [];
    const baseHourTraffic = Math.floor(baseValue / 7 / 24) || 10;
    for (let i = 0; i < 24; i++) {
      const mathPhase = Math.sin((i / 24) * Math.PI * 4);
      const randJitter = (Math.random() * 0.4) + 0.8;
      const val = Math.max(5, Math.floor(baseHourTraffic * (1 + (mathPhase * 0.6)) * randJitter));
      hours.push({
        time: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
        demand: val
      });
    }
    return hours;
  };

  if (loading) {
    return (
      <div className={`h-[500px] rounded-2xl border flex items-center justify-center ${isDark ? 'border-white/[0.05] bg-[#0a0a0a]' : 'border-slate-200 bg-slate-50'}`}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle Controller */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-[#111] border-[#222]' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setViewMode('zone')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'zone' ? (isDark ? 'bg-[#222] text-orange-500 shadow-sm' : 'bg-white text-orange-500 shadow-sm') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
          >
            <MapIcon size={14} /> Live Zone Map
          </button>
          <button
            onClick={() => setViewMode('area')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'area' ? (isDark ? 'bg-[#222] text-orange-500 shadow-sm' : 'bg-white text-orange-500 shadow-sm') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
          >
            <Grid3X3 size={14} /> Live Area Map
          </button>
        </div>
        <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-xl border ${isDark ? 'bg-[#111]/50 border-[#222]/50' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Engine Active</span>
          </div>
        </div>
      </div>

      <div className={`relative rounded-2xl overflow-hidden border ${isDark ? 'border-white/[0.05] bg-[#050505]' : 'border-slate-200 bg-white'}`} style={{ height: '500px' }}>
        {viewMode === 'zone' ? (
          /* --- LEAFLET MODE --- */
          <div className="relative w-full h-full">
            <MapContainer
              center={[40.7128, -74.0060]}
              zoom={zoom}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
              zoomControl={false}
              attributionControl={false}
              onZoomEnd={(e) => setZoom(e.target.getZoom())}
            >
              <FitBounds />
              <ZoomHandler zoom={zoom} />
              <TileLayer
                url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                attribution='&copy; CARTO'
              />
              {zonesWithPositions.map((zone) => {
                const radius = Math.max(4, Math.min(18, (zone.pickups / maxPickups) * 18));
                const color = getColor(zone.pickups, maxPickups);
                return (
                  <CircleMarker
                    key={zone.location_id}
                    center={zone.position}
                    radius={radius}
                    pathOptions={{
                      fillColor: color, fillOpacity: 0.65, color: color, weight: 1.5, opacity: 0.9,
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        setHoveredZone(zone);
                        e.target.setStyle({ fillOpacity: 1, weight: 3 });
                      },
                      mouseout: (e) => {
                        setHoveredZone(null);
                        e.target.setStyle({ fillOpacity: 0.65, weight: 1.5 });
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'Sora, sans-serif', padding: '2px 0' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: '#111' }}>{zone.name}</p>
                        <p style={{ fontSize: '11px', color: '#777', margin: '2px 0' }}>{zone.borough}</p>
                        <p style={{ fontWeight: 700, fontSize: '15px', color: color, margin: '4px 0 0' }}>
                          {zone.pickups.toLocaleString()} rides
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Event Catalyst Markers */}
              {events.map((event, idx) => (
                event.coords && (
                  <CircleMarker
                    key={`event-${idx}`}
                    center={event.coords}
                    radius={25}
                    pathOptions={{
                      fillColor: '#8b5cf6', fillOpacity: 0.1, color: '#8b5cf6', weight: 2, dashArray: '5, 10'
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[150px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={16} className="text-purple-500" />
                          <span className="text-xs font-black uppercase tracking-tight text-purple-600">Demand Catalyst</span>
                        </div>
                        <h4 className="font-bold text-sm text-[#111]">{event.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">{event.description}</p>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Impact Score</span>
                          <span className="text-xs font-black text-purple-600">+{Math.round((event.impact - 1) * 100)}%</span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              ))}
            </MapContainer>

            {/* Custom Vertical Zoom Controller */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-6 z-[1000] flex flex-col items-center gap-4 py-6 px-3 backdrop-blur-3xl border rounded-3xl shadow-2xl ${isDark ? 'bg-[#0a0a0b]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 1, 18))}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all font-bold text-xl hover:border-orange-500/30 ${isDark ? 'bg-[#111] border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}
              >
                +
              </button>
              <div className="h-40 w-1 flex justify-center py-2">
                <input
                  type="range"
                  min="5"
                  max="18"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className={`appearance-none w-1 h-32 rounded-full [writing-mode:bt-lr] [-webkit-appearance:slider-vertical] ${isDark ? 'bg-[#222]' : 'bg-slate-300'}`}
                />
              </div>
              <button
                onClick={() => setZoom(prev => Math.max(prev - 1, 5))}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all font-bold text-xl hover:border-orange-500/30 ${isDark ? 'bg-[#111] border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}
              >
                -
              </button>
            </div>
          </div>
        ) : (
          /* --- TREEMAP MODE --- */
          <div className="w-full h-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<CustomizedContent onZoneClick={setSelectedZone} maxPickups={maxBoroughValue} />}
              >
                <ChartTooltip content={<AreaTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* Floating Legends */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-[#111]/90 backdrop-blur-md border border-[#333] rounded-xl px-3 py-2.5 text-xs">
          <p className="text-white font-bold mb-1.5 uppercase tracking-wider text-[10px]">Demand Intensity</p>
          <div className="flex flex-col gap-1">
            {[
              { color: '#ef4444', label: 'Critical' },
              { color: '#f97316', label: 'High' },
              { color: '#f59e0b', label: 'Balanced' },
              { color: '#fbbf24', label: 'Baseline' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Tooltip (Leaflet Hover) */}
        {viewMode === 'zone' && hoveredZone && (
          <div className={`absolute top-24 right-20 z-[1000] backdrop-blur-md border rounded-xl px-4 py-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#111]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{hoveredZone.name}</p>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{hoveredZone.borough}</p>
            <p className="text-orange-500 font-black text-xl mt-1">{(hoveredZone.pickups || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">RIDES</span></p>
          </div>
        )}

        {/* Weather Intelligence Badge */}
        {weather && (
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in slide-in-from-left-4 duration-500">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              {weather.precip > 0 ? <CloudRain className="text-orange-500" size={20} /> : <Sun className="text-orange-500" size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intelligence Node</span>
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-white font-bold text-sm">{weather.condition} <span className="text-slate-500 text-xs font-medium">• {weather.temp}°C</span></p>
              <p className="text-orange-400/80 text-[10px] font-bold uppercase tracking-tight">{weather.description}</p>
            </div>
          </div>
        )}

        {/* Floating Events List */}
        {events.length > 0 && (
          <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2 max-w-[200px]">
            {events.map((event, idx) => (
              <div key={idx} className="bg-purple-900/20 backdrop-blur-md border border-purple-500/30 rounded-xl px-3 py-2 flex items-center gap-2 animate-in slide-in-from-left-8 duration-700">
                <Zap size={12} className="text-purple-400 animate-bounce" />
                <span className="text-[10px] font-bold text-white tracking-tight truncate">{event.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Modal (Treemap Click) */}
      {selectedZone && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-[32px] w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-8 py-6 border-b border-[#1a1a1a] bg-[#0d0d0d]">
              <div>
                <p className="text-orange-500 font-black tracking-wider text-[10px] uppercase mb-1">Deep Intelligence</p>
                <h3 className="text-white text-2xl font-black tracking-tight">{selectedZone.name}</h3>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#333] hover:border-orange-500/50 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 h-[450px] w-full bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSimulatedHourlyData(selectedZone.value)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="time" stroke="#444" tick={{ fill: '#666', fontSize: 11, fontWeight: 'bold' }} tickMargin={12} minTickGap={25} />
                  <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 11, fontWeight: 'bold' }} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#f97316', fontWeight: '900', fontSize: '14px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="demand"
                    stroke="#f97316"
                    strokeWidth={5}
                    dot={false}
                    activeDot={{ r: 10, fill: '#f97316', stroke: '#fff', strokeWidth: 3, shadow: '0 0 20px rgba(249,115,22,0.5)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="px-8 py-4 bg-[#0d0d0d] border-t border-[#1a1a1a] flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Synthetic SARIMAX Projection enabled</p>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="w-2 h-2 rounded-full bg-orange-500/40" />
                <span className="w-2 h-2 rounded-full bg-orange-500/10" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
