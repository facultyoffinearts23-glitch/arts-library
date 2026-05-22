/*
 * ============================================================
 * sw.js  —  Service Worker
 * منظومة المكتبة الرقمية | كلية الفنون والتصميم
 * جامعة طرابلس — إعداد: د. محمد اقميع © 2026
 * ------------------------------------------------------------
 * ⚠  عند تعديل أي ملف في التطبيق، غيّر رقم الإصدار هنا:
 * CACHE_VERSION = 'v2' (تم التحديث لكسر الكاش القديم)
 * ============================================================
 */

'use strict';

const CACHE_VERSION = 'v2';
const CACHE_NAME    = `arts-library-cache-${CACHE_VERSION}`;
const SCOPE         = '/arts-library';

const STATIC_ASSETS = [
  `${SCOPE}/`,
  `${SCOPE}/index.html`,
  `${SCOPE}/manifest.json`,
  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663672341033/DPcqnCesIGqshKoH.webp',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.tailwindcss.com',
];

const NETWORK_ONLY_ORIGINS = [
  'script.google.com',
  'script.googleusercontent.com',
];

self.addEventListener('install', event => {
  console.log(`[SW ${CACHE_VERSION}] Installing…`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Could not pre-cache: ${url}`, err.message);
          })
        )
      );
    }).then(() => {
      console.log(`[SW ${CACHE_VERSION}] Pre-cache complete.`);
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW ${CACHE_VERSION}] Activating…`);
  event.waitUntil(
    caches.keys().then(allCacheNames => {
      return Promise.all(
        allCacheNames
          .filter(name => name.startsWith('arts-library-cache-') && name !== CACHE_NAME)
          .map(oldCache => {
            console.log(`[SW] Deleting stale cache: ${oldCache}`);
            return caches.delete(oldCache);
          })
      );
    }).then(() => {
      console.log(`[SW ${CACHE_VERSION}] Now controlling all clients.`);
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  if (NETWORK_ONLY_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ status: 'error', message: 'لا يوجد اتصال بالإنترنت' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  if (
    url.pathname === `${SCOPE}/` ||
    url.pathname === `${SCOPE}/index.html` ||
    url.pathname === SCOPE
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok || networkResponse.type === 'opaqueredirect') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(`${SCOPE}/`) || caches.match(`${SCOPE}/index.html`);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    if (request.destination === 'image') {
      return new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
           <rect width="64" height="64" fill="#eef2ff" rx="8"/>
           <text x="50%" y="55%" font-size="10" fill="#8892ae" text-anchor="middle" font-family="Cairo,sans-serif">غير متاح</text>
         </svg>`,
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  return cached || fetchPromise;
}