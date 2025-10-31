"use client";

import { useAppDispatch } from "../_stores/hooks";
import { setUser } from '../_stores/mainSlice';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase-config';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import React, { ReactNode, useEffect, useState } from "react";
import StudentBottomNav from "./_components/StudentBottomNav";
import { usePWANavigation } from "@/app/_hooks/usePWANavigation";
import { Toaster } from 'sonner'
import { InstallPWA } from './_components/InstallPWA';
import StudentTopNav from './_components/StudentTopNav';
import NotificationPermissionPrompt from "./_components/NotificationPermissionPrompt";
import RouteGuard from "../_components/RouteGuard";
import LocaleProvider from "../_components/LocaleProvider";
import StudentLayoutContent from "./_components/StudentLayoutContent";
import { usePathname } from "next/navigation";
import { PWACache } from "../_utils/pwaCache";
import DateOfBirthPrompt from "./_components/DateOfBirthPrompt";
import LoadingScreen from "../_components/LoadingScreen";
import AccountInactiveScreen from "../_components/AccountInactiveScreen";
import { Student } from "../_interfaces";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [studentStatus, setStudentStatus] = useState<{
    isActive: boolean;
    reason?: 'dropped' | 'onBreak' | 'waitlist';
    expectedReturnMonth?: string;
    breakReason?: string;
    waitlistReason?: string;
  } | null>(null);

  const showTopNav = !pathname.includes('/student/payment-history');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is authenticated with Firebase. Now, we must verify they are a fully onboarded student.
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("authUid", "==", user.uid), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data() as Student;
            
            // A user is only fully onboarded if their record has a valid class.
            if (studentData && studentData.class && studentData.class !== 'Unassigned') {
                // Check if student account is active BEFORE allowing access
                // Priority: dropped > onBreak > onWaitlist
                if (studentData.dropped === true) {
                  // Student is dropped - show inactive screen
                  setStudentStatus({
                    isActive: false,
                    reason: 'dropped',
                  });
                  setLoading(false);
                  return; // Stop here - don't allow access
                }

                if (studentData.onBreak === true) {
                  // Student is on break - show inactive screen
                  setStudentStatus({
                    isActive: false,
                    reason: 'onBreak',
                    expectedReturnMonth: studentData.expectedReturnMonth,
                    breakReason: studentData.breakReason,
                  });
                  setLoading(false);
                  return; // Stop here - don't allow access
                }

                if (studentData.onWaitlist === true) {
                  // Student is on waitlist - show inactive screen
                  setStudentStatus({
                    isActive: false,
                    reason: 'waitlist',
                    waitlistReason: studentData.waitlistReason,
                  });
                  setLoading(false);
                  return; // Stop here - don't allow access
                }

                // SUCCESS: User is fully linked AND active. Load their profile and let them proceed.
                setStudentStatus({ isActive: true });
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
                
                // Cache successful student authentication for faster PWA startup
                PWACache.saveUserState('student', '/student/attendance', user.email || undefined);
                
                setLoading(false); // Allow rendering of the page
            } else {
                // FAILURE: User has a record, but it's incomplete. Force them to link.
                PWACache.clearUserState(); // Clear invalid cache
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
             PWACache.clearUserState(); // Clear invalid cache
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
        PWACache.clearUserState(); // Clear invalid cache
        navigateWithinPWA('/login');
      }
    });

    return () => unsubscribe();
  }, [dispatch, navigateWithinPWA]);


  // Show loading screen while checking authentication and status
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Show inactive screen if student is not active (blocked access)
  if (studentStatus && !studentStatus.isActive) {
    return (
      <AccountInactiveScreen
        reason={studentStatus.reason}
        expectedReturnMonth={studentStatus.expectedReturnMonth}
        breakReason={studentStatus.breakReason}
        waitlistReason={studentStatus.waitlistReason}
      />
    );
  }

  return (
    <LocaleProvider>
      <StudentLayoutContent>
        <RouteGuard requiredRole="student">
          <style jsx global>{`
            /* Enhanced light mode styling with subtle colors */
            html:not(.dark) body {
              background: linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 30%, rgb(236 242 251) 70%, rgb(243 244 246) 100%) !important;
              color: #111827 !important;
            }
            html.dark body {
              background: linear-gradient(135deg, rgb(12 16 35) 0%, rgb(15 23 42) 30%, rgb(30 41 59) 100%) !important;
              color: #f1f5f9 !important;
            }
          `}</style>
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
          <Toaster richColors position="top-center" />
          <div className="relative min-h-screen bg-transparent">
            {showTopNav && <StudentTopNav />}
            <main className={`relative pb-24 bg-transparent ${showTopNav ? '' : 'pt-0'}`}>
                <div className={`w-full max-w-2xl mx-auto px-4 sm:px-6 ${showTopNav ? 'py-6' : 'py-0'}`}>
                    {children}
                </div>
              <InstallPWA as_banner={true} />
            </main>
          </div>
          <StudentBottomNav />
          <NotificationPermissionPrompt />
          <DateOfBirthPrompt />
        </RouteGuard>
      </StudentLayoutContent>
    </LocaleProvider>
  );
}