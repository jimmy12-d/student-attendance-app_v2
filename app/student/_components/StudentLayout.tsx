"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../../firebase-config";
import { useRouter, usePathname } from "next/navigation";
import Button from "../../_components/Button";
import CardBoxModal from "../../_components/CardBox/Modal";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import Image from "next/image";
import DarkModeToggle from "./DarkModeToggle";
import DarkModeInit from "../../_components/DarkModeInit";

type Props = {
  children: (userName: string | null) => ReactNode;
};

export default function StudentLayout({ children }: Props) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [isLogoutModalActive, setIsLogoutModalActive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in. Now check if they are a registered student.
        const uid = user.uid;
        let studentData: DocumentData | null = null;
        
        // Firebase phone numbers include the country code, but our DB stores it locally.
        // This is a bit brittle. Let's assume +855 and convert back.
        // A better long-term solution would be to store phone numbers consistently.

        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("authUid", "==", uid)); // Query by authUid
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            studentData = studentDoc.data();
            
            // Student is valid
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
            // A user is authed with Firebase, but not in our students DB. Log them out.
             await signOut(auth);
             dispatch(setUser(null));
             router.replace("/login");
        }

      } else {
        // User is signed out.
        dispatch(setUser(null));
        if (pathname.startsWith('/student')) {
            router.replace("/login");
        }
      }
      setIsAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [dispatch, router, pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(setUser(null));
    router.push('/login');
    setIsLogoutModalActive(false);
  };

  const handleCancelLogout = () => {
    setIsLogoutModalActive(false);
  };

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
      <CardBoxModal
        title="Confirm Logout"
        buttonColor="danger"
        buttonLabel="Confirm"
        isActive={isLogoutModalActive}
        onConfirm={handleLogout}
        onCancel={handleCancelLogout}
      >
        <p>Are you sure you want to log out?</p>
      </CardBoxModal>

      <div className="min-h-screen bg-white dark:bg-slate-800">
        <nav className="bg-gray-50 dark:bg-slate-900 shadow-md">
          <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-2">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center flex-1 min-w-0">
                <Image src="/rodwell_logo.png" alt="Rodwell Logo" width={60} height={60} className="mr-4" />
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
              <div className="flex items-center space-x-2">
                <DarkModeToggle />
                <Button color="danger" label="Logout" onClick={() => setIsLogoutModalActive(true)} outline />
              </div>
            </div>
          </div>
        </nav>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children(userName)}
          </div>
        </main>
      </div>
    </>
  );
} 