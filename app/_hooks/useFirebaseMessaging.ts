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
        console.log('[useFirebaseMessaging] Starting permission request...');
        console.log('[useFirebaseMessaging] User ID:', userId);
        
        if (!userId) {
            console.error("[useFirebaseMessaging] User ID is not available. Cannot request permission.");
            return;
        }

        // Check if the browser supports notifications and service workers
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
            console.error("[useFirebaseMessaging] This browser doesn't support notifications or service workers");
            console.log('[useFirebaseMessaging] Browser checks:', {
                isWindow: typeof window !== 'undefined',
                hasNotification: 'Notification' in window,
                hasServiceWorker: 'serviceWorker' in navigator
            });
            setPermission('denied');
            return;
        }

        console.log('[useFirebaseMessaging] Browser support confirmed');

        try {
            // Request notification permission first
            console.log('[useFirebaseMessaging] Requesting notification permission...');
            const permissionResult = await Notification.requestPermission();
            console.log('[useFirebaseMessaging] Permission result:', permissionResult);
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                console.log('[useFirebaseMessaging] Permission granted! Registering service worker...');
                // Wait for service worker to be ready (simplified registration for iOS compatibility)
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/'
                });
                await navigator.serviceWorker.ready;
                console.log('[useFirebaseMessaging] Service worker registered:', registration.scope);

                // Initialize Firebase messaging
                console.log('[useFirebaseMessaging] Initializing Firebase Messaging...');
                const messaging = getMessaging(app);
                const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                
                if (!VAPID_KEY || VAPID_KEY === 'your_vapid_key_here') {
                    console.error("[useFirebaseMessaging] VAPID key is not set or is placeholder.");
                    return;
                }
                
                console.log('[useFirebaseMessaging] Getting FCM token...');
                const currentToken = await getToken(messaging, { 
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (currentToken) {
                    console.log('[useFirebaseMessaging] FCM Token obtained:', currentToken.substring(0, 20) + '...');
                    setFcmToken(currentToken);
                    
                    // Detect service worker version from registration
                    let swVersion = 'unknown';
                    try {
                        const swRegistration = await navigator.serviceWorker.getRegistration();
                        if (swRegistration && swRegistration.active) {
                            // Service worker version will be detected from the SW file itself
                            // For now, we'll use the current expected version
                            swVersion = 'v2.2.0-android-fix';
                        }
                    } catch (error) {
                        console.warn('[useFirebaseMessaging] Could not detect service worker version:', error);
                    }
                    
                    // Save the token to Firestore
                    console.log('[useFirebaseMessaging] Saving token to Firestore...');
                    await setDoc(doc(db, 'fcmTokens', userId), {
                        token: currentToken,
                        userId: userId,
                        createdAt: serverTimestamp(),
                        platform: navigator.userAgent.includes('iPhone') ? 'iOS' : 
                                 navigator.userAgent.includes('Android') ? 'Android' : 'other',
                        isPWA: window.matchMedia('(display-mode: standalone)').matches,
                        userAgent: navigator.userAgent,
                        swVersion: swVersion, // Service worker version
                        lastUpdated: serverTimestamp()
                    }, { merge: true });
                    console.log('[useFirebaseMessaging] Token saved successfully with SW version:', swVersion);
                } else {
                    console.warn('[useFirebaseMessaging] No registration token available.');
                }
            } else {
                console.log('[useFirebaseMessaging] Permission not granted:', permissionResult);
            }
        } catch (error) {
            console.error('[useFirebaseMessaging] Error in requestPermission:', error);
            // Provide more specific error handling
            if (error instanceof Error) {
                console.error('[useFirebaseMessaging] Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                if (error.message.includes('messaging/unsupported-browser')) {
                    console.error('[useFirebaseMessaging] Browser not supported for Firebase messaging');
                } else if (error.message.includes('messaging/permission-blocked')) {
                    console.error('[useFirebaseMessaging] Notification permission was blocked');
                } else if (error.message.includes('messaging/vapid-key-required')) {
                    console.error('[useFirebaseMessaging] VAPID key is required');
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
                    console.log('[useFirebaseMessaging] Message received in foreground:', payload);
                    
                    // Note: We don't manually show notification here because:
                    // 1. The service worker's onBackgroundMessage handles it (even in foreground for PWA)
                    // 2. Showing it here would cause duplicate notifications
                    // 3. The real-time listener in NotificationsPanel already updates the badge
                    
                    // Just log for debugging - the service worker handles display
                    console.log('[useFirebaseMessaging] Notification will be shown by service worker');
                });
                return () => unsubscribe();
            } catch (error) {
                console.error('[useFirebaseMessaging] Error setting up foreground message listener:', error);
            }
        }
    }, [permission]);

    return { permission, requestPermission, fcmToken };
}; 