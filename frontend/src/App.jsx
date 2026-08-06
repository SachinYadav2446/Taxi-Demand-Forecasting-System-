import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DemandForecast = lazy(() => import('./pages/DemandForecast'));
const EnhancedForecast = lazy(() => import('./pages/EnhancedForecast'));
const ModelComparison = lazy(() => import('./pages/ModelComparison'));
const ZoneManagement = lazy(() => import('./pages/ZoneManagement'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const OperatorSupport = lazy(() => import('./pages/OperatorSupport'));
const Landing = lazy(() => import('./pages/Landing'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Docs = lazy(() => import('./pages/Docs'));
const About = lazy(() => import('./pages/About'));
const ProfilePage = lazy(() => import('./pages/Profile'));
function ProtectedRoute({ children, requireOperator }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireOperator && user.role !== 'operator') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
          {/* SECTION 1: STANDALONE PUBLIC/GLOBAL ROUTES (NO SIDEBAR) */}
          <Route path="/" element={<Landing />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />

          {/* SECTION 2: PROTECTED DASHBOARD ROUTES (HAS SIDEBAR) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/forecast" element={<ProtectedRoute><DemandForecast /></ProtectedRoute>} />
            <Route path="/enhanced-forecast" element={<ProtectedRoute><EnhancedForecast /></ProtectedRoute>} />
            <Route path="/model-comparison" element={<ProtectedRoute><ModelComparison /></ProtectedRoute>} />
            <Route path="/zones" element={<ProtectedRoute requireOperator><ZoneManagement /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><OperatorSupport /></ProtectedRoute>} />
          </Route>

          {/* CATCH ALL */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
