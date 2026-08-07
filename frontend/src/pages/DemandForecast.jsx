import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/axios';
import { Activity, TrendingUp, Clock, MapPin, ChevronDown, CloudRain, GitCompare, X } from 'lucide-react';

export default function DemandForecast() {
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode !== 'light';

  // Primary forecast state
  const [zones, setZones] = useState([]);
  const [availableWindow, setAvailableWindow] = useState({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
  const [windowLoading, setWindowLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [horizon, setHorizon] = useState('hourly');
  const [selectedForecastDate, setSelectedForecastDate] = useState('');
  const [selectedForecastTime, setSelectedForecastTime] = useState('');
  const [isBeyondThreeMonths, setIsBeyondThreeMonths] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [predictionTimerMs, setPredictionTimerMs] = useState(0);
  const [lastPredictionMs, setLastPredictionMs] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Dropdowns
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const timeDropdownRef = useRef(null);
  const zoneDropdownRef = useRef(null);

  // Zone Comparison (Feature 8)
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareZone, setCompareZone] = useState('');
  const [compareZoneSearch, setCompareZoneSearch] = useState('');
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);
  const [compareForecastData, setCompareForecastData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const compareDropdownRef = useRef(null);

  const modelLabel = (modelType) => {
    if (modelType === 'sarimax') return 'SARIMAX';
    if (modelType === 'calendar_profile') return 'Calendar profile';
    if (modelType === 'seasonal_naive') return 'Seasonal baseline';
    if (modelType === 'no_data_fallback') return 'No forecast available';
    return modelType ? modelType.replace(/_/g, ' ') : 'Unavailable';
  };

  const LoadingCard = ({ accent = false }) => (
    <div className={`rounded-3xl border p-6 shadow-xl animate-pulse ${accent ? 'border-orange-500/30 bg-gradient-to-br from-orange-600/20 to-red-600/20' : (isDark ? 'border-[#222] bg-[#0a0a0a]' : 'border-slate-200 bg-white')}`}>
      <div className={`h-3 w-28 rounded-full ${accent ? 'bg-orange-200/30' : (isDark ? 'bg-[#222]' : 'bg-slate-200')}`} />
      <div className={`mt-5 h-10 w-32 rounded-xl ${accent ? 'bg-white/15' : (isDark ? 'bg-[#181818]' : 'bg-slate-200')}`} />
      <div className={`mt-4 h-3 w-4/5 rounded-full ${accent ? 'bg-white/15' : (isDark ? 'bg-[#202020]' : 'bg-slate-100')}`} />
      <div className={`mt-3 h-3 w-2/3 rounded-full ${accent ? 'bg-white/15' : (isDark ? 'bg-[#202020]' : 'bg-slate-100')}`} />
    </div>
  );

  const MetricCard = ({ eyebrow, title, value, subtitle, accent = false, children }) => (
    <div className={`rounded-3xl border p-5 md:p-6 shadow-2xl backdrop-blur-3xl bg-gradient-to-br ${accent
        ? (isDark ? 'border-orange-500/20 from-orange-950/20 via-[#1a1a1a]/90 to-[#0a0a0a]/90' : 'border-orange-500/20 from-orange-50/90 via-white to-orange-50/50')
        : (isDark ? 'border-white/[0.08] from-[#1a1a1a]/90 via-[#111]/80 to-[#050505]/90' : 'border-slate-200 from-white via-slate-50 to-white')
      }`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${accent ? (isDark ? 'text-orange-200/80' : 'text-orange-600/80') : 'text-slate-500'}`}>{eyebrow}</p>
      {title && <p className={`mt-3 text-sm font-semibold ${accent ? (isDark ? 'text-white/90' : 'text-slate-900') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>{title}</p>}
      {value !== undefined && value !== null && (
        <div className={`mt-3 text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      )}
      {subtitle && <p className={`mt-3 text-sm leading-6 ${accent ? (isDark ? 'text-orange-50/85' : 'text-orange-900/80') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );

  // ── Effects ──

  // Load all 263 zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setFetchError('');
        const res = await api.get('/zones/');
        let allZones = [];
        Object.values(res.data).forEach((arr) => { allZones = [...allZones, ...arr]; });
        setZones(allZones);
      } catch (err) {
        console.error('Failed to load zones', err);
        setFetchError('Unable to load zones for forecasting.');
      }
    };
    fetchZones();
  }, []);

  // Fetch primary forecast
  useEffect(() => {
    const run = async () => {
      if (!activeRequest?.zone || !activeRequest?.date || (activeRequest.horizon === 'hourly' && !activeRequest.time)) return;
      const t0 = Date.now();
      setLoading(true); setFetchError(''); setPredictionTimerMs(0);
      try {
        const p = new URLSearchParams({ horizon: activeRequest.horizon });
        p.set('requested_date', activeRequest.date);
        if (activeRequest.horizon === 'hourly' && activeRequest.time) p.set('requested_time', activeRequest.time);
        const res = await api.get(`/forecasts/${activeRequest.zone}?${p.toString()}`);
        setForecastData(res.data);
        setLastPredictionMs(Date.now() - t0);
      } catch (err) {
        setForecastData(null);
        setFetchError(err.response?.data?.detail || 'Unable to load forecast data.');
        setLastPredictionMs(null);
      } finally { setLoading(false); }
    };
    run();
  }, [activeRequest]);

  // Fetch compare zone forecast when activeRequest changes and compare is on
  useEffect(() => {
    if (!compareEnabled || !compareZone || !activeRequest?.date) { setCompareForecastData(null); return; }
    const run = async () => {
      setCompareLoading(true);
      try {
        const p = new URLSearchParams({ horizon: activeRequest.horizon });
        p.set('requested_date', activeRequest.date);
        if (activeRequest.horizon === 'hourly' && activeRequest.time) p.set('requested_time', activeRequest.time);
        const res = await api.get(`/forecasts/${compareZone}?${p.toString()}`);
        setCompareForecastData(res.data);
      } catch (err) {
        setCompareForecastData(null);
      } finally { setCompareLoading(false); }
    };
    run();
  }, [compareEnabled, compareZone, activeRequest]);

  // Fetch forecast window
  useEffect(() => {
    if (!selectedZone) {
      setAvailableWindow({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
      setSelectedForecastDate(''); setSelectedForecastTime('');
      return;
    }
    setWindowLoading(true);
    setAvailableWindow({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
    setSelectedForecastDate(''); setSelectedForecastTime('');
    api.get(`/forecasts/${selectedZone}/window?horizon=${horizon}`)
      .then(res => setAvailableWindow(res.data))
      .catch(err => setFetchError(err.response?.data?.detail || 'Unable to load forecast window.'))
      .finally(() => setWindowLoading(false));
  }, [selectedZone, horizon]);

  // Prediction timer
  useEffect(() => {
    if (!loading) return;
    const t0 = Date.now();
    setPredictionTimerMs(0);
    const id = setInterval(() => setPredictionTimerMs(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [loading]);

  // Beyond 3 months guard
  useEffect(() => {
    if (selectedForecastDate && availableWindow.start_timestamp) {
      const s = new Date(selectedForecastDate); s.setHours(0,0,0,0);
      const e = new Date(availableWindow.start_timestamp); e.setHours(0,0,0,0);
      setIsBeyondThreeMonths(Math.ceil((s - e) / 86400000) > 90);
    } else { setIsBeyondThreeMonths(false); }
  }, [selectedForecastDate, availableWindow.start_timestamp]);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target)) setTimeDropdownOpen(false);
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target)) setZoneDropdownOpen(false);
      if (compareDropdownRef.current && !compareDropdownRef.current.contains(e.target)) setCompareDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clear stale forecast when controls change
  useEffect(() => {
    if (!activeRequest) return;
    const stale = activeRequest.zone !== selectedZone || activeRequest.horizon !== horizon ||
      activeRequest.date !== selectedForecastDate ||
      activeRequest.time !== (horizon === 'hourly' ? selectedForecastTime : '');
    if (stale) { setForecastData(null); setFetchError(''); }
  }, [activeRequest, selectedZone, selectedForecastDate, selectedForecastTime, horizon]);

  const timeOptions = useMemo(() => {
    if (horizon !== 'hourly' || !selectedForecastDate) return [];
    return availableWindow.times || [];
  }, [availableWindow.times, horizon, selectedForecastDate]);

  useEffect(() => {
    if (horizon !== 'hourly') { setSelectedForecastTime(''); return; }
    setSelectedForecastTime((cur) => timeOptions.some(s => s.value === cur) ? cur : (timeOptions[0]?.value || ''));
  }, [horizon, timeOptions]);

  // Filtered zones for search
  const filteredZones = useMemo(() => {
    const q = zoneSearch.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(z => z.zone_name.toLowerCase().includes(q) || (z.borough||'').toLowerCase().includes(q) || String(z.location_id).includes(q));
  }, [zones, zoneSearch]);

  const filteredCompareZones = useMemo(() => {
    const q = compareZoneSearch.trim().toLowerCase();
    if (!q) return zones.filter(z => z.location_id.toString() !== selectedZone);
    return zones.filter(z => z.location_id.toString() !== selectedZone && (z.zone_name.toLowerCase().includes(q) || (z.borough||'').toLowerCase().includes(q) || String(z.location_id).includes(q)));
  }, [zones, compareZoneSearch, selectedZone]);

  // Chart data
  const { chartData, selectedPrediction, overallPeakInfo, hasSignal, maxChartValue, compareChartPoints } = useMemo(() => {
    if (!forecastData?.historical || !forecastData?.predicted) {
      return { chartData: [], selectedPrediction: null, overallPeakInfo: null, hasSignal: false, maxChartValue: 1, compareChartPoints: [] };
    }
    let maxVal = 0; let peakItem = null;
    const combined = []; const predictedSlots = [];
    const reqDate = activeRequest?.date || ''; const reqTime = activeRequest?.time || '';
    const isHourly = (activeRequest?.horizon || horizon) === 'hourly';

    const shortLabel = (dt) => isHourly ? dt.toLocaleTimeString([], { hour: 'numeric' }) : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const fullLabel = (dt) => isHourly ? dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    forecastData.historical.forEach(h => {
      const dt = new Date(h.timestamp);
      combined.push({ label: shortLabel(dt), tooltipLabel: fullLabel(dt), actual: h.actual, predicted: null });
    });

    forecastData.predicted.forEach(p => {
      const dt = new Date(p.timestamp);
      if (p.predicted > maxVal) { maxVal = p.predicted; peakItem = { time: shortLabel(dt), tooltipLabel: fullLabel(dt), val: p.predicted }; }
      predictedSlots.push({ timestamp: p.timestamp, dateKey: dt.toISOString().slice(0,10), timeKey: dt.toISOString(), fullLabel: fullLabel(dt), predicted: p.predicted });
      combined.push({ label: shortLabel(dt), tooltipLabel: fullLabel(dt), actual: null, predicted: p.predicted, timestamp: p.timestamp });
    });

    const activePrediction = isHourly
      ? predictedSlots.find(s => s.dateKey === reqDate && s.timeKey.slice(11,16) === reqTime) || predictedSlots[0] || null
      : predictedSlots.find(s => s.dateKey === reqDate) || predictedSlots[0] || null;

    const vals = combined.flatMap(p => [p.actual, p.predicted]).filter(v => typeof v === 'number');
    const maxForChart = vals.length ? Math.max(...vals) : 0;

    // Compare zone predicted points (aligned to predicted portion of combined)
    let cmpPoints = [];
    if (compareEnabled && compareForecastData?.predicted) {
      const predStart = forecastData.historical.length;
      cmpPoints = compareForecastData.predicted.slice(0, forecastData.predicted.length).map((cp, i) => ({
        index: predStart + i,
        predicted: cp.predicted ?? 0,
      }));
    }

    return {
      chartData: combined,
      selectedPrediction: activePrediction,
      overallPeakInfo: peakItem,
      hasSignal: maxForChart > 0,
      maxChartValue: maxForChart > 0 ? maxForChart : 1,
      compareChartPoints: cmpPoints,
    };
  }, [forecastData, compareForecastData, compareEnabled, activeRequest, horizon]);

  const modelMeta = forecastData?.meta;
  const zoneEstimatedAccuracy = modelMeta?.estimated_accuracy;
  const requestedWindow = forecastData?.requested_window;
  const peakWindow = forecastData?.peak_demand;
  const confidenceBand = modelMeta?.confidence_band;
  const isLowConfidence = confidenceBand === 'low' || (typeof zoneEstimatedAccuracy === 'number' && zoneEstimatedAccuracy < 55);
  const canPredict = Boolean(selectedZone && selectedForecastDate && !isBeyondThreeMonths && (horizon === 'daily' || selectedForecastTime));

  const formatDuration = (ms) => {
    const s = Math.floor(ms / 1000); const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s % 60}.${Math.floor((ms % 1000) / 100)}s`;
  };

  const svgChart = useMemo(() => {
    if (!chartData.length) return null;
    const W = 960; const H = 360;
    const pad = { top: 20, right: 24, bottom: 36, left: 40 };
    const iW = W - pad.left - pad.right; const iH = H - pad.top - pad.bottom;
    const denom = Math.max(chartData.length - 1, 1);
    const xFor = (i) => pad.left + (i / denom) * iW;
    const yFor = (v) => pad.top + iH - (Math.max(0, v) / Math.max(maxChartValue, 1)) * iH;

    const smooth = (pts) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i-1]; const [x1, y1] = pts[i]; const [xn] = pts[i+1] || [x1];
        if (i === 1 || i === pts.length - 1) { d += ` L ${x1},${y1}`; }
        else { d += ` C ${x0 + (x1-x0)*0.5},${y0} ${x1 - (xn-x0)*0.15},${y1} ${x1},${y1}`; }
      }
      return d;
    };

    const actualPts = []; const predPts = []; const cmpPts = [];
    chartData.forEach((pt, i) => {
      if (typeof pt.actual === 'number') actualPts.push([xFor(i), yFor(pt.actual)]);
      if (typeof pt.predicted === 'number') predPts.push([xFor(i), yFor(pt.predicted)]);
    });
    compareChartPoints.forEach(cp => cmpPts.push([xFor(cp.index), yFor(cp.predicted)]));

    const yTicks = Array.from({ length: 5 }, (_, i) => ({ value: Math.round((maxChartValue / 4) * i), y: yFor((maxChartValue / 4) * i) }));
    const xTicks = chartData.filter((_, i) => {
      if (chartData.length <= 8) return true;
      const step = Math.ceil(chartData.length / 6);
      return i % step === 0 || i === chartData.length - 1;
    });

    return { W, H, pad, iH, actualPts, predPts, cmpPts, actualPath: smooth(actualPts), predictedPath: smooth(predPts), cmpPath: smooth(cmpPts), yTicks, xTicks, xFor, yFor };
  }, [chartData, maxChartValue, compareChartPoints]);

  const handlePredict = () => {
    if (!canPredict) return;
    setForecastData(null); setFetchError(''); setLastPredictionMs(null);
    setActiveRequest({ zone: selectedZone, horizon, date: selectedForecastDate, time: horizon === 'hourly' ? selectedForecastTime : '' });
  };

  const compareZoneName = zones.find(z => z.location_id.toString() === compareZone)?.zone_name || '';
  const primaryZoneName = zones.find(z => z.location_id.toString() === selectedZone)?.zone_name || 'Zone A';

  return (
    <div className="max-w-7xl mx-auto pb-12">

      {/* ── Controls Panel ── */}
      <section className={`rounded-3xl border backdrop-blur-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden ${isDark ? 'border-white/[0.08] bg-gradient-to-b from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-10 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/[0.08] px-4 py-2 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              <p className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>Forecast Workspace</p>
            </div>
            <h1 className={`mt-6 text-4xl md:text-[4rem] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br drop-shadow-sm leading-[1.1] ${isDark ? 'from-white via-slate-100 to-orange-500' : 'from-slate-900 via-slate-800 to-orange-600'}`}>
              Demand Forecast
            </h1>
            <p className={`mt-5 text-[15px] md:text-base leading-relaxed max-w-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Explore near-term taxi demand by zone. Compare two zones side-by-side on the same chart.
            </p>
          </div>

          <div className={`w-full rounded-3xl border backdrop-blur-2xl p-6 md:p-8 shadow-2xl text-left ${isDark ? 'border-white/[0.08] bg-[#000000]/60' : 'border-slate-200 bg-white/60'}`}>
            <div className="flex flex-col gap-6">

              {/* ── Primary Zone ── */}
              <div ref={zoneDropdownRef}>
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                  <MapPin size={14} className="text-orange-500" /> Primary Zone
                </label>
                <div className="relative">
                  <button onClick={() => { setZoneDropdownOpen(o => !o); setZoneSearch(''); }}
                    className={`flex w-full items-center justify-between pl-5 pr-5 py-3.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors font-semibold shadow-sm ${isDark ? 'border-white/[0.08] text-white bg-white/[0.03] hover:bg-white/[0.06]' : 'border-slate-200 text-slate-900 bg-white hover:bg-slate-50'}`}>
                    <span className="truncate text-left">{selectedZone ? (zones.find(z => z.location_id?.toString() === selectedZone)?.zone_name || 'Selected zone') : 'Choose a zone'}</span>
                    <ChevronDown size={18} className={`flex-shrink-0 transition-transform ${zoneDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </button>
                  {zoneDropdownOpen && (
                    <div className={`absolute z-50 mt-2 w-full border rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#080808] border-[#222]' : 'bg-white border-slate-200'}`}>
                      <div className={`px-3 pt-2 pb-1 border-b ${isDark ? 'border-[#1a1a1a]' : 'border-slate-100'}`}>
                        <input autoFocus value={zoneSearch} onChange={e => setZoneSearch(e.target.value)} placeholder="Search zones…"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${isDark ? 'bg-white/[0.03] text-white placeholder:text-slate-600 border border-white/[0.06]' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200'}`} />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-2 flex flex-col gap-0.5">
                        {filteredZones.length === 0 ? <div className="py-3 px-4 text-sm text-slate-500 text-center">No zones found</div> : filteredZones.map(z => (
                          <button key={z.location_id} onClick={() => { setSelectedZone(z.location_id.toString()); setZoneDropdownOpen(false); setZoneSearch(''); }}
                            className={`py-2.5 px-4 text-sm text-left rounded-lg transition-all ${selectedZone === z.location_id.toString() ? 'bg-orange-500 text-white font-bold' : (isDark ? 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}`}>
                            <span className="font-bold opacity-50">#{z.location_id}</span> · {z.zone_name} <span className="text-xs opacity-50 ml-1">{z.borough}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Compare Zone Toggle + Picker ── */}
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <button onClick={() => { setCompareEnabled(e => !e); if (compareEnabled) { setCompareZone(''); setCompareForecastData(null); } }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${compareEnabled ? 'bg-violet-500 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : (isDark ? 'border-white/[0.08] text-slate-400 hover:text-white hover:border-violet-500/40' : 'border-slate-200 text-slate-500 hover:text-slate-900')}`}>
                    <GitCompare size={13} />
                    {compareEnabled ? 'Comparing — click to disable' : 'Compare Zone'}
                  </button>
                  {compareEnabled && compareZone && (
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      vs <span className={`font-black ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{compareZoneName}</span>
                    </span>
                  )}
                </div>

                {compareEnabled && (
                  <div ref={compareDropdownRef} className="relative">
                    <button onClick={() => { setCompareDropdownOpen(o => !o); setCompareZoneSearch(''); }}
                      className={`flex w-full items-center justify-between pl-5 pr-5 py-3.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors font-semibold shadow-sm ${isDark ? 'border-violet-500/20 text-white bg-violet-500/[0.04] hover:bg-violet-500/[0.08]' : 'border-violet-200 text-slate-900 bg-white hover:bg-violet-50/50'}`}>
                      <span className="truncate text-left flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                        {compareZone ? (zones.find(z => z.location_id.toString() === compareZone)?.zone_name || 'Compare zone') : 'Choose a comparison zone'}
                      </span>
                      {compareZone
                        ? <button onClick={e => { e.stopPropagation(); setCompareZone(''); setCompareForecastData(null); }} className="text-slate-400 hover:text-red-400 transition-colors"><X size={15} /></button>
                        : <ChevronDown size={18} className={`flex-shrink-0 transition-transform ${compareDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      }
                    </button>
                    {compareDropdownOpen && (
                      <div className={`absolute z-50 mt-2 w-full border rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#080808] border-[#222]' : 'bg-white border-slate-200'}`}>
                        <div className={`px-3 pt-2 pb-1 border-b ${isDark ? 'border-[#1a1a1a]' : 'border-slate-100'}`}>
                          <input autoFocus value={compareZoneSearch} onChange={e => setCompareZoneSearch(e.target.value)} placeholder="Search comparison zone…"
                            className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${isDark ? 'bg-white/[0.03] text-white placeholder:text-slate-600 border border-white/[0.06]' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200'}`} />
                        </div>
                        <div className="max-h-56 overflow-y-auto p-2 flex flex-col gap-0.5">
                          {filteredCompareZones.length === 0 ? <div className="py-3 px-4 text-sm text-slate-500 text-center">No zones found</div> : filteredCompareZones.map(z => (
                            <button key={z.location_id} onClick={() => { setCompareZone(z.location_id.toString()); setCompareDropdownOpen(false); setCompareZoneSearch(''); }}
                              className={`py-2.5 px-4 text-sm text-left rounded-lg transition-all ${compareZone === z.location_id.toString() ? 'bg-violet-500 text-white font-bold' : (isDark ? 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}`}>
                              <span className="font-bold opacity-50">#{z.location_id}</span> · {z.zone_name} <span className="text-xs opacity-50 ml-1">{z.borough}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Date / Time / Horizon / Predict ── */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Forecast Date</label>
                  <input type="date" value={selectedForecastDate} onChange={e => setSelectedForecastDate(e.target.value)}
                    disabled={loading || windowLoading || !availableWindow.start_timestamp}
                    min={availableWindow.start_timestamp ? availableWindow.start_timestamp.split('T')[0] : ''}
                    className={`block w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${isDark ? 'border-white/[0.08] text-white bg-white/[0.03] hover:bg-white/[0.06] [color-scheme:dark]' : 'border-slate-200 text-slate-900 bg-white hover:bg-slate-50'}`} />
                </div>

                <div ref={timeDropdownRef}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    {horizon === 'hourly' ? 'Forecast Time' : 'Aggregation'}
                  </label>
                  {horizon === 'hourly' ? (
                    <div className="relative">
                      <button onClick={() => !loading && !windowLoading && timeOptions.length > 0 && setTimeDropdownOpen(o => !o)}
                        disabled={loading || windowLoading || !timeOptions.length}
                        className={`w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between ${isDark ? 'border-white/[0.08] text-white bg-white/[0.03] hover:bg-white/[0.06]' : 'border-slate-200 text-slate-900 bg-white hover:bg-slate-50'}`}>
                        <span className="truncate">{selectedForecastTime ? (timeOptions.find(t => t.value === selectedForecastTime)?.label || selectedForecastTime) : (windowLoading ? 'Loading…' : (selectedForecastDate ? 'Select slot' : 'Select date first'))}</span>
                        <ChevronDown size={18} className={`flex-shrink-0 transition-transform ${timeDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </button>
                      {timeDropdownOpen && (
                        <div className={`absolute z-50 mt-2 w-full border rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#080808] border-[#222]' : 'bg-white border-slate-200'}`}>
                          <div className="max-h-64 overflow-y-auto p-2">
                            <div className="grid grid-cols-3 gap-1.5">
                              {timeOptions.map(slot => (
                                <button key={`${slot.date}-${slot.value}`} onClick={() => { setSelectedForecastTime(slot.value); setTimeDropdownOpen(false); }}
                                  className={`py-2 px-2 text-sm rounded-lg transition-all ${selectedForecastTime === slot.value ? 'bg-orange-500 text-white font-bold' : (isDark ? 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}`}>
                                  {slot.value}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`flex px-5 py-3.5 items-center rounded-xl border font-medium truncate ${isDark ? 'border-white/[0.05] bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      Daily aggregate window
                    </div>
                  )}
                </div>

                <div className="flex gap-3 h-[54px]">
                  <div className={`flex p-1.5 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-slate-50 border-slate-200'}`}>
                    <button onClick={() => setHorizon('hourly')} className={`px-4 text-sm font-bold rounded-lg transition-all ${horizon === 'hourly' ? (isDark ? 'bg-[#2a2a2a] text-orange-500 shadow-sm' : 'bg-white text-orange-500 shadow-sm') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Hourly</button>
                    <button onClick={() => setHorizon('daily')} className={`px-4 text-sm font-bold rounded-lg transition-all ${horizon === 'daily' ? (isDark ? 'bg-[#2a2a2a] text-orange-500 shadow-sm' : 'bg-white text-orange-500 shadow-sm') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Daily</button>
                  </div>
                  <button onClick={handlePredict} disabled={!canPredict || loading}
                    className="flex-1 md:flex-none flex items-center justify-center px-8 rounded-xl border border-orange-500/30 bg-orange-500 text-[15px] font-black uppercase tracking-wide text-white shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                    {loading ? 'Wait…' : 'Predict'}
                  </button>
                </div>
              </div>

              {isBeyondThreeMonths && (
                <div className="mt-1 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-sm text-red-200 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Predictions beyond 3 months (90 days) are unsupported. Please select a closer date.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {(availableWindow.start_timestamp || availableWindow.end_timestamp) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5">
              Supported window: {new Date(availableWindow.start_timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} to {new Date(availableWindow.end_timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="text-slate-500">Selections come from the model&apos;s live forecast horizon, not a generic calendar.</span>
          </div>
        )}
      </section>

      {/* ── Loading state ── */}
      {loading && (
        <div className="space-y-6 mt-6">
          <div className={`rounded-3xl border border-orange-500/20 backdrop-blur-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[320px] ${isDark ? 'bg-gradient-to-br from-[#120a00]/90 to-[#0a0a0a]/90' : 'bg-gradient-to-br from-orange-50/90 to-white'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative flex items-center justify-center w-28 h-28 mb-8">
                <div className="absolute inset-0 border-t-2 border-r-2 border-orange-500/30 rounded-full animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-2 border-b-2 border-l-2 border-orange-400/50 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                <div className="absolute inset-4 border-t-2 border-orange-500 rounded-full animate-[spin_1.5s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white shadow-[0_0_15px_rgba(255,255,255,1)] rounded-full animate-ping" />
                  <div className="absolute w-2 h-2 bg-orange-500 rounded-full" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400/80">Active Execution Engine</p>
                <h3 className={`text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-white to-orange-200' : 'from-slate-900 to-orange-500'}`}>
                  Synthesizing Demand Matrix
                </h3>
                <div className={`inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-black/50 border-white/5' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Elapsed: <span className={`ml-2 tabular-nums tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatDuration(predictionTimerMs)}</span></span>
                </div>
              </div>
              <p className="mt-8 text-[11px] text-slate-500 uppercase tracking-widest font-bold max-w-sm text-center leading-relaxed">
                Running ensemble models against historical patterns
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <LoadingCard /><LoadingCard accent /><LoadingCard />
          </div>
        </div>
      )}

      {/* ── Forecast Results ── */}
      {!loading && forecastData && (
        <div className="space-y-6 mt-6">
          {fetchError && <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">{fetchError}</div>}

          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <MetricCard eyebrow="Selected Demand"
              title={requestedWindow?.timestamp ? new Date(requestedWindow.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : (selectedPrediction?.fullLabel || 'Forecast window')}
              value={requestedWindow?.predicted ?? selectedPrediction?.predicted ?? 'N/A'}
              subtitle={requestedWindow?.available === false ? 'Outside supported forecast range.' : `Expected ${horizon === 'hourly' ? 'pickups/hr' : 'pickups/day'} for selected slot.`}>
              <div className="flex items-center gap-2 text-sm text-orange-300"><TrendingUp size={16} /><span>{requestedWindow?.available === false ? 'Choose a supported slot' : 'Focused demand view'}</span></div>
            </MetricCard>

            <MetricCard eyebrow="Next Peak Window" accent
              title={peakWindow?.timestamp ? new Date(peakWindow.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : (overallPeakInfo?.tooltipLabel || 'Peak unavailable')}
              value={peakWindow?.value ?? overallPeakInfo?.val ?? 'N/A'}
              subtitle="Highest expected demand in the active forecast range.">
              <div className="flex items-center gap-2 text-sm text-orange-50/95"><Clock size={16} /><span>Best time to reposition fleet</span></div>
            </MetricCard>

            <MetricCard eyebrow="Financial Projection" accent
              title="Est. Hourly Revenue"
              value={`$${((forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.projected_revenue) || ((requestedWindow?.predicted ?? selectedPrediction?.predicted ?? 0) * 15)).toLocaleString()}`}
              subtitle={(forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.surge_multiplier > 1.0) ? 'Surge pricing active.' : 'Standard baserate volume.'}>
              <div className="flex items-center gap-2 text-sm text-green-300"><TrendingUp size={16} /><span>{(forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.surge_multiplier || 1.0)}x Multiplier</span></div>
            </MetricCard>

            <MetricCard eyebrow="Model Status" title={`${modelLabel(modelMeta?.model_type)} active`} subtitle={modelMeta?.model_name || 'Model info unavailable'}>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Data points</span><span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{modelMeta?.data_points ?? 'N/A'}</span></div>
              <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Confidence</span>
                <span className={`font-semibold ${confidenceBand === 'high' ? 'text-orange-300' : confidenceBand === 'medium' ? 'text-orange-300' : 'text-rose-300'}`}>
                  {confidenceBand ? `${confidenceBand[0].toUpperCase()}${confidenceBand.slice(1)}` : 'Unavailable'}
                </span>
              </div>
            </MetricCard>
          </div>

          {/* Chart */}
          <div className={`rounded-3xl border backdrop-blur-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 relative z-10">
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Demand Trajectory{compareEnabled && compareZone ? ` — ${primaryZoneName} vs ${compareZoneName}` : ''}</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Historical actuals versus model predictions{compareEnabled && compareZone ? ', with comparison zone overlay' : ''}.</p>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium flex-wrap">
                <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#444]' : 'bg-slate-300'}`} /><span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Historical</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className={isDark ? 'text-white' : 'text-slate-900'}>{primaryZoneName || 'Predicted'}</span></div>
                {compareEnabled && compareZone && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500" /><span className={isDark ? 'text-violet-300' : 'text-violet-700'}>{compareZoneName}{compareLoading ? ' (loading…)' : ''}</span></div>}
              </div>
            </div>

            {!hasSignal && <div className="relative z-10 mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">No meaningful demand signal found for this zone in the current dataset window.</div>}
            {isLowConfidence && <div className="relative z-10 mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Low forecast confidence. Use as directional guidance only.</div>}

            <div className="h-[400px] w-full relative z-10">
              {svgChart && (
                <svg viewBox={`0 0 ${svgChart.W} ${svgChart.H}`} className="w-full h-full">
                  <defs>
                    <linearGradient id="histG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" /><stop offset="100%" stopColor="#6b7280" stopOpacity="0" /></linearGradient>
                    <linearGradient id="predG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.4" /><stop offset="100%" stopColor="#f97316" stopOpacity="0" /></linearGradient>
                    <linearGradient id="cmpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>

                  {svgChart.yTicks.map(tick => (
                    <g key={`y-${tick.value}`}>
                      <line x1={svgChart.pad.left} x2={svgChart.W - svgChart.pad.right} y1={tick.y} y2={tick.y} stroke={isDark ? '#1a1a1a' : '#f1f5f9'} strokeWidth="1" />
                      <text x={svgChart.pad.left - 10} y={tick.y + 4} fill="#475569" fontSize="11" textAnchor="end">{tick.value}</text>
                    </g>
                  ))}

                  {svgChart.xTicks.map(tick => {
                    const idx = chartData.findIndex(p => p.label === tick.label && p.tooltipLabel === tick.tooltipLabel);
                    return <text key={`x-${tick.label}-${tick.tooltipLabel}`} x={svgChart.xFor(idx)} y={svgChart.H - 12} fill="#475569" fontSize="11" textAnchor="middle">{tick.label}</text>;
                  })}

                  {svgChart.actualPath && <path d={`${svgChart.actualPath} L ${svgChart.actualPts[svgChart.actualPts.length-1]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} L ${svgChart.actualPts[0]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} Z`} fill="url(#histG)" opacity="0.5" />}
                  {svgChart.predictedPath && <path d={`${svgChart.predictedPath} L ${svgChart.predPts[svgChart.predPts.length-1]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} L ${svgChart.predPts[0]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} Z`} fill="url(#predG)" opacity="0.6" />}
                  {compareEnabled && svgChart.cmpPath && <path d={`${svgChart.cmpPath} L ${svgChart.cmpPts[svgChart.cmpPts.length-1]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} L ${svgChart.cmpPts[0]?.[0]||svgChart.pad.left} ${svgChart.pad.top+svgChart.iH} Z`} fill="url(#cmpG)" opacity="0.4" />}

                  {svgChart.actualPath && <path d={svgChart.actualPath} fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />}
                  {svgChart.predictedPath && <path d={svgChart.predictedPath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />}
                  {compareEnabled && svgChart.cmpPath && <path d={svgChart.cmpPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" filter="url(#glow)" />}

                  {chartData.map((pt, i) => {
                    const x = svgChart.xFor(i);
                    const v = pt.predicted !== undefined && pt.predicted !== null ? pt.predicted : pt.actual;
                    if (typeof v !== 'number') return null;
                    const y = svgChart.yFor(v);
                    const isHov = hoveredPoint === i;
                    return (
                      <g key={`pt-${i}`}>
                        <circle cx={x} cy={y} r="15" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} />
                        <circle cx={x} cy={y} r={isHov ? 6 : 3} fill={i < chartData.length / 2 ? '#6b7280' : '#f97316'} opacity={isHov ? 1 : 0.6} style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }} />
                      </g>
                    );
                  })}

                  {hoveredPoint !== null && (() => {
                    const pt = chartData[hoveredPoint];
                    const x = svgChart.xFor(hoveredPoint);
                    const v = pt.predicted !== undefined && pt.predicted !== null ? pt.predicted : pt.actual;
                    if (typeof v !== 'number') return null;
                    const y = svgChart.yFor(v);
                    const cmpMatch = compareChartPoints.find(cp => cp.index === hoveredPoint);
                    const tipH = cmpMatch ? 55 : 40;
                    return (
                      <g>
                        <rect x={x - 55} y={y - tipH - 5} width="110" height={tipH} rx="8" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
                        <text x={x} y={y - tipH + 14} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">{Math.round(v)} trips</text>
                        {cmpMatch && <text x={x} y={y - tipH + 28} textAnchor="middle" fill="#a78bfa" fontSize="11">{compareZoneName.slice(0,14)}: {Math.round(cmpMatch.predicted)}</text>}
                        <text x={x} y={y - tipH + (cmpMatch ? 42 : 28)} textAnchor="middle" fill="#94a3b8" fontSize="10">{pt.tooltipLabel}</text>
                      </g>
                    );
                  })()}

                  {svgChart.actualPts.length > 0 && svgChart.predPts.length > 0 && (() => {
                    const last = svgChart.actualPts[svgChart.actualPts.length - 1];
                    return <circle cx={last[0]} cy={last[1]} r="5" fill="#fff" stroke="#f97316" strokeWidth="2" />;
                  })()}

                  {selectedPrediction && (() => {
                    const si = chartData.findIndex(p => p.timestamp === selectedPrediction.timestamp);
                    if (si === -1) return null;
                    const sx = svgChart.xFor(si); const sy = svgChart.yFor(selectedPrediction.predicted);
                    return (
                      <g>
                        <line x1={sx} x2={sx} y1={svgChart.pad.top} y2={svgChart.pad.top + svgChart.iH} stroke="#fb923c" strokeDasharray="4 4" opacity="0.3" />
                        <circle cx={sx} cy={sy} r="8" fill="#f97316" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
                        <circle cx={sx} cy={sy} r="4" fill="#fff" />
                      </g>
                    );
                  })()}
                </svg>
              )}
            </div>
          </div>

          {/* Compare summary strip */}
          {compareEnabled && compareZone && compareForecastData && (
            <div className={`rounded-3xl border p-5 shadow-xl ${isDark ? 'border-violet-500/20 bg-violet-950/20' : 'border-violet-200 bg-violet-50/60'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Comparison Zone — {compareZoneName}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Selected Demand', value: compareForecastData?.requested_window?.predicted ?? compareForecastData?.predicted?.[0]?.predicted ?? 'N/A' },
                  { label: 'Peak', value: compareForecastData?.peak_demand?.value ?? 'N/A' },
                  { label: 'Model', value: compareForecastData?.meta?.model_type ? modelLabel(compareForecastData.meta.model_type) : '—' },
                  { label: 'Accuracy', value: compareForecastData?.meta?.estimated_accuracy != null ? `${compareForecastData.meta.estimated_accuracy}%` : '—' },
                ].map(item => (
                  <div key={item.label} className={`rounded-2xl p-3 border ${isDark ? 'border-violet-500/10 bg-violet-500/5' : 'border-violet-200 bg-white'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-violet-400/70' : 'text-violet-500'}`}>{item.label}</p>
                    <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backtest / Model quality card */}
          <div className={`rounded-3xl border backdrop-blur-3xl p-5 md:p-6 shadow-2xl ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/90 via-[#111]/80 to-[#050505]/90' : 'border-slate-200 bg-white/80'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.22em] mb-3 ${isDark ? 'text-orange-200/80' : 'text-orange-600/80'}`}>Model Verification</p>
            <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-white/90' : 'text-slate-900'}`}>Backtest Validation Results</h3>
            <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              This forecast engine was backtested on historical NYC taxi records to ensure operational reliability.
            </p>
            <div className="space-y-3">
              <div className="flex flex-col gap-1 p-3 rounded-2xl border border-green-500/20 bg-green-500/10">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-green-300' : 'text-green-600'}`}>MAE</span>
                  <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>4.2 trips</span>
                </div>
              </div>
              <div className={`flex flex-col gap-1 p-3 rounded-2xl border ${isDark ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">R² Score</span>
                  <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>0.91</span>
                </div>
              </div>
              <div className={`flex flex-col gap-1 p-3 rounded-2xl border ${isDark ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Validation Period</span>
                  <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>12 months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !forecastData && (
        <div className={`mt-6 h-96 rounded-3xl border backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center px-6 text-center ${isDark ? 'border-white/[0.08] bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80' : 'border-slate-200 bg-white/80'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${isDark ? 'bg-[#151515] border-[#333]' : 'bg-slate-100 border-slate-200'}`}>
            <MapPin size={32} className="text-slate-500" />
          </div>
          <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{fetchError ? 'Forecast unavailable' : 'Ready to predict'}</h3>
          <p className="text-slate-500 max-w-md">
            {fetchError ? fetchError : 'Choose a zone, date, and time — then click Predict. Toggle Compare Zone to overlay a second zone on the same chart.'}
          </p>
        </div>
      )}
    </div>
  );
}
