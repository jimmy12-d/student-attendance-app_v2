"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { useAppSelector } from '../_stores/hooks';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const darkMode = useAppSelector((state) => state.darkMode.isEnabled);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Apply dark mode classes to the html element and body without overriding existing classes
    if (isClient) {
      const htmlElement = document.documentElement;
      const bodyElement = document.body;
      
      // Ensure h-full class is always present on html
      if (!htmlElement.classList.contains('h-full')) {
        htmlElement.classList.add('h-full');
      }
      
      // Ensure h-full class is always present on body
      if (!bodyElement.classList.contains('h-full')) {
        bodyElement.classList.add('h-full');
      }
      
      // Handle dark mode classes
      if (darkMode) {
        htmlElement.classList.add('dark', 'dark-scrollbars-compat');
        bodyElement.classList.remove('bg-white', 'text-gray-900');
        bodyElement.classList.add('bg-gray-800', 'text-gray-100');
      } else {
        htmlElement.classList.remove('dark', 'dark-scrollbars-compat');
        bodyElement.classList.remove('bg-gray-800', 'text-gray-100');
        bodyElement.classList.add('bg-white', 'text-gray-900');
      }
    }
  }, [darkMode, isClient]);

  // Loading screens are now handled in individual layouts (student, teacher, admin)
  // This prevents flashing and provides better UX
  return <>{children}</>;
}

