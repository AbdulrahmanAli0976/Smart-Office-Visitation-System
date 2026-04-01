import React from 'react';
import AuthPanel from '../components/AuthPanel.jsx';

export default function LoginPage({ onLogin, onRegister, loading, error, message }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f4f0,_#e4d6c7_55%,_#d5c2ab)] px-4 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center">
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
