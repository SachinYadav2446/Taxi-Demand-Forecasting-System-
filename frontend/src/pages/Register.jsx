import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { User, Lock, Mail, ArrowRight, Activity, Users, Car } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'driver' ? 'driver' : 'operator';

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fleetSize, setFleetSize] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = role === 'operator' ? '/auth/register/operator' : '/auth/register/driver';
      const payload = {
        name,
        email,
        password,
      };
      if (role === 'operator') {
        payload.fleet_size = parseInt(fleetSize);
      }

      const res = await api.post(endpoint, payload);
      await login(res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row min-h-screen bg-[#0a0a0a] font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Form Side */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 py-12 sm:px-16 xl:px-32 relative z-10 border-r border-[#222]">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity">
            <Activity size={24} className="text-orange-500" />
            <span className="text-2xl font-bold text-white tracking-tight">DemandSight</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-2">Create an account</h2>
            <p className="text-slate-400 font-medium">Join us to start predicting zone demands.</p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1 bg-[#151515] rounded-xl mb-8 border border-[#222]">
            <button
              type="button"
              onClick={() => setRole('operator')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                role === 'operator' 
                  ? 'bg-[#222] text-orange-500 shadow-sm border border-[#333]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users size={16} /> Fleet Operator
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                role === 'driver' 
                  ? 'bg-[#222] text-orange-500 shadow-sm border border-[#333]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Car size={16} /> Driver
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-500/50 text-red-500 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#333] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#111] focus:bg-[#1a1a1a] transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#333] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#111] focus:bg-[#1a1a1a] transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#333] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#111] focus:bg-[#1a1a1a] transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            {role === 'operator' && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Fleet Size</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Car size={18} />
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={fleetSize}
                    onChange={(e) => setFleetSize(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-[#333] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#111] focus:bg-[#1a1a1a] transition-all"
                    placeholder="Number of vehicles"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl text-sm font-bold text-slate-900 bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-orange-500 transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-500 hover:text-orange-400 hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-[#050505]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548123378-bde4eca81d2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-10 mix-blend-screen saturate-0" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] via-transparent to-orange-900/20" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 px-16 max-w-lg">
          <blockquote className="text-3xl font-bold text-white leading-tight">
            "DemandSight has completely revolutionized how we dispatch our drivers. Idle time is down <span className="text-orange-500">40%</span>."
          </blockquote>
          <p className="mt-4 text-orange-400 font-medium tracking-wide">MICHAEL CHEN <span className="text-slate-500 ml-2 font-normal">NYC Fleet Manager</span></p>
        </div>
      </div>
    </div>
  );
}
