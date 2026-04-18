import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { api } from '../lib/axios';
import {
  Activity, ArrowRight, BrainCircuit, ChevronRight, Zap, Globe, Layers,
  Menu, X, MessageSquare, Mail, Send, CheckCircle2, Cpu, Workflow,
  Terminal, Map, TrendingUp, Shield, BarChart3, ExternalLink
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
function Counter({ end, suffix = '', label, icon }) {
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
      className="relative group p-12 rounded-[3.5rem] border border-white/[0.06] bg-black/40 backdrop-blur-[100px] hover:border-orange-500/30 transition-all duration-700 text-center overflow-hidden font-poppins shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">{icon}</div>
        <div className="text-6xl sm:text-7xl font-black text-white tracking-tighter mb-4 leading-none">{val.toFixed(end % 1 ? 1 : 0)}{suffix}</div>
        <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Feature Detail Modal ─── */
function FeatureModal({ feature, onClose }) {
  if (!feature) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      {/* Card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border border-white/[0.06] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
        {/* Close */}
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center ${feature.color} border border-white/10`}>{feature.icon}</div>
          <div>
            <h2 className="text-3xl font-black text-white italic tracking-tight uppercase">{feature.title}</h2>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">{feature.tag}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-400 leading-relaxed mb-10">{feature.detail}</p>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {feature.stats.map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                className="text-2xl font-black text-white italic">{s.value}</motion.div>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{s.label}</div>
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
                <span className="font-black text-white">{b.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span className="text-xs text-slate-400 font-medium">{cap}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link to={feature.cta.link} className="px-8 py-3 bg-orange-500 text-black font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-white transition-all flex items-center gap-2">
            {feature.cta.label} <ArrowRight size={14} />
          </Link>
          <Link to="/docs" className="px-8 py-3 border border-white/10 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">
            Read Docs
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Feature Card (clickable) ─── */
function FeatureCard({ feature, onClick, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}
      onClick={onClick}
      className="group relative p-12 rounded-[3rem] border border-white/[0.08] bg-black/40 backdrop-blur-3xl hover:border-orange-500/40 transition-all duration-700 cursor-pointer overflow-hidden shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
      <div className="relative z-10 space-y-8">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 ${feature.color} group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500 transition-all duration-500`}>{feature.icon}</div>
        <h3 className="text-3xl font-black text-white italic tracking-tight uppercase">{feature.title}</h3>
        <p className="text-slate-500 leading-relaxed">{feature.text}</p>
        <div className="flex items-center gap-2 text-orange-500 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          Click to explore <ArrowRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Features Data ─── */
const features = [
  {
    icon: <Cpu size={28} />, title: 'Zone Intel', color: 'text-orange-500 bg-orange-500/10', delay: 0.1,
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
    icon: <Workflow size={28} />, title: 'Fleet Sync', color: 'text-purple-400 bg-purple-500/10', delay: 0.3,
    text: 'Coordinate positioning across your entire fleet. Reduce idle time by up to 40% with predictive repositioning.',
    tag: 'Fleet Management',
    detail: 'Fleet Sync uses demand forecasts to generate optimal positioning suggestions for every vehicle in your fleet. The system considers current driver location, predicted surge zones, and travel time to minimize dead-miles and maximize ride coverage.',
    stats: [{ value: '-40%', label: 'Idle Time' }, { value: '+28%', label: 'Revenue/Hr' }, { value: '< 3s', label: 'Update Speed' }],
    bars: [{ label: 'Repositioning Efficiency', pct: 87 }, { label: 'Surge Capture Rate', pct: 91 }, { label: 'Driver Compliance', pct: 73 }],
    capabilities: ['Optimal positioning suggestions', 'Real-time rebalancing alerts', 'Driver performance metrics', 'Multi-vehicle coordination', 'Shift scheduling optimization', 'Route efficiency analysis'],
    cta: { label: 'Manage Fleet', link: '/login' },
  },
  {
    icon: <Map size={28} />, title: 'Live Maps', color: 'text-emerald-400 bg-emerald-500/10', delay: 0.15,
    text: 'Interactive Leaflet maps with zone-level overlays showing demand intensity, surge pricing, and competitor density.',
    tag: 'Visualization Layer',
    detail: 'Our mapping layer renders all 263 NYC taxi zones as interactive polygons on a Leaflet-powered map. Each zone is color-coded by demand intensity with smooth transitions. Click any zone to see detailed forecasts, historical trends, and nearby driver positions.',
    stats: [{ value: '60fps', label: 'Render Speed' }, { value: '500ms', label: 'Data Lag' }, { value: '4', label: 'Map Layers' }],
    bars: [{ label: 'Render Performance', pct: 95 }, { label: 'Data Freshness', pct: 88 }, { label: 'Mobile Responsiveness', pct: 82 }],
    capabilities: ['Demand intensity heatmaps', 'Zone polygon overlays', 'Click-to-forecast zones', 'Multi-layer toggle (heat/boundary/markers)', 'Smooth zoom transitions', 'Fullscreen mode'],
    cta: { label: 'Open Maps', link: '/login' },
  },
  {
    icon: <TrendingUp size={28} />, title: 'Revenue AI', color: 'text-amber-400 bg-amber-500/10', delay: 0.25,
    text: 'Track hourly earnings projections. Our models identify optimal shift times and high-value pickup corridors.',
    tag: 'Revenue Optimization',
    detail: 'Revenue AI combines demand forecasts with historical fare data to project hourly earnings for each zone. The system identifies the most profitable pickup corridors and recommends optimal shift start/end times based on your driving patterns.',
    stats: [{ value: '+34%', label: 'Avg Increase' }, { value: '$48', label: 'Peak $/Hr' }, { value: '6am', label: 'Best Start' }],
    bars: [{ label: 'Earnings Prediction', pct: 91 }, { label: 'Optimal Shift Detection', pct: 85 }, { label: 'Corridor Identification', pct: 88 }],
    capabilities: ['Hourly earnings projection', 'Optimal shift recommendations', 'High-value corridor alerts', 'Weekly earnings trends', 'Comparative zone analysis', 'Driver earnings leaderboard'],
    cta: { label: 'See Revenue Data', link: '/login' },
  },
  {
    icon: <Shield size={28} />, title: 'Role Access', color: 'text-rose-400 bg-rose-500/10', delay: 0.35,
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

function StatsCarousel() {
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
            <p className="text-[15px] font-bold text-white group-hover:translate-x-[-4px] transition-transform">Edge Node NYC-1</p>
            <div className="h-0.5 w-full bg-white/5 group-hover:bg-orange-500/30 transition-colors" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Inference Speed</p>
            <p className="text-[15px] font-bold text-orange-500 group-hover:translate-x-[-4px] transition-transform">42ms Latency</p>
            <div className="h-0.5 w-full bg-white/5 group-hover:bg-orange-500/30 transition-colors" />
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
              <Counter {...carouselStats[index]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Deco */}
        <div className="hidden lg:flex flex-col gap-10 w-48 font-poppins">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Reliability</p>
            <p className="text-[15px] font-bold text-orange-500 group-hover:translate-x-[4px] transition-transform">99.98% Service</p>
            <div className="h-0.5 w-full bg-white/5 group-hover:bg-orange-500/30 transition-colors" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2 group cursor-default">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-orange-500 transition-colors">Data Source</p>
            <p className="text-[15px] font-bold text-white group-hover:translate-x-[4px] transition-transform">PostgreSQL NYC</p>
            <div className="h-0.5 w-full bg-white/5 group-hover:bg-orange-500/30 transition-colors" />
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [contactStatus, setContactStatus] = useState('idle');
  const [form, setForm] = useState({ sender_name: '', sender_email: '', subject: 'Inquiry', message: '' });

  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']);

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

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handle = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  const navItems = [
    { label: 'Features', action: () => scrollTo('features') },
    { label: 'Vision', action: () => scrollTo('vision') },
    { label: 'Contact', action: () => scrollTo('contact') },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden selection:bg-orange-500/30">
      <AnimatePresence>
        {activeFeature && <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />}
      </AnimatePresence>

      {/* ── Predictive Intelligence Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020202]">
        {/* Layer 1: Static Tech Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:80px_80px]" />
        
        {/* Layer 2: Reactive Dot Matrix */}
        <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Layer 3: Mouse Spotlight Reveal */}
        <div 
          className="absolute inset-0 opacity-100 transition-opacity duration-500 ease-out" 
          style={{ 
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249,115,22,0.18), rgba(249,115,22,0.05) 40%, transparent 80%)`
          }} 
        />

        {/* Layer 4: Floating Data Particles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-orange-500/20 rounded-full"
              initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
              animate={{ 
                x: [null, (Math.random() * 100) + "%"],
                y: [null, (Math.random() * 100) + "%"],
                opacity: [0.1, 0.4, 0.1]
              }}
              transition={{ 
                duration: 20 + Math.random() * 20, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              style={{
                filter: 'blur(1px)',
                left: (Math.random() * 100) + "%",
                top: (Math.random() * 100) + "%"
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <motion.nav style={{ backgroundColor: headerBg }} className="fixed top-0 w-full z-[100] backdrop-blur-3xl border-b border-white/[0.08] px-6 md:px-16 py-4 flex items-center justify-between">
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
            <Activity size={20} className="text-black" />
          </div>
          <span className="text-lg font-black tracking-tight uppercase italic hidden sm:block">DemandSight</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(n => (
            <button key={n.label} onClick={n.action} className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-orange-500 transition-colors">{n.label}</button>
          ))}

          <Link to={user ? '/dashboard' : '/login'}
            className="px-7 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-95 shadow-lg">
            {user ? 'Dashboard' : 'Sign In'}
          </Link>
        </div>
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </motion.nav>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center gap-10">
            {navItems.map(n => <button key={n.label} onClick={n.action} className="text-4xl font-black uppercase italic tracking-tight hover:text-orange-500 transition-colors">{n.label}</button>)}

            <Link to="/login" onClick={() => setMenuOpen(false)} className="text-2xl font-black text-orange-500 underline underline-offset-8 uppercase italic">Sign In</Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">

        {/* ══════════ HERO ══════════ */}
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-20 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
            <motion.div
              style={{
                rotateX: (mousePos.y / 50) - 10,
                rotateY: (mousePos.x / -100) + 10,
              }}
              transition={{ type: "spring", stiffness: 100, damping: 30 }}
            >
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.85] tracking-tight italic uppercase drop-shadow-2xl">
                PREDICT<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">DEMAND.</span>
              </motion.h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed font-poppins">
              SARIMAX-powered geospatial intelligence for NYC mobility. Transform raw trip data into predictive fleet earnings across 263 taxi zones.
            </motion.p>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
              className="flex justify-center">
              <MagneticButton>
                <Link to="/register?role=operator"
                  className="px-12 py-5 bg-orange-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-[0_20px_50px_rgba(249,115,22,0.3)] active:scale-95 flex items-center gap-3">
                  Start Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </MagneticButton>
            </motion.div>

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
        <div className="border-y border-white/[0.08] py-8 overflow-hidden bg-black/60 backdrop-blur-xl">
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
              <h2 className="text-5xl sm:text-7xl font-black italic tracking-normal uppercase">Built for<br /><span className="text-orange-500">Operators.</span></h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">Click any card to see the full breakdown</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <FeatureCard key={i} feature={f} delay={f.delay} onClick={() => setActiveFeature(f)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Benchmarks Section ── */}
        <section className="py-24 sm:py-32 px-6 md:px-16 overflow-hidden relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-3">Live Performance</div>
              <h2 className="text-4xl sm:text-6xl font-black italic uppercase italic tracking-tight text-white line-height-[0.9]">
                SYSTEM <span className="text-orange-500">BENCHMARKS.</span>
              </h2>
            </motion.div>
            <StatsCarousel />
          </div>
        </section>

        {/* ══════════ VISION ══════════ */}
        <section id="vision" className="relative py-24 sm:py-32 overflow-hidden scroll-mt-24">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/10 to-transparent" />
          <div className="relative max-w-4xl mx-auto px-6 text-center space-y-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}>
              <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic tracking-tight leading-[0.85]">
                THE CITY<br />NEVER <span className="text-orange-500">STOPS.</span>
              </h2>
              <div className="w-20 h-1 bg-orange-500 mx-auto my-10 rounded-full" />
              <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                While others react, DemandSight operators anticipate. Our SARIMAX models see the surge 3 hours before it arrives.
              </p>
              <div className="pt-10 flex justify-center gap-5">
                <button onClick={() => navigate('/docs')}
                  className="px-10 py-4 border border-white/10 text-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all rounded-2xl">
                  Read the Docs
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════ CONTACT ══════════ */}
        <section id="contact" className="py-20 sm:py-24 px-6 md:px-16 scroll-mt-24">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
            {/* Left */}
            <div className="space-y-10 lg:sticky lg:top-32">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">Get In Touch</div>
                <h2 className="text-4xl sm:text-6xl font-black italic tracking-tight uppercase leading-[0.85]">
                  LET'S<br /><span className="text-orange-500">CONNECT.</span>
                </h2>
              </motion.div>
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                Whether you're an independent driver or managing a fleet of 500+ vehicles, our team is ready to help you deploy predictive intelligence.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-black"><Mail size={22} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email</div>
                    <div className="text-white font-bold">support@demandsight.ai</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-500"><Terminal size={22} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Repository</div>
                    <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:text-orange-500 transition-colors">SachinYadav2446</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-white/[0.015] border border-white/[0.04] backdrop-blur-xl p-10 sm:p-14 rounded-[3rem]">
              {contactStatus === 'success' ? (
                <div className="text-center py-20 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tight">Message Sent!</h3>
                  <p className="text-slate-500">We'll respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={submitContact} className="space-y-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight mb-2">Send a Message</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Name</label>
                      <input required type="text" value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })}
                        placeholder="Your name" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-700 focus:border-orange-500/40 outline-none transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email</label>
                      <input required type="email" value={form.sender_email} onChange={e => setForm({ ...form, sender_email: e.target.value })}
                        placeholder="you@company.com" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-700 focus:border-orange-500/40 outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Message</label>
                    <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your fleet..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-700 focus:border-orange-500/40 outline-none transition-colors resize-none" />
                  </div>
                  <button disabled={contactStatus === 'sending'}
                    className="w-full py-5 bg-orange-500 text-black font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50">
                    {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                    <Send size={16} />
                  </button>
                  {contactStatus === 'error' && <p className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>}
                </form>
              )}
            </motion.div>
          </div>
        </section>

        <section className="py-24 sm:py-32 px-6 bg-gradient-to-t from-black via-transparent to-transparent">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="text-4xl sm:text-7xl font-black text-white italic tracking-tight uppercase leading-[0.85]">
              READY TO<br /><span className="text-orange-500">SCALE?</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-lg mx-auto">Join operators leveraging the SARIMAX forecasting engine for smarter fleet decisions.</p>
            <div className="flex flex-wrap justify-center gap-5">
              <Link to="/register" className="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-orange-500 transition-all">Start Free</Link>
              <button onClick={() => navigate('/docs')} className="px-10 py-4 border border-white/10 text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Documentation</button>
            </div>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer className="py-12 px-6 md:px-16 bg-black border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Activity size={14} className="text-black" /></div>
              <span className="font-black uppercase tracking-tight italic text-sm">DemandSight</span>
            </div>

            <div className="flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Features</button>
              <Link to="/docs" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Docs</Link>
              <button onClick={() => scrollTo('contact')} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-orange-500 transition-colors">Contact</button>
              <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-white transition-colors">Source</a>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-green-600/60 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Operational
              </div>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">© 2026</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
