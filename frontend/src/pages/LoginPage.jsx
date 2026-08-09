import React from 'react';
import AuthPanel from '../components/AuthPanel.jsx';

export default function LoginPage({ onLogin, onRegister, loading, error, message }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle ambient background shapes */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <AuthPanel
          onLogin={onLogin}
          onRegister={onRegister}
          loading={loading}
          error={error}
          message={message}
        />
      </div>
    </div>
  );
}
