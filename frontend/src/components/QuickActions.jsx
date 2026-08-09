import React from 'react';

export default function QuickActions({ onAddVisitor, onClear, disabled }) {
  return (
    <div className="clay-card p-5 flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-400">Quick Actions</h3>
      
      <button
        type="button"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onAddVisitor}
        disabled={disabled}
      >
        Create New Visitor
      </button>

      <button
        type="button"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onClear}
        disabled={disabled}
      >
        Clear Selection & Form
      </button>
    </div>
  );
}

