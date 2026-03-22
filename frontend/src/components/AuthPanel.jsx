import React, { useState } from 'react';

export default function AuthPanel({ onLogin, onRegister, loading, error, message }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '' });

  const handleLogin = (event) => {
    event.preventDefault();
    onLogin(loginForm);
  };

  const handleRegister = (event) => {
    event.preventDefault();
    onRegister(registerForm);
  };

  return (
    <div className="clay-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-clay-600">System Login (Admin & Officer)</p>
          <h2 className="text-2xl font-semibold">Secure Login</h2>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={`px-3 py-1 rounded-full ${mode === 'login' ? 'bg-clay-800 text-white' : 'bg-white/70 text-clay-700'}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full ${mode === 'register' ? 'bg-clay-800 text-white' : 'bg-white/70 text-clay-700'}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>
      </div>

      {mode === 'login' && (
        <form className="space-y-3" onSubmit={handleLogin}>
          <input
            className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
            placeholder="Email address"
            value={loginForm.email}
            onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="password"
            className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
            placeholder="Password"
            value={loginForm.password}
            onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-clay-800 text-white py-2 shadow-clay disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form className="space-y-3" onSubmit={handleRegister}>
          <input
            className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
            placeholder="Full name"
            value={registerForm.full_name}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, full_name: event.target.value }))}
          />
          <input
            className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
            placeholder="Email address"
            value={registerForm.email}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="password"
            className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-inner"
            placeholder="Password"
            value={registerForm.password}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-clay-800 text-white py-2 shadow-clay disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      )}

      {(error || message) && (
        <div className={`rounded-xl px-4 py-2 text-sm ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <p className="text-xs text-clay-600">
        New officers remain in PENDING status until an admin approves access.
      </p>
    </div>
  );
}
