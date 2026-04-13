import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import {
  ArrowLeft, HelpCircle, LifeBuoy, ChevronDown, ChevronUp,
  Mail, Phone, MessageSquare, Send, CheckCircle, X,
  BookOpen, Zap, Activity, AlertTriangle, Cpu, GitBranch, Keyboard
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: 'How do I add or change my operating zones?', a: 'Navigate to Zone Management from the sidebar. Browse all NYC boroughs, toggle zones on/off, and hit Save. Changes apply immediately to forecasts.' },
  { q: 'Why is my demand forecast showing low accuracy?', a: 'Accuracy depends on zone-level historical data. The SARIMAX engine improves after 4+ weeks of zone-specific records. Ensure your model service is running on port 8001.' },
  { q: 'How do I update my fleet size?', a: 'Profile → Configure Account → Fleet Size field → Save Changes. Fleet size drives the Fleet Allocation algorithm for vehicle-to-zone distribution.' },
  { q: 'What is Smart Dispatch and how does it work?', a: 'An AI routing engine that evaluates real-time demand signals across your zones and recommends exactly where each vehicle should reposition for maximum pickup probability.' },
  { q: 'How do I interpret the City Demand Heatmap?', a: 'Block size = relative pickup volume. Larger, brighter = higher historical gravity. Hover any zone for exact statistics over the past 7 days.' },
  { q: 'Why are some zones shown in gray on the map?', a: 'Insufficient recent data to score. May indicate low historical volume or a newly mapped zone. Data will populate over the next collection cycle.' },
];

const MODAL_DATA = {
  guide: {
    title: 'Getting Started Guide', tag: 'DOCS',
    items: [
      { n: '01', h: 'Create your account', b: 'Register as a Fleet Operator. Use your business email — system alerts and support replies land here.' },
      { n: '02', h: 'Set your fleet size', b: 'Profile → Configure Account → enter total vehicle count. This drives the Fleet Allocation engine.' },
      { n: '03', h: 'Assign operating zones', b: 'Zone Management → Browse boroughs → toggle zones → Save Changes.' },
      { n: '04', h: 'Run your first forecast', b: 'Demand Forecast → select zone + date/time → Generate. SARIMAX returns hourly/daily pickup predictions.' },
      { n: '05', h: 'Activate Smart Dispatch', b: 'Operations tab → Smart Dispatch panel → share AI routing suggestions with drivers for peak-hour positioning.' },
      { n: '06', h: 'Monitor Market Analytics', b: 'Top-5 hotspots + lowest-traffic zones over 7 days. Review weekly to refine zone coverage.' },
    ],
  },
  status: {
    title: 'System Status', tag: 'LIVE',
    items: [
      { n: '✓', h: 'API Gateway — Operational', b: 'FastAPI backend responding normally. Avg latency: 42 ms.' },
      { n: '✓', h: 'Model Service — Operational', b: 'SARIMAX engine (port 8001) is online. Last successful forecast: < 5 min ago.' },
      { n: '✓', h: 'Database — Operational', b: 'PostgreSQL connection stable. Read/write within normal bounds.' },
      { n: '✓', h: 'Zone Data Pipeline — Operational', b: 'Centroid data loaded. Water-locked zones excluded correctly.' },
      { n: '✓', h: 'Authentication — Operational', b: 'JWT issuance and validation working. No failed auth events this hour.' },
      { n: '~', h: 'Email Notifications — Degraded', b: 'Support reply emails may be delayed up to 30 min. Under investigation.' },
    ],
  },
  changelog: {
    title: "What's New", tag: 'UPDATES',
    items: [
      { n: 'v3', h: 'April 2026 — Orange Theme & UI Overhaul', b: 'Full visual redesign. Dashboard now has Profile, Overview, Operations, and Market Analytics tabs.' },
      { n: 'v2', h: 'March 2026 — Operator Support Portal', b: 'This page — FAQ, contact form, resource library, live system status.' },
      { n: 'v2', h: 'March 2026 — Smart Dispatch AI', b: 'Proximity-aware AI routing engine launched for real-time driver positioning.' },
      { n: 'v2', h: 'March 2026 — City Demand Heatmap', b: 'Macro heatmap showing relative pickup gravity across all 263 NYC zones.' },
      { n: 'v1', h: 'March 2026 — Fleet Allocation Engine', b: 'Distributes fleet across demand hotspots by vehicle count + zone trends.' },
      { n: 'v1', h: 'March 2026 — Platform Launch', b: 'Core system: Zone Management, SARIMAX forecasting, multi-role auth.' },
    ],
  },
  shortcuts: {
    title: 'Keyboard Shortcuts & Tips', tag: 'TIPS',
    items: [
      { n: '⌨', h: 'Dashboard tab switching', b: 'Click Profile / Overview / Operations / Analytics tabs — each remembers scroll position.' },
      { n: '⌨', h: 'Zone search (Zone Management)', b: 'Click the search box and type a zone name or borough to filter instantly. Press Esc to clear.' },
      { n: '⌨', h: 'Dismiss error overlays', b: 'Press Esc to close Vite dev-server error overlays without reloading.' },
      { n: 'F12', h: 'Open browser DevTools', b: 'F12 or Ctrl+Shift+I (Win) / Cmd+Opt+I (Mac). Use Network tab to debug API calls.' },
      { n: '⌨', h: 'Close modals', b: 'Press the × button or click outside any modal to dismiss it.' },
      { n: '↑', h: 'Scroll to top', b: 'Press the Home key to jump back to the top of any page instantly.' },
    ],
  },
  troubleshoot: {
    title: 'Troubleshooting Guide', tag: 'SUPPORT',
    items: [
      { n: '!', h: 'Blank screen / site not loading', b: 'Clear browser cache and reload. Check that FastAPI and the model service are both running. Verify VITE_API_URL in your .env.' },
      { n: '!', h: 'Login: Invalid credentials', b: 'Passwords are case-sensitive. If forgotten, update via Settings after a password reset.' },
      { n: '!', h: 'Forecast returns no data', b: 'Model service must be on port 8001. Zone needs 30+ historical records to generate predictions.' },
      { n: '!', h: 'Zone Management not saving', b: 'Only Fleet Operators can save. Confirm your role in Profile. Check /zones/company endpoint in DevTools Network tab.' },
      { n: '!', h: 'Smart Dispatch — no recommendations', b: 'Assign at least 1 zone in Zone Management, save, then revisit Operations.' },
      { n: '!', h: 'Map shows zones in water', b: 'Known issue with certain NYC centroids. Backend excludes Jamaica Bay and Harbor Islands. Report new cases via Send a Message.' },
    ],
  },
};

const CARDS = [
  {
    key: 'guide',
    icon: <BookOpen size={22} />,
    label: 'Getting Started',
    sub: 'Full platform setup walkthrough from account creation to your first forecast.',
    tag: 'DOCS',
    badge: '6 Steps',
  },
  {
    key: 'status',
    icon: <Cpu size={22} />,
    label: 'System Status',
    sub: 'Live health of API gateway, model service, database, and auth.',
    tag: 'LIVE',
    badge: '5 Online · 1 Degraded',
  },
  {
    key: 'changelog',
    icon: <GitBranch size={22} />,
    label: "What's New",
    sub: 'Recent feature launches, UI updates, and platform milestones.',
    tag: 'UPDATES',
    badge: 'v3 · April 2026',
  },
  {
    key: 'shortcuts',
    icon: <Keyboard size={22} />,
    label: 'Shortcuts & Tips',
    sub: 'Power user moves for faster navigation, debugging, and zone search.',
    tag: 'TIPS',
    badge: '6 Tips',
  },
  {
    key: 'troubleshoot',
    icon: <AlertTriangle size={22} />,
    label: 'Troubleshooting',
    sub: 'Fix login failures, blank screens, forecast errors, Zone Management issues, and more.',
    tag: 'SUPPORT',
    badge: '6 Solutions',
  },
];

/* ─── Sub-components ─────────────────────────────────────────── */
function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-[#1a1a1a] last:border-0 transition-all`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between py-5 gap-4 text-left group">
        <span className={`font-bold text-sm leading-relaxed transition-colors ${open ? 'text-orange-400' : 'text-white group-hover:text-orange-300'}`}>{item.q}</span>
        <div className={`flex-shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180 text-orange-500' : 'text-slate-500'}`}>
          <ChevronDown size={16} />
        </div>
      </button>
      {open && (
        <div className="pb-5 -mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

function ResourceModal({ data, onClose }) {
  const isStatus = data.key === 'status';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0d0d0d] border border-[#252525] rounded-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-6 duration-300">

        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-[#1a1a1a] px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">{data.tag}</span>
            <h2 className="text-lg font-black text-white">{data.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-[#1f1f1f] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-3">
          {data.items.map((item, i) => (
            <div key={i} className={`flex gap-4 p-4 rounded-2xl border transition-all ${
              isStatus && item.n === '~'
                ? 'bg-yellow-500/5 border-yellow-500/20'
                : isStatus
                ? 'bg-green-500/5 border-green-500/10'
                : 'bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]'
            }`}>
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${
                isStatus && item.n === '~'
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : isStatus
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
              }`}>
                {item.n}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm mb-1">{item.h}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{item.b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function OperatorSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.post('/contact/send', {
        sender_name: user?.name || 'Unknown User',
        sender_email: user?.email || 'no-reply@demandsight.io',
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSubmitted(true);
      setForm({ subject: '', message: '' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to send message. Please try again.';
      setError(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Standardized Back Button - Aligned Right */}
      <div className="flex justify-end">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-slate-400 hover:text-white transition-all text-xs font-bold cursor-pointer group w-fit"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      {/* ── Modal Overlay ── */}
      {activeModal && <ResourceModal data={activeModal} onClose={() => setActiveModal(null)} />}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-[32px] border border-[#222] bg-[#0a0a0a] shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-10">
          <div className="flex-1">
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.35em] mb-4">DemandSight · Operator Hub</p>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight mb-5">
              Support<br />
              <span className="text-orange-500">Center</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-md">
              Everything you need to operate at full capacity — guides, live system status, shortcuts, and direct support.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-4 md:gap-3 flex-shrink-0">
            {[
              { v: '< 2h', l: 'Avg Response' },
              { v: '99.2%', l: 'Resolution Rate' },
              { v: '99.9%', l: 'System Uptime' },
            ].map(s => (
              <div key={s.l} className="text-center md:text-right">
                <p className="text-2xl font-black text-orange-500 leading-none">{s.v}</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bento Resource Grid ── */}
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Quick Resources</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(card => (
            <button
              key={card.key}
              onClick={() => setActiveModal({ key: card.key, ...MODAL_DATA[card.key] })}
              className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden group hover:border-orange-500/30 hover:bg-[#0d0d0d] transition-all duration-300 text-left flex flex-col gap-4"
            >
              {/* Subtle corner glow */}
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-orange-500/10 transition-colors duration-500" />

              {/* Top: icon + tag */}
              <div className="flex items-start justify-between relative z-10">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/15 text-orange-500 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-300">
                  {card.icon}
                </div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                  {card.tag}
                </span>
              </div>

              {/* Middle: label + description */}
              <div className="relative z-10 flex-1">
                <p className="text-white font-black text-base leading-tight mb-2">{card.label}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{card.sub}</p>
              </div>

              {/* Bottom: badge + open arrow */}
              <div className="relative z-10 flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
                <span className="text-[11px] font-bold text-slate-600">{card.badge}</span>
                <div className="flex items-center gap-1 text-orange-500/50 text-xs font-bold group-hover:text-orange-400 group-hover:gap-1.5 transition-all duration-200">
                  <span>Open</span>
                  <ArrowLeft size={11} className="rotate-180" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Lower Grid: FAQ + Contact ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">

        {/* FAQ */}
        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/15">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Frequently Asked</h2>
              <p className="text-slate-500 text-xs">Common operator questions</p>
            </div>
          </div>
          <div>
            {FAQ_ITEMS.map((item, i) => <FAQItem key={i} item={item} />)}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-5">
          {/* Form */}
          <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/15">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Send a Message</h2>
                  <p className="text-slate-500 text-xs truncate">Reply to {user?.email}</p>
                </div>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <CheckCircle size={26} className="text-orange-500" />
                  </div>
                  <p className="text-white font-black">Message Sent!</p>
                  <p className="text-slate-400 text-sm text-center">We'll reply within 2 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-1 text-xs text-orange-400 font-bold hover:text-orange-300 transition-colors">
                    Send another →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-in fade-in duration-200">
                      <AlertTriangle size={14} className="flex-shrink-0" />
                      <span>{error}</span>
                      <button type="button" onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-300"><X size={14} /></button>
                    </div>
                  )}
                  <input
                    type="text" value={form.subject} required
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject"
                    className="w-full bg-[#111] border border-[#222] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 placeholder-slate-600 transition-all"
                  />
                  <textarea
                    value={form.message} required rows={5}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    className="w-full bg-[#111] border border-[#222] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 placeholder-slate-600 resize-none transition-all"
                  />
                  <button
                    type="submit" disabled={sending}
                    className="w-full py-3 rounded-xl bg-orange-500 text-black font-black text-sm hover:bg-orange-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(249,115,22,0.2)] disabled:opacity-60"
                  >
                    {sending
                      ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      : <><Send size={14} /> Submit Request</>
                    }
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Direct Contact */}
          <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Direct Lines</p>
            <div className="space-y-3">
              <a href="mailto:demandsightsupport@gmail.com" className="flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-[#1f1f1f] hover:border-orange-500/20 hover:bg-[#151515] transition-all group">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform">
                  <Mail size={15} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Email Support</p>
                  <p className="text-slate-500 text-xs">demandsightsupport@gmail.com</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-[#1f1f1f]">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Phone size={15} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Phone Support</p>
                  <p className="text-slate-500 text-xs">+1 (800) 555-DEMAND · Mon–Fri 9–6 EST</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
