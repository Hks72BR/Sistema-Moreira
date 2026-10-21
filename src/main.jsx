import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (
  'serviceWorker' in navigator &&
  import.meta.env.MODE !== 'offline' &&
  (import.meta.env.PROD || import.meta.env.MODE === 'lan')
) {
  window.addEventListener('load', () => {
    const serviceWorker = import.meta.env.PROD ? '/sw.js' : '/sw-dev.js';
    navigator.serviceWorker.register(serviceWorker).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
