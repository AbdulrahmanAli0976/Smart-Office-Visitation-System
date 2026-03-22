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
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Analytics</p>
          <h3 className="text-lg font-semibold text-clay-900">Visits overview</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3 text-xs text-clay-700">
          <label className="flex flex-col gap-1">
            <span>From</span>
            <input
              type="date"
              className="rounded-lg border border-clay-200 bg-white/70 px-3 py-1"
              value={range?.from || ''}
              onChange={(event) => onRangeChange?.({ ...range, from: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>To</span>
            <input
              type="date"
              className="rounded-lg border border-clay-200 bg-white/70 px-3 py-1"
              value={range?.to || ''}
              onChange={(event) => onRangeChange?.({ ...range, to: event.target.value })}
            />
          </label>
          <button
            className="rounded-lg bg-clay-800 px-4 py-2 text-xs text-white shadow-clay"
            onClick={onApplyRange}
          >
            Apply
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-clay-600">Loading charts...</p>}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/70 p-4 shadow-inner">
              <p className="text-sm font-semibold text-clay-800">Visits per day</p>
              {perDay.length === 0 && <p className="text-sm text-clay-600">No visit data yet.</p>}
              {perDay.length > 0 && (
                <div className="mt-3">
                  <svg viewBox="0 0 420 160" className="w-full">
                    <polyline
                      fill="none"
                      stroke="#3d3329"
                      strokeWidth="3"
                      points={linePoints}
                    />
                    <circle
                      cx="24"
                      cy="136"
                      r="3"
                      fill="#3d3329"
                    />
                  </svg>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-clay-600">
                    {perDay.map((row) => (
                      <span key={row.day} className="rounded-full bg-clay-100 px-2 py-1">
                        {row.day}: {row.total_visits}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/70 p-4 shadow-inner">
              <p className="text-sm font-semibold text-clay-800">Recent activity</p>
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="text-sm text-clay-600">No recent activity.</p>
              )}
              {recentActivity && recentActivity.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs text-clay-700">
                    <thead>
                      <tr className="text-left text-clay-500">
                        <th className="py-2 pr-3">Visitor</th>
                        <th className="py-2 pr-3">Officer</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Time In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((visit) => (
                        <tr key={visit.visit_id} className="border-t border-clay-100">
                          <td className="py-2 pr-3 font-semibold text-clay-800">{visit.full_name}</td>
                          <td className="py-2 pr-3">{visit.officer_name}</td>
                          <td className="py-2 pr-3">{visit.status}</td>
                          <td className="py-2">{new Date(visit.time_in).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 shadow-inner space-y-3">
            <p className="text-sm font-semibold text-clay-800">Visitor type distribution</p>
            {typeDistribution.length === 0 && <p className="text-sm text-clay-600">No data yet.</p>}
            {typeDistribution.map((row) => (
              <div key={row.visitor_type} className="flex items-center gap-3">
                <span className="text-xs text-clay-600 w-24">{row.visitor_type}</span>
                <div className="flex-1 h-3 rounded-full bg-clay-200">
                  <div
                    className="h-3 rounded-full bg-clay-700"
                    style={{ width: `${Math.round((Number(row.total) / maxType) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-clay-600 w-8 text-right">{row.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
