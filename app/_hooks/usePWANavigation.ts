"use client";

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for PWA-aware navigation
 * Ensures navigation stays within the PWA context and doesn't break out of standalone mode
 */
export const usePWANavigation = () => {
  const router = useRouter();

  const navigateWithinPWA = useCallback((url: string, options?: { replace?: boolean }) => {
    // Check if we're in a PWA context
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;

    console.log('PWA Navigation:', { url, isPWA, options, currentUrl: window.location.href });

    // Force replace for attendance navigation to maintain PWA context
    const shouldReplace = options?.replace || url.includes('/student/attendance');
    
    // Use a small delay to ensure PWA context is preserved during navigation
    setTimeout(() => {
      // Always use Next.js router to maintain SPA navigation
      // PWA context is maintained through proper routing, not window.location
      if (shouldReplace) {
        console.log('Using router.replace for:', url);
        router.replace(url);
      } else {
        console.log('Using router.push for:', url);
        router.push(url);
      }
    }, 100);
  }, [router]);

  const isStandalone = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  const handleExternalLink = useCallback((url: string) => {
    // For external links, open in system browser to avoid breaking PWA
    if (isStandalone()) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  }, [isStandalone]);

  return {
    navigateWithinPWA,
    isStandalone,
    handleExternalLink,
  };
};

/**
 * Hook to detect PWA installation status and display mode
 */
export const usePWAStatus = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone' | 'fullscreen' | 'minimal-ui'>('browser');

  useEffect(() => {
    const checkPWAStatus = () => {
      // Check if app is installed as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone);

      // Determine display mode
      if (window.matchMedia('(display-mode: fullscreen)').matches) {
        setDisplayMode('fullscreen');
      } else if (window.matchMedia('(display-mode: standalone)').matches) {
        setDisplayMode('standalone');
      } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        setDisplayMode('minimal-ui');
      } else {
        setDisplayMode('browser');
      }
    };

    checkPWAStatus();

    // Listen for display mode changes
    const mediaQueries = [
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ];

    const handleChange = () => checkPWAStatus();

    mediaQueries.forEach(mq => mq.addEventListener('change', handleChange));

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', handleChange));
    };
  }, []);

  return {
    isInstalled,
    displayMode,
    isStandalone: displayMode === 'standalone' || displayMode === 'fullscreen',
  };
};
