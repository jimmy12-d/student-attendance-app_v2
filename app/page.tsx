"use client";
import { useEffect } from 'react';
import { usePWANavigation } from './_hooks/usePWANavigation';

export default function HomePage() {
  const { navigateWithinPWA } = usePWANavigation();

  useEffect(() => {
    // This is a placeholder for your actual auth check.
    // You might use Firebase's onAuthStateChanged or a similar method here.
    const isLoggedIn = localStorage.getItem('token'); 

    if (isLoggedIn) {
      // Navigate directly to student attendance (the actual home page)
      navigateWithinPWA('/student/attendance');
    } else {
      navigateWithinPWA('/login');
    }
  }, [navigateWithinPWA]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}