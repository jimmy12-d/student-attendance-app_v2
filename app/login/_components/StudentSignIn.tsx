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
  doc,
  getDoc,
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

  const isPhoneNumber = (input: string): boolean => {
    // More robust phone number detection
    const cleanInput = input.trim();

    // If it starts with +, it's definitely a phone number
    if (cleanInput.startsWith('+')) {
      return true;
    }

    // If it contains phone-specific characters (parentheses, dashes in phone format), it's a phone
    if (/[\(\)\-]/.test(cleanInput)) {
      return true;
    }

    // Count digits
    const digitCount = (cleanInput.match(/\d/g) || []).length;

    // If it has 7+ digits and no underscores (usernames have underscores), it's likely a phone
    if (digitCount >= 7 && !cleanInput.includes('_')) {
      return true;
    }

    // If it has 10+ digits regardless, it's definitely a phone
    if (digitCount >= 10) {
      return true;
    }

    // If it contains letters and underscores but few/no digits, it's a username
    if (/[a-z]/.test(cleanInput) && cleanInput.includes('_')) {
      return false;
    }

    // Default: if it has moderate digits (3-6) and no letters, could be phone
    if (digitCount >= 3 && digitCount <= 6 && !/[a-z]/.test(cleanInput)) {
      return true;
    }

    // Otherwise, assume username
    return false;
  };

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
            const isUsingPhone = isPhoneNumber(phone);
            
            let authenticateStudent;
            let authData;
            
            if (isUsingPhone) {
              // Use phone authentication
              authenticateStudent = httpsCallable(functions, 'authenticateStudentWithPhone');
              authData = { phone, password: userPassword };
            } else {
              // Use username authentication
              authenticateStudent = httpsCallable(functions, 'authenticateStudentWithUsername');
              authData = { username: phone, password: userPassword };
            }
            
            const result = await authenticateStudent(authData);
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
                throw new Error("Authentication failed. Please check your credentials and try again.");
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
            const isUsingPhone = isPhoneNumber(phone);
            setError(`No account found with this ${isUsingPhone ? 'phone number' : 'username'}. Students should register via Telegram bot first.`);
        } else if (error.code === 'functions/not-found') {
            setError("Invalid Account");
        } else if (error.code === 'functions/unauthenticated') {
            const isUsingPhone = isPhoneNumber(phone);
            setError(`Invalid ${isUsingPhone ? 'phone number' : 'username'} or password. Please check your credentials.`);
        } else {
            setError(error.message || "Invalid credentials. Please try again.");
        }
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200 animate-pulse">
              Loading student portal...
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Preparing your login
            </p>
          </div>
        </div>
      );
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
          <FormField label="Phone Number or Username" labelFor="phone">
              {(fd) => <input type="text" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone or username" required className={fd.className}/>}
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

      {/* <div className="mt-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">
              New student?
            </span>
          </div>
        </div>
        
        <button
          onClick={() => window.location.href = '/register'}
          className="mt-4 w-full flex justify-center py-2 px-4 border border-blue-300 rounded-lg shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Sign Up for New Account
        </button>
        
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Register and wait for admin approval
        </p>
      </div> */}

      <InstallPWA as_button={true} showPrompt={true} />

    </div>
  );
};

export default StudentSignIn;
