import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import VisitorCard from '../components/VisitorCard.jsx';
import QuickActions from '../components/QuickActions.jsx';
import ActiveVisitors from '../components/ActiveVisitors.jsx';
import BulkCheckInPanel from '../components/BulkCheckInPanel.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

const VISITOR_TYPES = [
  { value: 'BD', label: 'BD (Code required)' },
  { value: 'MS', label: 'MS (Code required)' },
  { value: 'AGG', label: 'AGG (Code required)' },
  { value: 'AGENT_MERCHANT', label: 'Agent/Merchant (No code)' }
];

const CODE_REQUIRED = new Set(['BD', 'MS', 'AGG']);
const NO_CODE = new Set(['AGENT_MERCHANT']);

export default function VisitsPage() {
  const { token, user, canManageVisits, handleAuthFailure } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [duplicates, setDuplicates] = useState([]);

  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorLimit] = useState(10);
  const [visitorTotalPages, setVisitorTotalPages] = useState(1);
  const [visitorTotal, setVisitorTotal] = useState(0);
  const [visitorSearch, setVisitorSearch] = useState('');

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

  const [activeVisits, setActiveVisits] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);

  const [bulkSummary, setBulkSummary] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const noticeRef = useScrollToError(error || searchError || bulkError);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const lastSearchRef = useRef('');

  const fetchVisitors = async ({ page = visitorPage, search = visitorSearch } = {}) => {
    if (!token || !user) {
      const messageText = 'Please log in to search visitors.';
      setError(messageText);
      toast.error(messageText);
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

  const refreshActiveVisits = async (signal) => {
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

  useEffect(() => {
    if (!token || !user) return;
    const controller = new AbortController();
    refreshActiveVisits(controller.signal);
    return () => controller.abort();
  }, [token, user]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setVisitorSearch('');
      setVisitorPage(1);
      setSearchError('');
      return;
    }
    if (debouncedQuery.length < 2) {
      setSearchError('Enter at least 2 characters to search.');
      return;
    }
    setSearchError('');
    if (debouncedQuery === lastSearchRef.current) return;
    lastSearchRef.current = debouncedQuery;
    setVisitorSearch(debouncedQuery);
    setVisitorPage(1);
    fetchVisitors({ page: 1, search: debouncedQuery });
  }, [debouncedQuery]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const messageText = 'Enter at least 2 characters to search.';
      setSearchError(messageText);
      toast.error(messageText);
      return;
    }

    setSearchError('');
    setVisitorSearch(trimmed);
    setVisitorPage(1);
    setDebouncedQuery(trimmed);
    lastSearchRef.current = trimmed;
    await fetchVisitors({ page: 1, search: trimmed });
  };

  const handleVisitorPageChange = (nextPage) => {
    if (!visitorTotalPages) return;
    const page = Math.max(1, Math.min(nextPage, visitorTotalPages));
    setVisitorPage(page);
    fetchVisitors({ page, search: visitorSearch });
  };

  const handleSelectVisitor = (visitor) => {
    const pick = visitor.code || visitor.phone_number || visitor.full_name;
    setQuery(pick || '');
    setCreateNew(false);
    setFieldErrors((prev) => ({ ...prev, query: '' }));
    setMessage('Visitor selected. Complete check-in details and confirm.');
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

    if (!token || !user) {
      const messageText = 'Please log in to check in visitors.';
      setError(messageText);
      toast.error(messageText);
      return;
    }

    if (!canManageVisits) {
      const messageText = 'Your role cannot manage visits.';
      setError(messageText);
      toast.error(messageText);
      return;
    }

    const errors = validateVisitorForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const messageText = 'Please fix the highlighted fields.';
      setError(messageText);
      toast.error(messageText);
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
      await refreshActiveVisits();
      if (createNew) {
        toast.success('Visitor created successfully');
      }
      toast.success('Visit checked in');
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

  const handleCheckout = async (visitId) => {
    setError('');
    setMessage('');

    if (!token || !user) {
      const messageText = 'Please log in to manage visits.';
      setError(messageText);
      toast.error(messageText);
      return;
    }

    if (!canManageVisits) {
      const messageText = 'Your role cannot manage visits.';
      setError(messageText);
      toast.error(messageText);
      return;
    }

    setActionLoading(true);
    try {
      await api.checkOut(visitId, token);
      await refreshActiveVisits();
      toast.success('Visit checked out');
      setMessage('Visit checked out.');
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

    if (!token || !user) {
      const messageText = 'Please log in to use bulk check-in.';
      setBulkError(messageText);
      toast.error(messageText);
      return;
    }

    if (!canManageVisits) {
      const messageText = 'Your role cannot manage visits.';
      setBulkError(messageText);
      toast.error(messageText);
      return;
    }

    setBulkLoading(true);
    try {
      const summary = await api.bulkCheckIn({ visitors: rows }, token);
      setBulkSummary(summary);
      await refreshActiveVisits();
      toast.success('Bulk check-in completed');
      setMessage('Bulk check-in completed.');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setBulkError(err.message);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const resultCards = useMemo(() => {
    if (!results.length) {
      const trimmed = query.trim();
      const title = trimmed
        ? `No results found for "${trimmed}"`
        : 'Start typing to search visitors';
      const subtitle = trimmed
        ? 'Try a different name, phone, or code.'
        : 'Search by code, phone, or name.';
      return (
        <div className="rounded-2xl border border-clay-200 bg-white/70 px-6 py-8 text-center text-sm text-clay-700 shadow-inner">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-clay-200/70 text-xs uppercase tracking-[0.2em] text-clay-700">i</div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-clay-600">{subtitle}</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((visitor) => (
          <VisitorCard
            key={visitor.id}
            visitor={visitor}
            onSelect={handleSelectVisitor}
          />
        ))}
      </div>
    );
  }, [results, query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">Visits</p>
        <h2 className="text-2xl font-semibold text-clay-900">Check-in and Manage Visits</h2>
        <p className="text-sm text-clay-600">Handle arrivals, departures, and bulk processing.</p>
      </header>

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

      {(error || message || searchError || bulkError) && (
        <div
          ref={noticeRef}
          className={`rounded-xl border px-4 py-3 text-sm ${error || searchError || bulkError ? 'border-red-200 bg-red-50/70 text-red-700' : 'border-green-200 bg-green-50/70 text-green-700'}`}
        >
          {error || searchError || bulkError || message}
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
            <h3 className="text-lg font-semibold">Search Results</h3>
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
            onAddVisitor={() => setCreateNew(true)}
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

      <ActiveVisitors
        visits={activeVisits}
        onCheckout={handleCheckout}
        loading={activeLoading}
        canManage={canManageVisits}
      />
    </div>
  );
}
