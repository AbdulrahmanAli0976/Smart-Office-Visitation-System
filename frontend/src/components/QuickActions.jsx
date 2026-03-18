import React from 'react';

export default function QuickActions({ onAddVisitor, onCheckIn, disabled, loading }) {
  return (
    <div className="clay-card p-5 flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Quick Actions</h3>
      <button
        className="w-full rounded-xl bg-clay-800 text-white py-3 shadow-clay disabled:opacity-60"
        onClick={onCheckIn}
        disabled={disabled}
      >
        {loading ? 'Processing...' : 'Check-in Visitor'}
      </button>
      <button
        className="w-full rounded-xl border border-clay-300 py-3 text-clay-700 hover:bg-clay-200 disabled:opacity-60"
        onClick={onAddVisitor}
        disabled={disabled}
      >
        Add Visitor
      </button>
    </div>
  );
}
