/*
 * ============================================================
 * sw.js  —  Service Worker
 * منظومة المكتبة الرقمية | كلية الفنون والتصميم
 * جامعة طرابلس — إعداد: د. محمد اقميع © 2026
 * ------------------------------------------------------------
 * ⚠ تم التحديث إلى الإصدار v3 لضمان تفعيل نظام الصلاحيات
 * ============================================================
 */

'use strict';

const CACHE_VERSION = 'v3';
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // استراتيجية Cache First للموارد الثابتة
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.includes('fonts')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  } else {
    // استراتيجية Network First للمحتوى المتغير
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});