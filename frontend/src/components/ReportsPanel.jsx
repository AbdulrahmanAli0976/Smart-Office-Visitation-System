import React from 'react';

const STAT_LABELS = [
  { key: 'total_visits', label: 'Total visits' },
  { key: 'active_visits', label: 'Active now' },
  { key: 'completed_visits', label: 'Completed visits' },
  { key: 'unique_visitors', label: 'Unique visitors' },
  { key: 'avg_duration_minutes', label: 'Avg duration (min)' },
  { key: 'checkins_today', label: 'Check-ins today' },
  { key: 'checkouts_today', label: 'Check-outs today' }
];

export default function ReportsPanel({ summary, loading, rangeLabel, onToggleRange }) {
  return (
    <section className="clay-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Analytics</p>
          <h3 className="text-lg font-semibold text-clay-900">Operational Summary</h3>
          <p className="text-sm text-clay-600">Showing: {rangeLabel}</p>
        </div>
        <button
          className="rounded-lg border border-clay-300 px-3 py-1 text-sm text-clay-700 hover:bg-clay-200 disabled:opacity-60"
          onClick={onToggleRange}
          disabled={loading}
        >
          Toggle Range
        </button>
      </div>

      {loading && <p className="text-sm text-clay-600">Loading analytics...</p>}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAT_LABELS.map((stat) => (
            <div key={stat.key} className="rounded-xl bg-white/70 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-clay-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-clay-900">
                {summary?.[stat.key] ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
