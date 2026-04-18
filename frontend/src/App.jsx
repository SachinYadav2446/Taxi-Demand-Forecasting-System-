import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DemandForecast from './pages/DemandForecast';
import ZoneManagement from './pages/ZoneManagement';
import SettingsPage from './pages/Settings';
import OperatorSupport from './pages/OperatorSupport';

import Landing from './pages/Landing';
import Privacy from './pages/Privacy';
import Docs from './pages/Docs';
import About from './pages/About';
import ProfilePage from './pages/Profile';

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
        <Routes>
          {/* SECTION 1: STANDALONE PUBLIC/GLOBAL ROUTES (NO SIDEBAR) */}
          <Route path="/" element={<Landing />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />

          {/* SECTION 2: PROTECTED DASHBOARD ROUTES (HAS SIDEBAR) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/forecast" element={<ProtectedRoute><DemandForecast /></ProtectedRoute>} />
            <Route path="/zones" element={<ProtectedRoute requireOperator><ZoneManagement /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><OperatorSupport /></ProtectedRoute>} />
          </Route>

          {/* CATCH ALL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
