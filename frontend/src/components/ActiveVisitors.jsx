import React, { useState } from 'react';

const TYPE_COLORS = {
  BD: 'bg-blue-500',
  MS: 'bg-orange-500',
  AGG: 'bg-green-500',
  AGENT_MERCHANT: 'bg-gray-500'
};

export default function ActiveVisitors({ visits, onCheckout, loading, canManage = true }) {
  const [localCheckingOut, setLocalCheckingOut] = useState({});

  const handleCheckout = async (visit) => {
    const confirmed = window.confirm(`Check out ${visit.full_name}?`);
    if (!confirmed) return;
    
    setLocalCheckingOut((prev) => ({ ...prev, [visit.visit_id]: true }));
    try {
      await onCheckout(visit.visit_id);
    } catch (err) {
      // Errors are handled by the page API caller
    } finally {
      setLocalCheckingOut((prev) => ({ ...prev, [visit.visit_id]: false }));
    }
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
        {loading && (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            <span className="inline-block animate-pulse">Loading active visits...</span>
          </div>
        )}
        {!loading && visits.length === 0 && (
          <div className="px-5 py-12 text-center max-w-md mx-auto">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
            </div>
            <p className="text-base font-bold text-slate-900">No active visits</p>
            <p className="mt-1.5 text-sm text-slate-500">
              There are currently no active visitors signed into the building. New check-ins will appear here in real time.
            </p>
          </div>
        )}
        {!loading && visits.map((visit) => {
          const isProcessing = !!localCheckingOut[visit.visit_id];
          return (
            <div key={visit.visit_id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className={`h-3 w-3 rounded-full mt-1.5 ${TYPE_COLORS[visit.visitor_type] || 'bg-slate-400'} glow-dot`} />
                <div>
                  <p className="font-semibold text-slate-900">{visit.full_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {visit.visitor_type?.replace('_', ' ')}
                    {visit.code ? ` · Code: ${visit.code}` : ''}
                    {visit.phone_number ? ` · Phone: ${visit.phone_number}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Checked in {new Date(visit.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {visit.person_to_see && ` · To see ${visit.person_to_see}`}
                    {visit.purpose && ` · Purpose: ${visit.purpose}`}
                    {visit.officer_name && ` · Checked in by ${visit.officer_name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="button-secondary self-start md:self-auto hover:border-red-200 hover:text-red-600 transition focus-visible:ring-red-500"
                onClick={() => handleCheckout(visit)}
                disabled={loading || isProcessing || !canManage}
              >
                {isProcessing ? 'Checking out...' : 'Check out'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

