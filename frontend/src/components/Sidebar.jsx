import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Visitors', to: '/visitors' },
  { label: 'Visits', to: '/visits' },
  { label: 'Reports', to: '/reports' }
];

export default function Sidebar({ user, isAdmin, onLogout }) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-clay-200 bg-white/80 px-5 py-6">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">VMS</p>
        <h1 className="text-xl font-semibold text-clay-900">Control Center</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-clay-800 text-white shadow-clay' : 'text-clay-700 hover:bg-clay-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-clay-800 text-white shadow-clay' : 'text-clay-700 hover:bg-clay-100'
              }`
            }
          >
            Admin
          </NavLink>
        )}
      </nav>

      {user && (
        <div className="mt-6 rounded-2xl border border-clay-200 bg-white/70 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-clay-600">Signed in</p>
          <p className="mt-2 font-semibold text-clay-900">{user.full_name}</p>
          <p className="text-xs text-clay-600">{user.role}</p>
          <button
            className="mt-4 w-full rounded-lg border border-clay-300 px-3 py-2 text-xs text-clay-700 hover:bg-clay-200"
            onClick={() => onLogout()}
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}

