/**
 * OnboardingTour — lightweight step-by-step walkthrough for first-time users.
 * Uses a localStorage flag to show only once per user.
 * Highlights DOM elements via a semi-transparent overlay + spotlight cutout.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, MapPin, Activity, Layers, Zap, Navigation, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TOUR_KEY = 'ds_onboarding_v2_done';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to DemandSight',
    description: 'Your AI-powered taxi demand intelligence platform. Let\'s take a 60-second tour to show you what\'s possible.',
    icon: <Sparkles size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
  },
  {
    id: 'map',
    title: 'Live Operations Map',
    description: 'The dashboard shows real-time NYC taxi demand across all 263 zones. Switch between the Leaflet zone view and the borough-level treemap.',
    icon: <MapPin size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
    navHint: 'Dashboard → Analytics tab',
  },
  {
    id: 'forecast',
    title: 'Demand Forecast',
    description: 'Select any zone, pick a date and time window, and get hourly or daily predictions. Compare a second zone side-by-side to spot opportunities.',
    icon: <Activity size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
    navHint: 'Demand Forecast page',
  },
  {
    id: 'enhanced',
    title: 'Enhanced Forecast',
    description: 'The full multi-model ensemble (Holt-Winters, Prophet, LightGBM, SARIMAX-Pro) layered with live weather, events, and airport traffic signals.',
    icon: <Zap size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
    navHint: 'Enhanced Forecast page',
  },
  {
    id: 'modellab',
    title: 'Model Lab',
    description: 'Compare all 5 models head-to-head on a validation fold for any zone. See MAE, RMSE, WMAPE, ensemble weights, and LightGBM feature importance.',
    icon: <Layers size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
    navHint: 'Model Lab page',
  },
  {
    id: 'dispatch',
    title: 'Smart Dispatch',
    description: 'Pick your current zone and get the top-3 nearby hotspots ranked by next-hour AI forecast. Operators also get proportional fleet allocation targets.',
    icon: <Navigation size={28} className="text-orange-400" />,
    position: 'center',
    targetSelector: null,
    navHint: 'Dashboard → Operations tab',
  },
];

export default function OnboardingTour({ onComplete }) {
  const { mode } = useTheme();
  const isDark = mode !== 'light';
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Small delay so the app has time to mount
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Tour card — always centered */}
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-0 z-[9001] flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className={`pointer-events-auto w-full max-w-md rounded-[32px] border shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08]'
                  : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

              <div className="p-8">
                {/* Header row */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                    {current.icon}
                  </div>
                  <button
                    onClick={dismiss}
                    className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                    aria-label="Close tour"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1.5 mb-4">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`rounded-full transition-all ${
                        i === step
                          ? 'w-6 h-2 bg-orange-500'
                          : `w-2 h-2 ${isDark ? 'bg-white/20 hover:bg-white/40' : 'bg-slate-300 hover:bg-slate-400'}`
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                  <span className={`ml-auto text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {step + 1} / {STEPS.length}
                  </span>
                </div>

                {/* Content */}
                <h2 className={`text-xl font-black mb-3 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {current.title}
                </h2>
                <p className={`text-[14px] leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {current.description}
                </p>

                {current.navHint && (
                  <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                    isDark
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      : 'bg-orange-50 border-orange-200 text-orange-600'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    {current.navHint}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-8 flex items-center gap-3">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[12px] font-bold border transition-all ${
                        isDark
                          ? 'border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <ChevronLeft size={15} /> Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-[13px] uppercase tracking-wider transition-all shadow-[0_8px_25px_rgba(249,115,22,0.3)]"
                  >
                    {isLast ? 'Get Started' : 'Next'}
                    {!isLast && <ChevronRight size={16} />}
                  </button>
                  {!isLast && (
                    <button
                      onClick={dismiss}
                      className={`px-4 py-3 rounded-2xl text-[12px] font-bold transition-all ${
                        isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manually re-trigger the tour (e.g., from a settings button)
 */
export function useOnboardingTour() {
  const reset = () => localStorage.removeItem(TOUR_KEY);
  return { reset };
}
