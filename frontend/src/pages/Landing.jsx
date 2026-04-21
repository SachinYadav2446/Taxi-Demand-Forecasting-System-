import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { api } from '../lib/axios';
import {
  Activity, ArrowRight, BrainCircuit, ChevronRight, Zap, Globe, Layers,
  Terminal, Map, TrendingUp, Shield, BarChart3, ExternalLink, Lock,
  MapPin, Route, PieChart, Users, Gauge, Cpu, User, Settings,
  X, Menu, CheckCircle2, Mail, MessageSquare, Send, Workflow, LogOut
} from 'lucide-react';

/* ─── Magnetic Wrapper ─── */
function MagneticButton({ children, className, onClick }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.35, y: y * 0.35 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      <div onClick={onClick} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Animated Counter ─── */
function Counter({ end, suffix = '', label, icon, mode }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let t = 0;
    const step = end / 40;
    const id = setInterval(() => { t += step; if (t >= end) { setVal(end); clearInterval(id); } else setVal(t); }, 40);
    return () => clearInterval(id);
  }, [inView, end]);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`relative group p-12 rounded-[3.5rem] border transition-all duration-700 text-center overflow-hidden font-poppins shadow-2xl ${mode === 'light' ? 'bg-white border-slate-100 hover:shadow-orange-500/5' : 'bg-black/40 border-white/[0.06] backdrop-blur-[100px] hover:border-orange-500/30'
        }`}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">{icon}</div>
        <div className={`text-6xl sm:text-7xl font-black tracking-tighter mb-4 leading-none ${mode === 'light' ? 'text-black' : 'text-white'}`}>{val.toFixed(end % 1 ? 1 : 0)}{suffix}</div>
        <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Feature Detail Modal ─── */
function FeatureModal({ feature, onClose, mode, user }) {
  if (!feature) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      {/* Backdrop */}
      <div className={`absolute inset-0 backdrop-blur-xl ${mode === 'light' ? 'bg-white/60' : 'bg-black/80'}`} />
      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto border-2 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl transition-colors duration-500 z-[501] pointer-events-auto ${mode === 'light' ? 'bg-white border-orange-500/20 text-slate-900' : 'bg-neutral-900 border-orange-500/30 text-white'
          }`}>
        {/* Close */}
        <button onClick={onClose} className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${mode === 'light' ? 'bg-black/5 border-black/10 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'
          } hover:scale-110`}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center ${feature.color} border ${mode === 'light' ? 'border-orange-500/20' : 'border-white/10'}`}>{feature.icon}</div>
          <div>
            <h2 className={`text-3xl font-black tracking-tight uppercase ${mode === 'light' ? 'text-black' : 'text-white'}`}>{feature.title}</h2>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">{feature.tag}</p>
          </div>
        </div>

        {/* Description */}
        <p className={`leading-relaxed mb-10 ${mode === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>{feature.detail}</p>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {feature.stats.map((s, i) => (
            <div key={i} className={`rounded-2xl p-5 text-center border ${mode === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/[0.04]'
              }`}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                className={`text-2xl font-black ${mode === 'light' ? 'text-black' : 'text-white'}`}>{s.value}</motion.div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bars */}
        <div className="space-y-4 mb-10">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Performance Metrics</h4>
          {feature.bars.map((b, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-400">{b.label}</span>
                <span className={`font-black ${mode === 'light' ? 'text-black' : 'text-white'}`}>{b.pct}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${mode === 'light' ? 'bg-slate-200' : 'bg-white/5'}`}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ delay: 0.3 + i * 0.15, duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Capabilities */}
        <div className="space-y-3 mb-10">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Key Capabilities</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {feature.capabilities.map((cap, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${mode === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/[0.03]'
                  }`}>
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span className={`text-xs font-medium ${mode === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>{cap}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link to={user ? '/dashboard' : feature.cta.link} className="px-10 py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-sm tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2 font-poppins">
            {user ? 'Launch Insight' : feature.cta.label} <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LogoutConfirmModal({ onConfirm, onClose, mode }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className={`absolute inset-0 backdrop-blur-md ${mode === 'light' ? 'bg-white/60' : 'bg-black/80'}`} onClick={onClose} />
      <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-300">
        <div className={`rounded-[2.5rem] border overflow-hidden p-8 text-center shadow-2xl ${mode === 'light' ? 'bg-white border-slate-200' : 'bg-[#0a0a0a] border-[#222]'
          }`}>
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
            <LogOut size={32} />
          </div>
          <h3 className={`text-xl font-black mb-2 ${mode === 'light' ? 'text-black' : 'text-white'}`}>Sign Out?</h3>
          <p className="text-slate-500 text-sm mb-8 font-medium">Are you sure you want to terminate your current session?</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
            >
              Yes, Sign Out
            </button>
            <button
              onClick={onClose}
              className={`w-full py-4 rounded-2xl border text-sm font-bold transition-all ${mode === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#111] border-[#222] text-slate-400 hover:bg-[#151515]'
                }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature Card (clickable) ─── */
function FeatureCard({ feature, onClick, delay, mode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative p-12 rounded-[3rem] border transition-all duration-700 cursor-pointer overflow-hidden shadow-xl z-20 ${mode === 'light' ? 'bg-white border-slate-200' : 'bg-black/40 border-white/[0.08] backdrop-blur-3xl'
        } hover:border-orange-500/40`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${mode === 'light' ? 'border-orange-500/20' : 'border-white/10'
          } ${feature.color} group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500`}>{feature.icon}</div>
        <h3 className={`text-3xl font-black tracking-tight uppercase ${mode === 'light' ? 'text-black' : 'text-white'}`}>{feature.title}</h3>
        <p className={`leading-relaxed ${mode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{feature.text}</p>
        <div className={`flex items-center justify-between pt-6 border-t mt-4 ${mode === 'light' ? 'border-slate-100' : 'border-white/[0.04]'}`}>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-orange-500 transition-colors duration-500 font-poppins">Explore Insight</span>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500 transition-all duration-500 shadow-xl group-hover:scale-110">
            <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Features Data ─── */
const features = [
  {
    icon: <MapPin size={28} />, title: 'Zone Intel', color: 'text-orange-500 bg-orange-500/10', delay: 0.1,
    text: 'Real-time demand heatmaps across all 263 NYC taxi zones. Know where riders need you before they do.',
    tag: 'Geospatial Intelligence',
    detail: 'Our zone intelligence engine continuously processes trip data from all 263 official NYC TLC zones. Each zone gets a real-time demand score updated every 15 minutes, layered onto an interactive Leaflet map with color-coded intensity overlays.',
    stats: [{ value: '263', label: 'Active Zones' }, { value: '15m', label: 'Refresh Cycle' }, { value: '99.7%', label: 'Uptime' }],
    bars: [{ label: 'Manhattan Coverage', pct: 98 }, { label: 'Brooklyn Coverage', pct: 92 }, { label: 'Queens (JFK/LGA)', pct: 96 }],
    capabilities: ['Interactive heatmap overlays', 'Zone-level demand scores', 'Historical zone comparison', 'Custom zone grouping', 'Export zone reports', 'Push alerts for surges'],
    cta: { label: 'View Live Map', link: '/login' },
  },
  {
    icon: <BrainCircuit size={28} />, title: 'SARIMAX AI', color: 'text-blue-400 bg-blue-500/10', delay: 0.2,
    text: 'Seasonal ARIMA with exogenous variables — weather, events, historical patterns — all feeding into one predictive model.',
    tag: 'Forecasting Engine',
    detail: 'SARIMAX (Seasonal AutoRegressive Integrated Moving Average with eXogenous factors) captures both daily and weekly seasonality in NYC taxi demand. Weather data, public events, and holidays are fed as exogenous variables to improve prediction quality.',
    stats: [{ value: '94.2%', label: 'Accuracy' }, { value: '24h', label: 'Horizon' }, { value: '6', label: 'Exog Vars' }],
    bars: [{ label: 'Peak Hour Accuracy', pct: 96 }, { label: 'Off-Peak Accuracy', pct: 89 }, { label: 'Weather Adjustment', pct: 78 }],
    capabilities: ['Hourly & daily forecasts', 'Weather-aware predictions', 'Holiday pattern detection', 'Confidence intervals', 'Model backtesting reports', 'Multi-zone batch forecasting'],
    cta: { label: 'Try Forecasting', link: '/login' },
  },
  {
    icon: <Route size={28} />, title: 'Fleet Sync', color: 'text-purple-400 bg-purple-500/10', delay: 0.3,
    text: 'Coordinate positioning across your entire fleet. Reduce idle time by up to 40% with predictive repositioning.',
    tag: 'Fleet Management',
    detail: 'Fleet Sync uses demand forecasts to generate optimal positioning suggestions for every vehicle in your fleet. The system considers current driver location, predicted surge zones, and travel time to minimize dead-miles and maximize ride coverage.',
    stats: [{ value: '-40%', label: 'Idle Time' }, { value: '+28%', label: 'Revenue/Hr' }, { value: '< 3s', label: 'Update Speed' }],
    bars: [{ label: 'Repositioning Efficiency', pct: 87 }, { label: 'Surge Capture Rate', pct: 91 }, { label: 'Driver Compliance', pct: 73 }],
    capabilities: ['Optimal positioning suggestions', 'Real-time rebalancing alerts', 'Driver performance metrics', 'Multi-vehicle coordination', 'Shift scheduling optimization', 'Route efficiency analysis'],
    cta: { label: 'Manage Fleet', link: '/login' },
  },
  {
    icon: <Globe size={28} />, title: 'Live Maps', color: 'text-emerald-400 bg-emerald-500/10', delay: 0.15,
    text: 'Interactive Leaflet maps with zone-level overlays showing demand intensity, surge pricing, and competitor density.',
    tag: 'Visualization Layer',
    detail: 'Our mapping layer renders all 263 NYC taxi zones as interactive polygons on a Leaflet-powered map. Each zone is color-coded by demand intensity with smooth transitions. Click any zone to see detailed forecasts, historical trends, and nearby driver positions.',
    stats: [{ value: '60fps', label: 'Render Speed' }, { value: '500ms', label: 'Data Lag' }, { value: '4', label: 'Map Layers' }],
    bars: [{ label: 'Render Performance', pct: 95 }, { label: 'Data Freshness', pct: 88 }, { label: 'Mobile Responsiveness', pct: 82 }],
    capabilities: ['Demand intensity heatmaps', 'Zone polygon overlays', 'Click-to-forecast zones', 'Multi-layer toggle (heat/boundary/markers)', 'Smooth zoom transitions', 'Fullscreen mode'],
    cta: { label: 'Open Maps', link: '/login' },
  },
  {
    icon: <Gauge size={28} />, title: 'Revenue AI', color: 'text-amber-400 bg-amber-500/10', delay: 0.25,
    text: 'Track hourly earnings projections. Our models identify optimal shift times and high-value pickup corridors.',
    tag: 'Revenue Optimization',
    detail: 'Revenue AI combines demand forecasts with historical fare data to project hourly earnings for each zone. The system identifies the most profitable pickup corridors and recommends optimal shift start/end times based on your driving patterns.',
    stats: [{ value: '+34%', label: 'Avg Increase' }, { value: '$48', label: 'Peak $/Hr' }, { value: '6am', label: 'Best Start' }],
    bars: [{ label: 'Earnings Prediction', pct: 91 }, { label: 'Optimal Shift Detection', pct: 85 }, { label: 'Corridor Identification', pct: 88 }],
    capabilities: ['Hourly earnings projection', 'Optimal shift recommendations', 'High-value corridor alerts', 'Weekly earnings trends', 'Comparative zone analysis', 'Driver earnings leaderboard'],
    cta: { label: 'See Revenue Data', link: '/login' },
  },
  {
    icon: <Users size={28} />, title: 'Role Access', color: 'text-rose-400 bg-rose-500/10', delay: 0.35,
    text: 'Operator dashboards, driver views, and admin panels — each with tailored forecasting depth and fleet controls.',
    tag: 'Access Control',
    detail: 'DemandSight supports role-based access with distinct interfaces for operators and drivers. Operators get fleet management, zone analytics, and bulk forecasting tools. Drivers see simplified demand maps, shift recommendations, and personal earnings tracking.',
    stats: [{ value: '2', label: 'Role Types' }, { value: 'JWT', label: 'Auth System' }, { value: '256-bit', label: 'Encryption' }],
    bars: [{ label: 'Operator Feature Depth', pct: 100 }, { label: 'Driver Feature Depth', pct: 75 }, { label: 'Security Compliance', pct: 97 }],
    capabilities: ['Operator dashboard', 'Driver simplified view', 'JWT token authentication', 'Profile management', 'Password encryption', 'Session persistence'],
    cta: { label: 'Create Account', link: '/register' },
  },
];

/* ─── Stats Carousel ─── */
const carouselStats = [
  { end: 94.2, suffix: "%", label: "Forecast Accuracy", icon: <Zap size={24} /> },
  { end: 263, suffix: "", label: "Active NYC Zones", icon: <Globe size={24} /> },
  { end: 1.2, suffix: "M", label: "Data Points / Day", icon: <Layers size={24} /> },
  { end: 3, suffix: "h", label: "Predictive Lead Time", icon: <TrendingUp size={24} /> },
  { end: 40, suffix: "%", label: "Idle Time Reduction", icon: <Workflow size={24} /> },
  { end: 15, suffix: "m", label: "Refresh Interval", icon: <Activity size={24} /> },
];

function StatsCarousel({ mode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % carouselStats.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[320px] flex justify-center items-center">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[600px] h-[300px] bg-orange-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center gap-6 sm:gap-16">
        {/* Left Deco */}
        <div className="hidden lg:flex flex-col gap-10 text-right w-48 font-poppins">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Infrastructure</p>
            <p className={`text-[15px] font-bold group-hover:translate-x-[-4px] transition-transform ${mode === 'light' ? 'text-black' : 'text-white'}`}>Edge Node NYC-1</p>
            <div className={`h-0.5 w-full transition-colors ${mode === 'light' ? 'bg-black/5' : 'bg-white/5'} group-hover:bg-orange-500/30`} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Inference Speed</p>
            <p className="text-[15px] font-bold text-orange-500 group-hover:translate-x-[-4px] transition-transform">42ms Latency</p>
            <div className={`h-0.5 w-full transition-colors ${mode === 'light' ? 'bg-black/5' : 'bg-white/5'} group-hover:bg-orange-500/30`} />
          </motion.div>
        </div>

        <div className="relative w-[400px] h-[320px] flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 100, scale: 0.8, rotateY: 20 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: -100, scale: 0.8, rotateY: -20 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
              className="w-full absolute"
            >
              <Counter {...carouselStats[index]} mode={mode} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Deco */}
        <div className="hidden lg:flex flex-col gap-10 w-48 font-poppins">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Reliability</p>
            <p className="text-[15px] font-bold text-orange-500 group-hover:translate-x-[4px] transition-transform">99.98% Service</p>
            <div className={`h-0.5 w-full transition-colors ${mode === 'light' ? 'bg-black/5' : 'bg-white/5'} group-hover:bg-orange-500/30`} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Data Source</p>
            <p className={`text-[15px] font-bold group-hover:translate-x-[4px] transition-transform ${mode === 'light' ? 'text-black' : 'text-white'}`}>PostgreSQL NYC</p>
            <div className={`h-0.5 w-full transition-colors ${mode === 'light' ? 'bg-black/5' : 'bg-white/5'} group-hover:bg-orange-500/30`} />
          </motion.div>
        </div>
      </div>

      <div className="absolute -bottom-4 flex justify-center gap-3 w-full">
        {carouselStats.map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: i === index ? 1.2 : 1, opacity: i === index ? 1 : 0.2 }}
            className={`w-2 h-2 rounded-full bg-orange-500 transition-colors duration-500`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Landing ─── */
export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [contactStatus, setContactStatus] = useState('idle');
  const [form, setForm] = useState({ sender_name: '', sender_email: '', subject: 'Inquiry', message: '' });
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { mode, setMode } = useTheme();

  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 0.85]);

  useEffect(() => {
    const handle = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  // Auto-populate form with authenticated user data
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        sender_name: user.name || '',
        sender_email: user.email || ''
      }));
    }
  }, [user]);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };

  const submitContact = async (e) => {
    e.preventDefault();
    setContactStatus('sending');
    try {
      await api.post('/contact/send', form);
      setContactStatus('success');
      setForm({ sender_name: '', sender_email: '', subject: 'Inquiry', message: '' });
      setTimeout(() => setContactStatus('idle'), 4000);
    } catch { setContactStatus('error'); setTimeout(() => setContactStatus('idle'), 4000); }
  };

  const navItems = [
    { label: 'Features', action: () => scrollTo('features') },
    { label: 'Vision', action: () => scrollTo('vision') },
    { label: 'Contact', action: () => scrollTo('contact') },
  ];

  return (
    <div className={`min-h-screen font-poppins selection:bg-orange-500/30 transition-colors duration-700 ${mode === 'light' ? 'bg-[#fdf6ef] text-slate-900' : 'bg-[#0a0a0c] text-white'
      }`}>

      {isLogoutModalOpen && (
        <LogoutConfirmModal
          mode={mode}
          onConfirm={() => {
            logout();
            navigate('/login');
          }}
          onClose={() => setIsLogoutModalOpen(false)}
        />
      )}


      {/* ── Predictive Intelligence Background ── */}
      <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-700 ${mode === 'light' ? 'bg-[#fdf6ef]' : 'bg-[#08080a]'
        }`}>
        {/* Layer 1: Static Tech Grid */}
        <div className={`absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:80px_80px]`} />

        {/* Layer 2: Reactive Dot Matrix */}
        <div className={`absolute inset-0 opacity-[0.1] bg-[radial-gradient(#808080_1px,transparent_1px)] bg-[size:32px_32px]`} />

        {/* Layer 3: Mouse Spotlight Reveal */}
        <div
          className="absolute inset-0 opacity-100 transition-opacity duration-500 ease-out"
          style={{
            background: mode === 'dark'
              ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249,115,22,0.18), rgba(249,115,22,0.05) 40%, transparent 80%)`
              : `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249,115,22,0.12), rgba(249,115,22,0.03) 40%, transparent 80%)`
          }}
        />

        {/* Layer 4: Floating Data Particles (Optimized) */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-orange-500/10 rounded-full"
              initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
              animate={{
                x: [null, (Math.random() * 100) + "%"],
                y: [null, (Math.random() * 100) + "%"],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 25 + Math.random() * 25,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                filter: 'blur(2px)',
                left: (Math.random() * 100) + "%",
                top: (Math.random() * 100) + "%",
                willChange: 'transform'
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <motion.nav
        style={{ opacity: 1 }}
        className={`fixed top-0 w-full z-[100] backdrop-blur-3xl border-b transition-colors duration-500 px-6 md:px-16 py-4 flex items-center justify-between ${mode === 'light' ? 'border-black/[0.05] bg-white/80' : 'border-white/[0.08] bg-[#0a0a0c]/80'
          }`}
      >
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
            <Activity size={20} className="text-black" />
          </div>
          <span className={`text-lg font-black tracking-tight uppercase hidden sm:block ${mode === 'light' ? 'text-black' : 'text-white'}`}>DemandSight</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(n => (
            <button key={n.label} onClick={n.action} className={`text-[13px] font-bold uppercase tracking-widest transition-colors ${mode === 'light' ? 'text-slate-600 hover:text-orange-600' : 'text-slate-300 hover:text-orange-500'
              }`}>{n.label}</button>
          ))}

          <div className="flex items-center gap-4">
            <Link to={user ? '/dashboard' : '/login'}
              className="px-8 py-2.5 rounded-xl bg-orange-500 text-white text-[12px] font-bold uppercase tracking-widest hover:brightness-110 shadow-lg font-poppins transition-all active:scale-95">
              {user ? 'ML Intelligence' : 'Sign In'}
            </Link>

            {user && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/profile')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${mode === 'light' ? 'bg-black/5 border-black/10 text-slate-600 hover:bg-black/10' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  title="Profile"
                >
                  <User size={18} />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${mode === 'light' ? 'bg-black/5 border-black/10 text-slate-600 hover:bg-black/10' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </motion.nav>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center gap-10">
            {navItems.map(n => <button key={n.label} onClick={n.action} className="text-4xl font-black uppercase tracking-tight hover:text-orange-500 transition-colors">{n.label}</button>)}

            <Link to={user ? '/dashboard' : '/login'} onClick={() => setMenuOpen(false)} className="text-2xl font-black text-white underline underline-offset-8 uppercase font-poppins">
              {user ? 'ML Engine' : 'Sign In'}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">

        {/* ══════════ HERO ══════════ */}
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-20 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
            >
              <h1 className={`text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.85] tracking-tight uppercase drop-shadow-2xl transition-colors duration-500 ${mode === 'light' ? 'text-black' : 'text-white'
                }`}>
                PREDICT<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">DEMAND.</span>
              </h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className={`text-lg max-w-2xl mx-auto leading-relaxed font-poppins transition-colors duration-500 ${mode === 'light' ? 'text-slate-600' : 'text-slate-500'
                }`}>
              SARIMAX-powered geospatial intelligence for NYC mobility. Transform raw trip data into predictive fleet earnings across 263 taxi zones.
            </motion.p>

            {/* Dashboard Image Mockup */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}
              className="pt-16 w-full max-w-4xl mx-auto px-4 perspective-[1000px]">
              <motion.div
                animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl shadow-orange-500/10 bg-black/50 backdrop-blur-3xl transform rotate-x-12 scale-[0.95] hover:scale-100 hover:rotate-x-0 transition-transform duration-700 ease-out cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
                <img src="/dashboard-mockup.png" alt="DemandSight Interactive Dashboard" className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" />
              </motion.div>
            </motion.div>
            {/* Scroll hint */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              className="pt-16 flex justify-center">
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
                <div className="w-1.5 h-3 rounded-full bg-orange-500" />
              </motion.div>
            </motion.div>
          </div>

        </section>

        {/* ── Marquee ── */}
        <div className={`border-y py-8 overflow-hidden transition-colors duration-500 ${mode === 'light' ? 'border-black/[0.05] bg-white/60' : 'border-white/[0.08] bg-black/60'
          } backdrop-blur-xl`}>
          <div className="flex animate-[marquee_45s_linear_infinite] whitespace-nowrap gap-16 text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">
            {['SARIMAX Engine', 'NYC Geospatial', 'Surge Detection', 'Fleet Routing', '263 Zones', 'Real-Time Maps'].map((t, i) => (
              <span key={`a-${i}`} className="flex items-center gap-6">{t}<span className="w-1.5 h-1.5 rounded-full bg-orange-500/30" /></span>
            ))}
            {['SARIMAX Engine', 'NYC Geospatial', 'Surge Detection', 'Fleet Routing', '263 Zones', 'Real-Time Maps'].map((t, i) => (
              <span key={`b-${i}`} className="flex items-center gap-6">{t}<span className="w-1.5 h-1.5 rounded-full bg-orange-500/30" /></span>
            ))}
          </div>
        </div>

        <section id="features" className="py-20 sm:py-24 px-6 md:px-16 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20 space-y-4">
              <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Core Capabilities</div>
              <h2 className="text-5xl sm:text-7xl font-black tracking-normal uppercase">Built for<br /><span className="text-orange-500">Operators.</span></h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">Click any card to see the full breakdown</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <FeatureCard key={i} feature={f} delay={f.delay} mode={mode} onClick={() => setActiveFeature(f)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Benchmarks Section ── */}
        <section className="py-24 sm:py-32 px-6 md:px-16 overflow-hidden relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-3">Live Performance</div>
              <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tight line-height-[0.9] transition-colors duration-500 ${mode === 'light' ? 'text-black' : 'text-white'
                }`}>
                SYSTEM <span className="text-orange-500">BENCHMARKS.</span>
              </h2>
            </motion.div>
            <StatsCarousel mode={mode} />
          </div>
        </section>

        {/* ══════════ VISION ══════════ */}
        <section id="vision" className="relative py-24 sm:py-32 overflow-hidden scroll-mt-24">
          <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-transparent ${mode === 'light' ? 'via-orange-500/5' : 'via-orange-950/10'
            }`} />
          <div className="relative max-w-4xl mx-auto px-6 text-center space-y-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}>
              <h2 className={`text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.85] transition-colors duration-500 ${mode === 'light' ? 'text-black' : 'text-white'
                }`}>
                THE CITY<br />NEVER <span className="text-orange-500">STOPS.</span>
              </h2>
              <div className="w-20 h-1 bg-orange-500 mx-auto my-10 rounded-full" />
              <p className={`text-lg max-w-lg mx-auto leading-relaxed transition-colors duration-500 ${mode === 'light' ? 'text-slate-600' : 'text-slate-500'
                }`}>
                While others react, DemandSight operators anticipate. Our SARIMAX models see the surge 3 hours before it arrives.
              </p>
              <div className="pt-10 flex justify-center gap-5">
                <button onClick={() => navigate('/docs')}
                  className={`px-12 py-5 border transition-all rounded-2xl font-poppins font-black uppercase text-sm tracking-[0.2em] ${mode === 'light' ? 'border-black/10 text-black hover:bg-black hover:text-white' : 'border-white/20 text-white hover:bg-white hover:text-black'
                    }`}>
                  Read the Docs
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════ CONTACT ══════════ */}
        <section id="contact" className="py-20 sm:py-24 px-6 md:px-16 scroll-mt-24">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            {/* Left */}
            <div className="space-y-10 lg:sticky lg:top-32">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">Get In Touch</div>
                <h2 className={`text-4xl sm:text-6xl font-black tracking-tight uppercase leading-[0.85] transition-colors duration-500 ${mode === 'light' ? 'text-black' : 'text-white'
                  }`}>
                  LET'S<br /><span className="text-orange-500">CONNECT.</span>
                </h2>
              </motion.div>
              <p className={`text-lg leading-relaxed max-w-md transition-colors duration-500 ${mode === 'light' ? 'text-slate-600' : 'text-slate-500'
                }`}>
                Whether you're an independent driver or managing a fleet of 500+ vehicles, our team is ready to help you deploy predictive intelligence.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-black"><Mail size={22} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email</div>
                    <div className={`font-bold transition-colors ${mode === 'light' ? 'text-black' : 'text-white'}`}>support@demandsight.ai</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-orange-500 ${mode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                    }`}><Terminal size={22} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Repository</div>
                    <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-" target="_blank" rel="noopener noreferrer" className={`font-bold hover:text-orange-500 transition-colors ${mode === 'light' ? 'text-black' : 'text-white'
                      }`}>SachinYadav2446</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className={`border backdrop-blur-xl p-8 sm:p-10 rounded-[3rem] max-w-lg w-full lg:ml-auto transition-colors duration-500 ${mode === 'light' ? 'bg-white border-slate-200 shadow-xl' : 'bg-white/[0.015] border-white/[0.04]'
                }`}>
              {!user ? (
                <div className="text-center py-8 space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                  <div className="w-20 h-20 rounded-[2rem] bg-orange-500/5 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.1)]">
                    <Lock size={40} className="animate-pulse" />
                  </div>

                  <div className="space-y-4">
                    <h3 className={`text-4xl font-black uppercase tracking-tight leading-tight ${mode === 'light' ? 'text-black' : 'text-white'}`}>COMMUNICATION<br /><span className="text-orange-500">SECURED.</span></h3>
                    <p className="text-slate-500 text-xs max-w-xs mx-auto font-medium transition-colors">Verify your identity to unlock the direct operational enquiry desk and secure messaging.</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-[2rem] p-6 grid grid-cols-2 gap-4 shadow-inner">
                    {[
                      { icon: <MessageSquare size={14} />, text: 'Direct Support' },
                      { icon: <Shield size={14} />, text: 'Secure Tunnel' },
                      { icon: <Send size={14} />, text: 'Fast Response' },
                      { icon: <Activity size={14} />, text: 'Real-time Chat' }
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <span className="text-orange-500">{b.icon}</span> {b.text}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col items-center gap-6">
                    <Link to="/login" className="px-12 py-5 bg-orange-600 text-white font-black rounded-2xl uppercase text-sm tracking-[0.2em] hover:brightness-110 transition-all shadow-[0_15px_40px_rgba(249,115,22,0.3)] font-poppins min-w-[240px] active:scale-95">
                      Sign In Now
                    </Link>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">
                      <div className={`w-10 h-[1px] ${mode === 'light' ? 'bg-black/10' : 'bg-white/[0.08]'}`} />
                      Protected Portal
                      <div className={`w-10 h-[1px] ${mode === 'light' ? 'bg-black/10' : 'bg-white/[0.08]'}`} />
                    </div>
                  </div>
                </div>
              ) : contactStatus === 'success' ? (
                <div className="text-center py-20 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight">Message Sent!</h3>
                  <p className="text-slate-500">We'll respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={submitContact} className="space-y-8">
                  <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 transition-colors ${mode === 'light' ? 'text-black' : 'text-white'}`}>Send a Message</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Name</label>
                      <input readOnly type="text" value={form.sender_name}
                        className="w-full bg-white/[0.015] border border-white/[0.04] rounded-xl px-5 py-4 text-sm text-slate-400 cursor-not-allowed outline-none font-poppins" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email</label>
                      <input readOnly type="email" value={form.sender_email}
                        className="w-full bg-white/[0.015] border border-white/[0.04] rounded-xl px-5 py-4 text-sm text-slate-400 cursor-not-allowed outline-none font-poppins" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Message</label>
                    <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your fleet..." className={`w-full border rounded-xl px-5 py-4 text-sm outline-none transition-colors resize-none ${mode === 'light' ? 'bg-slate-50 border-slate-200 text-black placeholder:text-slate-400' : 'bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-700'
                        } focus:border-orange-500/40`} />
                  </div>
                  <button disabled={contactStatus === 'sending'}
                    className="w-full py-6 bg-orange-600 text-white font-black uppercase text-[13px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins">
                    {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                    <Send size={18} />
                  </button>
                  {contactStatus === 'error' && <p className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>}
                </form>
              )}
            </motion.div>
          </div>
        </section>

        <section className={`py-24 sm:py-32 px-6 transition-colors duration-500 ${mode === 'light' ? 'bg-gradient-to-t from-orange-50/50 to-transparent' : 'bg-gradient-to-t from-black via-transparent to-transparent'
          }`}>
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className={`text-4xl sm:text-7xl font-black tracking-tight uppercase leading-[0.85] transition-colors duration-500 ${mode === 'light' ? 'text-black' : 'text-white'
              }`}>
              READY TO<br /><span className="text-orange-500">SCALE?</span>
            </h2>
            <p className={`text-lg max-w-lg mx-auto transition-colors duration-500 ${mode === 'light' ? 'text-slate-600' : 'text-slate-500'
              }`}>Join operators leveraging the SARIMAX forecasting engine for smarter fleet decisions.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to={user ? '/dashboard' : '/register'} className="px-12 py-5 bg-orange-500 text-white font-black rounded-2xl uppercase text-[13px] tracking-[0.2em] hover:bg-neutral-800 transition-all font-poppins shadow-xl shadow-orange-500/20">
                {user ? 'Access Intelligence' : 'Start Free'}
              </Link>
              <button onClick={() => navigate('/docs')} className={`px-12 py-5 border font-black rounded-2xl uppercase text-[13px] tracking-[0.2em] transition-all font-poppins ${mode === 'light' ? 'border-black/10 text-black hover:bg-black hover:text-white' : 'border-white/20 text-white hover:bg-white hover:text-black'
                }`}>Documentation</button>
            </div>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer className={`py-12 px-6 md:px-16 border-t transition-colors duration-500 ${mode === 'light' ? 'bg-white border-slate-100' : 'bg-black border-white/[0.04]'
          }`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className={`flex items-center gap-3 ${mode === 'light' ? 'text-black' : 'text-white'}`}>
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Activity size={14} className="text-black" /></div>
              <span className="font-black uppercase tracking-tight text-sm">DemandSight</span>
            </div>

            <div className="flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Features</button>
              <Link to="/docs" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Docs</Link>
              <button onClick={() => scrollTo('contact')} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Contact</button>
              <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-" target="_blank" rel="noopener noreferrer" className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${mode === 'light' ? 'text-slate-500 hover:text-black' : 'text-slate-500 hover:text-white'
                }`}>Source</a>
            </div>

            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${mode === 'light' ? 'text-green-600' : 'text-green-600/60'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Operational
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${mode === 'light' ? 'text-slate-400' : 'text-slate-800'}`}>© 2026</p>
            </div>
          </div>
        </footer>
      </main>
      <AnimatePresence>
        {activeFeature && <FeatureModal feature={activeFeature} mode={mode} user={user} onClose={() => setActiveFeature(null)} />}
      </AnimatePresence>
    </div>
  );
}
