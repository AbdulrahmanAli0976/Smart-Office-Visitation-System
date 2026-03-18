import React from 'react';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200'
};

export default function AdminPanel({ officers, onApprove, onDeactivate, onDelete, loading }) {
  return (
    <div className="clay-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Admin Control</p>
          <h2 className="text-2xl font-semibold">Officer Approvals</h2>
        </div>
        <span className="text-sm text-clay-600">{officers.length} officers</span>
      </div>

      <div className="space-y-3">
        {officers.length === 0 && (
          <p className="text-sm text-clay-600">No officers registered yet.</p>
        )}
        {officers.map((officer) => (
          <div key={officer.id} className="flex flex-col gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-inner md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-clay-900">{officer.full_name}</p>
              <p className="text-xs text-clay-600">{officer.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold uppercase border px-3 py-1 rounded-full ${STATUS_STYLES[officer.status] || 'bg-clay-200 text-clay-700 border-clay-200'}`}>
                {officer.status}
              </span>
              {officer.status !== 'ACTIVE' && (
                <button
                  className="rounded-lg bg-clay-800 px-3 py-1 text-xs text-white disabled:opacity-60"
                  onClick={() => onApprove(officer.id)}
                  disabled={loading}
                >
                  Approve
                </button>
              )}
              {officer.status === 'ACTIVE' && (
                <button
                  className="rounded-lg border border-clay-300 px-3 py-1 text-xs text-clay-700 disabled:opacity-60"
                  onClick={() => onDeactivate(officer.id)}
                  disabled={loading}
                >
                  Deactivate
                </button>
              )}
              <button
                className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-60"
                onClick={() => onDelete(officer.id)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
