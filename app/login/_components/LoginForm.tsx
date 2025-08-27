// app/login/_components/LoginForm.tsx
"use client";

import React, { useState, useEffect, useRef } from "react"; // <-- Import useRef
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebase-config"; // Import auth and db directly
import { usePWANavigation } from "../../_hooks/usePWANavigation";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
// No longer import db/auth directly
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { mdiGoogle, mdiCellphoneMessage } from "@mdi/js";
import Icon from "../../_components/Icon";

import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";

const LoginForm = () => {
  const router = useRouter();
  const { navigateWithinPWA } = usePWANavigation();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Create a ref for the reCAPTCHA container
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Set up reCAPTCHA verifier using the ref
  useEffect(() => {
    // Make sure we have a container and that the verifier hasn't been created yet.
    if (recaptchaContainerRef.current && !window.recaptchaVerifier) {
      try {
        const verifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current, // <-- Pass the element directly
          {
            size: "invisible",
            callback: (response: any) => {
              console.log("reCAPTCHA solved");
            },
            "expired-callback": () => {
              setError("reCAPTCHA response expired. Please try again.");
            },
          }
        );
        window.recaptchaVerifier = verifier;
      } catch (e: any) {
        console.error("Error setting up reCAPTCHA", e);
        setError(`Could not set up reCAPTCHA: ${e.message}`);
      }
    }

    // This cleanup function is important for single-page apps
    // It will destroy the reCAPTCHA instance when the component unmounts
    return () => {
      if (window.recaptchaVerifier) {
        // As of firebase v9+, RecaptchaVerifier doesn't have a direct clear/destroy method.
        // Unsetting it should be sufficient for most cases, or re-render on demand.
        // For more complex scenarios, you might need to manage the lifecycle more carefully.
        window.recaptchaVerifier = undefined;
      }
    };
  }, [auth]);


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user; // user from Firebase Auth
      console.log("Google Sign-In Attempt Successful with Firebase Auth:", firebaseUser.email);

      if (!firebaseUser.email) {
        console.error("User email not available from Google Sign-In.");
        setError("Could not retrieve email from Google account. Please try again or use a different account.");
        await signOut(auth); // Sign out the Firebase Auth session
        setIsLoading(false);
        return;
      }

      const authorizedUserRef = doc(db, "authorizedUsers", firebaseUser.email);
      const authorizedUserSnap = await getDoc(authorizedUserRef);

      if (authorizedUserSnap.exists()) {
        console.log("User is authorized:", firebaseUser.email);
        dispatch(
          setUser({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            uid: firebaseUser.uid,
            role: "admin",
          })
        );
        navigateWithinPWA("/dashboard");
      } else {
        console.warn("User is NOT authorized:", firebaseUser.email);
        setError(`Access Denied. Your Google account (${firebaseUser.email}) is not authorized for this application.`);
        await signOut(auth);
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in process was cancelled.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Popup request was cancelled, possibly due to another popup.")
      }
      else {
        setError(error.message || "Failed to sign in with Google. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    setIsLoading(true);
    setError(null);
    if (!phone) {
      setError("Please enter your phone number.");
      setIsLoading(false);
      return;
    }

    let phoneForAuth = "";
    if (phone.startsWith("+")) {
      phoneForAuth = phone;
    } else if (/^0\d{8,}$/.test(phone)) {
      phoneForAuth = "+855" + phone.slice(1);
    } else {
      setError("Invalid phone number format. Use local format like 0712345678 or include country code e.g. +855712345678.");
      setIsLoading(false);
      return;
    }

    try {
      const verifier = window.recaptchaVerifier;
      // This will render the invisible reCAPTCHA widget if it hasn't been already
      if (!verifier) {
        setError("reCAPTCHA verifier is not initialized. Please refresh the page and try again.");
        setIsLoading(false);
        return;
      }
      await verifier.render(); 

      const result = await signInWithPhoneNumber(auth, phoneForAuth, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setError(null);
    } catch (error: any) {
      console.error("Full Phone Sign-In Error Object:", error);
      let errorMessage = "Failed to send OTP. Please check the phone number.";

      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMessage = `The phone number format '${phoneForAuth}' is not valid. Please check it and try again.`;
            break;
          case 'auth/too-many-requests':
            errorMessage = "You've tried to sign in too many times. Please try again later.";
            break;
          case 'auth/captcha-check-failed':
             errorMessage = "reCAPTCHA verification failed. Please refresh the page and try again.";
             break;
          default:
            errorMessage = `An unexpected error occurred: ${error.message} (code: ${error.code})`;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  const handleOtpSubmit = async () => {
    setIsLoading(true);
    setError(null);
    if (!otp) {
      setError("Please enter the OTP.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      console.log("OTP Verified for UID:", firebaseUser.uid);

      // --- THIS IS THE CORRECTED QUERY ---
      // Query the students collection to find the document where the 'authUid' field matches the user's UID.
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("authUid", "==", firebaseUser.uid));
      const querySnapshot = await getDocs(q);
      // --- END OF CORRECTION ---

      if (querySnapshot.empty) {
        console.warn(`User with UID ${firebaseUser.uid} is not registered as a student.`);
        setError("Your user account is not registered as a student. Please contact administration.");
        await signOut(auth);

        setShowOtpInput(false);
        setOtp("");
      } else {
        // Since we expect only one match, we take the first document from the results.
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        const studentDocId = studentDoc.id; 
        console.log("Student found:", studentData.fullName);

        const userPayload = {
          name: studentData.fullName,
          email: null,
          avatar: null,
          uid: firebaseUser.uid,
          studentDocId: studentDocId,
          role: "student" as "student",
        };

        // Finally, dispatch user info to Redux store
        dispatch(setUser(userPayload));

        // Redirect to a student-specific dashboard using PWA navigation
        navigateWithinPWA("/student/attendance");
      }
    } catch (error: any) {
      console.error("OTP Verification or Student Check Error:", error);
      setError(error.message || "Failed to verify OTP. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* Attach the ref to this div. No need for an ID anymore. */}
      <div ref={recaptchaContainerRef} className="fixed bottom-0 right-0"></div>

      <h1 className="text-3xl font-bold text-center mb-8">Welcome Back</h1>
      
      {error && (
        <div className="my-4 text-sm text-red-600 p-3 bg-red-100 rounded-md text-center">
          {error}
        </div>
      )}

      <div className="mb-6 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold text-center mb-4">Admin Login</h2>
        <Buttons>
          <Button
            type="button"
            color="info"
            label={isLoading && !showOtpInput ? "Signing in..." : "Sign In with Google"}
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
            icon={mdiGoogle}
          />
        </Buttons>
      </div>

      <div className="my-6 flex items-center">
        <hr className="flex-grow border-t border-gray-300" />
        <span className="mx-4 text-gray-500 font-semibold">OR</span>
        <hr className="flex-grow border-t border-gray-300" />
      </div>

      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold text-center mb-4">Student Login</h2>
        {!showOtpInput ? (
          <div className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0712345678"
              className="w-full p-2 border rounded text-center text-black placeholder-gray-500"
              disabled={isLoading}
            />
            <Button
              type="button"
              color="info"
              label={isLoading ? "Sending OTP..." : "Get OTP via SMS"}
              onClick={handlePhoneSignIn}
              disabled={isLoading}
              className="w-full"
              icon={mdiCellphoneMessage}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full p-2 border rounded text-center text-black placeholder-gray-500"
              disabled={isLoading}
            />
            <Button
              type="button"
              color="success"
              label={isLoading ? "Verifying..." : "Verify OTP & Login"}
              onClick={handleOtpSubmit}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default LoginForm;