"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, limit, DocumentData } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";
import { auth, db } from "../../../firebase-config";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import FormField from "../../_components/FormField";
import OtpInput from "../../_components/OtpInput";
// ... your imports
console.log("LOGIN FORM - Firebase API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("LOGIN FORM - reCAPTCHA Site Key:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

const StudentLoginForm = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
        try {
          // The empty div is still needed for the invisible reCAPTCHA to anchor itself.
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: "invisible",
            callback: () => console.log("reCAPTCHA solved for phone auth"),
            "expired-callback": () => setError("reCAPTCHA response expired. Please try again."),
          });
        } catch (e: any) {
          setError(`Could not set up reCAPTCHA: ${e.message}`);
        }
      }
    }, []);

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
      setError("Invalid phone number format. Use 0... or +855...");
      setIsLoading(false);
      return;
    }

    try {
      const verifier = window.recaptchaVerifier;
      if (!verifier) {
        throw new Error("reCAPTCHA verifier is not initialized.");
      }
      await verifier.render();

      const result = await signInWithPhoneNumber(auth, phoneForAuth, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setError(null);
    } catch (error: any) {
      let errorMessage = "Failed to send OTP. Please check the phone number and try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMessage = `The phone number format '${phoneForAuth}' is not valid.`;
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many requests. Please try again later.";
            break;
          case 'auth/captcha-check-failed':
             errorMessage = "reCAPTCHA verification failed. Refresh and try again.";
             break;
          default:
            errorMessage = `Error: ${error.message}`;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
      
      // 1. Check if a student document is already linked to this auth user
      const studentsRef = collection(db, "students");
      let q = query(studentsRef, where("authUid", "==", firebaseUser.uid), limit(1));
      let querySnapshot = await getDocs(q);

      let studentDoc;

      if (querySnapshot.empty) {
        // 2. If no doc is linked, call the Cloud Function to request a link.
        console.log("No linked student found. Calling requestStudentLink Cloud Function...");
        
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch('https://asia-southeast1-rodwell-attendance.cloudfunctions.net/requestStudentLink', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to link account.");
        }
        
        // 3. After the function runs, query again to get the newly linked document.
        q = query(studentsRef, where("authUid", "==", firebaseUser.uid), limit(1));
        querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Failed to link account after calling function. Please contact an administrator.");
        }
      }
      
      studentDoc = querySnapshot.docs[0];

      // 4. Proceed to login
      dispatch(
        setUser({
          name: studentDoc.data().fullName,
          email: null,
          avatar: null,
          uid: firebaseUser.uid,
          studentDocId: studentDoc.id,
          role: "student",
        })
      );
      router.push("/student/dashboard");

    } catch (error: any) {
      await signOut(auth);
      setError(error.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <div className="flex justify-center">
        <Image src="/favicon.png" alt="Logo" width={96} height={96} />
      </div>

      <h2 className="text-3xl font-bold text-center">Student Portal</h2>
      <p className="text-center text-gray-500 dark:text-gray-400">
        {showOtpInput ? "Enter the code we sent to your phone." : "Sign in using your phone number."}
      </p>

      {error && (
        <div className="p-3 my-2 text-sm text-center text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
          {error}
        </div>
      )}

      {!showOtpInput ? (
        <div className="space-y-4">
          <FormField>
            {() => (
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="012 345 678"
                  className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:border-slate-600"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  onClick={handlePhoneSignIn}
                  label={isLoading ? "Sending..." : "Get OTP"}
                  color="info"
                  disabled={isLoading}
                  className="min-w-[120px] w-auto"
                />
              </div>
            )}
          </FormField>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField>
            {() => (
              <OtpInput
                length={6}
                onComplete={setOtp}
              />
            )}
          </FormField>
          <div className="flex flex-col items-center gap-y-2">
            <Button
              onClick={handleOtpSubmit}
              label={isLoading ? "Verifying..." : "Verify & Sign In"}
              color="success"
              disabled={isLoading || otp.length !== 6}
              className="w-full"
            />
            <Button
              onClick={() => {
                setShowOtpInput(false);
                setError(null);
                setOtp("");
              }}
              label="Use a different number"
              color="void"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLoginForm; 