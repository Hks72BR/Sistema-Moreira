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

const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : '';

function isUserTypingInForm() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || active.isContentEditable;
}

let isReloading = false;
async function applyUpdateAndReload(registration) {
  if (isReloading) return;
  isReloading = true;
  try {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn('Limpando cache antigo para atualização:', e);
  }
  window.location.reload();
}

function scheduleSafeReload(registration) {
  if (!isUserTypingInForm()) {
    applyUpdateAndReload(registration);
    return;
  }
  // Se o usuário estiver digitando num formulário no exato momento, aguardar sair do campo ou clicar no aviso
  if (!document.getElementById('moreira-update-toast')) {
    const banner = document.createElement('button');
    banner.id = 'moreira-update-toast';
    banner.type = 'button';
    banner.textContent = '🔄 Nova atualização disponível — Clique para atualizar agora';
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '9999',
      background: 'linear-gradient(135deg, #f5a623, #d48806)',
      color: '#0a0a0f',
      fontWeight: '700',
      fontSize: '13px',
      padding: '12px 18px',
      borderRadius: '10px',
      border: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      cursor: 'pointer',
    });
    banner.onclick = () => applyUpdateAndReload(registration);
    document.body.appendChild(banner);
  }
}

if (
  'serviceWorker' in navigator &&
  import.meta.env.MODE !== 'offline' &&
  (import.meta.env.PROD || import.meta.env.MODE === 'lan')
) {
  window.addEventListener('load', async () => {
    const serviceWorkerUrl = import.meta.env.PROD ? '/sw.js' : '/sw-dev.js';
    let registration = null;

    try {
      registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
        updateViaCache: 'none',
      });

      if (registration.waiting) {
        scheduleSafeReload(registration);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            scheduleSafeReload(registration);
          }
        });
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      scheduleSafeReload(registration);
    });

    const checkForNewVersion = async () => {
      if (!navigator.onLine) return;
      try {
        if (registration) {
          await registration.update().catch(() => {});
        }
        if (import.meta.env.PROD && CURRENT_BUILD_ID) {
          const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data?.buildId && String(data.buildId) !== String(CURRENT_BUILD_ID)) {
              scheduleSafeReload(registration);
            }
          }
        }
      } catch {
        // Ignorar falhas de rede silenciosamente
      }
    };

    // Verificar ao abrir, ao voltar para a aba e a cada 60 segundos
    checkForNewVersion();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForNewVersion();
      }
    });
    window.addEventListener('focus', checkForNewVersion);
    window.addEventListener('online', checkForNewVersion);
    setInterval(checkForNewVersion, 60 * 1000);
  });
}
