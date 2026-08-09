import React from 'react';

export default function SearchBar({ value, onChange, onSubmit, loading, disabled, error }) {
  return (
    <form onSubmit={onSubmit} className="w-full" role="search">
      <div className="clay-card p-4 sm:p-5">
        <div className="flex-1">
          <label htmlFor="visitor-search" className="eyebrow">Search visitor records</label>
          <input
            id="visitor-search"
            className={`mt-2 w-full rounded-xl border ${error ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50'} px-4 py-3 text-base text-slate-900 shadow-inner placeholder:text-slate-400 sm:text-lg`}
            placeholder="Search by code, phone, or name"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            autoFocus
          />
          {error && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{error}</p>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Use at least two characters to begin.</p>
          <button type="submit" className="button-primary" disabled={loading || disabled}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  );
}
