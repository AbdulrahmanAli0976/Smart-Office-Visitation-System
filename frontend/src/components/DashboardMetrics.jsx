import React from 'react';

function formatPeak(peak) {
  if (!peak) return 'N/A';
  const hour = String(peak.hour).padStart(2, '0');
  return `${hour}:00 - ${hour}:59 (${peak.visits})`;
}

export default function DashboardMetrics({ metrics, loading, isAdmin }) {
  const items = [
    { label: 'Total visitors today', value: metrics?.visitors_today ?? 'N/A' },
    { label: 'Active visits', value: metrics?.active_visitors_now ?? 'N/A' },
    { label: 'Completed visits', value: metrics?.completed_today ?? 'N/A' }
  ];

  if (isAdmin) {
    items.push({ label: 'Pending officers', value: metrics?.pending_officers ?? 'N/A' });
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">Today at a glance</p>
        <h3 className="section-title">Operational metrics</h3>
      </div>
      {loading && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-sm">Loading operational metrics...</div>}
      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className="stat-card">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                <p className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
      )}
      {!loading && <p className="text-xs text-slate-500">Peak hour today: {formatPeak(metrics?.peak_visit_hour)}</p>}
    </section>
  );
}
