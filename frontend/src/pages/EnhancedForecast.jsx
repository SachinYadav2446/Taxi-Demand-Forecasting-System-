import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/axios';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import {
  CloudRain, Music, Train, Plane, TrendingUp, CheckCircle,
  Zap, BarChart3, Clock, ChevronDown, Layers, Star,
  AlertCircle, Sparkles, Target, Gauge, Info, Sliders, Search, X,
} from 'lucide-react';

const MODEL_CHIPS = [
  { key: 'ensemble',      label: 'Ensemble',     color: '#f43f5e' },
  { key: 'holt_winters',  label: 'Holt-Winters', color: '#06b6d4' },
  { key: 'prophet',       label: 'Prophet',      color: '#8b5cf6' },
  { key: 'lightgbm',      label: 'LightGBM',     color: '#10b981' },
  { key: 'sarimax_pro',   label: 'SARIMAX-Pro',  color: '#f97316' },
];

function ForecastSvgChart({
  historical, predicted, perModelBreakdown, activeModelKey, isDark, height = 320,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const chartRef = useRef(null);

  const historicalVals = (historical || []).map((h) => ({ t: h.timestamp, v: h.actual ?? 0 }));
  const predictedVals = (predicted || []).map((p) => ({
    t: p.timestamp,
    v: p.predicted ?? 0,
    lo: p.confidence_lower ?? 0,
    hi: p.confidence_upper ?? 0,
    surge: p.surge_multiplier ?? 1,
    rev: p.projected_revenue ?? 0,
  }));

  const modelBreakdown = perModelBreakdown || {};
  const activeChip = MODEL_CHIPS.find((c) => c.key === activeModelKey) || MODEL_CHIPS[0];

  const showSeries = useMemo(() => {
    if (activeModelKey !== 'ensemble' && modelBreakdown[activeModelKey]) {
      const raw = modelBreakdown[activeModelKey].map((m) => m.predicted ?? 0);
      return { main: raw, color: activeChip.color };
    }
    return { main: predictedVals.map((p) => p.v), color: activeChip.color };
  }, [activeModelKey, modelBreakdown, predictedVals, activeChip]);

  const allValues = useMemo(() => {
    const a = historicalVals.map((h) => h.v);
    const b = showSeries.main;
    const c = predictedVals.flatMap((p) => [p.lo, p.hi]);
    return [...a, ...b, ...c];
  }, [historicalVals, showSeries, predictedVals]);

  const maxVal = Math.max(1, ...allValues);
  const minVal = 0;

  const width = 1000;
  const padding = { l: 54, r: 20, t: 28, b: 46 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const nHist = historicalVals.length;
  const nPred = predictedVals.length;
  const totalPts = nHist + nPred;

  const xFor = (i) => padding.l + (i / Math.max(1, totalPts - 1)) * plotW;

  const yFor = (v) => padding.t + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const bezier = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const histPoints = historicalVals.map((h, i) => [xFor(i), yFor(h.v)]);
  const predPoints = showSeries.main.map((v, i) => [xFor(nHist + i), yFor(v)]);

  const loPoints = predictedVals.map((p, i) => [xFor(nHist + i), yFor(Math.max(0, p.lo))]);
  const hiPoints = predictedVals.map((p, i) => [xFor(nHist + i), yFor(p.hi)]);
  const areaPath = (() => {
    if (loPoints.length < 2) return '';
    const top = bezier(hiPoints);
    const bottom = bezier(loPoints.slice().reverse()).replace(/^M/, 'L');
    return `${top} ${bottom} Z`;
  })();

  const gridYCount = 5;
  const gridLines = Array.from({ length: gridYCount + 1 }, (_, i) => {
    const v = (i / gridYCount) * (maxVal - minVal) + minVal;
    return { y: yFor(v), label: v.toFixed(0) };
  });

  const xTickEvery = Math.max(1, Math.floor(totalPts / 8));
  const xTicks = Array.from({ length: totalPts }, (_, i) => i)
    .filter((i) => i % xTickEvery === 0 || i === totalPts - 1)
    .map((i) => ({
      x: xFor(i),
      label: (() => {
        const raw = i < nHist ? historicalVals[i]?.t : predictedVals[i - nHist]?.t;
        if (!raw) return '';
        const d = new Date(raw);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      })(),
    }));

  const dividerX = nHist > 0 ? xFor(nHist - 0.5) : padding.l;

  const hovered = useMemo(() => {
    if (hoveredIdx === null) return null;
    if (hoveredIdx < nHist) {
      return {
        x: histPoints[hoveredIdx][0],
        y: histPoints[hoveredIdx][1],
        label: 'Actual',
        value: historicalVals[hoveredIdx].v,
        time: historicalVals[hoveredIdx].t,
        isHist: true,
      };
    }
    const pi = hoveredIdx - nHist;
    const pv = predictedVals[pi];
    const mv = showSeries.main[pi];
    return {
      x: predPoints[pi][0],
      y: predPoints[pi][1],
      label: MODEL_CHIPS.find((c) => c.key === activeModelKey)?.label || 'Predicted',
      value: mv,
      lo: pv?.lo,
      hi: pv?.hi,
      time: pv?.t,
      surge: pv?.surge,
      rev: pv?.rev,
      isHist: false,
    };
  }, [hoveredIdx, nHist, histPoints, predPoints, historicalVals, predictedVals, showSeries, activeModelKey]);

  const handleMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < padding.l - 5 || relX > width - padding.r + 5) {
      setHoveredIdx(null);
      return;
    }
    const frac = (relX - padding.l) / plotW;
    const i = Math.max(0, Math.min(totalPts - 1, Math.round(frac * (totalPts - 1))));
    setHoveredIdx(i);
  };

  const gradId = `histgrad-${isDark ? 'd' : 'l'}`;
  const predGradId = `predgrad-${isDark ? 'd' : 'l'}`;

  return (
    <div className="relative w-full" ref={chartRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? '#fb923c' : '#f97316'} stopOpacity="0.28" />
            <stop offset="100%" stopColor={isDark ? '#fb923c' : '#f97316'} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={predGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeChip.color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={activeChip.color} stopOpacity="0" />
          </linearGradient>
          <filter id="glowline" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.l} x2={width - padding.r} y1={g.y} y2={g.y}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'}
              strokeDasharray="3 4" strokeWidth={1}
            />
            <text
              x={padding.l - 10} y={g.y + 4}
              textAnchor="end"
              fontSize={10.5} fontWeight={700}
              fill={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.5)'}
            >
              {g.label}
            </text>
          </g>
        ))}

        <line
          x1={dividerX} x2={dividerX}
          y1={padding.t - 6} y2={height - padding.b + 6}
          stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.2)'}
          strokeWidth={1} strokeDasharray="4 3"
        />
        <rect
          x={padding.l} y={padding.t - 12}
          width={dividerX - padding.l} height={12}
          rx={4}
          fill={isDark ? 'rgba(251,146,60,0.12)' : 'rgba(249,115,22,0.10)'}
        />
        <rect
          x={dividerX} y={padding.t - 12}
          width={(width - padding.r) - dividerX} height={12}
          rx={4}
          fill={`${activeChip.color}20`}
        />
        <text x={padding.l + 6} y={padding.t - 3} fontSize={9.5} fontWeight={800}
          fill={isDark ? 'rgba(251,146,60,0.9)' : 'rgba(249,115,22,0.9)'}
          letterSpacing={0.8}>
          HISTORICAL
        </text>
        <text x={dividerX + 6} y={padding.t - 3} fontSize={9.5} fontWeight={800}
          fill={activeChip.color} letterSpacing={0.8}>
          {activeChip.label.toUpperCase()} FORECAST
        </text>

        {xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x} y={height - padding.b + 22}
            textAnchor="middle"
            fontSize={10} fontWeight={700}
            fill={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.55)'}
          >
            {t.label}
          </text>
        ))}

        {predictedVals.length > 1 && areaPath && (
          <path d={areaPath} fill={activeChip.color} opacity={0.11} />
        )}

        {histPoints.length > 1 && (
          <>
            <path
              d={`${bezier(histPoints)} L ${histPoints[histPoints.length - 1][0]} ${padding.t + plotH} L ${histPoints[0][0]} ${padding.t + plotH} Z`}
              fill={`url(#${gradId})`}
            />
            <path
              d={bezier(histPoints)}
              fill="none"
              stroke={isDark ? '#fb923c' : '#f97316'}
              strokeWidth={2.4}
              strokeLinecap="round"
              filter="url(#glowline)"
            />
          </>
        )}

        {predPoints.length > 1 && (
          <>
            <path
              d={`${bezier(predPoints)} L ${predPoints[predPoints.length - 1][0]} ${padding.t + plotH} L ${predPoints[0][0]} ${padding.t + plotH} Z`}
              fill={`url(#${predGradId})`}
            />
            <path
              d={bezier(predPoints)}
              fill="none"
              stroke={activeChip.color}
              strokeWidth={2.8}
              strokeLinecap="round"
              filter="url(#glowline)"
            />
          </>
        )}

        {hovered && (
          <g>
            <line
              x1={hovered.x} x2={hovered.x}
              y1={padding.t - 10} y2={height - padding.b + 10}
              stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.25)'}
              strokeWidth={1}
            />
            <circle
              cx={hovered.x} cy={hovered.y} r={7}
              fill={hovered.isHist ? (isDark ? '#fb923c' : '#f97316') : activeChip.color}
              stroke={isDark ? '#050505' : '#ffffff'}
              strokeWidth={2.5}
            />
          </g>
        )}
      </svg>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`pointer-events-none absolute z-20 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
              isDark
                ? 'border-white/10 bg-[#0a0a0a]/95'
                : 'border-slate-200 bg-white/95'
            }`}
            style={{
              left: `calc(${(hovered.x / width) * 100}% + 14px)`,
              top: `calc(${(hovered.y / height) * 100}% - 20px)`,
              transform: (hovered.x / width > 0.72) ? 'translateX(-110%)' : 'none',
            }}
          >
            <div className={`text-[10.5px] font-black uppercase tracking-[0.18em] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date(hovered.time).toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: hovered.isHist ? (isDark ? '#fb923c' : '#f97316') : activeChip.color }} />
              <span className={`text-[11.5px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {hovered.label}
              </span>
              <span className={`text-[18px] font-black tabular-nums ml-auto ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {Math.round(hovered.value)}
              </span>
            </div>
            {!hovered.isHist && hovered.lo !== undefined && (
              <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                90% CI: <span className="font-black">{Math.round(hovered.lo)} – {Math.round(hovered.hi)}</span>
              </div>
            )}
            {!hovered.isHist && hovered.surge > 1 && (
              <div className={`text-[11px] font-bold mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                ⚡ Surge ×{hovered.surge.toFixed(2)}
              </div>
            )}
            {!hovered.isHist && hovered.rev > 0 && (
              <div className={`text-[11px] font-bold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                💰 ${hovered.rev.toLocaleString()} est. revenue
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EnhancedForecast() {
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode !== 'light';

  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState([]);
  const [groupedZones, setGroupedZones] = useState({});
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const zoneDropdownRef = useRef(null);
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [externalFeatures, setExternalFeatures] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [importance, setImportance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState('hourly');
  const [activeModel, setActiveModel] = useState('ensemble');
  const [zonesLoading, setZonesLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target)) {
        setZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchZones = async () => {
      setZonesLoading(true);
      try {
        const endpoint = user?.role === 'operator' ? '/zones/company' : '/zones/';
        const res = await api.get(endpoint);
        let availableZones = [];
        if (user?.role === 'operator') {
          availableZones = res.data;
          const boroughGroups = {};
          res.data.forEach((z) => {
            const b = z.borough || 'Unknown';
            if (!boroughGroups[b]) boroughGroups[b] = [];
            boroughGroups[b].push(z);
          });
          setGroupedZones(boroughGroups);
        } else {
          Object.entries(res.data).forEach(([borough, arr]) => {
            availableZones = [...availableZones, ...arr];
            setGroupedZones(res.data);
          });
        }
        setZones(availableZones);
        if (availableZones.length) {
          setSelectedZone((cur) => {
            const exists = availableZones.some((z) => z.location_id.toString() === cur);
            return exists ? cur : availableZones[0].location_id.toString();
          });
        }
      } catch (err) {
        console.error('zones', err);
        setZones([]);
        setGroupedZones({});
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
    fetchWeather();
    fetchEvents();
  }, [user]);

  const filteredGroupedZones = useMemo(() => {
    const q = zoneSearch.trim().toLowerCase();
    if (!q) return groupedZones;
    const result = {};
    Object.entries(groupedZones).forEach(([borough, arr]) => {
      const filtered = (arr || []).filter((z) =>
        (z.zone_name || '').toLowerCase().includes(q) ||
        (z.borough || '').toLowerCase().includes(q) ||
        String(z.location_id).includes(q)
      );
      if (filtered.length) result[borough] = filtered;
    });
    return result;
  }, [groupedZones, zoneSearch]);

  const totalFilteredZones = useMemo(() => {
    return Object.values(filteredGroupedZones).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }, [filteredGroupedZones]);

  useEffect(() => {
    if (!selectedZone) return;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [f, xf, cmp, imp] = await Promise.all([
          api.get(`/forecasts/${selectedZone}?horizon=${horizon}`),
          api.get(`/enhanced-forecasts/${selectedZone}/external-features`).catch(() => null),
          api.get(`/forecasts/${selectedZone}/compare`).catch(() => null),
          api.get(`/forecasts/${selectedZone}/feature-importance`).catch(() => null),
        ]);
        setForecast(f.data);
        setExternalFeatures(xf?.data || null);
        setComparison(cmp?.data || null);
        setImportance(imp?.data || null);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Forecast unavailable for this zone.');
        setForecast(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedZone, horizon]);

  const fetchWeather = async () => {
    try {
      const res = await api.get('/enhanced-forecasts/weather/current');
      setWeather(res.data);
    } catch (e) {
      console.warn(e);
    }
  };
  const fetchEvents = async () => {
    try {
      const res = await api.get('/enhanced-forecasts/events/upcoming?hours=48');
      setEvents(res.data);
    } catch (e) {
      console.warn(e);
    }
  };

  const meta = forecast?.meta || {};
  const peak = forecast?.peak_demand || forecast?.peak_window || null;
  const avgDemand = forecast?.average_demand || 0;
  const selectedZoneObj = zones.find((z) => z.location_id.toString() === selectedZone);

  const groupedImportance = importance?.grouped || {};
  const importanceEntries = Object.entries(groupedImportance).sort((a, b) => b[1] - a[1]);
  const maxImp = Math.max(1, ...importanceEntries.map(([, v]) => v));

  const estAcc = meta.estimated_accuracy ?? 0;
  const estBand = meta.confidence_band || 'low';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 rounded-3xl border p-6 md:p-8 shadow-2xl backdrop-blur-2xl ${
          isDark
            ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80'
            : 'border-slate-200 bg-gradient-to-br from-white via-slate-50/60 to-white'
        }`}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${isDark ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] ${
                  isDark
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                }`}>
                  Ensemble Forecast
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] ${
                  isDark
                    ? 'bg-white/[0.03] text-slate-400 border border-white/[0.08]'
                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  Confidence · {estBand}
                </span>
              </div>
              <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Enhanced Demand Forecast
              </h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Multi-model stack with weather · events · holidays · lag features.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Horizon
              </label>
              <div className={`inline-flex rounded-2xl p-1 border ${isDark ? 'border-white/[0.08] bg-black/40' : 'border-slate-200 bg-white'}`}>
                {[
                  { k: 'hourly', label: '24 Hours' },
                  { k: 'daily', label: '7 Days' },
                ].map((h) => (
                  <button
                    key={h.k}
                    onClick={() => setHorizon(h.k)}
                    className={`px-4 py-2 rounded-xl text-[11.5px] font-black uppercase tracking-wider transition-all ${
                      horizon === h.k
                        ? isDark
                          ? 'bg-orange-500 text-black shadow-md'
                          : 'bg-orange-500 text-white shadow-md'
                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative min-w-[300px]" ref={zoneDropdownRef}>
              <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Target Zone
              </label>
              <button
                onClick={() => setZoneDropdownOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#0a0a0a] border-white/[0.08] hover:border-orange-500/30 text-white'
                    : 'bg-white border-slate-200 hover:border-orange-500/30 text-slate-900'
                } ${zonesLoading ? 'opacity-60 cursor-wait' : ''}`}
                disabled={zonesLoading}
              >
                <span className="flex items-center gap-3 text-left">
                  <Star size={15} className="text-orange-500 shrink-0" />
                  <span>
                    <span className="block text-[13px] font-black truncate max-w-[190px]">
                      {zonesLoading ? 'Loading zones…' : (selectedZoneObj?.zone_name || 'Select zone…')}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {zonesLoading
                        ? `${zones.length} available`
                        : `${selectedZoneObj?.borough || '—'} · #${selectedZone || '?'}`}
                    </span>
                  </span>
                </span>
                <ChevronDown size={18} className={`transition-transform shrink-0 ${zoneDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </button>
              {zoneDropdownOpen && (
                <div className={`absolute z-50 mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden ${
                  isDark ? 'bg-[#0a0a0a] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}>
                  <div className={`px-3 py-2.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className={`relative flex items-center`}>
                      <Search size={14} className={`absolute left-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        value={zoneSearch}
                        onChange={(e) => setZoneSearch(e.target.value)}
                        placeholder="Search zone name, borough, or #ID…"
                        className={`w-full pl-9 pr-9 py-2 rounded-xl text-[12px] font-semibold outline-none border transition-colors ${
                          isDark
                            ? 'bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus:border-orange-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500/40'
                        }`}
                        autoFocus
                      />
                      {zoneSearch && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setZoneSearch(''); }}
                          className={`absolute right-2.5 p-1 rounded-md ${isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-200 text-slate-400'}`}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className={`mt-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      <span>{totalFilteredZones} of {zones.length} zones</span>
                      <span>{Object.keys(filteredGroupedZones).length} boroughs</span>
                    </div>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    {totalFilteredZones === 0 ? (
                      <div className={`py-10 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Search size={22} className="mx-auto mb-2 opacity-50" />
                        <div className="text-[12px] font-bold">No zones match "{zoneSearch}"</div>
                        <div className="text-[10.5px] mt-1 uppercase tracking-wider">Try a different search term</div>
                      </div>
                    ) : (
                      Object.entries(filteredGroupedZones).map(([borough, bZones]) => (
                        <div key={borough} className="py-1">
                          <div className={`px-4 py-1.5 sticky top-0 backdrop-blur-sm ${isDark ? 'bg-[#0a0a0a]/80' : 'bg-white/80'}`}>
                            <span className={`text-[9.5px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
                              {borough}
                            </span>
                            <span className={`ml-2 text-[9.5px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                              {bZones.length}
                            </span>
                          </div>
                          <div>
                            {bZones.map((z) => (
                              <button
                                key={z.location_id}
                                onClick={() => {
                                  setSelectedZone(z.location_id.toString());
                                  setZoneDropdownOpen(false);
                                  setZoneSearch('');
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[12.5px] font-semibold transition-colors border-l-2 ${
                                  selectedZone === z.location_id.toString()
                                    ? `bg-orange-500/10 text-orange-500 border-orange-500 ${isDark ? '' : ''}`
                                    : `border-transparent ${isDark ? 'text-slate-300 hover:bg-white/[0.03]' : 'text-slate-700 hover:bg-slate-50'}`
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    <span className={`font-black ${selectedZone === z.location_id.toString() ? '' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>#{z.location_id}</span>
                                    <span className="mx-1.5 opacity-50">·</span>
                                    <span className="truncate">{z.zone_name}</span>
                                  </span>
                                  {selectedZone === z.location_id.toString() && (
                                    <CheckCircle size={14} className="text-orange-500 shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model selector chips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1.5 mr-2 text-[10.5px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Sliders size={13} /> View Model
          </span>
          {MODEL_CHIPS.map((c) => {
            const has = (forecast?.meta?.model_contributions || []).some(([k]) => k === c.key)
              || (forecast?.meta?.per_model_breakdown && Object.hasOwn(forecast.meta.per_model_breakdown, c.key))
              || c.key === 'ensemble';
            const on = activeModel === c.key;
            return (
              <button
                key={c.key}
                onClick={() => has && setActiveModel(c.key)}
                disabled={!has}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                  !has
                    ? (isDark ? 'border-white/[0.05] text-slate-600 cursor-not-allowed bg-white/[0.02]' : 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50')
                    : on
                      ? isDark
                        ? 'bg-orange-500 text-black border-orange-500 shadow-md'
                        : 'bg-orange-500 text-white border-orange-500 shadow-md'
                      : (isDark ? 'border-white/[0.10] text-slate-400 hover:text-white hover:border-white/20' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300')
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* KPI STRIP — single unified panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border shadow-2xl backdrop-blur-2xl overflow-hidden ${
          isDark
            ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80'
            : 'border-slate-200 bg-gradient-to-br from-white via-slate-50/40 to-white'
        }`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            {
              icon: <Gauge size={17} />,
              eyebrow: 'Accuracy',
              title: 'Estimated',
              value: `${estAcc.toFixed(1)}%`,
              sub: `Confidence band: ${estBand}`,
              accent: true,
            },
            {
              icon: <Sparkles size={17} />,
              eyebrow: 'Engine',
              title: 'Active model',
              value: meta.model_name || '—',
              sub: (meta.features_used || []).filter(Boolean).join(' · ') || 'features pending',
              valSize: 'text-[15px]',
            },
            {
              icon: <Target size={17} />,
              eyebrow: 'Peak Demand',
              title: horizon === 'hourly' ? 'Peak hour' : 'Peak day',
              value: peak ? Math.round(peak.value || peak.predicted_demand || 0).toLocaleString() : '—',
              sub: peak?.timestamp ? new Date(peak.timestamp).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit' }) : 'pending',
            },
            {
              icon: <BarChart3 size={17} />,
              eyebrow: 'Average',
              title: horizon === 'hourly' ? 'Trips / hour' : 'Trips / day',
              value: Math.round(avgDemand).toLocaleString(),
              sub: `${(forecast?.predicted || []).length} ${horizon} windows forecasted`,
            },
          ].map((k, i) => (
            <div
              key={i}
              className={`p-5 md:p-6 relative ${
                i < 3
                  ? isDark
                    ? 'md:border-r border-white/[0.06] col-span-2 md:col-span-1 md:border-b-0' + (i === 0 || i === 1 ? ' border-b md:border-b-0 border-white/[0.06]' : '')
                    : 'md:border-r border-slate-100 col-span-2 md:col-span-1 md:border-b-0' + (i === 0 || i === 1 ? ' border-b md:border-b-0 border-slate-100' : '')
                  : ''
              } ${
                k.accent
                  ? isDark
                    ? 'bg-orange-500/[0.04]'
                    : 'bg-orange-50/50'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{k.eyebrow}</span>
                <span className={`p-1.5 rounded-xl ${
                  k.accent
                    ? (isDark ? 'bg-orange-500/15 text-orange-500' : 'bg-orange-500/10 text-orange-600')
                    : (isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500')
                }`}>{k.icon}</span>
              </div>
              <p className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{k.title}</p>
              <div className={`mt-2 font-black tracking-tight ${k.valSize || 'text-2xl'} ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                {k.value}
              </div>
              <p className={`mt-2 text-[11.5px] leading-5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {error && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className={`text-[13px] font-bold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>Notice</p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-amber-300/80' : 'text-amber-800'}`}>{error}</p>
          </div>
        </div>
      )}

      {/* FORECAST CHART */}
      {(loading || forecast) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-6 md:p-7 shadow-2xl backdrop-blur-3xl ${
            isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp size={17} className="text-orange-500" />
                <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Demand Curve
                </span>
              </div>
              <h2 className={`text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {horizon === 'hourly' ? '24-Hour' : '7-Day'} Forecast with Confidence Band
              </h2>
              <p className={`mt-1 text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hover the chart to inspect per-timestamp values, surge multipliers, and projected revenue.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider">
              <span className={`px-3 py-1.5 rounded-xl border ${isDark ? 'border-white/[0.08]' : 'border-slate-200'} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: isDark ? '#fb923c' : '#f97316' }} />
                Historical
              </span>
              {(forecast?.meta?.weights || meta.weights) && (
                <span className={`px-3 py-1.5 rounded-xl shadow ${
                  isDark
                    ? 'bg-orange-500 text-black'
                    : 'bg-orange-500 text-white'
                }`}>
                  Weights · {Object.entries(meta.weights || {}).length} models
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            </div>
          ) : (
            <>
              <ForecastSvgChart
                historical={forecast?.historical || []}
                predicted={forecast?.predicted || []}
                perModelBreakdown={forecast?.per_model_breakdown || {}}
                activeModelKey={activeModel}
                isDark={isDark}
                height={340}
              />
              {(meta.model_contributions?.length || 0) > 0 && (
                <div className={`mt-6 pt-5 border-t grid grid-cols-2 md:grid-cols-4 gap-3 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  {meta.model_contributions.slice(0, 4).map(([k, w], i) => {
                    const chip = MODEL_CHIPS.find((c) => c.key === k);
                    if (!chip) return null;
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0">
                          <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                            <circle cx="20" cy="20" r="15" fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'} strokeWidth="5" />
                            <circle
                              cx="20" cy="20" r="15"
                              fill="none" stroke={chip.color} strokeWidth="5"
                              strokeDasharray={`${w * 94.2} 94.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{chip.label}</div>
                          <div className="text-[14px] font-black tabular-nums" style={{ color: chip.color }}>
                            {(w * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* EXTERNAL CONTEXT — single unified panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
        className={`rounded-3xl border shadow-2xl backdrop-blur-2xl overflow-hidden ${
          isDark
            ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80'
            : 'border-slate-200 bg-gradient-to-br from-white via-slate-50/40 to-white'
        }`}
      >
        <div className={`px-6 md:px-7 pt-5 md:pt-6 pb-4 md:pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-orange-500" />
            <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              External Context
            </span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <CloudRain size={19} />,
              title: 'Weather',
              value: weather ? `${weather.temperature?.toFixed(0) ?? '—'}°F` : '—',
              sub: weather
                ? `${weather.weather || 'Clear'} · Hum ${weather.humidity || 0}%${weather.rain ? ' · Rain' : ''}`
                : 'Loading weather data…',
              badge: weather?.rain > 0 ? { text: 'Rain · demand +' } : null,
            },
            {
              icon: <Music size={19} />,
              title: 'Events',
              value: `${events?.event_count || 0}`,
              sub: events
                ? `Next 48h · ${(events.total_expected_attendance || 0).toLocaleString()} attendees`
                : 'Loading events…',
              badge: (events?.event_count || 0) > 0 ? { text: `${events.event_count} upcoming` } : null,
            },
            {
              icon: <Train size={19} />,
              title: 'Transit',
              value: `${Math.round(((externalFeatures?.features?.transit?.disruption_score || 0) * 100))}%`,
              sub: (externalFeatures?.features?.transit?.disruption_score || 0) > 0.5 ? 'High disruption — expect more rides' : 'Normal subway operation',
              badge: (externalFeatures?.features?.transit?.disruption_score || 0) > 0.5 ? { text: 'Disruption surge' } : null,
              accent: true,
            },
            {
              icon: <Plane size={19} />,
              title: 'Airports',
              value: 'JFK · LGA · EWR',
              sub: `JFK ${Math.round(((externalFeatures?.features?.airports?.jfk_traffic || 0) * 100))}% · LGA ${Math.round(((externalFeatures?.features?.airports?.lga_traffic || 0) * 100))}% · EWR ${Math.round(((externalFeatures?.features?.airports?.ewr_traffic || 0) * 100))}%`,
              badge: Math.round(((externalFeatures?.features?.airports?.jfk_traffic || 0) * 100)) > 70 ? { text: 'Peak air traffic' } : null,
            },
          ].map((c, i) => (
            <div
              key={i}
              className={`p-5 md:p-6 relative ${
                i < 3
                  ? isDark
                    ? 'lg:border-r border-white/[0.06] col-span-2 md:col-span-1 lg:col-span-1 lg:border-b-0' + (i === 0 || i === 1 ? ' border-b lg:border-b-0 border-white/[0.06]' : '')
                    : 'lg:border-r border-slate-100 col-span-2 md:col-span-1 lg:col-span-1 lg:border-b-0' + (i === 0 || i === 1 ? ' border-b lg:border-b-0 border-slate-100' : '')
                  : ''
              } ${
                c.accent
                  ? isDark
                    ? 'bg-orange-500/[0.04]'
                    : 'bg-orange-50/40'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className={`p-2.5 rounded-xl ${
                  c.accent
                    ? (isDark ? 'bg-orange-500/15 text-orange-500' : 'bg-orange-500/10 text-orange-600')
                    : (isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500')
                }`}>
                  {c.icon}
                </div>
                {c.badge && (
                  <span className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider border ${
                    isDark
                      ? 'bg-white/[0.03] text-slate-300 border-white/[0.08]'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {c.badge.text}
                  </span>
                )}
              </div>
              <p className={`text-[10.5px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{c.title}</p>
              <div className={`mt-1.5 text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.value}</div>
              <p className={`mt-2 text-[11.5px] leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* BOTTOM GRID: Accuracy improvement + Feature importance */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Accuracy improvement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 rounded-3xl border p-6 shadow-2xl backdrop-blur-3xl ${
            isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle size={17} className="text-orange-500" />
            <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Accuracy Delta
            </span>
          </div>
          <h2 className={`text-lg md:text-xl font-black mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Ensemble vs Baseline
          </h2>
          {comparison ? (
            <div className="space-y-3.5">
              {Object.entries(comparison.improvement_over_baseline_sarimax || {})
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const chip = MODEL_CHIPS.find((c) => c.key === k);
                  if (!chip) return null;
                  const pct = Math.max(0, Math.min(100, v));
                  const positive = v >= 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${positive ? (isDark ? 'bg-orange-500' : 'bg-orange-500') : (isDark ? 'bg-slate-500' : 'bg-slate-400')}`} />
                          <span className={`text-[12px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{chip.label}</span>
                          {comparison.selected_model === k && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                              isDark
                                ? 'bg-orange-500 text-black border-orange-500'
                                : 'bg-orange-500 text-white border-orange-500'
                            }`}>
                              WINNER
                            </span>
                          )}
                        </span>
                        <span className={`text-[12px] font-black tabular-nums ${isDark ? (positive ? 'text-orange-500' : 'text-slate-500') : (positive ? 'text-orange-600' : 'text-slate-500')}`}>
                          {positive ? '+' : ''}{v.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${positive ? pct : 0}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            positive
                              ? (isDark ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-orange-500 to-orange-400')
                              : (isDark ? 'bg-slate-600/70' : 'bg-slate-400/70')
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              <div className={`mt-5 pt-4 border-t flex items-start gap-3 rounded-xl p-4 ${
                isDark
                  ? 'border-white/[0.06] bg-orange-500/[0.04]'
                  : 'border-orange-100 bg-orange-50/60'
              }`}>
                <Info size={17} className={`mt-0.5 shrink-0 ${isDark ? 'text-orange-500' : 'text-orange-600'}`} />
                <p className={`text-[12px] leading-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Recommendation — </span>
                  {comparison.recommendation || `Use ${comparison.selected_model || 'Ensemble'} for this zone.`}
                </p>
              </div>
            </div>
          ) : (
            <div className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Waiting for comparison snapshot…
            </div>
          )}
        </motion.div>

        {/* Feature importance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`lg:col-span-3 rounded-3xl border p-6 shadow-2xl backdrop-blur-3xl ${
            isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Layers size={17} className="text-orange-500" />
            <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Feature Drivers
            </span>
          </div>
          <h2 className={`text-lg md:text-xl font-black mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Why Did the Model Predict This?
          </h2>
          {importanceEntries.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3.5">
                {importanceEntries.map(([k, v]) => {
                  const pct = (v / maxImp) * 100;
                  const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[12px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {label}
                        </span>
                        <span className={`text-[12px] font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {v.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isDark
                              ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                              : 'bg-gradient-to-r from-orange-500 to-orange-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={`rounded-2xl border p-5 ${
                isDark
                  ? 'border-white/[0.06] bg-gradient-to-br from-[#141414]/80 to-[#0a0a0a]/80'
                  : 'border-slate-100 bg-gradient-to-br from-slate-50/80 to-white'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={15} className="text-orange-500" />
                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Top Individual Features
                  </span>
                </div>
                <div className="space-y-2.5">
                  {(importance.top_features || []).slice(0, 10).map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        i === 0 ? 'bg-orange-500/15 text-orange-500 border border-orange-500/20'
                          : (isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {i + 1}
                      </span>
                      <span className={`flex-1 text-[12px] font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {f.feature}
                      </span>
                      <span className={`text-[12px] font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {f.importance_pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {(importance.top_features || []).length === 0 && (
                    <div className={`text-[11.5px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Top features pending retraining — check back shortly.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border p-5 text-[12px] leading-6 ${isDark ? 'border-white/[0.06] text-slate-400' : 'border-slate-100 text-slate-500'}`}>
              Feature importance requires LightGBM. Install <code className={`px-1.5 py-0.5 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>lightgbm&gt;=4.0.0</code> and
              retrain — the model will automatically explain which features (hour-of-day, weekend, rain, lags, etc.) drive each prediction.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
