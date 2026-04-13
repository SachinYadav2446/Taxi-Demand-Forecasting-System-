import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Activity, TrendingUp, Clock, MapPin, ChevronDown, CloudRain } from 'lucide-react';

export default function DemandForecast() {
  const { user } = useAuth();
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
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const timeDropdownRef = useRef(null);

  const modelLabel = (modelType) => {
    if (modelType === 'sarimax') return 'SARIMAX';
    if (modelType === 'calendar_profile') return 'Calendar profile';
    if (modelType === 'seasonal_naive') return 'Seasonal baseline';
    if (modelType === 'no_data_fallback') return 'No forecast available';
    return modelType ? modelType.replace(/_/g, ' ') : 'Unavailable';
  };

  const LoadingCard = ({ accent = false }) => (
    <div className={`rounded-3xl border p-6 shadow-[0_4px_20px_rgba(0,0,0,0.35)] animate-pulse ${accent ? 'border-orange-500/30 bg-gradient-to-br from-orange-600/20 to-red-600/20' : 'border-[#222] bg-[#0a0a0a]'}`}>
      <div className={`h-3 w-28 rounded-full ${accent ? 'bg-orange-200/30' : 'bg-[#222]'}`} />
      <div className={`mt-5 h-10 w-32 rounded-xl ${accent ? 'bg-white/15' : 'bg-[#181818]'}`} />
      <div className={`mt-4 h-3 w-4/5 rounded-full ${accent ? 'bg-white/15' : 'bg-[#202020]'}`} />
      <div className={`mt-3 h-3 w-2/3 rounded-full ${accent ? 'bg-white/15' : 'bg-[#202020]'}`} />
    </div>
  );

  const MetricCard = ({ eyebrow, title, value, subtitle, accent = false, children }) => (
    <div className={`rounded-[28px] border p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.35)] h-full ${
      accent
        ? 'border-orange-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(16,185,129,0.12))]'
        : 'border-[#222] bg-[linear-gradient(180deg,#0d0d0d,#090909)]'
    }`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${accent ? 'text-orange-200/80' : 'text-slate-500'}`}>{eyebrow}</p>
      {title && <p className={`mt-3 text-sm font-semibold ${accent ? 'text-white/90' : 'text-slate-300'}`}>{title}</p>}
      {value !== undefined && value !== null && (
        <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
      )}
      {subtitle && <p className={`mt-3 text-sm leading-6 ${accent ? 'text-orange-50/85' : 'text-slate-400'}`}>{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setFetchError('');
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
        setSelectedZone((current) => {
          const currentExists = availableZones.some((zone) => zone.location_id.toString() === current);
          return currentExists ? current : '';
        });
      } catch (err) {
        console.error('Failed to load zones', err);
        setFetchError('Unable to load zones for forecasting.');
      }
    };

    fetchZones();
  }, [user]);

  useEffect(() => {
    const fetchForecast = async () => {
      if (!activeRequest?.zone || !activeRequest?.date || (activeRequest.horizon === 'hourly' && !activeRequest.time)) {
        return;
      }

      const requestStartedAt = Date.now();
      setLoading(true);
      setFetchError('');
      setPredictionTimerMs(0);

      try {
        const params = new URLSearchParams({ horizon: activeRequest.horizon });
        if (activeRequest.date) {
          params.set('requested_date', activeRequest.date);
        }
        if (activeRequest.horizon === 'hourly' && activeRequest.time) {
          params.set('requested_time', activeRequest.time);
        }

        const res = await api.get(`/forecasts/${activeRequest.zone}?${params.toString()}`);
        setForecastData(res.data);
        setLastPredictionMs(Date.now() - requestStartedAt);
      } catch (err) {
        console.error('Failed to load forecast', err);
        setForecastData(null);
        setFetchError(err.response?.data?.detail || 'Unable to load forecast data.');
        setLastPredictionMs(null);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [activeRequest]);

  useEffect(() => {
    const fetchAvailableWindow = async () => {
      if (!selectedZone) {
        setAvailableWindow({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
        setSelectedForecastDate('');
        setSelectedForecastTime('');
        return;
      }

      setWindowLoading(true);
      setFetchError('');
      setAvailableWindow({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
      setSelectedForecastDate('');
      setSelectedForecastTime('');

      try {
        const res = await api.get(`/forecasts/${selectedZone}/window?horizon=${horizon}`);
        setAvailableWindow(res.data);
      } catch (err) {
        console.error('Failed to load forecast window', err);
        setAvailableWindow({ dates: [], times: [], start_timestamp: null, end_timestamp: null });
        setFetchError(err.response?.data?.detail || 'Unable to load forecast window.');
      } finally {
        setWindowLoading(false);
      }
    };

    fetchAvailableWindow();
  }, [selectedZone, horizon]);

  useEffect(() => {
    if (!loading) return undefined;

    const startedAt = Date.now();
    setPredictionTimerMs(0);

    const intervalId = window.setInterval(() => {
      setPredictionTimerMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  const timeOptions = useMemo(() => {
    if (horizon !== 'hourly' || !selectedForecastDate) return [];
    return availableWindow.times || [];
  }, [availableWindow.times, horizon, selectedForecastDate]);
  
  useEffect(() => {
    if (selectedForecastDate && availableWindow.start_timestamp) {
      const selected = new Date(selectedForecastDate);
      const start = new Date(availableWindow.start_timestamp);
      // Strip time from both dates to get clean day difference
      selected.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      const diffTime = selected.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setIsBeyondThreeMonths(diffDays > 90);
    } else {
      setIsBeyondThreeMonths(false);
    }
  }, [selectedForecastDate, availableWindow.start_timestamp]);

  useEffect(() => {
    if (horizon !== 'hourly') {
      setSelectedForecastTime('');
      return;
    }

    setSelectedForecastTime((current) => {
      // If current selection is still valid, keep it
      if (timeOptions.some((slot) => slot.value === current)) {
        return current;
      }
      // Otherwise, default to the first available time slot
      return timeOptions[0]?.value || '';
    });
  }, [horizon, timeOptions]);

  // Close time dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    chartData,
    selectedPrediction,
    overallPeakInfo,
    hasSignal,
    maxChartValue,
  } = useMemo(() => {
    if (!forecastData || !forecastData.historical || !forecastData.predicted) {
      return {
        chartData: [],
        selectedPrediction: null,
        overallPeakInfo: null,
        hasSignal: false,
        maxChartValue: 1,
      };
    }

    let maxVal = 0;
    let peakItem = null;
    const combined = [];
    const predictedSlots = [];
    const requestedDate = activeRequest?.date || '';
    const requestedTime = activeRequest?.time || '';

    const buildShortLabel = (dt) => {
      if ((activeRequest?.horizon || horizon) === 'hourly') {
        return dt.toLocaleTimeString([], { hour: 'numeric' });
      }
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const buildFullLabel = (dt) => {
      if ((activeRequest?.horizon || horizon) === 'hourly') {
        return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      }
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    forecastData.historical.forEach((h) => {
      const dt = new Date(h.timestamp);
      combined.push({
        label: buildShortLabel(dt),
        tooltipLabel: buildFullLabel(dt),
        actual: h.actual,
        predicted: null,
      });
    });

    forecastData.predicted.forEach((p) => {
      const dt = new Date(p.timestamp);
      const dateKey = dt.toISOString().slice(0, 10);
      const timeKey = dt.toISOString();

      if (p.predicted > maxVal) {
        maxVal = p.predicted;
        peakItem = {
          time: buildShortLabel(dt),
          tooltipLabel: buildFullLabel(dt),
          val: p.predicted,
        };
      }

      predictedSlots.push({
        timestamp: p.timestamp,
        dateKey,
        timeKey,
        timeLabel: dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        fullLabel: buildFullLabel(dt),
        predicted: p.predicted,
      });

      combined.push({
        label: buildShortLabel(dt),
        tooltipLabel: buildFullLabel(dt),
        actual: null,
        predicted: p.predicted,
        timestamp: p.timestamp,
      });
    });

    const activePrediction = (activeRequest?.horizon || horizon) === 'hourly'
      ? predictedSlots.find((slot) => slot.dateKey === requestedDate && slot.timeKey.slice(11, 16) === requestedTime) || predictedSlots[0] || null
      : predictedSlots.find((slot) => slot.dateKey === requestedDate) || predictedSlots[0] || null;

    const values = combined.flatMap((point) => [point.actual, point.predicted]).filter((value) => typeof value === 'number');
    const maxForChart = values.length ? Math.max(...values) : 0;

    return {
      chartData: combined,
      selectedPrediction: activePrediction,
      overallPeakInfo: peakItem,
      hasSignal: maxForChart > 0,
      maxChartValue: maxForChart > 0 ? maxForChart : 1,
    };
  }, [forecastData, activeRequest, horizon]);

  const modelMeta = forecastData?.meta;
  const zoneEstimatedAccuracy = modelMeta?.estimated_accuracy;
  const requestedWindow = forecastData?.requested_window;
  const peakWindow = forecastData?.peak_demand;
  const confidenceBand = modelMeta?.confidence_band;
  const isLowConfidence = confidenceBand === 'low' || (typeof zoneEstimatedAccuracy === 'number' && zoneEstimatedAccuracy < 55);
  const canPredict = Boolean(
    selectedZone &&
    selectedForecastDate &&
    !isBeyondThreeMonths &&
    (horizon === 'daily' || selectedForecastTime)
  );

  const formatDuration = (durationMs) => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((durationMs % 1000) / 100);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}.${tenths}s`;
  };

  const svgChart = useMemo(() => {
    if (!chartData.length) return null;

    const width = 960;
    const height = 360;
    const padding = { top: 20, right: 24, bottom: 36, left: 40 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const denominator = Math.max(chartData.length - 1, 1);

    const xFor = (index) => padding.left + (index / denominator) * innerWidth;
    const yFor = (value) => padding.top + innerHeight - (Math.max(0, value) / Math.max(maxChartValue, 1)) * innerHeight;

    // Helper to create smooth bezier path
    const createSmoothPath = (points) => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0][0]},${points[0][1]}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        
        if (i === 1) {
          // First segment - simple line
          path += ` L ${curr[0]},${curr[1]}`;
        } else if (i === points.length - 1) {
          // Last segment - simple line
          path += ` L ${curr[0]},${curr[1]}`;
        } else {
          // Middle segments - bezier curve
          const cp1x = prev[0] + (curr[0] - prev[0]) * 0.5;
          const cp1y = prev[1];
          const cp2x = curr[0] - (next[0] - prev[0]) * 0.15;
          const cp2y = curr[1];
          path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr[0]},${curr[1]}`;
        }
      }
      
      return path;
    };

    const actualPoints = [];
    const predictedPoints = [];

    chartData.forEach((point, index) => {
      if (typeof point.actual === 'number') {
        actualPoints.push([xFor(index), yFor(point.actual)]);
      }
      if (typeof point.predicted === 'number') {
        predictedPoints.push([xFor(index), yFor(point.predicted)]);
      }
    });

    const actualPath = createSmoothPath(actualPoints);
    const predictedPath = createSmoothPath(predictedPoints);

    const yTicks = Array.from({ length: 5 }, (_, idx) => {
      const value = (maxChartValue / 4) * idx;
      return { value: Math.round(value), y: yFor(value) };
    });

    const xTicks = chartData.filter((_, index) => {
      if (chartData.length <= 8) return true;
      const step = Math.ceil(chartData.length / 6);
      return index % step === 0 || index === chartData.length - 1;
    });

    return {
      width,
      height,
      padding,
      innerHeight,
      actualPoints,
      predictedPoints,
      actualPath,
      predictedPath,
      yTicks,
      xTicks,
      xFor,
      yFor,
    };
  }, [chartData, maxChartValue]);

  const handlePredict = () => {
    if (!canPredict) return;

    setForecastData(null);
    setFetchError('');
    setLastPredictionMs(null);
    setActiveRequest({
      zone: selectedZone,
      horizon,
      date: selectedForecastDate,
      time: horizon === 'hourly' ? selectedForecastTime : '',
    });
  };

  useEffect(() => {
    if (!activeRequest) return;

    const requestIsStale =
      activeRequest.zone !== selectedZone ||
      activeRequest.horizon !== horizon ||
      activeRequest.date !== selectedForecastDate ||
      activeRequest.time !== (horizon === 'hourly' ? selectedForecastTime : '');

    if (requestIsStale) {
      setForecastData(null);
      setFetchError('');
    }
  }, [activeRequest, selectedZone, selectedForecastDate, selectedForecastTime, horizon]);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      <section className="rounded-[32px] border border-[#1f1f1f] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_34%),#090909] p-5 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.55fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.06] px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-300">Forecast Workspace</p>
            </div>
            <h1 className="mt-4 text-3xl md:text-[3.25rem] font-extrabold text-white tracking-tight">Demand Forecast</h1>
            <p className="mt-3 max-w-lg text-slate-400 leading-7">
              Explore near-term taxi demand by zone and inspect a specific prediction window that the model can actually serve.
            </p>

            <div className="mt-6 flex items-center gap-4 rounded-[20px] border border-[#252525] bg-[#111] p-3 w-fit pr-6">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <CloudRain size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live External Factor</p>
                <p className="text-white font-bold text-sm mt-0.5">NYC: Light Rain • 62°F</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-[10px] text-orange-400 font-semibold tracking-wide">SARIMAX Engine heavily weighting precipitation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-white/[0.02] p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,0.75fr)_auto]">
            <div className="md:col-span-2 xl:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Zone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-500">
                  <MapPin size={16} />
                </div>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-[#333] rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 bg-[#111] font-semibold shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">{zones.length === 0 ? 'No zones assigned' : 'Choose a zone'}</option>
                  {zones.map((z) => (
                    <option key={z.location_id} value={z.location_id}>{z.zone_name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Forecast Date</label>
              <input
                type="date"
                value={selectedForecastDate}
                onChange={(e) => setSelectedForecastDate(e.target.value)}
                disabled={loading || windowLoading || !availableWindow.start_timestamp}
                min={availableWindow.start_timestamp ? availableWindow.start_timestamp.split('T')[0] : ''}
                className="block w-full px-4 py-[10px] border border-[#333] rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 bg-[#111] font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed uppercase"
              />
            </div>

            <div ref={timeDropdownRef}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {horizon === 'hourly' ? 'Forecast Time' : 'View Type'}
              </label>
              {horizon === 'hourly' ? (
                <div className="relative">
                  {/* Custom Dropdown Trigger */}
                  <button
                    onClick={() => !loading && !windowLoading && timeOptions.length > 0 && setTimeDropdownOpen(!timeDropdownOpen)}
                    disabled={loading || windowLoading || !timeOptions.length}
                    className="w-full px-4 py-3 border border-[#333] rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 bg-[#111] font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between"
                  >
                    <span>
                      {selectedForecastTime 
                        ? timeOptions.find(t => t.value === selectedForecastTime)?.label || 'Choose a time'
                        : (windowLoading ? 'Loading times' : (selectedForecastDate ? 'Choose a time' : 'Select a date first'))
                      }
                    </span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-500 transition-transform duration-200 ${timeDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {/* Custom Dropdown Menu */}
                  {timeDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-[#111] border border-[#333] rounded-2xl shadow-2xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="grid grid-cols-3 gap-1">
                          {timeOptions.map((slot) => (
                            <button
                              key={`${slot.date}-${slot.value}`}
                              onClick={() => {
                                setSelectedForecastTime(slot.value);
                                setTimeDropdownOpen(false);
                              }}
                              className={`py-2 px-2 text-sm rounded-lg transition-all ${
                                selectedForecastTime === slot.value
                                  ? 'bg-orange-500 text-white'
                                  : 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white'
                              }`}
                            >
                              {slot.value}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[50px] items-center rounded-2xl border border-[#333] bg-[#111] px-4 text-sm font-medium text-slate-300">
                  Daily forecast window
                </div>
              )}
            </div>

            <div className="self-end flex items-center gap-3">
              <div className="flex p-1 bg-[#151515] rounded-2xl border border-[#222] shadow-sm h-[50px]">
                <button
                  onClick={() => setHorizon('hourly')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${horizon === 'hourly' ? 'bg-[#252525] text-orange-500 shadow-sm border border-[#333]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Hourly
                </button>
                <button
                  onClick={() => setHorizon('daily')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${horizon === 'daily' ? 'bg-[#252525] text-orange-500 shadow-sm border border-[#333]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Daily
                </button>
              </div>
              <button
                onClick={handlePredict}
                disabled={!canPredict || loading}
                className="h-[50px] rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500 to-red-500 px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(249,115,22,0.22)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Predicting...' : 'Predict'}
              </button>
            </div>
            {isBeyondThreeMonths && (
              <div className="md:col-span-2 xl:col-span-4 mt-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>For performance and accuracy, predictions beyond 3 months (90 days) are unsupported. Please select a closer date.</span>
              </div>
            )}
            </div>
          </div>
        </div>
        {(availableWindow.start_timestamp || availableWindow.end_timestamp) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5">
              Supported window:
              {' '}
              {new Date(availableWindow.start_timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' '}
              to
              {' '}
              {new Date(availableWindow.end_timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="text-slate-500">Selections come from the model&apos;s live forecast horizon, not a generic calendar.</span>
          </div>
        )}
      </section>

      {loading ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-orange-300 uppercase tracking-[0.28em]">Prediction Timer</p>
              <p className="text-sm text-orange-100 mt-1">Model is generating a fresh forecast for the selected zone.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-black text-white tabular-nums">{formatDuration(predictionTimerMs)}</p>
              <p className="text-xs text-orange-200 uppercase tracking-[0.22em] mt-1">Elapsed</p>
            </div>
          </div>

          <div className="rounded-[26px] border border-[#222] bg-[linear-gradient(180deg,#0d0d0d,#090909)] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Forecast Context</p>
                <p className="mt-2 text-sm text-slate-400">Current run details for the selected zone and forecast window.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[760px]">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Model</p>
                  <p className="mt-2 text-sm font-semibold text-white">{modelLabel(modelMeta?.model_type)}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Horizon</p>
                  <p className="mt-2 text-sm font-semibold text-white capitalize">{horizon}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Viewing</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {requestedWindow?.timestamp
                      ? new Date(requestedWindow.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : 'No forecast window selected'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Last Run</p>
                  <p className="mt-2 text-sm font-semibold text-white">{lastPredictionMs !== null ? formatDuration(lastPredictionMs) : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LoadingCard />
                <LoadingCard accent />
                <LoadingCard />
              </div>

              <div className="bg-[#0a0a0a] rounded-3xl border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="h-7 w-52 rounded-xl bg-[#1b1b1b] animate-pulse" />
                  <div className="flex gap-3">
                    <div className="h-4 w-20 rounded-full bg-[#1b1b1b] animate-pulse" />
                    <div className="h-4 w-20 rounded-full bg-[#1b1b1b] animate-pulse" />
                  </div>
                </div>

                <div className="h-[400px] rounded-2xl border border-[#1a1a1a] bg-[#080808] flex flex-col items-center justify-center">
                  <Activity size={44} className="text-orange-500/40 mb-4 animate-pulse" />
                  <p className="text-slate-400 font-medium">Generating demand forecast...</p>
                  <p className="text-slate-500 text-sm mt-2">Updating peak stats, model status, and trajectory</p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <LoadingCard />
              <LoadingCard />
            </div>
          </div>
        </div>
      ) : forecastData ? (
        <div className="space-y-6">
          {fetchError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {fetchError}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <MetricCard
                  eyebrow="Selected Demand"
                  title={
                    requestedWindow?.timestamp
                      ? new Date(requestedWindow.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : (selectedPrediction?.fullLabel || 'Forecast window')
                  }
                  value={requestedWindow?.predicted ?? selectedPrediction?.predicted ?? 'N/A'}
                  subtitle={requestedWindow?.available === false
                    ? 'The selected window is outside the model-supported forecast range for this zone.'
                    : `Expected ${horizon === 'hourly' ? 'pickups per hour' : 'pickups per day'} for the selected forecast slot.`}
                >
                  <div className="flex items-center gap-2 text-sm text-orange-300">
                    <TrendingUp size={16} />
                    <span>{requestedWindow?.available === false ? 'Choose a supported slot' : 'Focused demand view'}</span>
                  </div>
                </MetricCard>

                <MetricCard
                  eyebrow="Next Peak Window"
                  title={peakWindow?.timestamp ? new Date(peakWindow.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : (overallPeakInfo?.tooltipLabel || 'Peak window unavailable')}
                  value={peakWindow?.value ?? overallPeakInfo?.val ?? 'N/A'}
                  subtitle="Highest expected demand inside the active forecast range."
                  accent
                >
                  <div className="flex items-center gap-2 text-sm text-orange-50/95">
                    <Clock size={16} />
                    <span>Best time to reposition fleet</span>
                  </div>
                </MetricCard>
                
                <MetricCard
                  eyebrow="Financial Projection"
                  title="Est. Hourly Revenue"
                  value={`$${(
                    (forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.projected_revenue) || 
                    ((requestedWindow?.predicted ?? selectedPrediction?.predicted ?? 0) * 15)
                  ).toLocaleString()}`}
                  subtitle={
                    (forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.surge_multiplier > 1.0) 
                    ? "Surge pricing active for this block." 
                    : "Standard baserate volume."
                  }
                  accent
                >
                  <div className="flex items-center gap-2 text-sm text-green-300">
                    <TrendingUp size={16} />
                    <span>{(forecastData?.predicted?.find(p => p.timestamp === (requestedWindow?.timestamp || selectedPrediction?.timestamp))?.surge_multiplier || 1.0)}x Demand Multiplier</span>
                  </div>
                </MetricCard>

                <MetricCard
                  eyebrow="Model Status"
                  title={`${modelLabel(modelMeta?.model_type)} active`}
                  subtitle={modelMeta?.model_name || 'Model info unavailable'}
                >
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Data points</span>
                    <span className="font-semibold text-white">{modelMeta?.data_points ?? 'N/A'}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Confidence</span>
                    <span className={`font-semibold ${confidenceBand === 'high' ? 'text-orange-300' : confidenceBand === 'medium' ? 'text-orange-300' : 'text-rose-300'}`}>
                      {confidenceBand ? `${confidenceBand[0].toUpperCase()}${confidenceBand.slice(1)}` : 'Unavailable'}
                    </span>
                  </div>
                </MetricCard>
              </div>

              <div className="bg-[#0a0a0a] p-6 md:p-8 rounded-3xl border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 relative z-10">
                  <div>
                    <h2 className="text-lg font-bold text-white">Demand Trajectory</h2>
                    <p className="text-sm text-slate-400 mt-1">Historical demand versus predicted demand for the active zone.</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#444]"></div>
                      <span className="text-slate-400">Historical</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-white">Predicted</span>
                    </div>
                  </div>
                </div>

                {!hasSignal && (
                  <div className="relative z-10 mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                    No meaningful demand signal was found for this zone in the current dataset window. The chart below is a flat zero-demand forecast.
                  </div>
                )}

                {isLowConfidence && (
                  <div className="relative z-10 mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    This zone currently has low forecast confidence. Use the trend as directional guidance rather than a precise demand promise.
                  </div>
                )}

                <div className="h-[400px] w-full relative z-10">
                  {svgChart && (
                    <svg viewBox={`0 0 ${svgChart.width} ${svgChart.height}`} className="w-full h-full">
                      {/* Gradient definitions */}
                      <defs>
                        <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Grid lines */}
                      {svgChart.yTicks.map((tick) => (
                        <g key={`y-${tick.value}`}>
                          <line 
                            x1={svgChart.padding.left} 
                            x2={svgChart.width - svgChart.padding.right} 
                            y1={tick.y} 
                            y2={tick.y} 
                            stroke="#1a1a1a" 
                            strokeWidth="1"
                          />
                          <text x={svgChart.padding.left - 10} y={tick.y + 4} fill="#475569" fontSize="11" textAnchor="end">{tick.value}</text>
                        </g>
                      ))}

                      {/* X-axis labels */}
                      {svgChart.xTicks.map((tick) => {
                        const index = chartData.findIndex((point) => point.label === tick.label && point.tooltipLabel === tick.tooltipLabel);
                        return (
                          <text key={`x-${tick.label}-${tick.tooltipLabel}`} x={svgChart.xFor(index)} y={svgChart.height - 12} fill="#475569" fontSize="11" textAnchor="middle">
                            {tick.label}
                          </text>
                        );
                      })}

                      {/* Historical area fill */}
                      {svgChart.actualPath && (
                        <path
                          d={`${svgChart.actualPath} L ${svgChart.actualPoints[svgChart.actualPoints.length - 1]?.[0] || svgChart.padding.left} ${svgChart.padding.top + svgChart.innerHeight} L ${svgChart.actualPoints[0]?.[0] || svgChart.padding.left} ${svgChart.padding.top + svgChart.innerHeight} Z`}
                          fill="url(#historicalGradient)"
                          opacity="0.5"
                        />
                      )}

                      {/* Predicted area fill */}
                      {svgChart.predictedPath && (
                        <path
                          d={`${svgChart.predictedPath} L ${svgChart.predictedPoints[svgChart.predictedPoints.length - 1]?.[0] || svgChart.padding.left} ${svgChart.padding.top + svgChart.innerHeight} L ${svgChart.predictedPoints[0]?.[0] || svgChart.padding.left} ${svgChart.padding.top + svgChart.innerHeight} Z`}
                          fill="url(#predictedGradient)"
                          opacity="0.6"
                        />
                      )}

                      {/* Historical line */}
                      {svgChart.actualPath && (
                        <path 
                          d={svgChart.actualPath}
                          fill="none" 
                          stroke="#6b7280" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          opacity="0.8"
                        />
                      )}

                      {/* Predicted line with glow */}
                      {svgChart.predictedPath && (
                        <path 
                          d={svgChart.predictedPath}
                          fill="none" 
                          stroke="#f97316" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          filter="url(#glow)"
                        />
                      )}

                      {/* Data points with hover */}
                      {chartData.map((point, index) => {
                        const x = svgChart.xFor(index);
                        const y = svgChart.yFor(point.predicted !== undefined ? point.predicted : point.actual);
                        const isHovered = hoveredPoint === index;
                        const hasValue = typeof point.predicted === 'number' || typeof point.actual === 'number';
                        
                        if (!hasValue) return null;
                        
                        return (
                          <g key={`point-${index}`}>
                            {/* Invisible hit area for easier hovering */}
                            <circle
                              cx={x}
                              cy={y}
                              r="15"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredPoint(index)}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                            {/* Visible dot */}
                            <circle
                              cx={x}
                              cy={y}
                              r={isHovered ? 6 : 3}
                              fill={index < chartData.length / 2 ? '#6b7280' : '#f97316'}
                              opacity={isHovered ? 1 : 0.6}
                              style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }}
                            />
                          </g>
                        );
                      })}

                      {/* Hover tooltip */}
                      {hoveredPoint !== null && (() => {
                        const point = chartData[hoveredPoint];
                        const x = svgChart.xFor(hoveredPoint);
                        const y = svgChart.yFor(point.predicted !== undefined ? point.predicted : point.actual);
                        const value = point.predicted !== undefined ? point.predicted : point.actual;
                        
                        return (
                          <g>
                            {/* Tooltip background */}
                            <rect
                              x={x - 50}
                              y={y - 45}
                              width="100"
                              height="35"
                              rx="8"
                              fill="#1a1a1a"
                              stroke="#333"
                              strokeWidth="1"
                            />
                            {/* Tooltip text */}
                            <text
                              x={x}
                              y={y - 28}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize="12"
                              fontWeight="600"
                            >
                              {Math.round(value)} trips
                            </text>
                            <text
                              x={x}
                              y={y - 15}
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="10"
                            >
                              {point.tooltipLabel}
                            </text>
                          </g>
                        );
                      })()}

                      {/* Transition point marker */}
                      {svgChart.actualPoints.length > 0 && svgChart.predictedPoints.length > 0 && (() => {
                        const lastActual = svgChart.actualPoints[svgChart.actualPoints.length - 1];
                        return (
                          <circle
                            cx={lastActual[0]}
                            cy={lastActual[1]}
                            r="5"
                            fill="#fff"
                            stroke="#f97316"
                            strokeWidth="2"
                          />
                        );
                      })()}

                      {/* Selected prediction highlight */}
                      {selectedPrediction && (() => {
                        const selectedIndex = chartData.findIndex((point) => point.timestamp === selectedPrediction.timestamp);
                        if (selectedIndex === -1) return null;
                        const selectedX = svgChart.xFor(selectedIndex);
                        const selectedY = svgChart.yFor(selectedPrediction.predicted);

                        return (
                          <g>
                            {/* Vertical guide line */}
                            <line 
                              x1={selectedX} 
                              x2={selectedX} 
                              y1={svgChart.padding.top} 
                              y2={svgChart.padding.top + svgChart.innerHeight} 
                              stroke="#fb923c" 
                              strokeDasharray="4 4" 
                              opacity="0.3"
                            />
                            {/* Highlight circle */}
                            <circle 
                              cx={selectedX} 
                              cy={selectedY} 
                              r="8" 
                              fill="#f97316" 
                              stroke="#fff" 
                              strokeWidth="3"
                              filter="url(#glow)"
                            />
                            {/* Inner dot */}
                            <circle 
                              cx={selectedX} 
                              cy={selectedY} 
                              r="4" 
                              fill="#fff"
                            />
                          </g>
                        );
                      })()}

                      {/* Zero signal indicators */}
                      {!hasSignal && chartData.map((point, index) => (
                        <circle
                          key={`zero-${index}`}
                          cx={svgChart.xFor(index)}
                          cy={svgChart.padding.top + svgChart.innerHeight}
                          r="3"
                          fill={index < chartData.length / 2 ? '#777' : '#f97316'}
                          opacity="0.5"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-5">
              <MetricCard
                eyebrow="Live Forecast Quality"
                title="How this active forecast performed in validation"
                value={zoneEstimatedAccuracy !== null && zoneEstimatedAccuracy !== undefined ? `${zoneEstimatedAccuracy}%` : 'Pending'}
                subtitle="This score belongs to the current zone and horizon. The notebook benchmark below is only a project reference."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    <span className="text-slate-500">Confidence band</span>
                    <span className={`font-semibold ${confidenceBand === 'high' ? 'text-orange-300' : confidenceBand === 'medium' ? 'text-orange-300' : 'text-rose-300'}`}>
                      {confidenceBand ? `${confidenceBand[0].toUpperCase()}${confidenceBand.slice(1)}` : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </MetricCard>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 bg-[#0a0a0a] rounded-3xl border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-[#151515] rounded-2xl flex items-center justify-center mb-4 border border-[#333]">
            <MapPin size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {fetchError ? 'Forecast unavailable' : 'Ready to predict'}
          </h3>
          <p className="text-slate-500 max-w-md">
            {fetchError
              ? fetchError
              : user?.role === 'operator'
                ? 'Choose a zone, date, and time, then click Predict to generate a demand forecast. If no zones are available, visit Zone Management to map operating zones.'
                : 'Choose a zone, date, and time, then click Predict to generate a demand forecast.'}
          </p>
        </div>
      )}
    </div>
  );
}
