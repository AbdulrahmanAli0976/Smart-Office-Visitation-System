import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MaintenancePage({ message, onReturnToLogin }) {
  const navigate = useNavigate();

  const handleReturn = () => {
    if (onReturnToLogin) {
      onReturnToLogin();
    } else {
      localStorage.removeItem('vms_token');
      localStorage.removeItem('vms_user');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient blue background elements */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center space-y-6">
          {/* Brand Header */}
          <div className="flex flex-col items-center gap-2">
            <span className="brand-mark mb-1" aria-hidden="true">V</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Visitor Hub</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">System Maintenance</h1>
          </div>

          {/* Maintenance Message */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-slate-700">
            {message || "Kindly be patient with us. There's a maintenance going on, which will be resolved shortly."}
          </div>

          {/* Session Note */}
          <p className="text-xs text-slate-500 font-medium">
            Your session has been safely closed.
          </p>

          {/* Return to Login Action */}
          <button
            type="button"
            className="w-full button-primary py-3 text-base justify-center shadow-sm"
            onClick={handleReturn}
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
