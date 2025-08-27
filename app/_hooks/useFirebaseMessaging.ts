"use client";

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { app } from '../../firebase-config'; // Ensure you export 'app' from your config

export const useFirebaseMessaging = (userId: string | null) => {
    const [permission, setPermission] = useState<NotificationPermission | 'loading'>('loading');
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        } else {
            setPermission('denied');
        }
    }, []);

    const requestPermission = async () => {
        if (!userId) {
            console.error("User ID is not available. Cannot request permission.");
            return;
        }

        // Check if the browser supports notifications and service workers
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
            console.error("This browser doesn't support notifications or service workers");
            setPermission('denied');
            return;
        }

        try {
            // Request notification permission first
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                // Wait for service worker to be ready
                const registration = await navigator.serviceWorker.ready;
                console.log('Service worker is ready:', registration);

                // Initialize Firebase messaging
                const messaging = getMessaging(app);
                const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                
                if (!VAPID_KEY || VAPID_KEY === 'your_vapid_key_here') {
                    console.error("VAPID key is not set or is placeholder. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your environment variables.");
                    return;
                }
                
                const currentToken = await getToken(messaging, { 
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (currentToken) {
                    setFcmToken(currentToken);
                    // Save the token to Firestore
                    await setDoc(doc(db, 'fcmTokens', userId), {
                        token: currentToken,
                        userId: userId,
                        createdAt: serverTimestamp(),
                    }, { merge: true });
                    console.log('FCM Token registered:', currentToken);
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Permission not granted for Notification.');
            }
        } catch (error) {
            console.error('An error occurred while retrieving token:', error);
            // Provide more specific error handling
            if (error instanceof Error) {
                if (error.message.includes('messaging/unsupported-browser')) {
                    console.error('This browser is not supported for Firebase messaging');
                } else if (error.message.includes('messaging/permission-blocked')) {
                    console.error('Notification permission was blocked');
                } else if (error.message.includes('messaging/vapid-key-required')) {
                    console.error('VAPID key is required for this operation');
                }
            }
        }
    };
    
    // Optional: Handle foreground messages
    useEffect(() => {
        if (permission === 'granted' && typeof window !== 'undefined') {
            try {
                const messaging = getMessaging(app);
                const unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Message received in foreground:', payload);
                    
                    // Show browser notification for foreground messages
                    if (payload.notification) {
                        const notificationTitle = payload.notification.title || 'New Notification';
                        const notificationOptions = {
                            body: payload.notification.body || '',
                            icon: payload.notification.icon || '/favicon.png',
                            badge: '/favicon.png',
                            tag: payload.data?.notificationId || 'default',
                            renotify: true,
                            requireInteraction: false,
                            data: payload.data || {}
                        };

                        // Check if service worker is available and ready
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.ready.then((registration) => {
                                if (registration && registration.showNotification) {
                                    registration.showNotification(notificationTitle, notificationOptions);
                                } else {
                                    // Fallback to browser notification
                                    if ('Notification' in window && Notification.permission === 'granted') {
                                        new Notification(notificationTitle, notificationOptions);
                                    }
                                }
                            }).catch((error) => {
                                console.error('Error showing notification via service worker:', error);
                                // Fallback to browser notification
                                if ('Notification' in window && Notification.permission === 'granted') {
                                    new Notification(notificationTitle, notificationOptions);
                                }
                            });
                        } else {
                            // Direct browser notification if service worker not available
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(notificationTitle, notificationOptions);
                            }
                        }
                    }
                });
                return () => unsubscribe();
            } catch (error) {
                console.error('Error setting up foreground message listener:', error);
            }
        }
    }, [permission]);

    return { permission, requestPermission, fcmToken };
}; 