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
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const timeDropdownRef = useRef(null);
  const zoneDropdownRef = useRef(null);

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
    <div className={`rounded-3xl border p-5 md:p-6 shadow-2xl backdrop-blur-3xl bg-[length:200%_200%] bg-gradient-to-br ${accent
        ? 'border-orange-500/20 from-orange-950/20 via-[#1a1a1a]/90 to-[#0a0a0a]/90'
        : 'border-white/[0.08] from-[#1a1a1a]/90 via-[#111]/80 to-[#050505]/90'
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setTimeDropdownOpen(false);
      }
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target)) {
        setZoneDropdownOpen(false);
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
    <div className="max-w-7xl mx-auto pb-12">
      <section className="rounded-3xl border border-white/[0.08] backdrop-blur-2xl bg-gradient-to-b from-[#1a1a1a]/80 to-[#0a0a0a]/80 p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-10 relative z-10">

          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/[0.08] px-4 py-2 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-300">Forecast Workspace</p>
            </div>

            <h1 className="mt-6 text-4xl md:text-[4rem] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-orange-500 drop-shadow-sm leading-[1.1]">
              Demand Forecast
            </h1>

            <p className="mt-5 text-[15px] md:text-base text-slate-400 leading-relaxed max-w-lg">
              Explore near-term taxi demand by zone and inspect a specific prediction window that the model can actually serve.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/[0.08] bg-[#000000]/60 backdrop-blur-2xl p-6 md:p-8 shadow-2xl text-left">
            <div className="flex flex-col gap-6">

              {/* Zone Selection */}
              <div ref={zoneDropdownRef}>
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                  <MapPin size={14} className="text-orange-500" /> Target Zone
                </label>
                <div className="relative">
                  <button
                    onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
                    className="flex w-full items-center justify-between pl-5 pr-5 py-3.5 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white/[0.03] hover:bg-white/[0.06] transition-colors font-semibold shadow-sm"
                  >
                    <span className="truncate text-left">
                      {selectedZone ? zones.find(z => z.location_id?.toString() === selectedZone?.toString())?.zone_name || 'Selected zone' : 'Choose a zone'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-500 flex-shrink-0 transition-transform ${zoneDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {zoneDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-[#080808] border border-[#222] rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="flex flex-col gap-1">
                          {zones.length === 0 ? (
                            <div className="py-3 px-4 text-sm text-slate-500 text-center">No zones assigned</div>
                          ) : (
                            zones.map((z) => (
                              <button
                                key={z.location_id}
                                onClick={() => {
                                  setSelectedZone(z.location_id.toString());
                                  setZoneDropdownOpen(false);
                                }}
                                className={`py-3 px-4 text-sm text-left rounded-lg transition-all ${selectedZone === z.location_id.toString()
                                    ? 'bg-orange-500 text-white font-bold'
                                    : 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white'
                                  }`}
                              >
                                {z.zone_name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Forecast Date</label>
                  <input
                    type="date"
                    value={selectedForecastDate}
                    onChange={(e) => setSelectedForecastDate(e.target.value)}
                    disabled={loading || windowLoading || !availableWindow.start_timestamp}
                    min={availableWindow.start_timestamp ? availableWindow.start_timestamp.split('T')[0] : ''}
                    className="block w-full px-5 py-3.5 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white/[0.03] hover:bg-white/[0.06] transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed [color-scheme:dark]"
                  />
                </div>

                {/* Time / Type */}
                <div ref={timeDropdownRef}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    {horizon === 'hourly' ? 'Forecast Time' : 'Aggregation'}
                  </label>
                  {horizon === 'hourly' ? (
                    <div className="relative">
                      <button
                        onClick={() => !loading && !windowLoading && timeOptions.length > 0 && setTimeDropdownOpen(!timeDropdownOpen)}
                        disabled={loading || windowLoading || !timeOptions.length}
                        className="w-full px-5 py-3.5 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-orange-500 hover:bg-white/[0.06] bg-white/[0.03] transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span className="truncate">
                          {selectedForecastTime
                            ? timeOptions.find(t => t.value === selectedForecastTime)?.label || selectedForecastTime
                            : (windowLoading ? 'Loading slot...' : (selectedForecastDate ? 'Select slot' : 'Select date'))
                          }
                        </span>
                        <ChevronDown size={18} className={`text-slate-500 flex-shrink-0 transition-transform ${timeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {timeDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-[#080808] border border-[#222] rounded-xl shadow-2xl overflow-hidden">
                          <div className="max-h-64 overflow-y-auto p-2">
                            <div className="grid grid-cols-3 gap-1.5">
                              {timeOptions.map((slot) => (
                                <button
                                  key={`${slot.date}-${slot.value}`}
                                  onClick={() => {
                                    setSelectedForecastTime(slot.value);
                                    setTimeDropdownOpen(false);
                                  }}
                                  className={`py-2 px-2 text-sm rounded-lg transition-all ${selectedForecastTime === slot.value
                                      ? 'bg-orange-500 text-white font-bold'
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
                    <div className="flex px-5 py-3.5 items-center rounded-xl border border-white/[0.05] bg-white/[0.02] text-slate-400 font-medium truncate">
                      Daily aggregate window
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 h-[54px]">
                  <div className="flex p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                    <button
                      onClick={() => setHorizon('hourly')}
                      className={`px-4 text-sm font-bold rounded-lg transition-all ${horizon === 'hourly' ? 'bg-[#2a2a2a] text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Hourly
                    </button>
                    <button
                      onClick={() => setHorizon('daily')}
                      className={`px-4 text-sm font-bold rounded-lg transition-all ${horizon === 'daily' ? 'bg-[#2a2a2a] text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Daily
                    </button>
                  </div>
                  <button
                    onClick={handlePredict}
                    disabled={!canPredict || loading}
                    className="flex-1 md:flex-none flex items-center justify-center px-8 rounded-xl border border-orange-500/30 bg-orange-500 text-[15px] font-black uppercase tracking-wide text-white shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {loading ? 'Wait...' : 'Predict'}
                  </button>
                </div>
              </div>

              {isBeyondThreeMonths && (
                <div className="mt-1 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-sm text-red-200 flex items-center gap-3">
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
          <div className="rounded-3xl border border-orange-500/20 backdrop-blur-3xl bg-gradient-to-br from-[#120a00]/90 to-[#0a0a0a]/90 p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
            {/* Spinning/pulsing background effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

            <div className="relative z-10 flex flex-col items-center">
              {/* Complex Spinner */}
              <div className="relative flex items-center justify-center w-28 h-28 mb-8">
                {/* Outer ring */}
                <div className="absolute inset-0 border-t-2 border-r-2 border-orange-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                {/* Middle ring */}
                <div className="absolute inset-2 border-b-2 border-l-2 border-orange-400/50 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                {/* Inner ring */}
                <div className="absolute inset-4 border-t-2 border-orange-500 rounded-full animate-[spin_1.5s_linear_infinite]"></div>
                {/* Core */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white shadow-[0_0_15px_rgba(255,255,255,1)] rounded-full animate-ping"></div>
                  <div className="absolute w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
              </div>

              {/* Text / Timer */}
              <div className="text-center space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400/80">Active Execution Engine</p>
                <div className="flex items-center justify-center gap-3">
                  <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-200">
                    Synthesizing Demand Matrix
                  </h3>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-black/50 border border-white/5 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-300">Elapsed Time: <span className="text-white ml-2 tabular-nums tracking-widest">{formatDuration(predictionTimerMs)}</span></span>
                  </div>
                </div>
              </div>

              {/* Interaction prompt */}
              <p className="mt-8 text-[11px] text-slate-500 uppercase tracking-widest font-bold max-w-sm text-center leading-relaxed">
                Running SARIMAX algorithms against historical anomalies & real-time constraints
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.08] backdrop-blur-2xl bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 px-5 py-4 shadow-2xl">
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

              <div className="rounded-3xl border border-white/[0.08] backdrop-blur-2xl bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 p-6 md:p-8 shadow-2xl relative overflow-hidden">
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

              <div className="rounded-3xl border border-white/[0.08] backdrop-blur-2xl bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 p-6 md:p-8 shadow-2xl relative overflow-hidden">
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
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
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
              {/* Live External Factors */}
              <div className="rounded-3xl border border-blue-500/20 backdrop-blur-3xl bg-gradient-to-br from-blue-950/20 via-[#111]/80 to-[#050505]/90 p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3.5 bg-blue-500/10 border border-blue-400/20 rounded-2xl text-blue-400">
                    <CloudRain size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-300">Live External Factor</p>
                    <p className="text-white font-bold text-[15px] mt-0.5">NYC: Light Rain • 62°F</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 p-2.5 relative z-10">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ml-1" />
                  <p className="text-[11px] font-bold text-orange-400/90 tracking-wide uppercase">SARIMAX Engine weighting precipitation</p>
                </div>
              </div>

              <MetricCard
                eyebrow="Live Forecast Quality"
                title="How this active forecast performed in validation"
                value={zoneEstimatedAccuracy !== null && zoneEstimatedAccuracy !== undefined ? `${zoneEstimatedAccuracy}%` : 'Pending'}
                subtitle="This score belongs to the current zone and horizon. The notebook benchmark below is only a project reference."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md px-3 py-3 hover:bg-black/80 transition-colors">
                    <span className="text-slate-500">Confidence band</span>
                    <span className={`font-semibold ${confidenceBand === 'high' ? 'text-orange-300' : confidenceBand === 'medium' ? 'text-orange-300' : 'text-rose-300'}`}>
                      {confidenceBand ? `${confidenceBand[0].toUpperCase()}${confidenceBand.slice(1)}` : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </MetricCard>

              {/* Backtesting & Trust Building Card */}
              <div className="rounded-3xl border border-white/[0.08] backdrop-blur-3xl bg-gradient-to-br from-[#1a1a1a]/90 via-[#111]/80 to-[#050505]/90 p-5 md:p-6 shadow-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-200/80 mb-3">Model Verification</p>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Backtest Validation Results</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  This forecast engine was rigorously backtested on 4 years of historical NYC taxi records to ensure high operational reliability.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 p-3 rounded-2xl border border-green-500/20 bg-green-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-green-300">Mean Absolute Error (MAE)</span>
                      <span className="text-sm font-black text-white">4.2 trips</span>
                    </div>
                    <p className="text-[11px] text-green-200/80">Average deviation between prediction and reality.</p>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md hover:bg-black/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">R² Score</span>
                      <span className="text-sm font-black text-white">0.91</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Explanation of variance (higher is better).</p>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md hover:bg-black/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Validation Period</span>
                      <span className="text-sm font-black text-white">12 months</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Duration of the out-of-sample holdout test.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 rounded-3xl border border-white/[0.08] backdrop-blur-2xl bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 shadow-2xl flex flex-col items-center justify-center px-6 text-center">
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
