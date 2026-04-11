import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  Clock3,
  Database,
  Map,
  ShieldCheck,
  Shuffle,
  TrendingUp,
  UserRound,
} from 'lucide-react';

const featureCards = [
  {
    icon: <Map size={24} className="text-orange-500" />,
    title: 'Zone Intelligence',
    text: 'See pickup demand at zone level so drivers and operators can move toward high-activity neighborhoods before the rush begins.',
  },
  {
    icon: <TrendingUp size={24} className="text-orange-500" />,
    title: 'Demand Analytics',
    text: 'Compare historical trip activity with upcoming predicted demand to understand trends, spikes, and stable operating windows.',
  },
  {
    icon: <Shuffle size={24} className="text-orange-500" />,
    title: 'Strategic Fleet Planning',
    text: 'Help dispatch teams reduce idle time and rebalance vehicles across the city with forecast-guided positioning.',
  },
];

const projectCards = [
  {
    icon: <Clock3 size={22} className="text-orange-500" />,
    title: 'Granular Hourly Forecasts',
    text: 'Switch between short-term hourly demand bursts and broader daily trends to make precise positioning decisions.',
  },
  {
    icon: <ShieldCheck size={22} className="text-orange-500" />,
    title: 'Tailored Workflows',
    text: 'Dedicated toolsets exclusively designed for both enterprise fleet operators and independent owner-operators.',
  },
  {
    icon: <Database size={22} className="text-orange-500" />,
    title: 'Real-Time Data Processing',
    text: 'Our backend handles massive volumes of geospatial data seamlessly, delivering instant predictive insights to your dashboard.',
  },
  {
    icon: <BrainCircuit size={22} className="text-orange-500" />,
    title: 'Proprietary ML Models',
    text: 'Powered by advanced time-series algorithms analyzing millions of NYC transit data points to predict the future.',
  },
];

const workflowSteps = [
  {
    icon: <Database size={20} className="text-orange-500" />,
    title: 'Live Pattern Recognition',
    text: 'We analyze immense volumes of historical NYC transit records matched against real-time weather and events.',
  },
  {
    icon: <BarChart3 size={20} className="text-orange-500" />,
    title: 'Hyper-Local Aggregation',
    text: 'Mobility intelligence is broken down block-by-block across all official city zones.',
  },
  {
    icon: <BrainCircuit size={20} className="text-orange-500" />,
    title: 'Predictive Routing',
    text: 'Our AI generates precise, actionable demand signals hours before the surges actually happen.',
  },
  {
    icon: <Activity size={20} className="text-orange-500" />,
    title: 'Command Center Delivery',
    text: 'You receive instant alerts and visual heatmaps indicating exactly where your vehicles need to be.',
  },
];

const stackItems = [
  { name: 'Security', value: 'Enterprise-grade JWT authentication and role-basing' },
  { name: 'Reliability', value: 'Microsecond API response times scaling to thousands of concurrent drivers' },
  { name: 'Infrastructure', value: 'Distributed cloud architecture handling dynamic load' },
  { name: 'Intelligence', value: 'State-of-the-art SARIMAX forecasting pipelines tracking seasonality' },
];

const roleCards = [
  {
    icon: <Building2 size={22} className="text-orange-500" />,
    title: 'Fleet Operators',
    text: 'Assign operating zones, monitor peak demand windows, and decide where vehicles should be reallocated next.',
  },
  {
    icon: <UserRound size={22} className="text-orange-500" />,
    title: 'Independent Drivers',
    text: 'Check where demand is trending upward and choose better locations for the next pickup cycle.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 flex items-center justify-between px-6 py-6 md:px-12 lg:px-24">
        <div className="flex items-center gap-2">
          <Activity size={28} className="text-orange-500" />
          <span className="text-xl font-bold tracking-tight text-white">DemandSight</span>
        </div>
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-sm font-bold text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.12)] transition-all hover:border-white/70 hover:bg-white hover:text-slate-950 hover:shadow-[0_0_28px_rgba(255,255,255,0.22)]"
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            {user ? 'Go to Dashboard' : 'Sign in'}
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          {/* Background Glow */}
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />

          {/* Left Column Text */}
          <div className="flex-1 space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest">
              <Activity size={12} />
              AI-Powered Intelligence
            </div>
            
            {user ? (
              <>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                  Welcome back to the <span className="text-orange-500">Command Center</span>
                </h1>
                
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                  Your fleet and forecasting tools are ready for deployment. Jump into the dashboard to check your profile, monitor live demand, or organize active deployment zones.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto text-center px-8 py-4 bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all uppercase text-sm tracking-wider"
                  >
                    Open Dashboard
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                  Predict Taxi Demand <span className="text-orange-500">Before It Happens</span>
                </h1>
                
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                  Leverage AI-driven zone-level forecasting to position your fleet exactly where the passengers are. DemandSight transforms immense streams of transit data into actionable, predictive revenue maps for modern fleets.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link
                    to="/register?role=operator"
                    className="w-full sm:w-auto text-center px-8 py-4 bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all uppercase text-sm tracking-wider"
                  >
                    Register as Fleet Operator
                  </Link>
                  <Link
                    to="/register?role=driver"
                    className="w-full sm:w-auto text-center px-8 py-4 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white font-bold rounded-lg transition-all uppercase text-sm tracking-wider"
                  >
                    Register as Solo Driver
                  </Link>
                </div>
              </>
            )}
            
            <div className="pt-8 flex items-center gap-4 text-sm font-medium text-slate-500">
              <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a0a0a]" />
                 <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0a0a0a]" />
                 <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-[#0a0a0a]" />
              </div>
              <span><strong className="text-white">500+</strong> companies already optimizing</span>
            </div>
          </div>

          {/* Right Column Visual Mockup */}
          <div className="flex-1 relative z-10 w-full max-w-2xl lg:max-w-none perspective-1000">
            <div className="relative rounded-2xl bg-[#111] border border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out">
              {/* Fake UI Header */}
              <div className="h-10 bg-[#151515] border-b border-[#222] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              {/* Fake UI Body content simulating the dashboard from the mockup */}
              <div className="p-6 relative">
                 {/* Live Demand Badge */}
                 <div className="absolute top-8 right-8 bg-[#0a0a0a] border border-[#222] p-4 rounded-xl shadow-2xl z-20">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Live Demand</p>
                    <p className="text-3xl font-black text-white">+324%</p>
                    <p className="text-xs text-slate-400 mt-1 uppercase">Manhattan South</p>
                 </div>
                 
                 {/* Map Placeholder */}
                 <div className="w-full h-80 bg-[#1a1a1a] rounded-xl overflow-hidden relative border border-[#222]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/40 via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZmzXPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                    
                    {/* Heatmap Blobs simulating traffic density */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/50 rounded-full blur-[40px]" />
                    <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-red-500/40 rounded-full blur-[30px]" />
                 </div>
                 
                 {/* Data rows placeholder */}
                 <div className="mt-6 space-y-3">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-10 bg-[#151515] border border-[#222] rounded-lg w-full flex items-center px-4 justify-between">
                       <div className="w-1/4 h-2 bg-[#222] rounded-full" />
                       <div className="w-1/4 h-2 bg-[#222] rounded-full" />
                       <div className="w-1/4 h-2 bg-[#222] rounded-full" />
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-[#0a0a0a] py-24 px-6 md:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-3">Core Platform Features</h3>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Maximize Your Efficiency with AI</h2>
              <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Our platform provides the granular data and predictive insights you need to stay ahead of market shifts and drastically reduce idle time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featureCards.map((feature) => (
                <div key={feature.title} className="bg-[#111] border border-[#222] p-8 rounded-2xl hover:bg-[#151515] transition-colors group">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#080808] border-y border-[#181818]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <div>
              <h3 className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-3">How The System Works</h3>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">From historical transit patterns to real-time predictive routing</h2>
              <p className="text-slate-400 max-w-2xl leading-relaxed mb-8">
                DemandSight rapidly aggregates and processes massive urban mobility datasets. From real-time pipeline ingestion to final AI-driven inference, our platform guarantees accuracy.
              </p>

              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 p-5 rounded-2xl bg-[#111] border border-[#222] hover:bg-[#141414] transition-colors">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Step {index + 1}</span>
                        <span className="h-px w-8 bg-[#2a2a2a]" />
                      </div>
                      <h4 className="text-white font-bold text-lg">{step.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed mt-1">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#111] border border-[#222] rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Platform Capabilities</p>
                    <h3 className="text-white text-xl font-extrabold">Built for serious fleet orchestration</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {stackItems.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-6 pb-4 border-b border-[#1f1f1f] last:border-b-0 last:pb-0">
                      <span className="text-sm font-bold text-slate-200 min-w-[96px]">{item.name}</span>
                      <span className="text-sm text-slate-400 text-right leading-relaxed">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                  <Clock3 size={18} className="text-orange-500 mb-4" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Forecast Horizon</p>
                  <p className="text-2xl font-black text-white">Hourly</p>
                  <p className="text-sm text-slate-400 mt-2">Short-term demand windows for active positioning.</p>
                </div>
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                  <TrendingUp size={18} className="text-orange-500 mb-4" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Forecast Horizon</p>
                  <p className="text-2xl font-black text-white">Daily</p>
                  <p className="text-sm text-slate-400 mt-2">Longer planning windows for route and fleet decisions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-12">
              <h3 className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-3">Who It Helps</h3>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">Designed for both fleet operations and solo drivers</h2>
              <p className="text-slate-400 leading-relaxed">
                DemandSight offers specialized toolsets that adapt to your operational scope—giving independent drivers tactical advice, while providing fleet managers with macro-level control.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roleCards.map((role) => (
                <div key={role.title} className="relative overflow-hidden bg-[#111] border border-[#222] rounded-3xl p-8">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
                      {role.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{role.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{role.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 lg:px-24 pb-24">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="max-w-2xl">
              <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mb-3">Platform Features</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
                Built for orchestration, command, and ultimate urban mobility
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Beyond stunning dashboard visuals, DemandSight delivers robust operational tools to orchestrate your entire mobility supply chain from the top down.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {projectCards.map((card) => (
                <div key={card.title} className="relative overflow-hidden rounded-3xl border border-[#252525] bg-[linear-gradient(180deg,#111_0%,#0b0b0b_100%)] p-7 hover:border-orange-500/30 hover:bg-[#121212] transition-all">
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
                      {card.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">{card.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
