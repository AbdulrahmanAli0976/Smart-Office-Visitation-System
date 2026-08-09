import React from 'react';

const TYPE_COLORS = {
  BD: 'bg-blue-500',
  MS: 'bg-orange-500',
  AGG: 'bg-green-500',
  AGENT_MERCHANT: 'bg-gray-500'
};

export default function ActiveVisitors({ visits, onCheckout, loading, canManage = true }) {
  const handleCheckout = (visit) => {
    const confirmed = window.confirm(`Check out ${visit.full_name}?`);
    if (confirmed) onCheckout(visit.visit_id);
  };

  return (
    <section className="clay-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Live queue</p>
          <h3 className="section-title">Active visits</h3>
        </div>
        <span className="status-pill status-pill-success">{visits.length} active</span>
      </div>
      <div className="divide-y divide-slate-100">
        {loading && <p className="px-5 py-8 text-sm text-slate-500">Loading active visits...</p>}
        {!loading && visits.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No active visits</p>
            <p className="mt-1 text-sm text-slate-500">New check-ins will appear here in real time.</p>
          </div>
        )}
        {!loading && visits.map((visit) => (
          <div key={visit.visit_id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${TYPE_COLORS[visit.visitor_type] || 'bg-slate-400'} glow-dot`} />
              <div>
                <p className="font-semibold text-slate-900">{visit.full_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {visit.visitor_type?.replace('_', ' ')} · Checked in {new Date(visit.time_in).toLocaleTimeString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">To see {visit.person_to_see || '—'} · {visit.officer_name}</p>
              </div>
            </div>
            <button
              type="button"
              className="button-secondary self-start md:self-auto"
              onClick={() => handleCheckout(visit)}
              disabled={loading || !canManage}
            >
              Check out
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
