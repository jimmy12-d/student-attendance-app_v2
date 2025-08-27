"use client";

import { useEffect } from 'react';
import { usePWANavigation } from '../_hooks/usePWANavigation';

export default function StudentPage() {
  const { navigateWithinPWA } = usePWANavigation();

  useEffect(() => {
    // Use PWA-aware navigation to prevent breaking out of standalone mode
    navigateWithinPWA('/student/attendance', { replace: true });
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