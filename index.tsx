import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAnalytics } from './services/analytics';
import SystemDialog from './components/SystemDialog';

// Inicializa GA4 / Meta Pixel / Google Ads (no-op se os IDs não estiverem no .env)
initAnalytics();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Este projeto não usa service worker. Em dev, um SW de outro projeto pode ficar
// registrado na origem localhost:3000 e interceptar/quebrar as chamadas ao Supabase.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
    <SystemDialog />
  </React.StrictMode>
);
