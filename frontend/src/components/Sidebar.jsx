import React from 'react';
import { NavLink } from 'react-router-dom';

const operations = [
  { label: 'Dashboard', to: '/dashboard', hint: 'Overview' },
  { label: 'Visitor Search', to: '/visitors', hint: 'Find records' },
  { label: 'Check-in & visits', to: '/visits', hint: 'Manage arrivals' },
  { label: 'Reports & history', to: '/reports', hint: 'Review activity' }
];

function NavIcon({ type }) {
  const paths = {
    dashboard: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
    visitors: 'M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-5a2.5 2.5 0 1 1 0 5m4 10v-1a4 4 0 0 0-3-3.87',
    visits: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4h4m-4 4h4m-4 4h2',
    reports: 'M5 20V10m7 10V4m7 16v-7'
  };
  const key = type === 'Dashboard' ? 'dashboard' : type.startsWith('Visitor') ? 'visitors' : type.startsWith('Check') ? 'visits' : 'reports';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[key]} />
    </svg>
  );
}

export default function Sidebar({ user, isAdmin, onLogout, open = false, onClose }) {
  return (
    <aside className={`app-sidebar ${open ? 'app-sidebar-open' : ''}`}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-mark" aria-hidden="true">V</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">VMS</p>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-950">Visitor Hub</h1>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">A focused workspace for safe, efficient office arrivals.</p>
        </div>
        <button type="button" aria-label="Close navigation" className="icon-button lg:hidden" onClick={onClose}>
          <span aria-hidden="true" className="text-lg">×</span>
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto py-7" aria-label="Primary navigation">
        <div>
          <p className="nav-section-label">Workspace</p>
          <div className="mt-3 space-y-1.5">
        {operations.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <NavIcon type={item.label} />
            <span className="min-w-0">
              <span className="block truncate">{item.label}</span>
              <span className="nav-link-hint">{item.hint}</span>
            </span>
          </NavLink>
        ))}
          </div>
        </div>
        {isAdmin && (
          <div>
            <p className="nav-section-label">Administration</p>
            <div className="mt-3 space-y-1.5">
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5c0 4.5 3.2 8.5 7.5 10 4.3-1.5 7.5-5.5 7.5-10V6L12 3Zm0 5v4m0 4h.01" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate">Officers & administration</span>
                  <span className="nav-link-hint">Manage access</span>
                </span>
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      {user && (
        <div className="account-card">
          <div className="flex items-center gap-3">
            <span className="avatar-mark" aria-hidden="true">{user.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.full_name}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
            onClick={() => onLogout()}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

