// app/login/_components/LoginForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import Button from "../../_components/Button"; // Verify path
import Buttons from "../../_components/Buttons"; // Verify path
import { useRouter } from "next/navigation"; // For redirection

// Firebase imports for Google Sign-In & Phone Auth
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth"; // Added signOut
import { auth, db } from "../../../firebase-config"; // Adjust path, ensure db is exported from firebase-config
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"; // For checking authorization
import { mdiGoogle, mdiCellphoneMessage } from "@mdi/js";
import Icon from "../../_components/Icon";

// Redux imports to set user state
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice"; // Ensure this path and action are correct

const LoginForm = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for phone auth
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Set up reCAPTCHA verifier
  useEffect(() => {
    // This timeout ensures the container is in the DOM.
    setTimeout(() => {
      try {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: (response: any) => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
              console.log("reCAPTCHA solved");
            },
            "expired-callback": () => {
              // Response expired. Ask user to solve reCAPTCHA again.
              setError("reCAPTCHA response expired. Please try again.");
            },
          });
          window.recaptchaVerifier.render(); // Render the verifier
        }
      } catch (e) {
        console.error("Error setting up reCAPTCHA", e);
        setError("Could not set up reCAPTCHA. Please refresh and try again.");
      }
    }, 1000);
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

      // **** CHECK IF USER IS AUTHORIZED ****
      const authorizedUserRef = doc(db, "authorizedUsers", firebaseUser.email);
      const authorizedUserSnap = await getDoc(authorizedUserRef);

      if (authorizedUserSnap.exists()) {
        // User is authorized (Admin)
        console.log("User is authorized:", firebaseUser.email);
        dispatch(
          setUser({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            uid: firebaseUser.uid,
            role: "admin", // Set role as admin
          })
        );
        router.push("/dashboard"); // Redirect to dashboard
        // No need to setIsLoading(false) here as it redirects
      } else {
        // User is NOT authorized
        console.warn("User is NOT authorized:", firebaseUser.email);
        setError(`Access Denied. Your Google account (${firebaseUser.email}) is not authorized for this application.`);
        await signOut(auth); // Sign them out of the Firebase session
        setIsLoading(false);
      }
      // **** END OF AUTHORIZATION CHECK ****

    } catch (error) {
      console.error("Google Sign-In Error:", error);
      // Handle specific errors like 'auth/popup-closed-by-user' gracefully
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in process was cancelled.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this error or treat as cancellation if another popup was opened.
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

    // Prepare phone number for Firebase (E.164 format)
    let phoneForAuth = "";
    if (phone.startsWith("+")) {
      // Already in E.164 format
      phoneForAuth = phone;
    } else if (/^0\d{8,}$/.test(phone)) {
      // Local number starting with 0 -> convert to +855 (Cambodia) without leading 0
      phoneForAuth = "+855" + phone.slice(1);
    } else {
      setError("Invalid phone number format. Use local format like 0712345678 or include country code e.g. +855712345678.");
      setIsLoading(false);
      return;
    }

    try {
      const verifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneForAuth, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setError(null); // Clear previous errors
    } catch (error: any) {
      console.error("Full Phone Sign-In Error Object:", error); // Log the whole object
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
            // This will show us the exact error from Firebase
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
      // 1. Confirm OTP
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      console.log("OTP Verified for:", firebaseUser.phoneNumber);

      // 2. Check if phone number exists in 'students' collection
      // The `phone` state variable holds the number as entered by the user, e.g., "0712777404"
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("phone", "==", phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // 3a. If student not found
        console.warn(`User with phone ${phone} is not registered in 'students' collection.`);
        setError("This phone number is not registered as a student.");
        await signOut(auth); // Sign them out of the Firebase session
        setShowOtpInput(false); // Go back to phone input
        setOtp(""); // Clear OTP input
      } else {
        // 3b. If student found
        const studentData = querySnapshot.docs[0].data();
        console.log("Student found:", studentData.fullName);

        dispatch(
          setUser({
            name: studentData.fullName, // Use full name from DB
            email: null, // Students don't have email login
            avatar: null, // No avatar for phone users
            uid: firebaseUser.uid,
            role: "student", // Set role as student
          })
        );
        router.push("/student/dashboard"); // Redirect to a student-specific dashboard
      }
    } catch (error) {
      console.error("OTP Verification or Student Check Error:", error);
      setError(error.message || "Failed to verify OTP. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <>
      <div id="recaptcha-container" className="fixed bottom-0 right-0"></div>

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

      {/* Student Login */}
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