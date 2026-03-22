import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import SearchBar from './components/SearchBar.jsx';
import VisitorCard from './components/VisitorCard.jsx';
import ActiveVisitors from './components/ActiveVisitors.jsx';
import QuickActions from './components/QuickActions.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import ReportsPanel from './components/ReportsPanel.jsx';
import DashboardMetrics from './components/DashboardMetrics.jsx';
import AnalyticsCharts from './components/AnalyticsCharts.jsx';
import VisitHistoryPanel from './components/VisitHistoryPanel.jsx';
import VisitorHistoryPanel from './components/VisitorHistoryPanel.jsx';
import BulkCheckInPanel from './components/BulkCheckInPanel.jsx';

const VISITOR_TYPES = [
  { value: 'BD', label: 'BD (Code required)' },
  { value: 'MS', label: 'MS (Code required)' },
  { value: 'AGG', label: 'AGG (Code required)' },
  { value: 'AGENT_MERCHANT', label: 'Agent/Merchant (No code)' }
];

const CODE_REQUIRED = new Set(['BD', 'MS', 'AGG']);
const NO_CODE = new Set(['AGENT_MERCHANT']);

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const role = normalizeRole(raw.role);
  if (!role) return null;
  const status = normalizeStatus(raw.status);
  const parsedId = Number.isInteger(raw.id) ? raw.id : parseInt(raw.id, 10);
  return {
    ...raw,
    id: Number.isInteger(parsedId) ? parsedId : raw.id,
    role,
    status
  };
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateOnly(date);
}

export default function App() {
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
  const isAdmin = user?.role === 'ADMIN';
  const canManageVisits = user?.role === 'ADMIN' || user?.role === 'OFFICER';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [adminOfficers, setAdminOfficers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorLimit] = useState(10);
  const [visitorTotalPages, setVisitorTotalPages] = useState(1);
  const [visitorTotal, setVisitorTotal] = useState(0);
  const [visitorSearch, setVisitorSearch] = useState('');

  const [officerPage, setOfficerPage] = useState(1);
  const [officerLimit] = useState(10);
  const [officerTotalPages, setOfficerTotalPages] = useState(1);
  const [officerTotal, setOfficerTotal] = useState(0);
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerStatus, setOfficerStatus] = useState('');

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [purpose, setPurpose] = useState('');
  const [personToSee, setPersonToSee] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    full_name: '',
    phone_number: '',
    visitor_type: 'BD',
    code: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchError, setSearchError] = useState('');

  const [reportSummary, setReportSummary] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRange, setReportRange] = useState('today');

  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [perDay, setPerDay] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState({
    from: daysAgo(6),
    to: formatDateOnly(new Date())
  });

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

  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitorHistory, setVisitorHistory] = useState([]);
  const [visitorHistoryLoading, setVisitorHistoryLoading] = useState(false);

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
  }, [user, isAdmin]);

  const logout = (note) => {
    setToken('');
    setUser(null);
    setActiveVisits([]);
    setAdminOfficers([]);
    setResults([]);
    setDuplicates([]);
    setBulkSummary(null);
    setBulkError('');
    setBulkLoading(false);
    setReportSummary(null);
    setDashboardMetrics(null);
    setPerDay([]);
    setTypeDistribution([]);
    setVisitHistory([]);
    setSelectedVisitor(null);
    setVisitorHistory([]);
    setMessage(note || 'Logged out.');
  };

  const handleAuthFailure = (err) => {
    const msg = String(err.message || '').toLowerCase();
    if (
      msg.includes('token') ||
      msg.includes('authorization') ||
      msg.includes('expired') ||
      msg.includes('invalid')
    ) {
      logout('Session expired. Please log in again.');
      return true;
    }
    return false;
  };

  const fetchVisitors = async ({ page = visitorPage, search = visitorSearch } = {}) => {
    if (!token) {
      setError('Please log in to search visitors.');
      return;
    }
    setLoading(true);
    try {
      const { data, pagination } = await api.listVisitors({
        search,
        page,
        limit: visitorLimit
      }, token);
      setResults(data);
      setVisitorPage(pagination.page || page);
      setVisitorTotalPages(pagination.totalPages || 1);
      setVisitorTotal(pagination.total || data.length);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveVisits = async (authToken) => {
    try {
      const data = await api.getActiveVisits(authToken);
      setActiveVisits(data);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    }
  };

  const refreshOfficers = async (authToken, overrides = {}) => {
    if (!user || !isAdmin) return;
    setAdminLoading(true);
    try {
      const page = overrides.page ?? officerPage;
      const search = overrides.search ?? officerSearch;
      const status = overrides.status ?? officerStatus;
      const { data, pagination } = await api.getOfficers({
        page,
        limit: officerLimit,
        search,
        status
      }, authToken);
      setAdminOfficers(data);
      setOfficerPage(pagination.page || page);
      setOfficerTotalPages(pagination.totalPages || 1);
      setOfficerTotal(pagination.total || data.length);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const refreshReport = async (authToken, range = reportRange) => {
    setReportLoading(true);
    try {
      const today = formatDateOnly(new Date());
      const params = range === 'today' ? { from: today, to: today } : {};
      const data = await api.getSummaryReport(params, authToken);
      setReportSummary(data);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const refreshDashboard = async (authToken) => {
    setDashboardLoading(true);
    try {
      const data = await api.getDashboardMetrics(authToken);
      setDashboardMetrics(data);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  const refreshAnalytics = async (authToken, range = analyticsRange) => {
    setAnalyticsLoading(true);
    try {
      const perDayData = await api.getVisitorsPerDay(range, authToken);
      const typeData = await api.getVisitorTypeDistribution(range, authToken);
      setPerDay(perDayData);
      setTypeDistribution(typeData);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const refreshVisitHistory = async (authToken, filters = historyFilters, pageOverride = historyPage) => {
    setHistoryLoading(true);
    try {
      const params = { ...filters };
      if (user && !isAdmin) {
        params.officer_id = user.id;
      }
      params.page = pageOverride;
      params.limit = historyLimit;
      const { data, pagination } = await api.getVisitHistory(params, authToken);
      setVisitHistory(data);
      setHistoryPage(pagination.page || pageOverride);
      setHistoryTotalPages(pagination.totalPages || 1);
      setHistoryTotal(pagination.total || data.length);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    refreshActiveVisits(token);
    refreshReport(token);
    refreshDashboard(token);
    refreshAnalytics(token, analyticsRange);
    refreshVisitHistory(token, historyFilters, historyPage);
  }, [token]);

  useEffect(() => {
    if (!token || !user || !isAdmin) return;
    refreshOfficers(token);
  }, [token, user, officerPage, officerSearch, officerStatus]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      refreshActiveVisits(token);
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setHistoryFilters((prev) => ({ ...prev, officer_id: user.id }));
    }
  }, [user, isAdmin]);

  const handleLogin = async (payload) => {
    setAuthError('');
    setAuthMessage('');
    setLoading(true);
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
      setToken(data.token);
      setUser(normalized);
      setAuthMessage('Login successful.');
      setMessage('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (payload) => {
    setAuthError('');
    setAuthMessage('');
    setLoading(true);
    try {
      const data = await api.register(payload);
      setAuthMessage(data.message || 'Registration submitted. Await approval.');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters to search.');
      return;
    }

    setSearchError('');
    if (!token) {
      setError('Please log in to search visitors.');
      return;
    }
    setVisitorSearch(trimmed);
    setVisitorPage(1);
    await fetchVisitors({ page: 1, search: trimmed });
  };

  const handleVisitorPageChange = (nextPage) => {
    if (!visitorTotalPages) return;
    const page = Math.max(1, Math.min(nextPage, visitorTotalPages));
    setVisitorPage(page);
    fetchVisitors({ page, search: visitorSearch });
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

  const handleOfficerSearch = (value) => {
    setOfficerSearch(value);
    setOfficerPage(1);
  };

  const handleOfficerStatus = (value) => {
    setOfficerStatus(value);
    setOfficerPage(1);
  };

  const handleOfficerPageChange = (nextPage) => {
    if (!officerTotalPages) return;
    const page = Math.max(1, Math.min(nextPage, officerTotalPages));
    setOfficerPage(page);
  };

  const handleCheckout = async (visitId) => {
    setError('');
    setMessage('');

    if (!canManageVisits) {
      setError('Your role cannot manage visits.');
      return;
    }

    setActionLoading(true);
    try {
      await api.checkOut(visitId, token);
      await refreshActiveVisits(token);
      await refreshReport(token);
      await refreshDashboard(token);
      setMessage('Visit checked out.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const validateVisitorForm = () => {
    const errors = {};

    if (!purpose.trim()) errors.purpose = 'Purpose is required.';
    if (!personToSee.trim()) errors.personToSee = 'Person to see is required.';

    if (!query.trim() && !createNew) {
      errors.query = 'Search or enable create new visitor.';
    }

    if (createNew) {
      if (!visitorForm.full_name.trim()) errors.full_name = 'Full name is required.';
      if (!visitorForm.phone_number.trim()) errors.phone_number = 'Phone number is required.';
      if (!visitorForm.visitor_type) errors.visitor_type = 'Visitor type is required.';
      if (CODE_REQUIRED.has(visitorForm.visitor_type) && !visitorForm.code.trim()) {
        errors.code = 'Code is required for this visitor type.';
      }
      if (NO_CODE.has(visitorForm.visitor_type) && visitorForm.code.trim()) {
        errors.code = 'Agent/Merchant must not have a code.';
      }
    }

    return errors;
  };

  const handleCheckIn = async () => {
    setError('');
    setMessage('');
    setDuplicates([]);

    if (!token) {
      setError('Please log in to check in visitors.');
      return;
    }

    if (!canManageVisits) {
      setError('Your role cannot manage visits.');
      return;
    }

    const errors = validateVisitorForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        query: query.trim(),
        purpose: purpose.trim(),
        person_to_see: personToSee.trim(),
        visitor: createNew ? {
          ...visitorForm,
          full_name: visitorForm.full_name.trim(),
          phone_number: visitorForm.phone_number.trim(),
          code: visitorForm.code.trim()
        } : undefined
      };

      const response = await api.checkIn(payload, token);
      await refreshActiveVisits(token);
      await refreshReport(token);
      await refreshDashboard(token);
      setMessage('Visitor checked in successfully.');
      setDuplicates(response.duplicates || []);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const clearBulkStatus = () => {
    setBulkSummary(null);
    setBulkError('');
  };

  const handleBulkCheckIn = async (rows) => {
    setBulkError('');
    setBulkSummary(null);

    if (!token) {
      setBulkError('Please log in to use bulk check-in.');
      return;
    }

    if (!canManageVisits) {
      setBulkError('Your role cannot manage visits.');
      return;
    }

    setBulkLoading(true);
    try {
      const summary = await api.bulkCheckIn({ visitors: rows }, token);
      setBulkSummary(summary);
      await refreshActiveVisits(token);
      await refreshReport(token);
      await refreshDashboard(token);
      await refreshAnalytics(token, analyticsRange);
      setMessage('Bulk check-in completed.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setBulkError(err.message);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleAddVisitor = () => {
    setCreateNew(true);
    setMessage('');
    setError('');
  };

  const handleApprove = async (id) => {
    setError('');
    setAdminLoading(true);
    try {
      await api.approveOfficer(id, token);
      await refreshOfficers(token);
      setMessage('Officer approved.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    setError('');
    setAdminLoading(true);
    try {
      await api.deactivateOfficer(id, token);
      await refreshOfficers(token);
      setMessage('Officer deactivated.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    setAdminLoading(true);
    try {
      await api.deleteOfficer(id, token);
      await refreshOfficers(token);
      setMessage('Officer removed.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

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

  const handleSelectVisitor = (visitor) => {
    const pick = visitor.code || visitor.phone_number || visitor.full_name;
    setQuery(pick || '');
    setCreateNew(false);
    setFieldErrors((prev) => ({ ...prev, query: '' }));
    setMessage('Visitor selected. Complete check-in details and confirm.');
  };

  const handleViewHistory = async (visitor) => {
    if (!token) return;
    setVisitorHistoryLoading(true);
    setSelectedVisitor(visitor);
    try {
      const history = await api.getVisitorHistory(visitor.id, token);
      setVisitorHistory(history);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setVisitorHistoryLoading(false);
    }
  };

  const handleCloseVisitorHistory = () => {
    setSelectedVisitor(null);
    setVisitorHistory([]);
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
      setMessage('Export ready.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Export failed');
      }
    }
  };

  const recentActivity = useMemo(() => visitHistory.slice(0, 5), [visitHistory]);

  const resultCards = useMemo(() => {
    if (!results.length) {
      return <p className="text-sm text-clay-600">No matches yet.</p>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((visitor) => (
          <VisitorCard
            key={visitor.id}
            visitor={visitor}
            onSelect={handleSelectVisitor}
            onHistory={handleViewHistory}
          />
        ))}
      </div>
    );
  }, [results]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f4f0,_#e4d6c7_55%,_#d5c2ab)] px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-clay-600">Visitor Management System</p>
            <h1 className="text-3xl font-bold font-display text-clay-900">Operations Dashboard</h1>
            <p className="text-sm text-clay-700">Smart search, fast check-ins, clear audit trail.</p>
          </div>
          {user && (
            <div className="clay-card px-5 py-4 max-w-md">
              <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Signed in</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-clay-900">{user.full_name}</p>
                  <p className="text-xs text-clay-600">{user.role}</p>
                </div>
                <button
                  className="rounded-lg border border-clay-300 px-3 py-1 text-xs text-clay-700"
                  onClick={() => logout()}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </header>

        {!user && (
          <AuthPanel
            onLogin={handleLogin}
            onRegister={handleRegister}
            loading={loading}
            error={authError}
            message={authMessage}
          />
        )}

        {user && (
          <>
            <DashboardMetrics metrics={dashboardMetrics} loading={dashboardLoading} />

            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value);
                if (searchError) setSearchError('');
              }}
              onSubmit={handleSearch}
              loading={loading}
              disabled={!token}
              error={searchError || fieldErrors.query}
            />

            {(error || message) && (
              <div className={`clay-card px-5 py-3 ${error ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700'}`}>
                {error || message}
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="clay-card px-5 py-3 border-yellow-200 text-yellow-700">
                <p className="font-semibold">Possible duplicates detected:</p>
                <ul className="text-sm list-disc pl-5">
                  {duplicates.map((dup) => (
                    <li key={dup.id}>{dup.full_name} ({dup.phone_number})</li>
                  ))}
                </ul>
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

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Search Results</h2>
                  <button
                    className="text-sm text-clay-700 underline"
                    onClick={() => setResults([])}
                  >
                    Clear
                  </button>
                </div>
                {resultCards}
                {results.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-clay-600">
                    <span>Page {visitorPage} of {visitorTotalPages} ? Showing {results.length} of {visitorTotal}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border border-clay-300 px-3 py-1 text-xs text-clay-700 disabled:opacity-60"
                        onClick={() => handleVisitorPageChange(visitorPage - 1)}
                        disabled={visitorPage <= 1}
                      >
                        Previous
                      </button>
                      <button
                        className="rounded-lg border border-clay-300 px-3 py-1 text-xs text-clay-700 disabled:opacity-60"
                        onClick={() => handleVisitorPageChange(visitorPage + 1)}
                        disabled={visitorPage >= visitorTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <QuickActions
                  onAddVisitor={handleAddVisitor}
                  onCheckIn={handleCheckIn}
                  disabled={actionLoading || !canManageVisits}
                  loading={actionLoading}
                />
                <div className="clay-card p-5 space-y-4">
                  <h3 className="text-lg font-semibold">Check-in Details</h3>
                  <div className="space-y-3">
                    <div>
                      <input
                        className={`w-full rounded-xl border ${fieldErrors.purpose ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                        placeholder="Purpose of visit"
                        value={purpose}
                        onChange={(event) => setPurpose(event.target.value)}
                      />
                      {fieldErrors.purpose && <p className="mt-1 text-xs text-red-600">{fieldErrors.purpose}</p>}
                    </div>
                    <div>
                      <input
                        className={`w-full rounded-xl border ${fieldErrors.personToSee ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                        placeholder="Person to see"
                        value={personToSee}
                        onChange={(event) => setPersonToSee(event.target.value)}
                      />
                      {fieldErrors.personToSee && <p className="mt-1 text-xs text-red-600">{fieldErrors.personToSee}</p>}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-clay-700">
                    <input
                      type="checkbox"
                      checked={createNew}
                      onChange={(event) => setCreateNew(event.target.checked)}
                    />
                    Create new visitor if not found
                  </label>
                  {createNew && (
                    <div className="space-y-3">
                      <div>
                        <input
                          className={`w-full rounded-xl border ${fieldErrors.full_name ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                          placeholder="Full name"
                          value={visitorForm.full_name}
                          onChange={(event) => setVisitorForm((prev) => ({ ...prev, full_name: event.target.value }))}
                        />
                        {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name}</p>}
                      </div>
                      <div>
                        <input
                          className={`w-full rounded-xl border ${fieldErrors.phone_number ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                          placeholder="Phone number"
                          value={visitorForm.phone_number}
                          onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                        />
                        {fieldErrors.phone_number && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone_number}</p>}
                      </div>
                      <div>
                        <select
                          className={`w-full rounded-xl border ${fieldErrors.visitor_type ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                          value={visitorForm.visitor_type}
                          onChange={(event) => setVisitorForm((prev) => ({ ...prev, visitor_type: event.target.value, code: '' }))}
                        >
                          {VISITOR_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        {fieldErrors.visitor_type && <p className="mt-1 text-xs text-red-600">{fieldErrors.visitor_type}</p>}
                      </div>
                      <div>
                        <input
                          className={`w-full rounded-xl border ${fieldErrors.code ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-2 text-sm shadow-inner`}
                          placeholder="Visitor code (if required)"
                          value={visitorForm.code}
                          onChange={(event) => setVisitorForm((prev) => ({ ...prev, code: event.target.value }))}
                        />
                        {fieldErrors.code && <p className="mt-1 text-xs text-red-600">{fieldErrors.code}</p>}
                      </div>
                    </div>
                  )}
                  <button
                    className="w-full rounded-xl bg-clay-800 text-white py-3 shadow-clay disabled:opacity-60"
                    onClick={handleCheckIn}
                    disabled={actionLoading || !canManageVisits}
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Check-in'}
                  </button>
                </div>
                <BulkCheckInPanel
                  onSubmit={handleBulkCheckIn}
                  loading={bulkLoading}
                  summary={bulkSummary}
                  error={bulkError}
                  disabled={bulkLoading || !canManageVisits}
                  onReset={clearBulkStatus}
                />
              </div>
            </section>

            <ActiveVisitors visits={activeVisits} onCheckout={handleCheckout} loading={actionLoading} canManage={canManageVisits} />

            <VisitHistoryPanel
              filters={historyFilters}
              onChange={setHistoryFilters}
              onApply={handleHistoryApply}
              onExport={handleExport}
              visits={visitHistory}
              loading={historyLoading}
              officers={adminOfficers}
              isAdmin={isAdmin}
              page={historyPage}
              totalPages={historyTotalPages}
              total={historyTotal}
              onPrev={() => handleHistoryPageChange(historyPage - 1)}
              onNext={() => handleHistoryPageChange(historyPage + 1)}
            />

            {visitorHistoryLoading && (
              <div className="clay-card px-5 py-3 text-sm text-clay-600">Loading visitor history...</div>
            )}

            {selectedVisitor && !visitorHistoryLoading && (
              <VisitorHistoryPanel
                visitor={selectedVisitor}
                visits={visitorHistory}
                onClose={handleCloseVisitorHistory}
              />
            )}

            {isAdmin && (
              <AdminPanel
                officers={adminOfficers}
                onApprove={handleApprove}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                loading={adminLoading}
                search={officerSearch}
                status={officerStatus}
                page={officerPage}
                totalPages={officerTotalPages}
                total={officerTotal}
                onSearchChange={handleOfficerSearch}
                onStatusChange={handleOfficerStatus}
                onPrev={() => handleOfficerPageChange(officerPage - 1)}
                onNext={() => handleOfficerPageChange(officerPage + 1)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
