import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, Activity, ChevronRight, Zap, Globe, Terminal,
  AlertTriangle, HelpCircle, Code, Copy, Check, ArrowLeft,
  Map, Shield, BarChart3, Search, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Code Block with Copy ─── */
function CodeBlock({ code, lang = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group rounded-2xl bg-[#0a0a0a] border border-white/[0.04] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{lang}</span>
        <button onClick={doCopy} className="p-1.5 rounded-lg hover:bg-orange-500 hover:text-black text-slate-600 transition-all">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre className="p-5 text-[13px] font-mono text-slate-400 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

/* ─── FAQ Accordion ─── */
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.04]">
      <button onClick={() => setOpen(!open)} className="w-full py-5 flex items-center justify-between text-left group">
        <span className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors pr-4">{q}</span>
        <ChevronRight size={16} className={`shrink-0 text-slate-600 transition-transform duration-300 ${open ? 'rotate-90 text-orange-500' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-5 text-sm text-slate-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Navigation Data ─── */
const navGroups = [
  {
    title: 'Operator Guide',
    items: [
      { id: 'overview', label: 'Platform Overview', icon: <Book size={16} /> },
      { id: 'usage', label: 'Dashboard Usage', icon: <Map size={16} /> },
      { id: 'faq', label: 'FAQ & Help', icon: <HelpCircle size={16} /> },
    ]
  }
];

export default function Docs() {
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const content = {
    overview: (
      <div className="space-y-10">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black italic tracking-tight uppercase mb-6">Platform Overview</h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
            DemandSight is a prediction-first mobility platform built for NYC taxi operators. We combine SARIMAX time-series models with real-time geospatial data to forecast ride demand across all 263 official TLC zones.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { icon: <Map size={20} />, title: 'Zone Mapping', desc: 'Full coverage of 263 NYC taxi zones with interactive Leaflet maps', color: 'text-emerald-400 bg-emerald-500/10' },
            { icon: <BarChart3 size={20} />, title: 'Forecasting', desc: 'Hourly & daily demand predictions using SARIMAX statistical models', color: 'text-blue-400 bg-blue-500/10' },
            { icon: <Shield size={20} />, title: 'Role-Based Access', desc: 'Separate operator and driver dashboards with tailored data views', color: 'text-purple-400 bg-purple-500/10' },
            { icon: <Globe size={20} />, title: 'Weather Integration', desc: 'Real-time weather data as exogenous variables in the forecasting model', color: 'text-orange-400 bg-orange-500/10' },
          ].map(item => (
            <div key={item.title} className="p-6 rounded-2xl border border-white/[0.04] bg-white/[0.015] space-y-3 hover:border-orange-500/20 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
              <h4 className="text-sm font-black text-white uppercase tracking-wide">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
          <p className="text-sm text-orange-400 font-bold">💡 This platform is designed for the NYC Yellow Taxi ecosystem. Zone IDs 1-263 correspond directly to the official TLC taxi zone boundaries.</p>
        </div>
      </div>
    ),

    usage: (
      <div className="space-y-10">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black italic tracking-tight uppercase mb-6">Dashboard Usage</h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">Learn how to navigate the operational tools to predict and capture peak demand.</p>
        </div>

        <div className="space-y-8">
          <div className="p-8 rounded-[2rem] border border-white/[0.04] bg-[#0a0a0a]">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0"><Map size={24} /></div>
               <h3 className="text-xl font-black text-white uppercase tracking-tight">The Intelligence Map</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              The core of the dashboard is the real-time Leaflet map. It displays all 263 TLC zones color-coded by current wait-times and predicted demand surges. Look for <span className="text-orange-500 font-bold">Orange/Red</span> zones — these are your most profitable target areas.
            </p>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Click any zone shape to view a specific 24-hour demand projection chart.</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Use the layer controls in the top right to toggle between Heatmaps and Zone Boundaries.</li>
            </ul>
          </div>

          <div className="p-8 rounded-[2rem] border border-white/[0.04] bg-[#0a0a0a]">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Activity size={24} /></div>
               <h3 className="text-xl font-black text-white uppercase tracking-tight">Demand Forecast Tool</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Want to know where to start your shift tomorrow? The Forecast Tool allows you to run SARIMAX predictions up to 72 hours into the future. It automatically factors in the predicted weather and day of the week.
            </p>
          </div>
        </div>
      </div>
    ),



    faq: (
      <div className="space-y-10">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black italic tracking-tight uppercase mb-6">FAQ & Troubleshooting</h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">Common questions and solutions for operators and developers.</p>
        </div>

        <div className="space-y-1">
          <FAQ q="What is the forecast accuracy?" a="Our SARIMAX models achieve 94%+ mean accuracy across high-traffic zones during peak hours. Accuracy varies by zone density — core Manhattan zones typically outperform outer borough predictions." />
          <FAQ q="Are the Zone IDs TLC-compliant?" a="Yes. Zone IDs 1-263 map directly to the official NYC Taxi & Limousine Commission taxi zone boundaries. For example, Zone 132 = JFK Airport, Zone 138 = LaGuardia Airport, Zone 161 = Midtown Center." />
          <FAQ q="How often do models retrain?" a="Models retrain every 60 minutes using the latest available trip data. During retraining (~15 seconds), the system falls back to historical averages so predictions are never interrupted." />
          <FAQ q="Can I use this for ride-share (Uber/Lyft)?" a="The current dataset is Yellow Taxi specific. However, the SARIMAX model architecture can be adapted for any ride-share platform by swapping the data ingestion pipeline." />
          <FAQ q="What happens if the backend goes down?" a="The frontend gracefully handles API failures with retry logic and cached last-known-good data. The auth system uses JWT tokens stored locally, so sessions persist through short outages." />
          <FAQ q="How do I add a new zone or modify boundaries?" a="Zone boundaries are sourced from the official TLC GeoJSON file. To customize, update the zone data in the PostgreSQL database and regenerate the Leaflet overlays." />
        </div>

        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start gap-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-black text-red-400 uppercase tracking-wide mb-2">Common Issue: Backend Won't Start</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              If you see <code className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">ModuleNotFoundError: model_service</code>, make sure you're running uvicorn from the <code className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded text-xs">backend/</code> directory with <code className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded text-xs">PYTHONPATH</code> set to the project root.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/[0.04] bg-white/[0.015] space-y-4">
          <h4 className="text-sm font-black text-white uppercase tracking-wide">Still need help?</h4>
          <p className="text-sm text-slate-500">Open an issue on GitHub or use the contact form on the home page.</p>
          <div className="flex gap-4">
            <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-/issues" target="_blank" rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2">
              <ExternalLink size={12} /> Open Issue
            </a>
            <Link to="/" className="px-6 py-2.5 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
              Contact Form
            </Link>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex selection:bg-orange-500/30">
      {/* ── Atmosphere ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/[0.04] rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/[0.03] rounded-full blur-[200px]" />
      </div>

      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/[0.04] bg-black/50 backdrop-blur-2xl h-screen sticky top-0 z-20">
        <div className="p-8 space-y-10 flex-1 overflow-y-auto">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Activity size={16} className="text-black" />
            </div>
            <span className="text-lg font-black tracking-tight uppercase italic">Docs</span>
          </Link>

          {/* Nav */}
          <nav className="space-y-8">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-4 mb-3">{group.title}</h4>
                <div className="space-y-1">
                  {group.items.map(s => (
                    <button key={s.id} onClick={() => setActive(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wide flex items-center gap-3 transition-all ${active === s.id ? 'bg-orange-500/10 text-orange-500' : 'text-slate-500 hover:text-white hover:bg-white/[0.02]'}`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Separator */}
          <div className="border-t border-white/[0.04]" />

          {/* External Links */}
          <div className="space-y-3">
            <a href="https://github.com/SachinYadav2446/Taxi-Demand-Forecasting-System-" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 text-[11px] font-bold text-slate-600 uppercase tracking-wide hover:text-white transition-colors px-4 py-2">
              <Terminal size={14} /> Source Code
            </a>
            <Link to="/" className="flex items-center gap-3 text-[11px] font-bold text-slate-600 uppercase tracking-wide hover:text-orange-500 transition-colors px-4 py-2">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </div>
        </div>

        <div className="p-8 border-t border-white/[0.04]">
          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">© 2026 DemandSight</p>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 w-full z-30 bg-black/80 backdrop-blur-2xl border-b border-white/[0.04] px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Activity size={14} className="text-black" /></div>
          <span className="text-sm font-black tracking-tight uppercase italic">Docs</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
          {sidebarOpen ? <X size={20} /> : <Search size={20} />}
        </button>
      </div>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -200 }}
            className="fixed inset-0 z-20 bg-black/95 backdrop-blur-3xl p-8 pt-20 lg:hidden">
            <nav className="space-y-6">
              {navGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-4 mb-3">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map(s => (
                      <button key={s.id} onClick={() => { setActive(s.id); setSidebarOpen(false); }}
                        className={`w-full text-left px-4 py-4 rounded-xl text-sm font-bold uppercase tracking-wide flex items-center gap-3 ${active === s.id ? 'bg-orange-500/10 text-orange-500' : 'text-slate-500'}`}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="flex-1 min-h-screen relative z-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 lg:py-24 pt-20 lg:pt-24">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              {content[active]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
