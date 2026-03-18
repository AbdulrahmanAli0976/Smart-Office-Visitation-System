import React from 'react';

function formatPeak(peak) {
  if (!peak) return '—';
  const hour = String(peak.hour).padStart(2, '0');
  return `${hour}:00 - ${hour}:59 (${peak.visits})`;
}

export default function DashboardMetrics({ metrics, loading }) {
  const items = [
    { label: 'Visitors today', value: metrics?.visitors_today ?? '—' },
    { label: 'Active now', value: metrics?.active_visitors_now ?? '—' },
    { label: 'Completed today', value: metrics?.completed_today ?? '—' },
    { label: 'Peak hour', value: formatPeak(metrics?.peak_visit_hour) }
  ];

  return (
    <section className="clay-card p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Dashboard</p>
        <h3 className="text-lg font-semibold text-clay-900">Live Metrics</h3>
      </div>
      {loading && <p className="text-sm text-clay-600">Loading metrics...</p>}
      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl bg-white/70 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-clay-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-clay-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
