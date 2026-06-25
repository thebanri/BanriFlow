import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global Error Handler for sending logs to backend
const logErrorToBackend = async (errorMsg, stack) => {
  try {
    const apiUrl = `http://${window.location.hostname}:3005/api/logs/client`;
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: errorMsg,
        stack: stack || '',
        url: window.location.href,
        agent: navigator.userAgent
      })
    });
  } catch (err) {
    console.error("Failed to send log to backend", err);
  }
};

window.addEventListener('error', (event) => {
  logErrorToBackend(event.message, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  logErrorToBackend(event.reason?.message || String(event.reason), event.reason?.stack);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
