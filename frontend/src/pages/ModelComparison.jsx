import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/axios';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp, Award, BarChart3, PieChart, Target,
  Zap, Clock, ChevronDown, Star, Shield, CheckCircle2,
  AlertCircle, Gauge, Layers, Search, X, CheckCircle, Trophy
} from 'lucide-react';

const MODEL_DISPLAY = {
  holt_winters: {
    label: 'Holt-Winters ETS',
    short: 'ETS',
    color: '#06b6d4',
    fill: 'rgba(6,182,212,0.18)',
    stroke: 'rgba(6,182,212,0.6)',
  },
  prophet: {
    label: 'Prophet',
    short: 'Prophet',
    color: '#8b5cf6',
    fill: 'rgba(139,92,246,0.18)',
    stroke: 'rgba(139,92,246,0.6)',
  },
  lightgbm: {
    label: 'LightGBM GBM',
    short: 'LGBM',
    color: '#10b981',
    fill: 'rgba(16,185,129,0.18)',
    stroke: 'rgba(16,185,129,0.6)',
  },
  sarimax_pro: {
    label: 'SARIMAX-Pro',
    short: 'SARX',
    color: '#f97316',
    fill: 'rgba(249,115,22,0.18)',
    stroke: 'rgba(249,115,22,0.6)',
  },
  ensemble: {
    label: 'Weighted Ensemble',
    short: 'Ensemble',
    color: '#f43f5e',
    fill: 'rgba(244,63,94,0.22)',
    stroke: 'rgba(244,63,94,0.7)',
  },
};

const MODEL_STRENGTH_AXES = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'speed', label: 'Inference Speed' },
  { key: 'seasonality', label: 'Seasonality' },
  { key: 'exogenous', label: 'Exog. Vars' },
  { key: 'interpret', label: 'Interpretability' },
  { key: 'robustness', label: 'Robustness' },
];

const STRENGTH_PROFILES = {
  holt_winters: { accuracy: 65, speed: 98, seasonality: 80, exogenous: 10, interpret: 85, robustness: 90 },
  prophet:      { accuracy: 78, speed: 65, seasonality: 90, exogenous: 75, interpret: 70, robustness: 80 },
  lightgbm:     { accuracy: 92, speed: 95, seasonality: 70, exogenous: 95, interpret: 60, robustness: 75 },
  sarimax_pro:  { accuracy: 80, speed: 30, seasonality: 75, exogenous: 85, interpret: 75, robustness: 70 },
  ensemble:     { accuracy: 95, speed: 55, seasonality: 92, exogenous: 95, interpret: 55, robustness: 95 },
};

function LoadingCard({ accent = false, isDark }) {
  return (
    <div className={`rounded-3xl border p-6 shadow-xl animate-pulse ${accent
      ? 'border-orange-500/30 bg-gradient-to-br from-orange-600/20 to-red-600/20'
      : (isDark ? 'border-white/[0.08] bg-[#0a0a0a]' : 'border-slate-200 bg-white')}`}>
      <div className={`h-3 w-28 rounded-full ${accent ? 'bg-orange-200/30' : (isDark ? 'bg-[#222]' : 'bg-slate-200')}`} />
      <div className={`mt-5 h-10 w-32 rounded-xl ${accent ? 'bg-white/15' : (isDark ? 'bg-[#181818]' : 'bg-slate-200')}`} />
      <div className={`mt-4 h-3 w-4/5 rounded-full ${accent ? 'bg-white/15' : (isDark ? 'bg-[#202020]' : 'bg-slate-100')}`} />
    </div>
  );
}

function RadarChart({ profiles, selectedKeys, isDark }) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;
  const n = MODEL_STRENGTH_AXES.length;

  const rings = [0.25, 0.5, 0.75, 1.0];

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointFor = (i, value) => {
    const a = angleFor(i);
    const r = (value / 100) * radius;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const polygonFor = (profile) => MODEL_STRENGTH_AXES
    .map((ax, i) => pointFor(i, profile[ax.key]).join(','))
    .join(' ');

  const activeKeys = selectedKeys.length ? selectedKeys : Object.keys(profiles);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] mx-auto">
      <defs>
        {activeKeys.map((k) => {
          const m = MODEL_DISPLAY[k];
          if (!m) return null;
          return (
            <radialGradient key={k} id={`rg-${k}`}>
              <stop offset="0%" stopColor={m.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={m.color} stopOpacity="0.05" />
            </radialGradient>
          );
        })}
      </defs>

      {rings.map((r, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={radius * r}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
          strokeDasharray={i === rings.length - 1 ? '0' : '3 4'}
          strokeWidth={1}
        />
      ))}

      {MODEL_STRENGTH_AXES.map((_, i) => {
        const [x, y] = pointFor(i, 100);
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
            strokeWidth={1}
          />
        );
      })}

      {activeKeys.map((k) => {
        const prof = profiles[k];
        const m = MODEL_DISPLAY[k];
        if (!prof || !m) return null;
        return (
          <g key={k}>
            <polygon
              points={polygonFor(prof)}
              fill={m.fill}
              stroke={m.color}
              strokeWidth={1.8}
              strokeLinejoin="round"
              opacity={0.9}
            />
          </g>
        );
      })}

      {MODEL_STRENGTH_AXES.map((ax, i) => {
        const [lx, ly] = pointFor(i, 116);
        return (
          <text
            key={ax.key}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10.5}
            fontWeight={700}
            fill={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.6)'}
            letterSpacing={0.3}
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

function WeightsDonut({ weights, isDark }) {
  const entries = Object.entries(weights || {}).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = 78;
  const rIn = 50;

  let accAngle = -Math.PI / 2;

  const arcs = entries.map(([k, v]) => {
    const frac = v / total;
    const a0 = accAngle;
    accAngle += frac * Math.PI * 2;
    const a1 = accAngle;
    const m = MODEL_DISPLAY[k];
    const color = m?.color || '#888';

    const large = frac > 0.5 ? 1 : 0;
    const x0o = cx + Math.cos(a0) * rOut;
    const y0o = cy + Math.sin(a0) * rOut;
    const x1o = cx + Math.cos(a1) * rOut;
    const y1o = cy + Math.sin(a1) * rOut;
    const x0i = cx + Math.cos(a1) * rIn;
    const y0i = cy + Math.sin(a1) * rIn;
    const x1i = cx + Math.cos(a0) * rIn;
    const y1i = cy + Math.sin(a0) * rIn;

    const d = `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${rIn} ${rIn} 0 ${large} 0 ${x1i} ${y1i} Z`;
    return { k, d, color, frac, label: m?.short || k };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[200px] h-[200px] shrink-0">
        {arcs.map((a) => (
          <path key={a.k} d={a.d} fill={a.color} opacity={0.92} />
        ))}
        <circle cx={cx} cy={cy} r={rIn - 1} fill={isDark ? '#0a0a0a' : '#fff'} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={12} fontWeight={800}
          fill={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)'}>
          WEIGHTS
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={18} fontWeight={900}
          fill={isDark ? '#fff' : '#0f172a'}>
          {entries.length}
        </text>
      </svg>
      <div className="space-y-2.5 min-w-[180px]">
        {entries.sort((a, b) => b.frac - a.frac).map((a) => (
          <div key={a.k} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
            <span className={`text-[12px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {a.label}
            </span>
            <span className={`text-[12px] font-black tabular-nums ml-auto ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {(a.frac * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No weights yet…</div>
        )}
      </div>
    </div>
  );
}

function MetricBar({ label, value, unit, max, color, isDark, rank }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </span>
          {rank && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-orange-500/15 text-orange-400 border border-orange-500/20">
              #{rank}
            </span>
          )}
        </div>
        <span className={`text-[12px] font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {value.toFixed(2)} <span className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
      </div>
    </div>
  );
}

export default function ModelComparison() {
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode !== 'light';

  const [zones, setZones] = useState([]);
  const [groupedZones, setGroupedZones] = useState({});
  const [selectedZone, setSelectedZone] = useState('');
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const zoneDropdownRef = useRef(null);
  const [comparison, setComparison] = useState(null);
  const [importance, setImportance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggleModels, setToggleModels] = useState(['ensemble', 'lightgbm']);
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
        console.error(err);
        setZones([]);
        setGroupedZones({});
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
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
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [cmp, imp] = await Promise.all([
          api.get(`/forecasts/${selectedZone}/compare`),
          api.get(`/forecasts/${selectedZone}/feature-importance`).catch(() => null),
        ]);
        setComparison(cmp.data);
        setImportance(imp?.data || null);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Unable to run model comparison for this zone.');
        setComparison(null);
        setImportance(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedZone]);

  const results = comparison?.results || {};
  const sortedKeys = useMemo(() => {
    return Object.entries(results)
      .filter(([, r]) => r && typeof r === 'object' && !('error' in r))
      .sort((a, b) => (a[1]?.wmape ?? 1e9) - (b[1]?.wmape ?? 1e9))
      .map(([k]) => k);
  }, [results]);

  const baselineKey = 'sarimax_pro';
  const maxMae = useMemo(() => {
    return Math.max(1, ...sortedKeys.map((k) => results[k]?.mae ?? 0));
  }, [sortedKeys, results]);
  const maxRmse = useMemo(() => {
    return Math.max(1, ...sortedKeys.map((k) => results[k]?.rmse ?? 0));
  }, [sortedKeys, results]);
  const maxWmape = useMemo(() => {
    return Math.max(1, ...sortedKeys.map((k) => results[k]?.wmape ?? 0));
  }, [sortedKeys, results]);

  const toggleModel = (k) => {
    setToggleModels((cur) =>
      cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]
    );
  };

  const groupedImportance = importance?.grouped || {};
  const importanceEntries = Object.entries(groupedImportance).sort((a, b) => b[1] - a[1]);
  const maxImp = Math.max(1, ...importanceEntries.map(([, v]) => v));

  const selectedZoneObj = zones.find((z) => z.location_id.toString() === selectedZone);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
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
              <Layers size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/15 text-orange-500 border border-orange-500/20">
                  Model Lab
                </span>
              </div>
              <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Multi-Model Comparison
              </h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Benchmark Holt-Winters · Prophet · LightGBM · SARIMAX-Pro · Weighted Ensemble on the same validation fold.
              </p>
            </div>
          </div>

          <div className="relative min-w-[320px]" ref={zoneDropdownRef}>
            <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Target Zone
            </label>
            <button
              onClick={() => setZoneDropdownOpen((o) => !o)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08] hover:border-orange-500/30 text-white'
                  : 'bg-white border-slate-200 hover:border-orange-500/30 text-slate-900'
              } ${zonesLoading ? 'opacity-60 cursor-wait' : ''}`}
              disabled={zonesLoading}
            >
              <span className="flex items-center gap-3 text-left">
                <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                  <Trophy size={16} />
                </span>
                <span>
                  <span className="block text-[13px] font-black truncate max-w-[200px]">
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
                                  ? `bg-orange-500/10 text-orange-500 border-orange-500`
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
      </motion.div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className={`text-[13px] font-bold ${isDark ? 'text-red-200' : 'text-red-900'}`}>Comparison failed</p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>{error}</p>
          </div>
        </div>
      )}

      {/* TOP KPI STRIP — single unified panel */}
      {loading ? (
        <LoadingCard isDark={isDark} />
      ) : comparison ? (
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
                icon: <Trophy size={18} />,
                eyebrow: 'Best Model',
                title: 'Holdout champion',
                value: MODEL_DISPLAY[comparison.selected_model]?.label || comparison.selected_model,
                sub: comparison.recommendation,
                accent: true,
                valSize: 'text-lg',
              },
              {
                icon: <TrendingUp size={18} />,
                eyebrow: 'vs Baseline',
                title: 'WMAPE improvement',
                value: `${(comparison.improvement_over_baseline_sarimax?.[comparison.selected_model] ?? 0).toFixed(1)}%`,
                sub: `Improvement over ${MODEL_DISPLAY[baselineKey]?.label || 'SARIMAX baseline'}`,
              },
              {
                icon: <Gauge size={18} />,
                eyebrow: 'Models Evaluated',
                title: 'Candidates compared',
                value: `${sortedKeys.filter((k) => k !== 'ensemble').length} + Ensemble`,
                sub: 'Each trained on same train/test split',
              },
              {
                icon: <Clock size={18} />,
                eyebrow: 'Snapshot',
                title: 'Generated at',
                value: comparison.comparison_generated_at
                  ? new Date(comparison.comparison_generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—',
                sub: comparison.from_cache ? 'Served from cache' : 'Freshly evaluated',
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
                <p className={`mt-2 text-[11.5px] leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* MAIN GRID: Radar + Donut + Legend */}
      {loading ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <LoadingCard isDark={isDark} />
          <LoadingCard isDark={isDark} />
        </div>
      ) : comparison ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`lg:col-span-2 rounded-3xl border p-6 md:p-7 shadow-2xl backdrop-blur-3xl ${
              isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Target size={17} className="text-orange-500" />
                  <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Strength Profiles
                  </span>
                </div>
                <h2 className={`text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Model Capability Radar
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5 max-w-md">
                {Object.keys(MODEL_DISPLAY).map((k) => {
                  const m = MODEL_DISPLAY[k];
                  const on = toggleModels.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleModel(k)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider border transition-all ${
                        on
                          ? isDark
                            ? 'bg-orange-500 text-black border-orange-500'
                            : 'bg-orange-500 text-white border-orange-500'
                          : (isDark ? 'border-white/[0.08] text-slate-500 bg-white/[0.02] hover:text-slate-300' : 'border-slate-200 text-slate-400 bg-slate-50 hover:text-slate-600')
                      }`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <RadarChart profiles={STRENGTH_PROFILES} selectedKeys={toggleModels} isDark={isDark} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`rounded-3xl border p-6 md:p-7 shadow-2xl backdrop-blur-2xl ${
              isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <PieChart size={17} className="text-orange-500" />
              <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Ensemble Weights
              </span>
            </div>
            <h2 className={`text-lg md:text-xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Inverse-WMAPE Weighting
            </h2>
            <WeightsDonut weights={comparison.ensemble_weights} isDark={isDark} />
            <div className={`mt-6 pt-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <div className="flex items-start gap-2.5">
                <Shield size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <p className={`text-[11.5px] leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Models with lower validation WMAPE receive higher weight. Ensemble
                  automatically combines predictions — typically <span className={`font-black ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>2–8% more accurate</span> than any single model.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* METRIC COMPARISON TABLE / BAR CARDS */}
      {loading ? (
        <LoadingCard isDark={isDark} />
      ) : comparison && sortedKeys.length ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-6 md:p-7 shadow-2xl backdrop-blur-3xl ${
            isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 size={17} className="text-orange-500" />
                <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Holdout Metrics
                </span>
              </div>
              <h2 className={`text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Side-by-side Performance (lower = better)
              </h2>
            </div>
            <div className={`px-3 py-2 rounded-xl text-[11px] font-bold ${isDark ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              {Object.values(comparison.results).find((r) => r?.test_size)?.test_size || '168'}h validation window
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedKeys.map((k, idx) => {
              const r = results[k];
              const m = MODEL_DISPLAY[k];
              if (!r || !m) return null;
              const isWinner = comparison.selected_model === k;
              const isBaseline = k === baselineKey;
              const improve = comparison.improvement_over_baseline_sarimax?.[k] ?? 0;
              return (
                <div
                  key={k}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isWinner
                      ? (isDark
                          ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/[0.08] via-[#0f0f0f] to-[#050505]'
                          : 'border-orange-500/30 bg-gradient-to-br from-orange-50/80 via-white to-orange-50/40')
                      : (isDark
                          ? 'border-white/[0.06] bg-[#0d0d0d]/60 hover:border-white/[0.12]'
                          : 'border-slate-200 bg-white hover:border-slate-300')
                  }`}
                >
                  {isWinner && (
                    <div className={`absolute -top-2.5 right-4 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] shadow-md ${
                      isDark
                        ? 'bg-orange-500 text-black'
                        : 'bg-orange-500 text-white'
                    }`}>
                      <span className="flex items-center gap-1"><Star size={10} fill={isDark ? '#000' : '#fff'} /> Champion</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`p-2 rounded-xl shrink-0 ${
                        isWinner
                          ? (isDark ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30' : 'bg-orange-500/10 text-orange-600 border border-orange-200')
                          : (isDark ? 'bg-white/[0.04] text-slate-400 border border-white/[0.06]' : 'bg-slate-100 text-slate-500 border border-slate-200')
                      }`}
                    >
                      <Zap size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[15px] font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isBaseline && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                            Baseline
                          </span>
                        )}
                        <span className={`text-[10.5px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Rank #{idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3.5">
                    <MetricBar label="MAE" value={r.mae} unit="trips" max={maxMae} color={isDark ? '#fb923c' : '#f97316'} isDark={isDark} />
                    <MetricBar label="RMSE" value={r.rmse} unit="trips" max={maxRmse} color={isDark ? '#fb923c' : '#f97316'} isDark={isDark} />
                    <MetricBar label="WMAPE" value={r.wmape} unit="%" max={maxWmape} color={isDark ? '#fb923c' : '#f97316'} isDark={isDark} rank={k === comparison.selected_model ? 1 : null} />
                  </div>
                  <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Weight
                    </span>
                    <span className={`text-[14px] font-black tabular-nums ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
                      {((comparison.ensemble_weights?.[k] ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  {!isBaseline && (
                    <div className={`mt-2 flex items-center gap-1.5 ${improve >= 0 ? (isDark ? 'text-orange-500' : 'text-orange-600') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                      {improve >= 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {improve >= 0 ? '+' : ''}{improve.toFixed(1)}% vs baseline
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {/* FEATURE IMPORTANCE */}
      {loading ? (
        <LoadingCard isDark={isDark} />
      ) : importanceEntries.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-3xl border p-6 md:p-7 shadow-2xl backdrop-blur-3xl ${
            isDark ? 'border-white/[0.08] bg-[#0a0a0a]/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={17} className="text-orange-500" />
                <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Feature Drivers
                </span>
              </div>
              <h2 className={`text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                LightGBM Gain-based Importance
              </h2>
              <p className={`mt-1 text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {importance.n_features || '…'} features · grouped by feature family
              </p>
            </div>
          </div>
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
                <Star size={15} className="text-orange-500" />
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
                    Individual features pending re-evaluation.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
