"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import { setUser } from '../_stores/mainSlice';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);
  
  const userRole = useAppSelector((state) => state.main.userRole);
  const userName = useAppSelector((state) => state.main.userName);

  useEffect(() => {
    console.log('TeacherLayout: useEffect triggered, userName:', userName, 'userRole:', userRole);
    
    // If user is already authenticated as teacher, we're good
    if (userName && userRole === 'teacher') {
      console.log('TeacherLayout: User already authenticated as teacher');
      setIsLoading(false);
      return;
    }

    // Check localStorage cache first (for page refresh scenarios)
    const checkCachedSession = () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('teacherSession');
          if (cached) {
            const parsed = JSON.parse(cached);
            // Consider session valid for 12 hours
            if (parsed.ts && Date.now() - parsed.ts < 12 * 60 * 60 * 1000) {
              console.log('TeacherLayout: Found valid cached teacher session, restoring...');
              dispatch(setUser({
                name: parsed.name,
                email: null,
                avatar: null,
                role: 'teacher',
                subject: parsed.subject,
                uid: parsed.uid,
                phone: parsed.phone
              }));
              setIsLoading(false);
              return true;
            } else {
              console.log('TeacherLayout: Cached session expired, removing...');
              localStorage.removeItem('teacherSession');
            }
          }
        } catch (e) {
          console.warn('TeacherLayout: Failed to read cached session:', e);
        }
      }
      return false;
    };

    // Try to restore from cache first
    if (checkCachedSession()) {
      return;
    }

    // If no cached session and no user data, redirect to login after a short delay
    const timeoutId = setTimeout(() => {
      if (!userName) {
        console.log('TeacherLayout: No user found and no cache, redirecting to login');
        router.push('/login');
      } else if (userRole && userRole !== 'teacher') {
        // User is logged in but not a teacher, redirect based on role
        console.log('TeacherLayout: User is not a teacher, redirecting based on role:', userRole);
        if (userRole === 'student') {
          router.push('/student/attendance');
        } else if (userRole === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } else {
        // User is authenticated as teacher
        setIsLoading(false);
      }
    }, 500); // Give some time for potential auth state restoration

    return () => clearTimeout(timeoutId);
  }, [userRole, userName, router, dispatch]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if user is authenticated as teacher
  if (userRole === 'teacher') {
    return (
      <div className="teacher-layout">
        {children}
      </div>
    );
  }

  // This should not render due to the useEffect redirects, but just in case
  return null;
};

export default TeacherLayout;
