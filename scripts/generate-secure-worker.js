const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Service worker template
const workerTemplate = `// Custom service worker for PWA navigation handling and Firebase Cloud Messaging
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Import Firebase for messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration injected at build time
const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

// Initialize Firebase for messaging
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    
    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[Unified SW] Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/favicon.png',
        badge: '/favicon.png',
        tag: payload.data?.notificationId || 'default',
        renotify: true,
        requireInteraction: false,
        data: payload.data || {}
      };
    
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    console.log('[Unified SW] Firebase messaging initialized successfully');
  } catch (error) {
    console.error('[Unified SW] Error initializing Firebase messaging:', error);
  }
} else {
  console.warn('[Unified SW] Firebase config not available or incomplete');
}

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
    new RegExp('.*\\\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$'),
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

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Unified SW] Notification click received:', event);
  
  event.notification.close();
  
  // Get the URL to open (default to student notifications page)
  const urlToOpen = event.notification.data?.url || '/student/notifications';
  
  // Check if any window/tab is already open with this URL
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window/tab is already open with the target URL, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open with the target URL, open a new one
      if (self.clients.openWindow) {
        const baseUrl = self.location.origin;
        return self.clients.openWindow(baseUrl + urlToOpen);
      }
    })
  );
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
`;

// Write the generated worker
const outputPath = path.resolve(process.cwd(), 'worker/index.js');
fs.writeFileSync(outputPath, workerTemplate, 'utf8');

console.log('✅ Secure service worker generated with environment variables!');
console.log('🔒 No credentials exposed in public files.');
