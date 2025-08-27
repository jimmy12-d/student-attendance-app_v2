"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, User } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import { setUser } from '../_stores/mainSlice';
import { auth, db } from '../../firebase-config';
import { usePWANavigation } from '../_hooks/usePWANavigation';

interface TeacherProtectedRouteProps {
  children: React.ReactNode;
}

const TeacherProtectedRoute: React.FC<TeacherProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [authStatus, setAuthStatus] = useState<'loading' | 'teacher' | 'student' | 'unauthorized' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userRole = useAppSelector((state) => state.main.userRole);
  const isTeacher = (userRole as any) === 'teacher';

  useEffect(() => {
    console.log('TeacherProtectedRoute: useEffect triggered, userRole:', userRole, 'isTeacher:', isTeacher);
    
    // If we already have a teacher in Redux, we're good.
    if (isTeacher) {
      console.log('TeacherProtectedRoute: User already has teacher role in Redux');
      setAuthStatus('teacher');
      return;
    }

    let mounted = true;
    let authUnsubscribe: (() => void) | null = null;
    
    // Check localStorage cache first (for page refresh scenarios)
    const checkCachedSession = () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('teacherSession');
          if (cached) {
            const parsed = JSON.parse(cached);
            // Consider session valid for 12 hours
            if (parsed.ts && Date.now() - parsed.ts < 12 * 60 * 60 * 1000) {
              console.log('TeacherProtectedRoute: Found valid cached teacher session, restoring...');
              dispatch(setUser({
                name: parsed.name,
                email: null,
                avatar: null,
                role: 'teacher',
                subject: parsed.subject,
                uid: parsed.uid,
                phone: parsed.phone
              }));
              setAuthStatus('teacher');
              return true;
            } else {
              console.log('TeacherProtectedRoute: Cached session expired, removing...');
              localStorage.removeItem('teacherSession');
            }
          }
        } catch (e) {
          console.warn('TeacherProtectedRoute: Failed to read cached session:', e);
        }
      }
      return false;
    };

    // First try to restore from cache
    if (checkCachedSession()) {
      return;
    }
    
    // If no cache, set up Firebase auth listener
    const initializeAuth = () => {
      console.log('TeacherProtectedRoute: Setting up Firebase auth listener...');
      authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!mounted) return;
        
        console.log('TeacherProtectedRoute: Auth state changed, user:', user ? user.uid : 'null');
        console.log('TeacherProtectedRoute: Current userRole in auth callback:', userRole);
        
        // Check Redux state again in case it changed
        const currentIsTeacher = (userRole as any) === 'teacher';
        if (currentIsTeacher) {
          console.log('TeacherProtectedRoute: Already have teacher role, ignoring auth state change');
          setAuthStatus('teacher');
          return;
        }
        
        if (user) {
          // User is signed in, let's verify they are a teacher.
          console.log('TeacherProtectedRoute: User found, verifying teacher status...');
          await verifyTeacher(user);
        } else {
          // No user is signed in and we don't have teacher role
          console.log("TeacherProtectedRoute: No user found and no teacher role. Redirecting to login.");
          // Small delay to avoid redirect during auth state settling
          setTimeout(() => {
            if (mounted && !((userRole as any) === 'teacher')) {
              console.log("TeacherProtectedRoute: Final redirect to login");
              navigateWithinPWA('/login');
            }
          }, 500);
        }
      });
    };

    // Initialize auth with a small delay
    const timeoutId = setTimeout(initializeAuth, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [dispatch, router]);

  const verifyTeacher = async (user: User) => {
    console.log('TeacherProtectedRoute: Verifying teacher for user:', user.uid);
    
    try {
      // 1. Primary check: Firestore `teachers` collection using authUid
      const teachersRef = collection(db, 'teachers');
      const q = query(teachersRef, where("authUid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      console.log('TeacherProtectedRoute: Teacher query result:', querySnapshot.size, 'documents');

      if (!querySnapshot.empty) {
        const teacherDoc = querySnapshot.docs[0];
        const teacherData = teacherDoc.data();
        
        console.log('TeacherProtectedRoute: Teacher found:', teacherData.name || teacherData.fullName);
        
        dispatch(setUser({
          name: teacherData.name || teacherData.fullName,
          email: user.email,
          avatar: null,
          uid: user.uid,
          role: 'teacher',
          subject: teacherData.subject,
          phone: teacherData.phone,
        }));
        
        setAuthStatus('teacher');
        return;
      }

      console.log('TeacherProtectedRoute: No teacher found with authUid, checking if student...');

      // 2. Fallback: Check if it's a student to redirect them properly
      const studentsRef = collection(db, "students");
      const studentQuery = query(studentsRef, where("authUid", "==", user.uid));
      const studentSnapshot = await getDocs(studentQuery);

      if (!studentSnapshot.empty) {
        console.log("TeacherProtectedRoute: User is a student. Redirecting...");
        setAuthStatus('student');
        navigateWithinPWA('/student/attendance');
        return;
      }
      
      console.log("TeacherProtectedRoute: User is neither teacher nor student");
      
      // 3. If not found in teachers or students, they are unauthorized
      setErrorMessage("Your account is not authorized to access this page.");
      setAuthStatus('unauthorized');

    } catch (error) {
      console.error("TeacherProtectedRoute: Error verifying teacher:", error);
      setErrorMessage("An error occurred during authentication.");
      setAuthStatus('error');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying teacher session...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'teacher') {
    return <>{children}</>;
  }

  if (authStatus === 'unauthorized' || authStatus === 'error') {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{errorMessage}</p>
          <button
            onClick={() => navigateWithinPWA('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Render nothing while redirecting for student
  return null;
};

export default TeacherProtectedRoute;
