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
      <div className="min-h-screen bg-white dark:bg-slate-800">
        <nav className="fixed top-0 left-0 right-0 z-30 bg-gray-50 dark:bg-slate-900 shadow-md">
          <div className="max-w-2xl mx-auto px-2 sm:px-2 lg:px-2">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center flex-1 min-w-0">
                <Image src="/favicon.png" alt="Logo" width={50} height={50} className="mr-4" />
                <div className="flex flex-col justify-center">
                  <span className="text-xl font-bold dark:text-white truncate">Student Portal</span>
                  {userName && (
                    <div className="flex flex-col">
                      <span className="text-base text-gray-700 dark:text-gray-300 truncate">{userName}</span>
                      {userClass && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{userClass}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-20 pb-20">
          <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <StudentBottomNav />
      </div>
    </>
  );
} 