import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DemandForecast from './pages/DemandForecast';
import ZoneManagement from './pages/ZoneManagement';
import SettingsPage from './pages/Settings';
import OperatorSupport from './pages/OperatorSupport';

import Landing from './pages/Landing';

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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/forecast" element={<ProtectedRoute><DemandForecast /></ProtectedRoute>} />
          <Route path="/zones" element={<ProtectedRoute requireOperator><ZoneManagement /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><OperatorSupport /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
