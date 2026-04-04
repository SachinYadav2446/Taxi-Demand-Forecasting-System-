import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Building2, Mail, MapPin, ShieldCheck, UserRound, Users } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
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
      } catch (err) {
        console.error('Failed to load dashboard zones', err);
      }
    };

    if (user) {
      fetchZones();
    }
  }, [user]);

  const zonePreview = useMemo(() => zones.slice(0, 4), [zones]);

  const profileStats = [
    {
      label: 'Account Type',
      value: user?.role === 'operator' ? 'Fleet Operator' : 'Driver',
      icon: user?.role === 'operator' ? <Building2 size={18} className="text-orange-500" /> : <UserRound size={18} className="text-orange-500" />,
    },
    {
      label: 'Email',
      value: user?.email || 'No email found',
      icon: <Mail size={18} className="text-orange-500" />,
    },
    {
      label: user?.role === 'operator' ? 'Fleet Size' : 'Available Zones',
      value: user?.role === 'operator' ? `${user?.fleet_size ?? 0} vehicles` : `${zones.length} zones`,
      icon: user?.role === 'operator' ? <Users size={18} className="text-orange-500" /> : <MapPin size={18} className="text-orange-500" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-[#222] bg-[linear-gradient(135deg,#111_0%,#0c0c0c_58%,#1c1108_100%)] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-[360px] h-[360px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-slate-400 mt-3 max-w-2xl leading-relaxed">
              This is your signed-in home. Review your account details, current zone coverage, and get ready to jump into demand forecasting or zone management.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {profileStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#262626] bg-[#0d0d0d]/90 p-5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="text-white font-bold text-lg mt-2 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#262626] bg-[#0b0b0b]/90 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Account Summary</p>
                <h2 className="text-xl font-extrabold text-white mt-2">Signed-in overview</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <ShieldCheck size={20} className="text-orange-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Primary User</p>
                <p className="text-white text-lg font-bold mt-2">{user?.name}</p>
                <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
              </div>

              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Zone Coverage</p>
                <p className="text-white text-3xl font-black mt-2">{zones.length}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {user?.role === 'operator' ? 'Zones mapped to your fleet operations.' : 'Zones available for your demand exploration.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Quick Next Step</p>
                <p className="text-white text-lg font-bold mt-2">
                  {user?.role === 'operator' ? 'Manage zones or open forecasts' : 'Open demand forecast'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Use the sidebar to move between your operational tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Zone Snapshot</p>
          <h2 className="text-2xl font-extrabold text-white">Your current zone visibility</h2>
          <p className="text-slate-400 mt-3 leading-relaxed">
            {user?.role === 'operator'
              ? 'These are the zones currently tied to your fleet account. Update them anytime from Zone Management.'
              : 'These are sample zones you can inspect in the demand forecast workspace.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {zonePreview.length > 0 ? zonePreview.map((zone) => (
              <div key={zone.location_id} className="rounded-2xl border border-[#252525] bg-[#111] p-4">
                <p className="text-white font-bold">{zone.zone_name}</p>
                <p className="text-slate-400 text-sm mt-1">{zone.borough}</p>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-3">
                  Zone {zone.location_id}
                </p>
              </div>
            )) : (
              <div className="sm:col-span-2 rounded-2xl border border-[#252525] bg-[#111] p-6 text-center">
                <p className="text-white font-bold">No zones available yet</p>
                <p className="text-slate-400 text-sm mt-2">
                  {user?.role === 'operator'
                    ? 'Map your zones from Zone Management to start building your dashboard context.'
                    : 'Zone data will appear here once available.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] p-6">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Workspace Guide</p>
          <h2 className="text-2xl font-extrabold text-white">How your app is now organized</h2>
          <div className="space-y-4 mt-6">
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Dashboard</p>
              <p className="text-slate-400 text-sm mt-2">Your signed-in home with account details, zone coverage, and quick context.</p>
            </div>
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Zone Management</p>
              <p className="text-slate-400 text-sm mt-2">Operator-only workspace for selecting and saving operating zones.</p>
            </div>
            <div className="rounded-2xl border border-[#252525] bg-[#111] p-4">
              <p className="text-white font-bold">Demand Forecast</p>
              <p className="text-slate-400 text-sm mt-2">Dedicated forecasting area with zone selection, peak windows, and the chart view.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
