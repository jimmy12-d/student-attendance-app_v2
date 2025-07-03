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

        try {
            const messaging = getMessaging(app);
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                if (!VAPID_KEY) {
                    console.error("VAPID key is not set in environment variables!");
                    return;
                }
                
                const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

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
            console.error('An error occurred while retrieving token. ', error);
        }
    };
    
    // Optional: Handle foreground messages
    useEffect(() => {
        if (permission === 'granted') {
            const messaging = getMessaging(app);
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Message received in foreground.', payload);
                // You can dispatch a Redux action here to show an in-app notification
            });
            return () => unsubscribe();
        }
    }, [permission]);

    return { permission, requestPermission, fcmToken };
}; 