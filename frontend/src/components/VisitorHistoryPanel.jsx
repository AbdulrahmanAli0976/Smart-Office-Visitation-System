import React from 'react';

export default function VisitorHistoryPanel({ visitor, visits, onClose }) {
  if (!visitor) return null;

  return (
    <section className="clay-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Visitor</p>
          <h3 className="text-lg font-semibold text-clay-900">History for {visitor.full_name}</h3>
          <p className="text-sm text-clay-600">{visitor.phone_number}</p>
        </div>
        <button
          className="rounded-lg border border-clay-300 px-3 py-1 text-sm text-clay-700 hover:bg-clay-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {visits.length === 0 && <p className="text-sm text-clay-600">No visit history available.</p>}

      {visits.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-clay-600">
                <th className="pb-2">Purpose</th>
                <th className="pb-2">Person to See</th>
                <th className="pb-2">Check-in</th>
                <th className="pb-2">Check-out</th>
                <th className="pb-2">Officer</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-clay-800">
              {visits.map((visit) => (
                <tr key={visit.visit_id} className="border-t border-white/70">
                  <td className="py-2">{visit.purpose}</td>
                  <td className="py-2">{visit.person_to_see}</td>
                  <td className="py-2">{new Date(visit.time_in).toLocaleString()}</td>
                  <td className="py-2">{visit.time_out ? new Date(visit.time_out).toLocaleString() : '—'}</td>
                  <td className="py-2">{visit.officer_name}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${visit.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-clay-200 text-clay-700'}`}>
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
