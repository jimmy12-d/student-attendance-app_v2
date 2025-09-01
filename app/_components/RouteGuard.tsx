"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '../_stores/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase-config';
import { getDefaultRouteForRole } from '../_lib/authUtils';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'teacher' | 'student';
  fallbackPath?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const userName = useAppSelector((state) => state.main.userName);
  const userUid = useAppSelector((state) => state.main.userUid);
  const userRole = useAppSelector((state) => state.main.userRole);

  useEffect(() => {
    const checkAuthorization = () => {
      // If no specific role is required, allow access
      if (!requiredRole) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // If user is not logged in, redirect to login
      if (!userName || !userUid) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Check if user has the required role
      if (userRole === requiredRole) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        // Redirect based on user's actual role
        const defaultRoute = getDefaultRouteForRole(userRole);
        router.replace(defaultRoute);
      }
      setIsLoading(false);
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, check authorization
        checkAuthorization();
      } else {
        // User is signed out, redirect to login
        setIsAuthorized(false);
        setIsLoading(false);
        if (pathname !== '/login' && !pathname.startsWith('/login')) {
          router.replace('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [userName, userUid, userRole, requiredRole, router, pathname]);

  // Show loading spinner while checking authorization
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show unauthorized message if user doesn't have required role
  if (!isAuthorized && requiredRole) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Required role: {requiredRole} | Your role: {userRole || 'none'}
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;
