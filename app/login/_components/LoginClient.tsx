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

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout reached - forcing login screen display');
      setCheckingProfile(false);
    }, 5000); // 5 second max wait time

    return () => clearTimeout(safetyTimeout);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const checkUserProfile = async () => {
      // If still loading auth, keep showing loading
      if (isLoading) {
        if (isMounted) setCheckingProfile(true);
        return;
      }
      
      // IMMEDIATELY redirect if authenticated with role
      if (isAuthenticated && userRole) {
        if (isMounted) {
          console.log('User authenticated with role:', userRole);
          setCheckingProfile(true);
        }
        
        // Navigate based on role
        if (userRole === 'admin') {
          navigateWithinPWA('/dashboard', { replace: true });
        } else if (userRole === 'teacher') {
          navigateWithinPWA('/teacher', { replace: true });
        } else if (userRole === 'student') {
          navigateWithinPWA('/student/attendance', { replace: true });
        }
        return;
      }
      
      // Check if authenticated but no role (might be student without profile set)
      if (isAuthenticated && currentUser && !userRole) {
        if (isMounted) setCheckingProfile(true);
        
        try {
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("authUid", "==", currentUser.uid), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty && isMounted) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
              console.log('Student profile found, redirecting...');
              navigateWithinPWA('/student/attendance', { replace: true });
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
        }
        
        // If we get here, user is authenticated but doesn't have valid profile
        // Show login form
        if (isMounted) {
          console.log('User authenticated but no valid profile, showing login');
          setCheckingProfile(false);
        }
        return;
      }
      
      // Only show login form if definitely not authenticated
      if (!isAuthenticated && !isLoading && isMounted) {
        console.log('User not authenticated, showing login');
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
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