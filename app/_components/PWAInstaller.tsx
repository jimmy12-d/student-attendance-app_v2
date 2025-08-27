"use client";

import { useEffect } from 'react';

const PWAInstaller = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Update service worker when new version is available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available
                  // Don't force reload in PWA mode as it breaks standalone mode
                  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;
                  
                  if (!isPWA && confirm('New version available! Refresh to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  } else if (isPWA) {
                    // In PWA mode, just activate the new worker without reload
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });

      // Listen for service worker updates - avoid reload in PWA mode
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true;
        
        if (!isPWA) {
          window.location.reload();
        }
        // In PWA mode, let the new worker take control without reload
      });

      // Pre-cache critical routes when service worker is ready
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'CACHE_URLS',
            payload: ['/login', '/student/attendance', '/', '/student']
          });
        }
      });
    }

    // Handle PWA installation prompt
    let deferredPrompt;
    
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show install button/prompt (you can customize this)
      console.log('PWA install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PWAInstaller;
