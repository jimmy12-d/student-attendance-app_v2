"use client";
import { useEffect, useState } from 'react';
import { usePWANavigation } from './_hooks/usePWANavigation';
import { useAuthContext } from './_contexts/AuthContext';
import { getDefaultRouteForRole } from './_lib/authUtils';
import { PWACache } from './_utils/pwaCache';
import './_utils/pwaInstantRedirect'; // Import for immediate PWA redirect

export default function HomePage() {
  const { navigateWithinPWA } = usePWANavigation();
  const { isAuthenticated, userRole, isLoading, currentUser } = useAuthContext();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [initialCheck, setInitialCheck] = useState(false);

  // Immediate check for PWA cache before any rendering
  const performImmediateCheck = () => {
    if (initialCheck) return false;
    
    setInitialCheck(true);
    
    // For PWA users, check cache immediately
    if (PWACache.isPWA()) {
      const cachedState = PWACache.getUserState();
      if (cachedState && cachedState.hasValidSession && cachedState.lastRole) {
        console.log('PWA Immediate: Using cached route', cachedState.lastRoute);
        setHasNavigated(true);
        // Use setTimeout to avoid hydration issues
        setTimeout(() => {
          navigateWithinPWA(cachedState.lastRoute);
        }, 0);
        return true;
      }
    }
    return false;
  };

  // Perform immediate check
  const hasImmediateRedirect = performImmediateCheck();

  useEffect(() => {
    // Skip if we already did an immediate redirect
    if (hasImmediateRedirect) return;

    // For PWA users, try to use cached route for immediate navigation
    const handlePWAQuickStart = () => {
      if (!PWACache.isPWA() || hasNavigated) return false;

      const cachedState = PWACache.getUserState();
      if (cachedState && cachedState.hasValidSession && cachedState.lastRole) {
        // Navigate immediately to last known route for better UX
        console.log('PWA Quick Start: Using cached route', cachedState.lastRoute);
        setHasNavigated(true);
        navigateWithinPWA(cachedState.lastRoute);
        return true;
      }
      return false;
    };

    // Try quick PWA start first (immediate, no waiting)
    if (handlePWAQuickStart()) {
      return;
    }

    // Add a longer delay before defaulting to login to give auth more time
    const authTimeout = setTimeout(() => {
      if (!hasNavigated) {
        if (isAuthenticated && userRole) {
          // User is authenticated and we have role info, redirect to appropriate dashboard
          const defaultRoute = getDefaultRouteForRole(userRole);
          setHasNavigated(true);
          
          // Cache the user state for future PWA starts
          if (PWACache.isPWA()) {
            PWACache.saveUserState(userRole, defaultRoute, currentUser?.email || undefined);
          }
          
          console.log('Auth Success: Navigating to', defaultRoute);
          navigateWithinPWA(defaultRoute);
        } else if (!isLoading) {
          // Only redirect to login if we're definitely not loading and not authenticated
          setHasNavigated(true);
          
          // Clear cache since user is not authenticated
          if (PWACache.isPWA()) {
            PWACache.clearUserState();
          }
          
          console.log('No Auth: Navigating to login');
          navigateWithinPWA('/login');
        }
      }
    }, isLoading ? 2000 : 800); // Wait even longer if still loading auth

    return () => clearTimeout(authTimeout);
  }, [isAuthenticated, userRole, isLoading, navigateWithinPWA, hasNavigated, hasImmediateRedirect]);

  if (hasImmediateRedirect) {
    // Show minimal loading for immediate redirects
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
            Opening your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !initialCheck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
        <div className="relative text-center max-w-md mx-auto px-8">
          {/* Background decorative elements */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-200 dark:bg-blue-900 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-200 dark:bg-purple-900 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-10 right-8 w-6 h-6 bg-indigo-300 dark:bg-indigo-700 rounded-full opacity-30 animate-ping" style={{ animationDelay: '2s' }}></div>
          
          {/* Main loading content */}
          <div className="relative z-10">
            {/* App logo/icon area */}
            <div className="mb-8">
              <div className="relative mx-auto w-20 h-20 mb-4">
                {/* Rotating outer ring */}
                <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
                
                {/* Pulsing inner circle */}
                <div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                
                {/* Floating dots */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute -bottom-2 left-1/4 w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>

            {/* Dynamic app title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2 animate-pulse">
                Rodwell Attendance
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto animate-pulse"></div>
            </div>

            {/* Dynamic status messages */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200 animate-pulse">
                  {isAuthenticated ? 'Preparing your dashboard...' : PWACache.isPWA() ? 'Opening your workspace...' : 'Checking your session...'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAuthenticated && userRole ? `Welcome back! Redirecting to ${userRole} dashboard` : PWACache.isPWA() ? 'Loading your personalized attendance portal' : 'Verifying credentials and loading your workspace'}
                </p>
                {/* Debug info in development */}
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-xs text-gray-500 mt-2">
                    Debug: Auth: {isAuthenticated ? 'Yes' : 'No'} | Role: {userRole || 'None'} | Loading: {isLoading ? 'Yes' : 'No'} | PWA: {PWACache.isPWA() ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-8">
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse transform origin-left"></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 animate-pulse">
                Loading your personalized experience...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}