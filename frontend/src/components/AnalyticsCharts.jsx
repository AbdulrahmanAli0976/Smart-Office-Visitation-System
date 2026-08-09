import React from 'react';

function maxValue(rows, field) {
  if (!rows || rows.length === 0) return 1;
  return Math.max(...rows.map((row) => Number(row[field] || 0)), 1);
}

function buildLinePoints(rows, field) {
  if (!rows || rows.length === 0) return '';
  const width = 420;
  const height = 160;
  const padding = 24;
  const max = maxValue(rows, field);
  const step = rows.length > 1 ? (width - padding * 2) / (rows.length - 1) : 0;

  return rows
    .map((row, index) => {
      const x = padding + index * step;
      const value = Number(row[field] || 0);
      const y = height - padding - (value / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

export default function AnalyticsCharts({
  perDay,
  typeDistribution,
  loading,
  range,
  onRangeChange,
  onApplyRange,
  recentActivity
}) {
  const maxType = maxValue(typeDistribution, 'total');
  const linePoints = buildLinePoints(perDay, 'total_visits');

  return (
    <section className="clay-card p-5 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">Analytics</p>
          <h3 className="section-title">Visits overview</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-600">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-500">From</span>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:bg-white"
              value={range?.from || ''}
              onChange={(event) => onRangeChange?.({ ...range, from: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-500">To</span>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:bg-white"
              value={range?.to || ''}
              onChange={(event) => onRangeChange?.({ ...range, to: event.target.value })}
            />
          </label>
          <button
            type="button"
            className="button-primary text-xs px-4 py-1.5"
            onClick={onApplyRange}
          >
            Apply
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500 animate-pulse">Loading charts...</p>}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-inner">
              <p className="text-sm font-bold text-slate-900">Visits per day</p>
              {perDay.length === 0 && <p className="mt-2 text-sm text-slate-500">No visit data yet.</p>}
              {perDay.length > 0 && (
                <div className="mt-3">
                  <svg viewBox="0 0 420 160" className="w-full">
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      points={linePoints}
                    />
                    <circle
                      cx="24"
                      cy="136"
                      r="3"
                      fill="#2563eb"
                    />
                  </svg>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    {perDay.map((row) => (
                      <span key={row.day} className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 font-medium text-blue-700">
                        {row.day}: {row.total_visits}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-inner">
              <p className="text-sm font-bold text-slate-900">Recent activity</p>
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="mt-2 text-sm text-slate-500">No recent activity.</p>
              )}
              {recentActivity && recentActivity.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs text-slate-700">
                    <thead>
                      <tr className="text-left text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2 pr-3">Visitor</th>
                        <th className="py-2 pr-3">Officer</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Time In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((visit) => (
                        <tr key={visit.visit_id} className="border-t border-slate-200/80">
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">{visit.full_name}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{visit.officer_name}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              visit.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {visit.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500">{new Date(visit.time_in).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-inner space-y-3">
            <p className="text-sm font-bold text-slate-900">Visitor type distribution</p>
            {typeDistribution.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {typeDistribution.map((row) => (
              <div key={row.visitor_type} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 w-24 truncate">{row.visitor_type?.replace('_', ' ')}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.round((Number(row.total) / maxType) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-8 text-right">{row.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
