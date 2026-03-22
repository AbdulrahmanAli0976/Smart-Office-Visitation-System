import React, { useMemo, useState } from 'react';

const TYPE_OPTIONS = [
  { value: 'BD', label: 'BD (Code required)' },
  { value: 'MS', label: 'MS (Code required)' },
  { value: 'AGG', label: 'AGG (Code required)' },
  { value: 'AGENT_MERCHANT', label: 'Agent/Merchant (No code)' },
  { value: 'OTHER', label: 'Other (No code)' }
];

const CODE_REQUIRED = new Set(['BD', 'MS', 'AGG']);
const NO_CODE = new Set(['AGENT_MERCHANT', 'OTHER']);
const MAX_ROWS = 150;

const createRow = () => ({
  full_name: '',
  phone: '',
  type: 'BD',
  code: ''
});

function validateRow(row) {
  const errors = {};
  if (!row.full_name.trim()) errors.full_name = 'Full name is required.';
  if (!row.phone.trim()) errors.phone = 'Phone number is required.';
  if (!row.type) errors.type = 'Visitor type is required.';
  if (CODE_REQUIRED.has(row.type) && !row.code.trim()) {
    errors.code = 'Code is required for this visitor type.';
  }
  if (NO_CODE.has(row.type) && row.code.trim()) {
    errors.code = 'Code must be empty for this visitor type.';
  }
  return errors;
}

export default function BulkCheckInPanel({ onSubmit, loading, summary, error, disabled, onReset }) {
  const [rows, setRows] = useState([createRow()]);
  const [rowErrors, setRowErrors] = useState([]);
  const hasRows = rows.length > 0;

  const totalErrors = useMemo(
    () => rowErrors.reduce((count, entry) => count + Object.keys(entry || {}).length, 0),
    [rowErrors]
  );

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setRowErrors((prev) => prev.map((entry, i) => (i === index ? {} : entry)));
    if (onReset) onReset();
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, createRow()]);
    setRowErrors((prev) => [...prev, {}]);
    if (onReset) onReset();
  };

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setRowErrors((prev) => prev.filter((_, i) => i !== index));
    if (onReset) onReset();
  };

  const handleSubmit = async () => {
    if (!onSubmit || disabled) return;
    const nextErrors = rows.map((row) => validateRow(row));
    setRowErrors(nextErrors);
    if (nextErrors.some((entry) => Object.keys(entry).length > 0)) {
      return;
    }

    const payload = rows.map((row) => ({
      full_name: row.full_name.trim(),
      phone: row.phone.trim(),
      type: row.type,
      code: row.code.trim()
    }));

    await onSubmit(payload);
  };

  return (
    <section className="clay-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Bulk Check-In</p>
          <h3 className="text-lg font-semibold text-clay-900">Process multiple visitors</h3>
        </div>
        <span className="text-xs text-clay-600">{rows.length}/{MAX_ROWS}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {summary && (
        <div className="rounded-xl border border-green-200 bg-green-50/70 px-4 py-3 text-sm text-green-700">
          <p className="font-semibold">Bulk check-in complete</p>
          <p>Created: {summary.created} · Reused: {summary.reused} · Failed: {summary.failed}</p>
        </div>
      )}

      {totalErrors > 0 && (
        <p className="text-xs text-red-600">Fix the highlighted rows before submitting.</p>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => {
          const errors = rowErrors[index] || {};
          return (
            <div key={`row-${index}`} className="grid gap-2 rounded-xl bg-white/70 p-3 shadow-inner md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
              <div>
                <input
                  className={`w-full rounded-lg border ${errors.full_name ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-3 py-2 text-sm shadow-inner`}
                  placeholder="Full name"
                  value={row.full_name}
                  onChange={(event) => updateRow(index, { full_name: event.target.value })}
                />
                {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
              </div>
              <div>
                <input
                  className={`w-full rounded-lg border ${errors.phone ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-3 py-2 text-sm shadow-inner`}
                  placeholder="Phone"
                  value={row.phone}
                  onChange={(event) => updateRow(index, { phone: event.target.value })}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <select
                  className={`w-full rounded-lg border ${errors.type ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-3 py-2 text-sm shadow-inner`}
                  value={row.type}
                  onChange={(event) => updateRow(index, { type: event.target.value, code: '' })}
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type}</p>}
              </div>
              <div>
                <input
                  className={`w-full rounded-lg border ${errors.code ? 'border-red-300 bg-red-50/70' : 'border-white/70 bg-white/70'} px-3 py-2 text-sm shadow-inner`}
                  placeholder="Code (optional)"
                  value={row.code}
                  onChange={(event) => updateRow(index, { code: event.target.value })}
                />
                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
              </div>
              <div className="flex items-start justify-end">
                <button
                  className="rounded-lg border border-clay-300 px-3 py-2 text-xs text-clay-700 disabled:opacity-50"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1 || disabled}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg border border-clay-300 px-3 py-2 text-xs text-clay-700 disabled:opacity-60"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS || disabled}
        >
          Add Row
        </button>
        <button
          className="rounded-xl bg-clay-800 px-5 py-2 text-sm text-white shadow-clay disabled:opacity-60"
          onClick={handleSubmit}
          disabled={disabled || loading || !hasRows}
        >
          {loading ? 'Submitting...' : 'Submit All'}
        </button>
      </div>
    </section>
  );
}
