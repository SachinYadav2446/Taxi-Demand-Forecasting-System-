import { motion } from 'framer-motion';
import { Target, Users, Map, Activity, Globe, Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      <div className="relative z-10 p-8 flex justify-between items-center max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
             <Activity size={18} className="text-black" />
           </div>
           <span className="text-sm font-bold tracking-widest uppercase italic">DemandSight</span>
        </Link>
      </div>

      <main className="relative z-10 px-6 py-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-16"
        >
          <div className="text-center space-y-6">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tight uppercase leading-none">
              OUR <span className="text-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">VISION.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed font-medium">
              We started with a simple question: why do taxi drivers spend 40% of their day empty when thousands of passengers are waiting?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Target size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight">The Mission</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                To eliminate idle time in urban mobility through hyper-local predictive analytics. We want every vehicle to be exactly where the next passenger will be, minutes before they even think about booking.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Users size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight">The Community</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                Whether you're a multi-national fleet operator or a solo gig driver, DemandSight provides the same high-fidelity SARIMAX intelligence used by enterprise logistics giants.
              </p>
            </div>
          </div>

          <div className="p-12 rounded-[3rem] bg-orange-500/5 border border-orange-500/20 text-center">
             <Globe className="text-orange-500 mx-auto mb-8" size={48} />
             <h3 className="text-3xl font-black uppercase italic tracking-tight mb-4">Scaling Across the Globe</h3>
             <p className="text-slate-400 mb-8 max-w-xl mx-auto">Starting with NYC Yellow Taxi data, we are expanding our predictive footprint to every major metropolitan hub.</p>
             <Link to="/register" className="inline-flex items-center gap-2 text-orange-500 font-black uppercase text-xs tracking-widest hover:text-orange-400 transition-colors">
                JOIN THE MOVEMENT <Activity size={16} />
             </Link>
          </div>
        </motion.div>
      </main>

      <footer className="mt-32 p-12 text-center">
         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">© 2026 DemandSight. The Future of Revenue Intelligence.</p>
      </footer>
    </div>
  );
}
