'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

// Translations for PWA update (works without NextIntl context)
const translations = {
  en: {
    newVersionTitle: "New version available!",
    newVersionDescription: "A new version of the app is ready to use.",
    updateNow: "Update Now",
    updateLater: "Later",
    updating: "Updating app..."
  },
  kh: {
    newVersionTitle: "មានកំណែថ្មី!",
    newVersionDescription: "កំណែថ្មីនៃកម្មវិធីត្រៀមរួចរាល់ហើយ។",
    updateNow: "ធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ",
    updateLater: "ពេលក្រោយ",
    updating: "កំពុងធ្វើបច្ចុប្បន្នភាព..."
  }
};

export default function PWAUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);
  const updateToastId = useRef<string | number | null>(null);
  const hasShownToast = useRef(false);
  const isUpdating = useRef(false);
  const userDismissed = useRef(false); // Track if user manually dismissed

  // Check if user has dismissed update recently (persists across reloads)
  const isUpdateDismissed = () => {
    if (typeof window !== 'undefined') {
      const dismissedTime = localStorage.getItem('pwa-update-dismissed');
      if (dismissedTime) {
        const timeDiff = Date.now() - parseInt(dismissedTime);
        return timeDiff < 30 * 60 * 1000; // 30 minutes
      }
    }
    return false;
  };

  // Mark update as dismissed in localStorage
  const markUpdateDismissed = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-update-dismissed', Date.now().toString());
    }
  };

  // Get current locale from localStorage
  const getLocale = () => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('preferredLanguage');
      return savedLocale === 'kh' ? 'kh' : 'en';
    }
    return 'en';
  };

  const t = (key: keyof typeof translations.en) => {
    const locale = getLocale();
    return translations[locale][key];
  };

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Initialize dismissal state from localStorage
    userDismissed.current = isUpdateDismissed();

    // Function to handle service worker updates
    const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && !hasShownToast.current && !isUpdating.current && !userDismissed.current) {
        // SW is waiting to activate
        setWaitingWorker(registration.waiting);
        setShowReload(true);
      }

      // Listen for new service worker installing
      if (registration.installing) {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !hasShownToast.current && !isUpdating.current && !userDismissed.current) {
            // New service worker is installed but waiting to activate
            setWaitingWorker(newWorker);
            setShowReload(true);
          }
        });
      }
    };
    
    // Check for updates every 10 minutes (increased from 5 to reduce frequency)
    const checkForUpdates = async () => {
      try {
        if (!hasShownToast.current && !isUpdating.current && !userDismissed.current) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.update();
          }
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Initial registration check
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        handleServiceWorkerUpdate(registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          handleServiceWorkerUpdate(registration);
        });
      }
    });

    // Listen for controller change (when new SW takes over)
    const handleControllerChange = () => {
      if (!showReload && !isUpdating.current) {
        window.location.reload();
      }
    };
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for updates periodically (every 10 minutes)
    const updateInterval = setInterval(checkForUpdates, 600000); // 10 minutes

    return () => {
      clearInterval(updateInterval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [showReload]);

  // Show toast notification when update is available
  useEffect(() => {
    if (showReload && waitingWorker && !hasShownToast.current && !isUpdating.current && !userDismissed.current) {
      hasShownToast.current = true;
      const locale = getLocale();
      const isKhmer = locale === 'kh';
      
      const updateApp = () => {
        if (isUpdating.current) return; // Prevent multiple clicks
        isUpdating.current = true;
        userDismissed.current = true; // Mark as dismissed
        markUpdateDismissed(); // Persist across reloads
        
        if (updateToastId.current) {
          toast.dismiss(updateToastId.current);
          updateToastId.current = null;
        }
        
        // Ensure we have a valid waiting worker
        if (waitingWorker && waitingWorker.state === 'installed') {
          try {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            console.log('Sent SKIP_WAITING message to service worker');
          } catch (error) {
            console.error('Error sending SKIP_WAITING message:', error);
            // Fallback: try to get the waiting worker again
            navigator.serviceWorker.getRegistration().then((registration) => {
              if (registration?.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                console.log('Sent SKIP_WAITING message via registration');
              }
            });
          }
        } else {
          // Fallback: get the current registration and try again
          navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration?.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              console.log('Sent SKIP_WAITING message via fallback registration');
            }
          });
        }
        
        setShowReload(false);
        setWaitingWorker(null); // Clear waiting worker
        
        // Show loading toast with Khmer font if needed
        toast.loading(t('updating'), {
          duration: 3000, // Increased duration
          className: isKhmer ? 'font-nokora' : '',
          style: isKhmer ? {
            fontFamily: 'var(--font-nokora), sans-serif'
          } : undefined
        });

        // Reload after a longer delay to ensure SW has time to activate
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      };

      const handleLater = () => {
        userDismissed.current = true; // Mark as dismissed
        markUpdateDismissed(); // Persist across reloads
        
        if (updateToastId.current) {
          toast.dismiss(updateToastId.current);
          updateToastId.current = null;
        }
        setShowReload(false);
        setWaitingWorker(null); // Clear waiting worker
      };

      // Show persistent toast with update button and Khmer font support
      updateToastId.current = toast.info(t('newVersionTitle'), {
        description: t('newVersionDescription'),
        duration: Infinity, // Keep toast until user interacts
        className: isKhmer ? 'font-nokora' : '',
        style: isKhmer ? {
          fontFamily: 'var(--font-nokora), sans-serif'
        } : undefined,
        action: {
          label: t('updateNow'),
          onClick: updateApp,
        },
        cancel: {
          label: t('updateLater'),
          onClick: handleLater,
        },
      });
    }
  }, [showReload, waitingWorker]);

  return null; // This component doesn't render anything visible
}
