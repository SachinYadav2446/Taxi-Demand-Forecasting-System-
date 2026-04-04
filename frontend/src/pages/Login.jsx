import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/axios';
import { Lock, Mail, ArrowRight, Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      await login(res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Left Panel - Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#050505] border-r border-[#222]">
        {/* Decorator glow */}
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-900/20 via-transparent to-[#0a0a0a]" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white h-full">
          <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            <Activity size={32} className="text-orange-500" />
            <h1 className="text-3xl font-bold tracking-tight">DemandSight</h1>
          </Link>
          <h2 className="text-5xl font-extrabold mb-6 leading-[1.1] tracking-tight">
            Predict the Future of <span className="text-orange-500">Urban Mobility</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
             Harness AI-driven demand forecasting to position your fleet exactly where they'll be needed. Optimize revenue and reduce idle time.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 xl:px-32 bg-[#0a0a0a] relative z-10">
        <div className="w-full max-w-md mx-auto">
           {/* Mobile Header */}
           <div className="flex lg:hidden items-center gap-3 mb-10">
            <Activity size={24} className="text-orange-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">DemandSight</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-2">Welcome back</h2>
             <p className="text-slate-400 font-medium">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-500/50 text-red-500 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5" htmlFor="email">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
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
                <label className="block text-sm font-semibold text-slate-300 mb-1.5" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-[#333] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#111] focus:bg-[#1a1a1a] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl text-sm font-bold text-slate-900 bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-orange-500 transition-all duration-200 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? 'Authenticating...' : 'Sign in'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:text-orange-400 hover:underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
