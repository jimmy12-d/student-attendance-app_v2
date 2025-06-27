"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  User,
  getAuth
} from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";
import { auth, db } from "../../../firebase-config";
import Button from "../../_components/Button";
import Image from "next/image";
import { navItems } from "../../student/_components/StudentBottomNav";

const StudentGoogleSignIn = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true); // Start as true to handle redirect
  const [error, setError] = useState<string | null>(null);

  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const checkUserAndRedirect = useCallback(async (firebaseUser: User) => {
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("authUid", "==", firebaseUser.uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const studentDoc = querySnapshot.docs[0];
      dispatch(
        setUser({
          name: studentDoc.data().fullName,
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
          uid: firebaseUser.uid,
          studentDocId: studentDoc.id,
          role: "student",
        })
      );
      router.push(navItems[0].href);
    } else {
      router.push("/link-account");
    }
  }, [dispatch, router]);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const firebaseUser = result.user;
          await checkUserAndRedirect(firebaseUser);
        } else {
          setIsLoading(false); // No redirect result, stop loading
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error:", error);
        setError(error.message || "Failed to process sign-in.");
        setIsLoading(false);
      });
  }, [checkUserAndRedirect]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    if (isMobileDevice()) {
      await signInWithRedirect(auth, provider);
    } else {
      try {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        await checkUserAndRedirect(firebaseUser);
      } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
          setError(error.message || "Failed to sign in with Google.");
        }
        console.error("Google sign-in error:", error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-sm px-8 py-4 bg-white rounded-lg shadow-lg dark:bg-slate-800">
      <div className="flex justify-center mb-4">
        <Image src="/favicon.png" alt="Logo" width={80} height={80} />
      </div>
      <h1 className="text-3xl font-bold text-center pb-6 text-gray-900 dark:text-white">
        Student Login
      </h1>

      {error && (
        <div className="p-3 my-2 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
          {error}
        </div>
      )}

      <Button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        color="info"
        className="w-full"
      >
        <div className="flex items-center justify-center">
            <svg className="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.319,44,30.021,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            {isLoading ? "Signing In..." : "Sign in with Google"}
        </div>
      </Button>
    </div>
  );
};

export default StudentGoogleSignIn;