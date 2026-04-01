import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import VisitorCard from '../components/VisitorCard.jsx';
import VisitorHistoryPanel from '../components/VisitorHistoryPanel.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

export default function VisitorsPage() {
  const { token, user, handleAuthFailure } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');

  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorLimit] = useState(10);
  const [visitorTotalPages, setVisitorTotalPages] = useState(1);
  const [visitorTotal, setVisitorTotal] = useState(0);
  const [visitorSearch, setVisitorSearch] = useState('');

  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitorHistory, setVisitorHistory] = useState([]);
  const [visitorHistoryLoading, setVisitorHistoryLoading] = useState(false);

  const noticeRef = useScrollToError(error || searchError);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const lastSearchRef = useRef('');

  const fetchVisitors = async ({ page = visitorPage, search = visitorSearch } = {}) => {
    if (!token || !user) {
      const message = 'Please log in to search visitors.';
      setError(message);
      toast.error(message);
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

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const message = 'Enter at least 2 characters to search.';
      setSearchError(message);
      toast.error(message);
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

  const handleViewHistory = async (visitor) => {
    if (!token || !user) return;
    setVisitorHistoryLoading(true);
    setSelectedVisitor(visitor);
    try {
      const history = await api.getVisitorHistory(visitor.id, token);
      setVisitorHistory(history);
      toast.success('Visitor history loaded.');
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
            onHistory={handleViewHistory}
          />
        ))}
      </div>
    );
  }, [results, query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">Visitors</p>
        <h2 className="text-2xl font-semibold text-clay-900">Search and View Visitors</h2>
        <p className="text-sm text-clay-600">Find visitor records and review visit history.</p>
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
        error={searchError}
      />

      {(error || searchError) && (
        <div
          ref={noticeRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error || searchError}
        </div>
      )}

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
    </div>
  );
}
