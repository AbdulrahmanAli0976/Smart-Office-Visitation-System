import React from 'react';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200'
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
];

export default function AdminPanel({
  officers,
  onApprove,
  onDeactivate,
  onDelete,
  loading,
  search,
  status,
  page,
  totalPages,
  total,
  onSearchChange,
  onStatusChange,
  onPrev,
  onNext
}) {
  return (
    <section className="clay-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Access control</p>
          <h2 className="section-title">Officer approvals</h2>
        </div>
        <span className="text-sm text-slate-500">Showing {officers.length} of {total}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Search officers"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm shadow-inner"
          placeholder="Search officers"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <select
          aria-label="Filter officers by status"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm shadow-inner"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {officers.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-center text-sm text-slate-600">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs uppercase tracking-[0.2em] text-slate-600">i</div>
            <p className="font-semibold text-slate-800">No officers found</p>
            <p className="mt-1 text-xs text-slate-500">Invite new officers or adjust search filters.</p>
          </div>
        )}
        {officers.map((officer) => (
          <div key={officer.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{officer.full_name}</p>
              <p className="text-xs text-slate-500">{officer.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLES[officer.status] || 'bg-slate-200 text-slate-700 border-slate-200'}`}>
                {officer.status}
              </span>
              {officer.status !== 'ACTIVE' && (
                <button
                  className="button-primary"
                  onClick={() => onApprove(officer.id)}
                  disabled={loading}
                >
                  Approve
                </button>
              )}
              {officer.status === 'ACTIVE' && (
                <button
                  className="button-secondary"
                  onClick={() => onDeactivate(officer.id)}
                  disabled={loading}
                >
                  Deactivate
                </button>
              )}
              <button
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                onClick={() => onDelete(officer.id)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Page {page} of {totalPages}</span>
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
