"use client";

import { useRouter } from 'next/navigation';
import { useAppDispatch } from "../_stores/hooks";
import { setUser } from '../_stores/mainSlice';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase-config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import React, { ReactNode, useEffect, useState } from "react";
import StudentBottomNav from "./_components/StudentBottomNav";
import { usePWANavigation } from "@/app/_hooks/usePWANavigation";
import { Toaster } from 'sonner'
import { InstallPWA } from './_components/InstallPWA';
import StudentTopNav from './_components/StudentTopNav';
import NotificationPermissionPrompt from "./_components/NotificationPermissionPrompt";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is authenticated with Firebase. Now, we must verify they are a fully onboarded student.
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("authUid", "==", user.uid), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();
            
            // A user is only fully onboarded if their record has a valid class.
            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
                // SUCCESS: User is fully linked. Load their profile and let them proceed.
                dispatch(
                  setUser({
                    name: studentData.fullName,
                    email: user.email,
                    avatar: user.photoURL,
                    uid: user.uid,
                    studentDocId: studentDoc.id,
                    role: "student",
                  })
                );
                setLoading(false); // Allow rendering of the page
            } else {
                // FAILURE: User has a record, but it's incomplete. Force them to link.
                dispatch(
                  setUser({
                    name: user.displayName, // Use Google name as fallback
                    email: user.email,
                    avatar: user.photoURL,
                    uid: user.uid,
                    studentDocId: studentDoc.id,
                    role: "student",
                  })
                );
                navigateWithinPWA('/login');
            }
        } else {
             // FAILURE: Authenticated, but no student record at all. Force them to link.
             dispatch(
                setUser({
                  name: user.displayName,
                  email: user.email,
                  avatar: user.photoURL,
                  uid: user.uid,
                  studentDocId: null,
                  role: "student",
                })
              );
             navigateWithinPWA('/login');
        }
      } else {
        // User is not authenticated at all. Send them to the login page.
        navigateWithinPWA('/login');
      }
    });

    return () => unsubscribe();
  }, [dispatch, navigateWithinPWA]);


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      <Toaster richColors position="top-center" />
      <div className="relative min-h-screen md:ml-64 lg:ml-0 xl:ml-0">
        <StudentTopNav />
        <main className="relative pb-24">
            <div className="p-6 max-w-2xl mx-auto">
                {children}
            </div>
          <InstallPWA as_banner={true} />
        </main>
      </div>
      <StudentBottomNav />
      <NotificationPermissionPrompt />
    </>
  );
} 