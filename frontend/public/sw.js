/**
 * Service Worker minimo do Nexus AI PWA.
 * Estrategia: "network first, cache fallback" para navegacao e assets
 * estaticos, o suficiente para permitir instalacao no Android/iOS e
 * abrir o app mesmo com conexao instavel. Chamadas de API e WebSocket
 * NUNCA sao cacheadas (sempre precisam de dados atuais/tempo real).
 */
const CACHE_NAME = 'nexus-ai-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca intercepta chamadas de API ou WebSocket - precisam ser sempre ao vivo.
  if (url.pathname.startsWith('/api/') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html'))),
  );
});
