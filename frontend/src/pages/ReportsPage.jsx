import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import ReportsPanel from '../components/ReportsPanel.jsx';
import AnalyticsCharts from '../components/AnalyticsCharts.jsx';
import VisitHistoryPanel from '../components/VisitHistoryPanel.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { daysAgo, formatDateOnly } from '../utils/date.js';

export default function ReportsPage() {
  const { token, user, isAdmin, handleAuthFailure } = useAuth();
  const [reportSummary, setReportSummary] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRange, setReportRange] = useState('today');

  const [analyticsRange, setAnalyticsRange] = useState({
    from: daysAgo(6),
    to: formatDateOnly(new Date())
  });
  const [perDay, setPerDay] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [historyFilters, setHistoryFilters] = useState({
    from: daysAgo(7),
    to: formatDateOnly(new Date()),
    visitor_type: '',
    officer_id: '',
    status: '',
    search: ''
  });
  const [visitHistory, setVisitHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [adminOfficers, setAdminOfficers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const [error, setError] = useState('');
  const noticeRef = useScrollToError(error);

  const refreshReport = async (authToken, range = reportRange, signal) => {
    if (!authToken || !user) return;
    setReportLoading(true);
    try {
      const today = formatDateOnly(new Date());
      const params = range === 'today' ? { from: today, to: today } : {};
      const data = await api.getSummaryReport(params, authToken, { signal });
      setReportSummary(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const refreshAnalytics = async (authToken, range = analyticsRange, signal) => {
    if (!authToken || !user) return;
    setAnalyticsLoading(true);
    try {
      const perDayData = await api.getVisitorsPerDay(range, authToken, { signal });
      const typeData = await api.getVisitorTypeDistribution(range, authToken, { signal });
      setPerDay(perDayData);
      setTypeDistribution(typeData);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const refreshVisitHistory = async (authToken, filters = historyFilters, pageOverride = historyPage, signal) => {
    if (!authToken || !user) return;
    setHistoryLoading(true);
    try {
      const params = { ...filters };
      if (user && !isAdmin) {
        params.officer_id = user.id;
      }
      params.page = pageOverride;
      params.limit = historyLimit;
      const { data, pagination } = await api.getVisitHistory(params, authToken, { signal });
      setVisitHistory(data);
      setHistoryPage(pagination.page || pageOverride);
      setHistoryTotalPages(pagination.totalPages || 1);
      setHistoryTotal(pagination.total || data.length);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshOfficers = async (authToken, signal) => {
    if (!authToken || !user || !isAdmin) return;
    setAdminLoading(true);
    try {
      const { data } = await api.getOfficers({ page: 1, limit: 50 }, authToken, { signal });
      setAdminOfficers(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const controller = new AbortController();
    refreshReport(token, reportRange, controller.signal);
    refreshAnalytics(token, analyticsRange, controller.signal);
    refreshVisitHistory(token, historyFilters, historyPage, controller.signal);
    refreshOfficers(token, controller.signal);
    return () => controller.abort();
  }, [token, user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setHistoryFilters((prev) => ({ ...prev, officer_id: user.id }));
    }
  }, [user, isAdmin]);

  const toggleReportRange = () => {
    const next = reportRange === 'today' ? 'all' : 'today';
    setReportRange(next);
    if (token) {
      refreshReport(token, next);
    }
  };

  const handleAnalyticsApply = () => {
    if (!token) return;
    refreshAnalytics(token, analyticsRange);
  };

  const handleHistoryApply = () => {
    if (!token) return;
    setHistoryPage(1);
    refreshVisitHistory(token, historyFilters, 1);
  };

  const handleHistoryPageChange = (nextPage) => {
    if (!token || !historyTotalPages) return;
    const page = Math.max(1, Math.min(nextPage, historyTotalPages));
    setHistoryPage(page);
    refreshVisitHistory(token, historyFilters, page);
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = { ...historyFilters };
      if (user && !isAdmin) {
        params.officer_id = user.id;
      }
      const csv = await api.exportVisits(params, token);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'visits_export.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Export failed');
      }
    }
  };

  const recentActivity = useMemo(() => visitHistory.slice(0, 5), [visitHistory]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">Reports</p>
        <h2 className="text-2xl font-semibold text-clay-900">Analytics and Audit Reports</h2>
        <p className="text-sm text-clay-600">Review summaries, trends, and historical data.</p>
      </header>

      {error && (
        <div
          ref={noticeRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <ReportsPanel
        summary={reportSummary}
        loading={reportLoading}
        rangeLabel={reportRange === 'today' ? 'Today' : 'All time'}
        onToggleRange={toggleReportRange}
      />

      <AnalyticsCharts
        perDay={perDay}
        typeDistribution={typeDistribution}
        loading={analyticsLoading}
        range={analyticsRange}
        onRangeChange={setAnalyticsRange}
        onApplyRange={handleAnalyticsApply}
        recentActivity={recentActivity}
      />

      <VisitHistoryPanel
        filters={historyFilters}
        onChange={setHistoryFilters}
        onApply={handleHistoryApply}
        onExport={handleExport}
        visits={visitHistory}
        loading={historyLoading || adminLoading}
        officers={adminOfficers}
        isAdmin={isAdmin}
        page={historyPage}
        totalPages={historyTotalPages}
        total={historyTotal}
        onPrev={() => handleHistoryPageChange(historyPage - 1)}
        onNext={() => handleHistoryPageChange(historyPage + 1)}
      />
    </div>
  );
}








