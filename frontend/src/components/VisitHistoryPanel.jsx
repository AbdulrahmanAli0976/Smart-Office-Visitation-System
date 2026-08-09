import React from 'react';

const VISITOR_TYPES = [
  { value: '', label: 'All types' },
  { value: 'BD', label: 'BD' },
  { value: 'MS', label: 'MS' },
  { value: 'AGG', label: 'AGG' },
  { value: 'AGENT_MERCHANT', label: 'Agent/Merchant' }
];

const VISIT_STATUS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' }
];

export default function VisitHistoryPanel({
  filters,
  onChange,
  onApply,
  onExport,
  visits,
  loading,
  officers,
  isAdmin,
  page,
  totalPages,
  total,
  onPrev,
  onNext
}) {
  return (
    <section className="clay-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h3 className="section-title">Visit history</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="button-secondary"
            onClick={onApply}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            className="button-primary"
            onClick={onExport}
            disabled={loading}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <input
          type="text"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
          placeholder="Search visitor/officer"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
        <input
          type="date"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
          value={filters.from}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
        <input
          type="date"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
          value={filters.to}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
        <select
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
          value={filters.visitor_type}
          onChange={(event) => onChange({ ...filters, visitor_type: event.target.value })}
        >
          {VISITOR_TYPES.map((item) => (
            <option key={item.label} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
        >
          {VISIT_STATUS.map((item) => (
            <option key={item.label} value={item.value}>{item.label}</option>
          ))}
        </select>
        {isAdmin ? (
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner"
            value={filters.officer_id}
            onChange={(event) => onChange({ ...filters, officer_id: event.target.value })}
          >
            <option value="">All officers</option>
            {officers.map((officer) => (
              <option key={officer.id} value={officer.id}>{officer.full_name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            readOnly
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-inner"
            value="My visits"
          />
        )}
      </div>

      {visits.length === 0 && !loading && (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No visits found for this range.</p>
      )}

      {visits.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2">Visitor</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Check-in</th>
                <th className="pb-2">Check-out</th>
                <th className="pb-2">Officer</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {visits.map((visit) => (
                <tr key={visit.visit_id} className="border-t border-slate-100">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">{visit.full_name}</div>
                    <div className="text-xs text-slate-500">{visit.phone_number}</div>
                  </td>
                  <td className="py-2 text-xs uppercase tracking-[0.1em]">{visit.visitor_type?.replace('_', ' ')}</td>
                  <td className="py-2">{new Date(visit.time_in).toLocaleString()}</td>
                  <td className="py-2">{visit.time_out ? new Date(visit.time_out).toLocaleString() : '—'}</td>
                  <td className="py-2">{visit.officer_name}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${visit.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                      {visit.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Page {page} of {totalPages} · Showing {visits.length} of {total}</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
            onClick={onPrev}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
            onClick={onNext}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
