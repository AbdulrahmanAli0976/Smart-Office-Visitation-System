import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './styles.css';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('GLOBAL_ERROR:', {
      message: event.message,
      stack: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('UNHANDLED_PROMISE:', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
