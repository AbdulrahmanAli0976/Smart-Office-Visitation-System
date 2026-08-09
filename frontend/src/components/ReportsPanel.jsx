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
    <section className="clay-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">At a glance</p>
          <h3 className="section-title">Operational summary</h3>
          <p className="mt-1 text-sm text-slate-500">Showing: {rangeLabel}</p>
        </div>
        <button
          className="button-secondary"
          onClick={onToggleRange}
          disabled={loading}
        >
          Toggle Range
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading analytics...</p>}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAT_LABELS.map((stat) => (
            <div key={stat.key} className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
              <p className="mt-3 font-display text-2xl font-bold text-slate-950">
                {summary?.[stat.key] ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
