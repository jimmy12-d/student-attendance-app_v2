"use client";
import { useEffect, useState } from 'react';
import { usePWANavigation } from './_hooks/usePWANavigation';
import { useAppSelector } from './_stores/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase-config';
import { getDefaultRouteForRole } from './_lib/authUtils';

export default function HomePage() {
  const { navigateWithinPWA } = usePWANavigation();
  const [isChecking, setIsChecking] = useState(true);
  
  const userName = useAppSelector((state) => state.main.userName);
  const userRole = useAppSelector((state) => state.main.userRole);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && userName && userRole) {
        // User is authenticated and we have role info, redirect to appropriate dashboard
        const defaultRoute = getDefaultRouteForRole(userRole);
        navigateWithinPWA(defaultRoute);
      } else {
        // User is not authenticated or we don't have role info, go to login
        navigateWithinPWA('/login');
      }
      setIsChecking(false);
    });

    return () => unsubscribe();
  }, [navigateWithinPWA, userName, userRole]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}