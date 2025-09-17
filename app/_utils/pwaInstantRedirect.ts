/**
 * PWA Instant Redirect - Immediate navigation for PWA users
 * This runs before any component rendering to prevent login page flash
 */

import { PWACache } from './pwaCache';

export const performInstantPWARedirect = (): boolean => {
  // Only run in browser environment
  if (typeof window === 'undefined') return false;
  
  // Only for PWA users
  if (!PWACache.isPWA()) return false;
  
  try {
    const cachedState = PWACache.getUserState();
    if (cachedState && cachedState.hasValidSession && cachedState.lastRole && cachedState.lastRoute) {
      console.log('PWA Instant Redirect: Redirecting to', cachedState.lastRoute);
      
      // Use location.replace for instant navigation without history entry
      window.location.replace(cachedState.lastRoute);
      return true;
    }
  } catch (error) {
    console.error('PWA Instant Redirect failed:', error);
  }
  
  return false;
};

// Run immediately if this is a PWA environment
if (typeof window !== 'undefined') {
  // Check if we're at the root and this is a PWA
  if (window.location.pathname === '/' && PWACache.isPWA()) {
    // Add a small delay to ensure the page has started loading
    setTimeout(() => {
      performInstantPWARedirect();
    }, 10);
  }
}