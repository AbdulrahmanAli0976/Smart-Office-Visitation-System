import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import SearchBar from './components/SearchBar.jsx';
import VisitorCard from './components/VisitorCard.jsx';
import ActiveVisitors from './components/ActiveVisitors.jsx';
import QuickActions from './components/QuickActions.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import AdminPanel from './components/AdminPanel.jsx';

const VISITOR_TYPES = [
  { value: 'BD', label: 'BD (Code required)' },
  { value: 'MS', label: 'MS (Code required)' },
  { value: 'AGG', label: 'AGG (Code required)' },
  { value: 'AGENT_MERCHANT', label: 'Agent/Merchant (No code)' }
];

const CODE_REQUIRED = new Set(['BD', 'MS', 'AGG']);
const NO_CODE = new Set(['AGENT_MERCHANT']);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('vms_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vms_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  });
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

  const [purpose, setPurpose] = useState('');
  const [personToSee, setPersonToSee] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    full_name: '',
    phone_number: '',
    visitor_type: 'BD',
    code: ''
  });

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

  const logout = (note) => {
    setToken('');
    setUser(null);
    setActiveVisits([]);
    setAdminOfficers([]);
    setResults([]);
    setDuplicates([]);
    setMessage(note || 'Logged out.');
  };

  const handleAuthFailure = (err) => {
    if (String(err.message || '').toLowerCase().includes('token')) {
      logout('Session expired. Please log in again.');
      return true;
    }
    return false;
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

  const refreshOfficers = async (authToken) => {
    if (!user || user.role !== 'ADMIN') return;
    setAdminLoading(true);
    try {
      const data = await api.getOfficers(authToken);
      setAdminOfficers(data);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    refreshActiveVisits(token);
  }, [token]);

  useEffect(() => {
    if (!token || !user || user.role !== 'ADMIN') return;
    refreshOfficers(token);
  }, [token, user]);

  const handleLogin = async (payload) => {
    setAuthError('');
    setAuthMessage('');
    setLoading(true);
    try {
      const data = await api.login(payload);
      setToken(data.token);
      setUser(data.user);
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
    setLoading(true);
    try {
      if (!token) {
        setError('Please log in to search visitors.');
        return;
      }
      const data = await api.searchVisitors(query, token);
      setResults(data);
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (visitId) => {
    setError('');
    setMessage('');
    setActionLoading(true);
    try {
      await api.checkOut(visitId, token);
      await refreshActiveVisits(token);
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
    if (!createNew) return null;
    if (!visitorForm.full_name || !visitorForm.phone_number || !visitorForm.visitor_type) {
      return 'Please complete the new visitor details.';
    }
    if (CODE_REQUIRED.has(visitorForm.visitor_type) && !visitorForm.code) {
      return 'Code is required for this visitor type.';
    }
    if (NO_CODE.has(visitorForm.visitor_type) && visitorForm.code) {
      return 'Agent/Merchant must not have a code.';
    }
    return null;
  };

  const handleCheckIn = async () => {
    setError('');
    setMessage('');
    setDuplicates([]);

    if (!token) {
      setError('Please log in to check in visitors.');
      return;
    }

    if (!purpose || !personToSee) {
      setError('Purpose and person to see are required.');
      return;
    }

    if (!query && !createNew) {
      setError('Search for a visitor or enable create new visitor.');
      return;
    }

    const formError = validateVisitorForm();
    if (formError) {
      setError(formError);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        query,
        purpose,
        person_to_see: personToSee,
        visitor: createNew ? visitorForm : undefined
      };

      const response = await api.checkIn(payload, token);
      await refreshActiveVisits(token);
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

  const resultCards = useMemo(() => {
    if (!results.length) {
      return <p className="text-sm text-clay-600">No matches yet.</p>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((visitor) => (
          <VisitorCard key={visitor.id} visitor={visitor} />
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
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              loading={loading}
              disabled={!token}
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
              </div>
              <div className="space-y-4">
                <QuickActions
                  onAddVisitor={handleAddVisitor}
                  onCheckIn={handleCheckIn}
                  disabled={actionLoading}
                  loading={actionLoading}
                />
                <div className="clay-card p-5 space-y-4">
                  <h3 className="text-lg font-semibold">Check-in Details</h3>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                      placeholder="Purpose of visit"
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                      placeholder="Person to see"
                      value={personToSee}
                      onChange={(event) => setPersonToSee(event.target.value)}
                    />
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
                      <input
                        className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                        placeholder="Full name"
                        value={visitorForm.full_name}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, full_name: event.target.value }))}
                      />
                      <input
                        className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                        placeholder="Phone number"
                        value={visitorForm.phone_number}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                      />
                      <select
                        className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                        value={visitorForm.visitor_type}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, visitor_type: event.target.value, code: '' }))}
                      >
                        {VISITOR_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
                        placeholder="Visitor code (if required)"
                        value={visitorForm.code}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, code: event.target.value }))}
                      />
                    </div>
                  )}
                  <button
                    className="w-full rounded-xl bg-clay-800 text-white py-3 shadow-clay disabled:opacity-60"
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Check-in'}
                  </button>
                </div>
              </div>
            </section>

            <ActiveVisitors visits={activeVisits} onCheckout={handleCheckout} loading={actionLoading} />

            {user.role === 'ADMIN' && (
              <AdminPanel
                officers={adminOfficers}
                onApprove={handleApprove}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                loading={adminLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
