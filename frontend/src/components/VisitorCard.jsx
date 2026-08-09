import React from 'react';

const TYPE_STYLES = {
  BD: 'bg-blue-100 text-blue-800 border-blue-200',
  MS: 'bg-orange-100 text-orange-800 border-orange-200',
  AGG: 'bg-green-100 text-green-800 border-green-200',
  AGENT_MERCHANT: 'bg-gray-100 text-gray-700 border-gray-200'
};

export default function VisitorCard({ visitor, onSelect, onHistory, isSelected = false }) {
  if (!visitor) return null;
  const badgeStyle = TYPE_STYLES[visitor.visitor_type] || 'bg-clay-200 text-clay-700 border-clay-200';

  return (
    <article
      className={`clay-card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
          : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Visitor record</p>
          <h3 className="mt-1 truncate text-lg font-bold text-slate-950">{visitor.full_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isSelected && (
            <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-[0.1em]">
              Selected ✓
            </span>
          )}
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${badgeStyle}`}>
            {visitor.visitor_type?.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Phone</p>
          <p className="mt-1 font-medium text-slate-800">{visitor.phone_number}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Visitor code</p>
          <p className="mt-1 font-medium text-slate-800">{visitor.code || 'Not assigned'}</p>
        </div>
      </div>
      {(onSelect || onHistory) && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {onSelect && (
            <button
              type="button"
              className={isSelected ? 'button-secondary border-blue-300 text-blue-700 bg-blue-50/50' : 'button-primary'}
              onClick={() => onSelect(visitor)}
              aria-pressed={isSelected}
            >
              {isSelected ? 'Selected for check-in' : 'Select for check-in'}
            </button>
          )}
          {onHistory && (
            <button
              type="button"
              className="button-secondary"
              onClick={() => onHistory(visitor)}
            >
              View history
            </button>
          )}
        </div>
      )}
    </article>
  );
}

