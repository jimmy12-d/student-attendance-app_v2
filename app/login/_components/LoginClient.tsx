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
import LoadingScreen from '../../_components/LoadingScreen';

const LoginClient = () => {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const { currentUser, isAuthenticated, userRole, isLoading } = useAuthContext();
  const [checkingProfile, setCheckingProfile] = useState(true); // Start as true to prevent flash

  useEffect(() => {
    const checkUserProfile = async () => {
      // If still loading auth, keep showing loading
      if (isLoading) {
        setCheckingProfile(true);
        return;
      }
      
      // IMMEDIATELY redirect if authenticated with role
      if (isAuthenticated && userRole) {
        setCheckingProfile(true); // Keep loading screen visible
        // Don't stop checking - keep loading screen until navigation completes
        if (userRole === 'admin') {
          navigateWithinPWA('/dashboard', { replace: true });
        } else if (userRole === 'teacher') {
          navigateWithinPWA('/teacher', { replace: true });
        } else if (userRole === 'student') {
          navigateWithinPWA('/student/attendance', { replace: true });
        }
        return; // Don't set checkingProfile to false
      }
      
      // Check if authenticated but no role (might be student)
      if (isAuthenticated && currentUser && !userRole) {
        setCheckingProfile(true);
        
        try {
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("authUid", "==", currentUser.uid), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
              // User has a complete profile, redirect and keep loading
              navigateWithinPWA('/student/attendance', { replace: true });
              return; // Don't set checkingProfile to false
            }
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
        }
        // If we get here, user is authenticated but doesn't have valid profile
        // Fall through to show login form
      }
      
      // Only show login form if definitely not authenticated
      if (!isAuthenticated && !isLoading) {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [isAuthenticated, currentUser, userRole, isLoading, navigateWithinPWA]);

  // Show loading screen while checking auth or profile
  if (isLoading || checkingProfile) {
    return <LoadingScreen message="Checking authentication..." />;
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