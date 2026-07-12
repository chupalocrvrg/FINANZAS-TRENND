import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx'; import { ErrorBoundary } from './ErrorBoundary';
import './index.css';
import { AuthProvider } from './lib/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><AuthProvider>
      <App />
    </AuthProvider></ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
        // Request background sync
        if ('sync' in reg) {
          (reg as any).sync.register('sync-ledger').catch(() => {});
        }
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}
