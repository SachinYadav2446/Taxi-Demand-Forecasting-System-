import React, { useMemo } from 'react';
import { Route, Navigation } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function FleetAllocation({ fleetSize, hotspots }) {
  const { mode } = useTheme();
  const isDark = mode !== 'light';
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
      <div className={`rounded-2xl border border-dashed p-8 text-center mt-6 ${isDark ? 'border-[#333] bg-[#0f0f0f]' : 'border-slate-300 bg-slate-50'}`}>
        <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Add vehicles to your fleet to see AI deployment targets.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-orange-500/20 p-6 mt-6 relative overflow-hidden ${isDark ? 'bg-gradient-to-b from-orange-900/10 to-[#0a0a0a]' : 'bg-gradient-to-b from-orange-50 to-white'}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none" />
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400">
          <Navigation size={20} />
        </div>
        <div>
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">Operational AI</p>
          <h3 className={`font-extrabold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Fleet Deployment Targets</h3>
        </div>
      </div>

      <p className={`text-sm mb-6 max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        Algorithmically distributing your full capacity of <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{fleetSize} vehicles</span> across the city's highest velocity demand zones to ensure maximum revenue capture.
      </p>

      <div className="space-y-3 relative z-10">
        {allocationLayout.map((alloc, i) => (
          <div key={alloc.location_id} className={`group relative flex items-center justify-between rounded-2xl border p-4 transition-colors hover:border-orange-500/40 ${isDark ? 'bg-[#0f0f0f] border-[#222]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex flex-col justify-center items-center">
                <span className="text-orange-400 font-black text-sm">{i + 1}</span>
              </div>
              <div>
                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{alloc.zone_name}</p>
                <p className="text-slate-500 text-xs font-medium tracking-wide uppercase">{alloc.borough}</p>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <p className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{alloc.vehiclesToDispatch}</p>
              <p className="text-orange-500 text-xs font-bold uppercase tracking-widest">Vehicles</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
