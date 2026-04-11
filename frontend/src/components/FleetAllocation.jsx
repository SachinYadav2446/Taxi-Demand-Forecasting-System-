import React, { useMemo } from 'react';
import { Route, Navigation } from 'lucide-react';

export default function FleetAllocation({ fleetSize, hotspots }) {
  // Execute dynamic vehicle distribution algorithm matching volume gravity
  const allocationLayout = useMemo(() => {
    if (!fleetSize || !hotspots || hotspots.length === 0) return [];
    
    const totalVolume = hotspots.reduce((acc, curr) => acc + curr.pickups, 0);
    
    let allocated = 0;
    const distribution = hotspots.map((zone, index) => {
      // For all except the last zone, calculate proportionally
      if (index < hotspots.length - 1) {
        const share = Math.floor(fleetSize * (zone.pickups / totalVolume));
        allocated += share;
        return { ...zone, vehiclesToDispatch: share };
      }
      // The absolute remainder gets dumped to the final zone precisely ensuring exactly N cars deployed
      return { ...zone, vehiclesToDispatch: fleetSize - allocated };
    });

    // Strip out 0-car dispatch assignments if fleet is too small
    return distribution.filter(d => d.vehiclesToDispatch > 0);
  }, [fleetSize, hotspots]);

  if (!fleetSize || allocationLayout.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#333] bg-[#0f0f0f] p-8 text-center mt-6">
         <p className="text-slate-400 font-medium">Add vehicles to your fleet to see AI deployment targets.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-900/10 to-[#0a0a0a] p-6 mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
           <Navigation size={20} />
        </div>
        <div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">Operational AI</p>
          <h3 className="text-white font-extrabold text-xl">Fleet Deployment Targets</h3>
        </div>
      </div>
      
      <p className="text-slate-400 text-sm mb-6 max-w-xl">
        Algorithmically distributing your full capacity of <span className="font-bold text-white">{fleetSize} vehicles</span> across the city's highest velocity demand zones to ensure maximum revenue capture.
      </p>

      <div className="space-y-3 relative z-10">
        {allocationLayout.map((alloc, i) => (
          <div key={alloc.location_id} className="group relative flex items-center justify-between rounded-2xl bg-[#0f0f0f] border border-[#222] p-4 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center items-center">
                 <span className="text-emerald-400 font-black text-sm">{i + 1}</span>
               </div>
               <div>
                  <p className="text-white font-bold">{alloc.zone_name}</p>
                  <p className="text-slate-500 text-xs font-medium tracking-wide uppercase">{alloc.borough}</p>
               </div>
            </div>
            
            <div className="flex flex-col items-end">
               <p className="text-3xl font-extrabold text-white">{alloc.vehiclesToDispatch}</p>
               <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Vehicles</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
