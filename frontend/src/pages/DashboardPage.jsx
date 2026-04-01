import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import ActiveVisitors from '../components/ActiveVisitors.jsx';
import DashboardMetrics from '../components/DashboardMetrics.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const { token, user, isAdmin, canManageVisits, handleAuthFailure } = useAuth();
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
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">Dashboard</p>
        <h2 className="text-2xl font-semibold text-clay-900">Live Operations Overview</h2>
        <p className="text-sm text-clay-600">Track real-time visits and system activity.</p>
      </header>

      {error && (
        <div
          ref={errorRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {isAdmin && (
        <DashboardMetrics metrics={metrics} loading={metricsLoading} isAdmin={isAdmin} />
      )}

      {!isAdmin && (
        <div className="rounded-2xl border border-clay-200 bg-white/70 px-5 py-4 text-sm text-clay-700 shadow-inner">
          Admin-only metrics are hidden for officer accounts. Use Visits and Reports for operational views.
        </div>
      )}

      <ActiveVisitors
        visits={activeVisits}
        onCheckout={handleCheckout}
        loading={activeLoading}
        canManage={canManageVisits}
      />
    </div>
  );
}










