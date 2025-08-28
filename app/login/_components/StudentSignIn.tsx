"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  getRedirectResult, 
  User,
  signInWithCustomToken
} from "firebase/auth";
import { usePWANavigation } from "../../_hooks/usePWANavigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit
} from "firebase/firestore";
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";
import { auth, db } from "../../../firebase-config";
import Button from "../../_components/Button";
import Icon from "../../_components/Icon";
import Image from "next/image";
import { navItems } from "../../student/_components/StudentBottomNav";
import { InstallPWA } from "../../student/_components/InstallPWA";
import FormField from "@/app/_components/FormField";
import { mdiEye, mdiEyeOff } from "@mdi/js";

const StudentSignIn = () => {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Phone/password login state
  const [phone, setPhone] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const checkUserAndRedirect = useCallback(async (firebaseUser: User) => {
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("authUid", "==", firebaseUser.uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const studentDoc = querySnapshot.docs[0];
      const studentData = studentDoc.data();

      if (studentData && studentData.class && studentData.class !== 'Unassigned') {
        dispatch(
          setUser({
            name: studentData.fullName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            uid: firebaseUser.uid,
            studentDocId: studentDoc.id,
            role: "student",
          })
        );
        navigateWithinPWA(navItems[0].href, { replace: true });
        return;
      }
    }

    dispatch(
      setUser({
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        avatar: firebaseUser.photoURL,
        uid: firebaseUser.uid,
        studentDocId: querySnapshot.empty ? null : querySnapshot.docs[0].id,
        role: "student",
      })
    );
    navigateWithinPWA("/login");

  }, [dispatch, router]);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          setIsSubmitting(true);
          const firebaseUser = result.user;
          await checkUserAndRedirect(firebaseUser);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error:", error);
        setError(error.message || "Failed to process sign-in.");
        setIsLoading(false);
      });
  }, [checkUserAndRedirect]);

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {        
        // First try teacher authentication using Cloud Function
        const functions = getFunctions(auth.app, "asia-southeast1");
        const authenticateTeacher = httpsCallable(functions, 'authenticateTeacherWithPhone');
        
        try {
            const teacherResult = await authenticateTeacher({ phone, password: userPassword });
            const teacherData = teacherResult.data as { customToken?: string; teacher?: any; error?: string };

            if (teacherData.customToken && teacherData.teacher) {                
                // Sign in with the custom token
                const userCredential = await signInWithCustomToken(auth, teacherData.customToken);
                const firebaseUser = userCredential.user;
                
                // Dispatch teacher data to Redux
                dispatch(
                  setUser({
                    name: teacherData.teacher.fullName,
                    email: firebaseUser.email,
                    avatar: firebaseUser.photoURL,
                    uid: firebaseUser.uid,
                    studentDocId: null,
                    role: "teacher",
                    subject: teacherData.teacher.subject,
                    phone: teacherData.teacher.phone
                  })
                );

                // Cache teacher session locally for fast restore on refresh
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('teacherSession', JSON.stringify({
                      name: teacherData.teacher.fullName,
                      uid: firebaseUser.uid,
                      subject: teacherData.teacher.subject,
                      phone: teacherData.teacher.phone,
                      ts: Date.now()
                    }));
                  }
                } catch (e) {
                  console.warn('Unable to cache teacher session', e);
                }

                // Redirect to teacher dashboard
                navigateWithinPWA("/teacher");
                setIsSubmitting(false);
                return;
            }
            
        } catch (teacherAuthError: any) {            
            // If teacher auth fails, proceed with student authentication
            const authenticateStudent = httpsCallable(functions, 'authenticateStudentWithPhone');
                        const result = await authenticateStudent({ phone, password: userPassword });
            const resultData = result.data as { customToken?: string; student?: any; error?: string };

            if (resultData.customToken && resultData.student) {
                // Sign in with the custom token
                const userCredential = await signInWithCustomToken(auth, resultData.customToken);
                const firebaseUser = userCredential.user;
                
                // Dispatch user data to Redux
                dispatch(
                  setUser({
                    name: resultData.student.fullName,
                    email: firebaseUser.email,
                    avatar: firebaseUser.photoURL,
                    uid: firebaseUser.uid,
                    studentDocId: resultData.student.id,
                    role: "student",
                  })
                );

                // Redirect to student dashboard
                navigateWithinPWA(navItems[0].href, { replace: true });
            } else {
                throw new Error("Authentication failed. Please check your phone and password.");
            }
        }

    } catch (error: any) {
        console.error("Phone sign-in error:", error);
        
        // More specific error messages
        if (error.code === 'auth/invalid-email') {
            setError("Account setup error. Please contact support or try registering via Telegram bot again.");
        } else if (error.code === 'auth/invalid-custom-token') {
            setError("Authentication token error. Please try again or contact support.");
        } else if (error.code === 'auth/wrong-password') {
            setError("Invalid password. For teachers, use 'RodwellTeacher'. For students, use your registered password.");
        } else if (error.code === 'auth/user-not-found') {
            setError("No account found with this phone number. Students should register via Telegram bot first.");
        } else if (error.code === 'functions/not-found') {
            setError("Invalid Account");
        } else if (error.code === 'functions/unauthenticated') {
            setError("Invalid phone or password. Please check your credentials.");
        } else {
            setError(error.message || "Invalid credentials. Please try again.");
        }
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="w-full max-w-sm px-8 py-4 bg-white rounded-lg shadow-lg dark:bg-slate-800">
      <div className="flex justify-center mb-4">
        <Image src="/favicon.png" alt="Logo" width={80} height={80} />
      </div>
      <h1 className="text-2xl font-bold text-center pb-4 text-gray-900 dark:text-white">
        Rodwell Portal
      </h1>

      {error && (
        <div className="p-3 my-2 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 my-2 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
          {success}
        </div>
      )}

      <form onSubmit={handlePhoneSignIn} className="space-y-4">
          <FormField label="Phone Number" labelFor="phone">
              {(fd) => <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone (e.g., 0967639355)" required className={fd.className}/>}
          </FormField>
          <FormField label="Password" labelFor="userPassword">
              {(fd) => (
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="userPassword" 
                    value={userPassword} 
                    onChange={(e) => setUserPassword(e.target.value)} 
                    placeholder="Enter your password" 
                    required 
                    className={`${fd.className} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <Icon path={showPassword ? mdiEyeOff : mdiEye} size={20} />
                  </button>
                </div>
              )}
          </FormField>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-1">Students: Need to register or change password? Use the Telegram bot.</p>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            color="success"
            className="w-full"
          >
            {isSubmitting ? "Logging In..." : "Log In"}
          </Button>
      </form>

      <InstallPWA as_button={true} showPrompt={true} />

    </div>
  );
};

export default StudentSignIn;
