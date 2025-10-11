
// Service Worker Version - Update this to force cache refresh
const SW_VERSION = 'v2.3.0-ios-notification-fix';
console.log('[firebase-messaging-sw.js] Version:', SW_VERSION);

// Import the Firebase app and messaging services
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: urlParams.get("apiKey") || "AIzaSyDlURWNlFO7hZeUBVL5tMCLr8HHdtk_Yac",
  authDomain: urlParams.get("authDomain") || "student-attendance-71ab2.firebaseapp.com",
  projectId: urlParams.get("projectId") || "student-attendance-71ab2",
  storageBucket: urlParams.get("storageBucket") || "student-attendance-71ab2.appspot.com",
  messagingSenderId: urlParams.get("messagingSenderId") || "50079853705",
  appId: urlParams.get("appId") || "1:50079853705:web:1e8e1e9c5b5e1e8e1e8e1e",
};

console.log('[firebase-messaging-sw.js] Service Worker Started with config:', firebaseConfig.projectId);

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Service Worker Install Event - Important for Android
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting(); // Force activation
});

// Service Worker Activate Event - Important for Android
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating...');
  event.waitUntil(self.clients.claim()); // Take control immediately
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  // Check both notification and data payloads for iOS/Android compatibility
  // iOS may receive notification object, Android typically uses data
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new notification';
  
  const notificationOptions = {
    body: notificationBody,
    icon: payload.data?.icon || payload.notification?.icon || "/icon-192x192-3d.png",
    badge: payload.data?.badge || "/icon-192x192-3d.png",
    tag: payload.data?.notificationId || payload.data?.permissionId || payload.data?.requestId || 'default',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200], // Android: vibration pattern
    timestamp: Date.now(),
    data: {
      url: payload.data?.url || '/student/notifications',
      notificationId: payload.data?.notificationId,
      type: payload.data?.type,
      // Include all data fields for click handling
      ...payload.data
    }
  };

  console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle, notificationOptions);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/student/notifications';
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              // Navigate to the notification URL
              return client.navigate(urlToOpen);
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Note: The 'push' event listener is NOT needed here because
// Firebase Messaging SDK's onBackgroundMessage already handles push events.
// Having both would cause duplicate notifications.

console.log('[firebase-messaging-sw.js] Service Worker Initialized');