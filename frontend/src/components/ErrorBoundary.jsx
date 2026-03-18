import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f7f4f0,_#e4d6c7_55%,_#d5c2ab)] px-4">
          <div className="clay-card max-w-lg p-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-clay-600">Unexpected error</p>
            <h1 className="mt-3 text-2xl font-semibold text-clay-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-clay-700">
              Please refresh the page. If the issue persists, contact support.
            </p>
            <button
              className="mt-5 rounded-xl bg-clay-800 px-6 py-3 text-white shadow-clay"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
