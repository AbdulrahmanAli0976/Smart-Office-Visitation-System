import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VisitorsPage from './pages/VisitorsPage.jsx';
import VisitsPage from './pages/VisitsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import { normalizeUser } from './utils/auth.js';
import { api, setLoggingOut } from './api.js';

function AppLayout({ user, isAdmin, onLogout }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f4f0,_#e4d6c7_55%,_#d5c2ab)] flex">
      <Sidebar user={user} isAdmin={isAdmin} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function ProtectedRoute({ token, user, children }) {
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ user, isAdmin, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('vms_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vms_user');
    if (!raw) return null;
    try {
      return normalizeUser(JSON.parse(raw));
    } catch (err) {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [systemError, setSystemError] = useState('');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const isAdmin = user?.role === 'ADMIN';
  const canManageVisits = user?.role === 'ADMIN' || user?.role === 'OFFICER';

  useEffect(() => {
    if (token) {
      localStorage.setItem('vms_token', token);
    } else {
      localStorage.removeItem('vms_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('vms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vms_user');
    }
  }, [user]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSystemError = (event) => {
      const message = event?.detail?.message || 'Server unreachable. Please check connection.';
      setSystemError(message);
    };
    const handleSystemClear = () => setSystemError('');
    window.addEventListener('system:error', handleSystemError);
    window.addEventListener('system:clear', handleSystemClear);
    return () => {
      window.removeEventListener('system:error', handleSystemError);
      window.removeEventListener('system:clear', handleSystemClear);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    setIsOffline(!navigator.onLine);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const logout = useCallback((note) => {
    const safeNote = (note && typeof note === 'object')
      ? (console.warn('OBJECT DETECTED IN RENDER', note), '')
      : note;
    setLoggingOut(true);
    setToken('');
    setUser(null);
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthMessage(safeNote || 'Logged out.');
    setAuthError('');
    navigate('/login', { replace: true });
    setTimeout(() => setLoggingOut(false), 1000);
  }, [navigate]);

  const handleAuthFailure = (err) => {
    if (err?.message === 'Request blocked during logout' || err?.isAuthError) {
      return true;
    }
    const msg = String(err?.message || '').toLowerCase();
    if (
      msg.includes('token') ||
      msg.includes('authorization') ||
      msg.includes('expired') ||
      msg.includes('invalid') ||
      err.status === 401
    ) {
      logout('Session expired. Please login again.');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const handler = (event) => {
      const reason = event?.detail?.reason;
      logout(reason ? 'Session expired. Please login again.' : 'Session expired. Please login again.');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  const handleLogin = async (payload) => {
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);
    try {
      const data = await api.login(payload);
      const normalized = normalizeUser(data.user);
      if (!normalized || !normalized.role) {
        setAuthError('Account role is missing. Contact admin.');
        return;
      }
      if (normalized.role === 'OFFICER' && normalized.status !== 'ACTIVE') {
        setAuthError('Account not active. Await approval or contact admin.');
        return;
      }
      setLoggingOut(false);
      setToken(data.token);
      setUser(normalized);
      setAuthMessage('Login successful.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload) => {
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);
    try {
      const data = await api.register(payload);
      setAuthMessage(data.message || 'Registration submitted. Await approval.');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const authContextValue = useMemo(() => ({
    token,
    user,
    isAdmin,
    canManageVisits,
    logout,
    handleAuthFailure
  }), [token, user, isAdmin, canManageVisits, logout]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {(isOffline || systemError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700">
          {isOffline && <p>You are offline</p>}
          {systemError && <p>{systemError}</p>}
        </div>
      )}
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage
              onLogin={handleLogin}
              onRegister={handleRegister}
              loading={authLoading}
              error={authError}
              message={authMessage}
            />
          )}
        />
        <Route
          path="/"
          element={(
            <ProtectedRoute token={token} user={user}>
              <AppLayout user={user} isAdmin={isAdmin} onLogout={logout} />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="visitors" element={<VisitorsPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route
            path="admin"
            element={(
              <RequireAdmin user={user} isAdmin={isAdmin}>
                <AdminPage />
              </RequireAdmin>
            )}
          />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}











