"use client";

import { useRouter } from 'next/navigation';
import { useAppDispatch } from "../_stores/hooks";
import { setUser } from '../_stores/mainSlice';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import React, { ReactNode, useEffect, useState } from "react";
import StudentBottomNav from "./_components/StudentBottomNav";
import { Toaster } from 'sonner'
import { InstallPWA } from './_components/InstallPWA';
import StudentTopNav from './_components/StudentTopNav';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, now find their document in the 'students' collection
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("authUid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();
            
            dispatch(
              setUser({
                name: studentData.fullName, // Use name from Firestore
                email: user.email,
                avatar: user.photoURL,
                uid: user.uid,
                studentDocId: studentDoc.id, // This is crucial
                role: "student",
              })
            );
        } else {
             // If user is authenticated but not in the database, something is wrong. Log them out.
             setError("Student record not found."); // You can show an error message
             await signOut(auth);
             router.push('/login');
        }
      } else {
        // User is signed out
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch, router]);


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="md:ml-64 lg:ml-0 xl:ml-0">
        <StudentTopNav />
        <main className="relative pb-20">
            <div className="p-6 max-w-2xl mx-auto">
                {children}
            </div>
          <InstallPWA as_banner={true} />
        </main>
        <StudentBottomNav />
      </div>
    </>
  );
} 