import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import { bootstrapNativeShell } from './native.js';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Ajustes do shell nativo (status bar, splash screen) quando rodando
// dentro do app Android/iOS empacotado via Capacitor. E um no-op no
// navegador/PWA.
bootstrapNativeShell();

// Registra o service worker do PWA (permite instalar o Nexus AI no
// Android/iOS via "Adicionar a tela inicial", com o app shell em cache).
// Em builds nativas via Capacitor isso e um no-op inofensivo.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha silenciosa: o app continua funcionando normalmente sem PWA offline.
    });
  });
}
