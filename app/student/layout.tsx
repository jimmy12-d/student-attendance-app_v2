"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useAppDispatch } from "../_stores/hooks";
import { setUser } from "../_stores/mainSlice";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../firebase-config";
import { useRouter, usePathname } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import Image from "next/image";
import DarkModeInit from "../_components/DarkModeInit";
import StudentBottomNav from "./_components/StudentBottomNav";
import { Toaster } from 'sonner'

export default function StudentLayout({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("authUid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();
            const fetchedUserName = studentData.fullName;
            const fetchedUserClass = studentData.class;
            const studentDocId = studentDoc.id;
            
            setUserName(fetchedUserName);
            setUserClass(fetchedUserClass);
            
            dispatch(
              setUser({
                name: fetchedUserName,
                email: null,
                avatar: null,
                uid: user.uid,
                studentDocId: studentDocId,
                role: "student",
              })
            );
        } else {
             // If user is authenticated but not in the database, log them out.
             await signOut(auth);
             dispatch(setUser(null));
             router.replace("/login");
        }
      } else {
        dispatch(setUser(null));
        if (pathname.startsWith('/student')) {
            router.replace("/login");
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch, router, pathname]);

  if (isAuthLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
            <p className="text-lg dark:text-white">Loading Student Portal...</p>
        </div>
    );
  }

  return (
    <>
      <DarkModeInit />
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            marginTop: '5rem', // equivalent to mt-20 (80px)
          },
        }}
      />
      <div className="min-h-screen bg-white dark:bg-slate-800">
      <nav className="fixed top-0 left-0 right-0 z-30 bg-gray-50 dark:bg-slate-900 shadow-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-4 lg:px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* 1. LEFT side is now simplified */}
            <div className="flex items-center">
              <Image src="/favicon.png" alt="Logo" width={40} height={40} className="mr-2"/>
              <span className="text-lg font-bold dark:text-white">Student Portal</span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-end">
                {userName && (
                  <span className="text-base text-slate-800 dark:text-gray-100 truncate">
                    {userName}
                  </span>
                )}
                {userClass && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userClass}
                  </span>
                )}
              </div>

              {/* The notification icon */}
              {/* <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg> */}
            </div>

          </div>
        </div>
      </nav>
        <main className="pt-16 pb-20">
          <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <StudentBottomNav />
      </div>
    </>
  );
} 