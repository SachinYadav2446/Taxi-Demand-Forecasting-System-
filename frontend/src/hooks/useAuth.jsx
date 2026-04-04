import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const loadUserProfile = async (token) => {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 <= Date.now()) {
      clearSession();
      return;
    }

    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (e) {
      clearSession();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const initAuth = async () => {
      if (token) {
        try {
          await loadUserProfile(token);
        } catch (e) {
          clearSession();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token) => {
    localStorage.setItem('token', token);
    await loadUserProfile(token);
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
