// Import the Firebase SDK for Google Cloud Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// This script assumes you have a firebase-config.js file in your public directory
// or that these values are passed some other way.
self.firebase.initializeApp({
  apiKey: "YOUR_API_KEY", // Replace with your actual config
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = self.firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize the notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.png' // default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 