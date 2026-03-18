import React from 'react';

const TYPE_COLORS = {
  BD: 'bg-blue-500',
  MS: 'bg-orange-500',
  AGG: 'bg-green-500',
  AGENT_MERCHANT: 'bg-gray-500'
};

export default function ActiveVisitors({ visits, onCheckout, loading }) {
  return (
    <div className="clay-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Visitors</h3>
        <span className="text-sm text-clay-600">{visits.length} active</span>
      </div>
      <div className="space-y-4">
        {visits.length === 0 && (
          <p className="text-sm text-clay-600">No active visits yet.</p>
        )}
        {visits.map((visit) => (
          <div key={visit.visit_id} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-inner">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${TYPE_COLORS[visit.visitor_type] || 'bg-clay-500'} glow-dot`} />
              <div>
                <p className="font-medium text-clay-900">{visit.full_name}</p>
                <p className="text-xs text-clay-600">Checked in {new Date(visit.time_in).toLocaleTimeString()}</p>
              </div>
            </div>
            <button
              className="rounded-lg border border-clay-300 px-3 py-1 text-sm text-clay-700 hover:bg-clay-200 disabled:opacity-60"
              onClick={() => onCheckout(visit.visit_id)}
              disabled={loading}
            >
              Check-out
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
