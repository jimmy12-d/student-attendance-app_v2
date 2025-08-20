"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../../../firebase-config';
import CardBox from '../../_components/CardBox';
import SectionFullScreen from '../../_components/Section/FullScreen';
import StudentSignIn from './StudentSignIn';

const LoginClient = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Check if user has a complete profile before redirecting
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("authUid", "==", user.uid), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
              // User has a complete profile, redirect them
              setIsAuthenticated(true);
              router.replace('/student/home');
              return;
            }
          }
          
          // User is authenticated but doesn't have a complete profile
          // Let them stay on the login page to complete registration
          setLoading(false);
        } else {
          // If no user, stop loading and show the login button.
          setLoading(false);
        }
      });
      // Cleanup the listener when the component unmounts.
      return () => unsubscribe();
    }
  }, [router]);

  if (loading) {
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