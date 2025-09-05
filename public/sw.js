// public/sw.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `veec-planning-${CACHE_VERSION}`;

// ⚠️ Mets ici tes fichiers "app shell" indispensables en offline :
const APP_SHELL = [
  '/',                    // la route racine
  '/index.html',
  '/logo.png',
  '/logo_og_landscape.png',
  '/favicon.ico',
  '/favicon-512.png',
  // Vite génère des assets fingerprintés (/assets/...), on les mettra en "cache-first dynamique"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
      await self.clients.claim();
    })()
  );
});

// Stratégies :
// - HTML (navigations/documents) => Network-first avec fallback cache
// - Assets (JS/CSS/images sous /assets/...) => Cache-first avec fetch en arrière-plan
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On ignore les requêtes non-GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = self.location.origin === url.origin;

  // Documents HTML (navigations)
  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets statiques fingerprintés Vite: /assets/*
  if (isSameOrigin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Images/ico/png/logo
  if (isSameOrigin && /\.(png|jpg|jpeg|gif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Par défaut, passe au réseau
  // (tu peux basculer en cacheFirst pour d'autres types si tu veux)
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    // Optionnel : ne mettre en cache que les 200 OK
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fallback final : index.html (SPA) si la requête est une navigation
    if (req.mode === 'navigate') {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}