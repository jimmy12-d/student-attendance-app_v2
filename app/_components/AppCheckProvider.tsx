"use client";

import React, { useEffect } from 'react';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from '@/firebase-config'; // Using alias

export default function AppCheckProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // This effect runs only once on the client after the component mounts
    
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
        console.log("App Check initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize App Check:", error);
      }
    } else {
      console.warn("App Check not initialized: NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable not found.");
    }
  }, []);

  return <>{children}</>;
} 