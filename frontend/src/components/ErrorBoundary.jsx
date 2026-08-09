import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (error && (error.status === 401 || error.status === 403 || error.isAuthError)) {
      return null;
    }
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (error && (error.status === 401 || error.status === 403 || error.isAuthError)) {
      return;
    }
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="rounded-2xl border border-slate-200 bg-white max-w-lg p-8 text-center shadow-xl space-y-4">
            <p className="eyebrow">Unexpected error</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Something went wrong</h1>
            <p className="text-sm text-slate-600">
              Please refresh the page. If the issue persists, contact support.
            </p>
            <button
              type="button"
              className="button-primary px-6 py-2.5 shadow-sm inline-flex items-center justify-center"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
