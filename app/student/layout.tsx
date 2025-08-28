"use client";

import { useAppDispatch } from "../_stores/hooks";
import { setUser } from '../_stores/mainSlice';
import { onAuthStateChanged } from 'firebase/auth';
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
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);

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
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Enhanced light mode styling with subtle colors */
        html:not(.dark) body {
          background: linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 30%, rgb(236 242 251) 70%, rgb(243 244 246) 100%) !important;
          color: #111827 !important;
        }
        html.dark body {
          background: linear-gradient(135deg, rgb(2 6 23) 0%, rgb(15 23 42) 50%, rgb(30 41 59) 100%) !important;
          color: #f1f5f9 !important;
        }
      `}</style>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      <Toaster richColors position="top-center" />
      <div className="relative min-h-screen md:ml-64 lg:ml-0 xl:ml-0 bg-transparent">
        <StudentTopNav />
        <main className="relative pb-24 bg-transparent">
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