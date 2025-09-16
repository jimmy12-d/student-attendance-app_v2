"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase-config';
import CardBox from '../../_components/CardBox';
import SectionFullScreen from '../../_components/Section/FullScreen';
import StudentSignIn from './StudentSignIn';
import { usePWANavigation } from '../../_hooks/usePWANavigation';
import { useAuthContext } from '../../_contexts/AuthContext';

const LoginClient = () => {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const { currentUser, isAuthenticated, userRole, isLoading } = useAuthContext();
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      // Only check profile if we're not currently loading auth state
      if (isLoading) return;
      
      if (isAuthenticated && currentUser && !userRole) {
        // User is authenticated but we don't know their role yet
        // Check if they are a student with a complete profile
        setCheckingProfile(true);
        
        try {
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("authUid", "==", currentUser.uid), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
              // User has a complete profile, redirect them using PWA navigation
              navigateWithinPWA('/student/attendance', { replace: true });
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
        } finally {
          setCheckingProfile(false);
        }
      } else if (isAuthenticated && userRole) {
        // User is authenticated and has a role, redirect to appropriate dashboard
        if (userRole === 'admin') {
          navigateWithinPWA('/dashboard', { replace: true });
        } else if (userRole === 'teacher') {
          navigateWithinPWA('/teacher', { replace: true });
        } else if (userRole === 'student') {
          navigateWithinPWA('/student/attendance', { replace: true });
        }
      }
    };

    // Add a small delay to prevent race conditions with main page navigation
    const timeoutId = setTimeout(checkUserProfile, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, currentUser, userRole, isLoading, navigateWithinPWA]);

  if (isLoading || checkingProfile) {
    // Show a loading indicator while we check for an active session.
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SectionFullScreen bg="white">
      <CardBox
        className="w-11/12 md:w-7/12 lg:w-6/12 xl:w-4/12 shadow-2xl"
        flex="flex-col"
      >
        <StudentSignIn />
      </CardBox>
    </SectionFullScreen>
  );
};

export default LoginClient; 