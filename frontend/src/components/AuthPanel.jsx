import React, { useEffect, useRef, useState } from 'react';

export default function AuthPanel({ onLogin, onRegister, loading, error, message }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const noticeRef = useRef(null);

  useEffect(() => {
    if ((error || message) && noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error, message]);

  const handleLogin = (event) => {
    event.preventDefault();
    onLogin(loginForm);
  };

  const handleRegister = (event) => {
    event.preventDefault();
    onRegister(registerForm);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
      {/* Branding Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <span className="brand-mark" aria-hidden="true">V</span>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-950">Visitor Hub</h1>
            <p className="text-xs text-slate-500 font-medium">Smart Office Visitation System</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>
      </div>

      {/* Mode Title & Subtitle */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {mode === 'login'
            ? 'Sign in to manage visitors, check-ins, and office visits.'
            : 'Request access to join the front desk operations team.'}
        </p>
      </div>

      {/* Notice panel */}
      {(error || message) && (
        <div
          ref={noticeRef}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-red-200 bg-red-50/80 text-red-700'
              : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
          }`}
          role="alert"
        >
          {error || message}
        </div>
      )}

      {/* Forms */}
      {mode === 'login' && (
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:bg-white"
              placeholder="name@company.com"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:bg-white"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>

          <button
            type="submit"
            className="w-full button-primary py-3 text-base justify-center shadow-sm mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:bg-white"
              placeholder="Full name"
              value={registerForm.full_name}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, full_name: event.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:bg-white"
              placeholder="name@company.com"
              value={registerForm.email}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="register-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:bg-white"
              placeholder="••••••••"
              value={registerForm.password}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>

          <button
            type="submit"
            className="w-full button-primary py-3 text-base justify-center shadow-sm mt-2"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      )}

      {/* Bottom informational note */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs text-slate-500 flex items-start gap-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="leading-relaxed">
          Newly registered officers remain in <span className="font-semibold text-slate-700">PENDING</span> status until an administrator approves access.
        </p>
      </div>
    </div>
  );
}
