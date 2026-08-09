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

  // Selection state
  const [selectedVisitor, setSelectedVisitor] = useState(null);

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
    // Map the actual properties from search response
    setSelectedVisitor({
      id: visitor.id,
      full_name: visitor.full_name,
      phone_number: visitor.phone_number,
      visitor_type: visitor.visitor_type,
      code: visitor.code
    });
    setCreateNew(false);
    setFieldErrors((prev) => ({ ...prev, query: '', full_name: '', phone_number: '', visitor_type: '', code: '' }));
    setMessage(`Visitor "${visitor.full_name}" selected. Complete check-in details and confirm.`);
  };

  const handleClearSelectedVisitor = () => {
    setSelectedVisitor(null);
    setMessage('');
  };

  const handleClearForm = () => {
    setSelectedVisitor(null);
    setCreateNew(false);
    setQuery('');
    setPurpose('');
    setPersonToSee('');
    setVisitorForm({
      full_name: '',
      phone_number: '',
      visitor_type: 'BD',
      code: ''
    });
    setFieldErrors({});
    setMessage('');
    setError('');
    setSearchError('');
    setResults([]);
  };

  const validateVisitorForm = () => {
    const errors = {};

    if (!purpose.trim()) errors.purpose = 'Purpose of visit is required.';
    if (!personToSee.trim()) errors.personToSee = 'Person to see is required.';

    if (!selectedVisitor && !createNew) {
      errors.query = 'Please search and select a visitor, or enable "Create new visitor".';
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
      // Map checkin query parameter to exact phone or code of selected visitor to prevent lookup ambiguity, or fallback to query text
      const queryText = selectedVisitor
        ? (selectedVisitor.phone_number || selectedVisitor.code || selectedVisitor.full_name)
        : query.trim();

      const payload = {
        query: queryText,
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
      
      // Clear form inputs on success
      setPurpose('');
      setPersonToSee('');
      setSelectedVisitor(null);
      setQuery('');
      setCreateNew(false);
      setVisitorForm({
        full_name: '',
        phone_number: '',
        visitor_type: 'BD',
        code: ''
      });
      setResults([]);
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
    const trimmed = query.trim();
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-8 text-center text-sm text-slate-500 shadow-inner">
          <p className="font-semibold animate-pulse">Searching visitor records...</p>
        </div>
      );
    }
    if (!results.length) {
      const title = trimmed
        ? `No results found for "${trimmed}"`
        : 'Find an existing visitor';
      const subtitle = trimmed
        ? 'Try a different name, phone, or code, or register them as a new visitor.'
        : 'Search by visitor code, phone number, or full name to begin check-in.';
      return (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-8 text-center text-sm text-slate-600 shadow-inner">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          {trimmed && (
            <button
              type="button"
              className="mt-4 button-secondary text-xs"
              onClick={() => {
                setSelectedVisitor(null);
                setCreateNew(true);
              }}
            >
              Create New Visitor
            </button>
          )}
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
            isSelected={selectedVisitor?.id === visitor.id}
          />
        ))}
      </div>
    );
  }, [results, query, loading, selectedVisitor]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Front desk operations</p>
        <h2 className="page-title">Check-in and manage visits</h2>
        <p className="page-subtitle">Find a visitor, capture the visit details, and keep the live queue accurate.</p>
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
            <h3 className="text-lg font-semibold text-slate-900">Search Results</h3>
            {results.length > 0 && (
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                onClick={() => setResults([])}
              >
                Clear
              </button>
            )}
          </div>
          {resultCards}
          {!loading && results.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Page {visitorPage} of {visitorTotalPages} · Showing {results.length} of {visitorTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                  onClick={() => handleVisitorPageChange(visitorPage - 1)}
                  disabled={visitorPage <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-50 hover:bg-slate-50"
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
            onAddVisitor={() => {
              setSelectedVisitor(null);
              setCreateNew(true);
            }}
            onClear={handleClearForm}
            disabled={actionLoading || !canManageVisits}
          />
          
          <div className="clay-card p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <p className="eyebrow">Step 2: Check-in Form</p>
              <h3 className="text-lg font-bold text-slate-950">Check-in Details</h3>
            </div>

            {selectedVisitor ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-slate-900 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white uppercase shadow-sm">
                      {selectedVisitor.full_name?.charAt(0)?.toUpperCase() || 'V'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950 truncate">{selectedVisitor.full_name}</p>
                      <p className="text-xs text-slate-600 truncate">
                        {selectedVisitor.phone_number} {selectedVisitor.code ? `· Code: ${selectedVisitor.code}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800 tracking-wide">
                      {selectedVisitor.visitor_type?.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedVisitor}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-955 transition"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createNew}
                    onChange={(event) => setCreateNew(event.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Create new visitor record</span>
                </label>

                {createNew ? (
                  <div className="space-y-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200">
                    <div>
                      <label htmlFor="new-full-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
                      <input
                        id="new-full-name"
                        className={`w-full rounded-xl border ${fieldErrors.full_name ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white'} px-4 py-2 text-sm shadow-inner`}
                        placeholder="Full name"
                        value={visitorForm.full_name}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, full_name: event.target.value }))}
                      />
                      {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name}</p>}
                    </div>
                    <div>
                      <label htmlFor="new-phone-number" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                      <input
                        id="new-phone-number"
                        className={`w-full rounded-xl border ${fieldErrors.phone_number ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white'} px-4 py-2 text-sm shadow-inner`}
                        placeholder="Phone number"
                        value={visitorForm.phone_number}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                      />
                      {fieldErrors.phone_number && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone_number}</p>}
                    </div>
                    <div>
                      <label htmlFor="new-visitor-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Visitor Type</label>
                      <select
                        id="new-visitor-type"
                        className={`w-full rounded-xl border ${fieldErrors.visitor_type ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white'} px-4 py-2 text-sm shadow-inner`}
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
                      <label htmlFor="new-visitor-code" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Visitor Code (if required)</label>
                      <input
                        id="new-visitor-code"
                        className={`w-full rounded-xl border ${fieldErrors.code ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white'} px-4 py-2 text-sm shadow-inner`}
                        placeholder="Visitor code (if required)"
                        value={visitorForm.code}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, code: event.target.value }))}
                      />
                      {fieldErrors.code && <p className="mt-1 text-xs text-red-600">{fieldErrors.code}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Please search and select a visitor above, or check the box to create a new visitor.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <label htmlFor="visit-purpose" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Purpose of Visit</label>
                <input
                  id="visit-purpose"
                  className={`w-full rounded-xl border ${fieldErrors.purpose ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50'} px-4 py-2 text-sm shadow-inner`}
                  placeholder="Purpose of visit"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                />
                {fieldErrors.purpose && <p className="mt-1 text-xs text-red-600">{fieldErrors.purpose}</p>}
              </div>
              <div>
                <label htmlFor="visit-person-to-see" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Person to See</label>
                <input
                  id="visit-person-to-see"
                  className={`w-full rounded-xl border ${fieldErrors.personToSee ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50'} px-4 py-2 text-sm shadow-inner`}
                  placeholder="Person to see"
                  value={personToSee}
                  onChange={(event) => setPersonToSee(event.target.value)}
                />
                {fieldErrors.personToSee && <p className="mt-1 text-xs text-red-600">{fieldErrors.personToSee}</p>}
              </div>
            </div>

            <button
              type="button"
              className="w-full button-primary py-3 text-base justify-center shadow-sm"
              onClick={handleCheckIn}
              disabled={actionLoading || !canManageVisits}
            >
              {actionLoading ? 'Processing check-in...' : 'Confirm Check-in'}
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
