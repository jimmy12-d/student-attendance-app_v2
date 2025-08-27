// Custom service worker for PWA navigation handling
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache all generated assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// Skip waiting and claim clients immediately
self.skipWaiting();
self.addEventListener('activate', () => {
  self.clients.claim();
});

// Cache key pages for offline functionality
const pagesToCache = ['/login', '/student/attendance', '/', '/student'];

// Handle navigation to ensure PWA doesn't break out of standalone mode
const navigationHandler = new NetworkFirst({
  cacheName: 'pages',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
    }),
  ],
});

// Register navigation route that handles client-side routing
const navigationRoute = new NavigationRoute(navigationHandler, {
  allowlist: [
    new RegExp('^/login$'),
    new RegExp('^/student/attendance$'),
    new RegExp('^/$'),
    new RegExp('^/student/.*$'),
    new RegExp('^/dashboard/.*$'),
  ],
  denylist: [
    new RegExp('^/api/.*$'),
    new RegExp('.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$'),
  ],
});

registerRoute(navigationRoute);

// Cache API requests with network-first strategy
registerRoute(
  ({ request }) => request.destination === 'empty' && request.url.includes('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
);

// Cache Firebase/Firestore requests
registerRoute(
  ({ url }) => url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase'),
  new NetworkFirst({
    cacheName: 'firebase-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache static assets
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// Handle message events for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open('manual-cache').then((cache) => {
        return cache.addAll(event.data.payload);
      })
    );
  }
});

// Handle client-side navigation events to prevent breaking out of PWA
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle navigation requests specifically
  if (request.mode === 'navigate') {
    // Ensure we stay within the PWA context
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, try to serve from cache
        return caches.match('/login') || caches.match('/');
      })
    );
  }
});

// Pre-cache critical pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pages').then((cache) => {
      return cache.addAll(pagesToCache);
    })
  );
});
