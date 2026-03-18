import React from 'react';

const TYPE_STYLES = {
  BD: 'bg-blue-100 text-blue-800 border-blue-200',
  MS: 'bg-orange-100 text-orange-800 border-orange-200',
  AGG: 'bg-green-100 text-green-800 border-green-200',
  AGENT_MERCHANT: 'bg-gray-100 text-gray-700 border-gray-200'
};

export default function VisitorCard({ visitor, onSelect }) {
  if (!visitor) return null;
  const badgeStyle = TYPE_STYLES[visitor.visitor_type] || 'bg-clay-200 text-clay-700 border-clay-200';

  return (
    <div className="clay-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-clay-900">{visitor.full_name}</h3>
        <span className={`text-xs font-semibold uppercase border px-3 py-1 rounded-full ${badgeStyle}`}>
          {visitor.visitor_type?.replace('_', ' ')}
        </span>
      </div>
      <div className="text-sm text-clay-700">
        <p>Phone: {visitor.phone_number}</p>
        {visitor.code ? <p>Code: {visitor.code}</p> : <p>No code</p>}
      </div>
      {onSelect && (
        <button
          className="self-start rounded-lg border border-clay-300 px-3 py-1 text-sm text-clay-700 hover:bg-clay-200"
          onClick={() => onSelect(visitor)}
        >
          Use for check-in
        </button>
      )}
    </div>
  );
}
