import React from 'react';

function maxValue(rows, field) {
  if (!rows || rows.length === 0) return 1;
  return Math.max(...rows.map((row) => Number(row[field] || 0)), 1);
}

export default function AnalyticsCharts({ perDay, typeDistribution, loading }) {
  const maxDay = maxValue(perDay, 'total_visits');
  const maxType = maxValue(typeDistribution, 'total');

  return (
    <section className="clay-card p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Analytics</p>
        <h3 className="text-lg font-semibold text-clay-900">Trends</h3>
      </div>

      {loading && <p className="text-sm text-clay-600">Loading charts...</p>}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-clay-800">Visitors per day</p>
            {perDay.length === 0 && <p className="text-sm text-clay-600">No visit data yet.</p>}
            {perDay.map((row) => (
              <div key={row.day} className="flex items-center gap-3">
                <span className="text-xs text-clay-600 w-20">{row.day}</span>
                <div className="flex-1 h-3 rounded-full bg-clay-200">
                  <div
                    className="h-3 rounded-full bg-clay-700"
                    style={{ width: `${Math.round((Number(row.total_visits) / maxDay) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-clay-600 w-10 text-right">{row.total_visits}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-clay-800">Visitor type distribution</p>
            {typeDistribution.length === 0 && <p className="text-sm text-clay-600">No data yet.</p>}
            {typeDistribution.map((row) => (
              <div key={row.visitor_type} className="flex items-center gap-3">
                <span className="text-xs text-clay-600 w-28">{row.visitor_type}</span>
                <div className="flex-1 h-3 rounded-full bg-clay-200">
                  <div
                    className="h-3 rounded-full bg-clay-700"
                    style={{ width: `${Math.round((Number(row.total) / maxType) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-clay-600 w-10 text-right">{row.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
