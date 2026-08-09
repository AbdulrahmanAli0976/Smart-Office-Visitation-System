import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import ActiveVisitors from '../components/ActiveVisitors.jsx';
import DashboardMetrics from '../components/DashboardMetrics.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const { token, user, isAdmin, canManageVisits, handleAuthFailure } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [activeVisits, setActiveVisits] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useScrollToError(error);

  const refreshActive = async (signal) => {
    if (!token || !user) return;
    setActiveLoading(true);
    try {
      const data = await api.getActiveVisits(token, { signal });
      setActiveVisits(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setActiveLoading(false);
    }
  };

  const refreshMetrics = async (signal) => {
    if (!token || !user || !isAdmin) {
      setMetrics(null);
      return;
    }
    setMetricsLoading(true);
    try {
      const data = await api.getDashboardMetrics(token, { signal });
      setMetrics(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleCheckout = async (visitId) => {
    setError('');
    if (!token || !user) return;
    try {
      await api.checkOut(visitId, token);
      await refreshActive();
      toast.success('Visit checked out');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const controller = new AbortController();
    refreshActive(controller.signal);
    refreshMetrics(controller.signal);
    return () => controller.abort();
  }, [token, user, isAdmin]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Operations dashboard</p>
          <h2 className="page-title">Good to see you, {user?.full_name?.split(' ')[0] || 'there'}</h2>
          <p className="page-subtitle">Monitor arrivals and keep today’s front desk moving.</p>
        </div>
        <span className="status-pill status-pill-success">Live operations</span>
      </header>

      {error && (
        <div
          ref={errorRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {isAdmin && <DashboardMetrics metrics={metrics} loading={metricsLoading} isAdmin={isAdmin} />}

      {!isAdmin && (
        <div className="rounded-2xl border border-clay-200 bg-white/70 px-5 py-4 text-sm text-clay-700 shadow-inner">
          Admin-only metrics are hidden for officer accounts. Use Visits and Reports for operational views.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Check-in visitor', description: 'Start a new arrival', to: '/visits', primary: true },
          { label: 'Find a visitor', description: 'Search by name, phone, or code', to: '/visitors' },
          { label: 'View history', description: 'Review recent visit records', to: '/reports' },
          { label: 'Active visits', description: `${activeVisits.length} currently open`, to: '/visits' }
        ].map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to)}
            className={`action-card text-left ${action.primary ? 'action-card-primary' : ''}`}
          >
            <span className="text-sm font-semibold">{action.label}</span>
            <span className="mt-1 block text-xs opacity-75">{action.description}</span>
            <span className="mt-4 block text-lg" aria-hidden="true">→</span>
          </button>
        ))}
      </section>

      <ActiveVisitors
        visits={activeVisits}
        onCheckout={handleCheckout}
        loading={activeLoading}
        canManage={canManageVisits}
      />
    </div>
  );
}










