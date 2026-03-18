import React from 'react';

export default function SearchBar({ value, onChange, onSubmit, loading, disabled, error }) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="clay-card px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1">
          <label className="text-sm uppercase tracking-[0.2em] text-clay-600">Smart Search</label>
          <input
            className={`mt-2 w-full rounded-xl border ${error ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-4 py-3 text-lg shadow-inner`}
            placeholder="Search by code, phone, or name"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-clay-800 text-white px-6 py-3 font-medium shadow-clay disabled:opacity-60"
          disabled={loading || disabled}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
