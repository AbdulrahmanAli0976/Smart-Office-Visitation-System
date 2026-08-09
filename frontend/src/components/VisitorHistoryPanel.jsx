import React from 'react';

export default function VisitorHistoryPanel({ visitor, visits, onClose }) {
  if (!visitor) return null;

  return (
    <section className="clay-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Visitor</p>
          <h3 className="section-title">History for {visitor.full_name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{visitor.phone_number}</p>
        </div>
        <button
          type="button"
          className="button-secondary text-xs px-3 py-1.5"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {visits.length === 0 && <p className="text-sm text-slate-500">No visit history available.</p>}

      {visits.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-xs text-slate-700">
            <thead>
              <tr className="text-left text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Purpose</th>
                <th className="pb-2">Person to See</th>
                <th className="pb-2">Check-in</th>
                <th className="pb-2">Check-out</th>
                <th className="pb-2">Officer</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {visits.map((visit) => (
                <tr key={visit.visit_id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-medium">{visit.purpose}</td>
                  <td className="py-2.5">{visit.person_to_see}</td>
                  <td className="py-2.5 text-slate-500">{new Date(visit.time_in).toLocaleString()}</td>
                  <td className="py-2.5 text-slate-500">{visit.time_out ? new Date(visit.time_out).toLocaleString() : '-'}</td>
                  <td className="py-2.5 text-slate-600">{visit.officer_name}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      visit.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {visit.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
