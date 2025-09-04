"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import { setUser } from '../_stores/mainSlice';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const router = useRouter();
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 animate-pulse">
            Loading Teacher Portal
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preparing your teaching interface...
          </p>
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
