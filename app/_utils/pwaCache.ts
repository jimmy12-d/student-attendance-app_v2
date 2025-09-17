/**
 * PWA Cache utilities for improving user experience
 * Helps speed up navigation for returning users
 */

const PWA_CACHE_KEY = 'pwa_user_cache';

interface PWAUserCache {
  lastRole: 'admin' | 'teacher' | 'student' | null;
  lastRoute: string;
  timestamp: number;
  hasValidSession: boolean;
  userEmail?: string; // Add user email for validation
  sessionExpiry?: number; // Add session expiry
}

export const PWACache = {
  /**
   * Save user's last known state for faster PWA startup
   */
  saveUserState(role: 'admin' | 'teacher' | 'student' | null, route: string, userEmail?: string) {
    if (typeof window === 'undefined') {
      return; // Not in browser environment
    }
    
    try {
      const cache: PWAUserCache = {
        lastRole: role,
        lastRoute: route,
        timestamp: Date.now(),
        hasValidSession: true,
        userEmail: userEmail,
        sessionExpiry: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      };
      localStorage.setItem(PWA_CACHE_KEY, JSON.stringify(cache));
      console.log('PWA Cache: Saved user state', { role, route, userEmail });
    } catch (error) {
      console.warn('Failed to save PWA cache:', error);
    }
  },

  /**
   * Get user's last known state (valid for 7 days for better PWA experience)
   */
  getUserState(): PWAUserCache | null {
    if (typeof window === 'undefined') {
      return null; // Not in browser environment
    }
    
    try {
      const cached = localStorage.getItem(PWA_CACHE_KEY);
      if (!cached) return null;

      const cache: PWAUserCache = JSON.parse(cached);
      
      // Check both timestamp (7 days) and session expiry
      const isExpired = Date.now() - cache.timestamp > 7 * 24 * 60 * 60 * 1000;
      const isSessionExpired = cache.sessionExpiry && Date.now() > cache.sessionExpiry;
      
      if (isExpired || isSessionExpired || !cache.hasValidSession) {
        console.log('PWA Cache: Expired or invalid', { isExpired, isSessionExpired, hasValidSession: cache.hasValidSession });
        this.clearUserState();
        return null;
      }

      console.log('PWA Cache: Valid cache found', cache);
      return cache;
    } catch (error) {
      console.warn('Failed to read PWA cache:', error);
      return null;
    }
  },

  /**
   * Clear user state (on logout or error)
   */
  clearUserState() {
    if (typeof window === 'undefined') {
      return; // Not in browser environment
    }
    
    try {
      localStorage.removeItem(PWA_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear PWA cache:', error);
    }
  },

  /**
   * Check if we're running in PWA mode
   */
  isPWA(): boolean {
    if (typeof window === 'undefined') {
      return false; // Not in browser environment
    }
    
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           window.location.search.includes('utm_source=web_app_manifest');
  }
};