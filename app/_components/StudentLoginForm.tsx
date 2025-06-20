"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAppDispatch } from "../_stores/hooks";
import { setUser } from "../_stores/mainSlice";
import { auth, db } from "../../firebase-config";
import Button from "./Button";
import Buttons from "./Buttons";
import FormField from "./FormField";
import Image from "next/image";

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
    if (recaptchaContainerRef.current && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: "invisible",
          callback: () => console.log("reCAPTCHA solved"),
          "expired-callback": () => setError("reCAPTCHA response expired. Please try again."),
        });
      } catch (e: any) {
        setError(`Could not set up reCAPTCHA: ${e.message}`);
      }
    }
    return () => {
      window.recaptchaVerifier = undefined;
    };
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
      
      const studentsRef = collection(db, "students");
      let q = query(studentsRef, where("authUid", "==", firebaseUser.uid));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No linked student found, attempting to call requestStudentLink...");
        const functions = getFunctions(auth.app, "asia-southeast1");
        const requestLinkFunction = httpsCallable(functions, 'requestStudentLink');
        
        try {
          await requestLinkFunction();
          console.log("requestStudentLink succeeded. Re-querying for student...");
          querySnapshot = await getDocs(q);
        } catch (linkError: any) {
          console.error("requestStudentLink failed:", linkError);
          await signOut(auth);
          throw new Error(linkError.message || "Your account is not registered as a student.");
        }
      }

      if (querySnapshot.empty) {
        await signOut(auth);
        throw new Error("Failed to link your account. Please contact an administrator.");
      }

      const studentDoc = querySnapshot.docs[0];
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
      setError(error.message || "Failed to verify OTP.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-8 py-4 bg-white rounded-lg shadow-lg dark:bg-slate-800">
      <div ref={recaptchaContainerRef} />
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

      {!showOtpInput ? (
        <div className="space-y-4">
          <FormField label="Phone Number" labelFor="phone">
            {() => (
              <input
                type="tel"
                name="phone"
                id="phone"
                placeholder="0712345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-purple-200 dark:bg-slate-700 dark:border-slate-600"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
          </FormField>
          <Buttons className="mt-6 mb-4">
            <Button
              onClick={handlePhoneSignIn}
              label={isLoading ? "Sending OTP..." : "Send OTP"}
              color="info"
              disabled={isLoading}
            />
          </Buttons>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="OTP" labelFor="otp">
            {() => (
              <input
                type="text"
                name="otp"
                id="otp"
                placeholder="Enter OTP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-purple-200 dark:bg-slate-700 dark:border-slate-600"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            )}
          </FormField>
          <Buttons className="mt-6 mb-2">
            <Button
              onClick={handleOtpSubmit}
              label={isLoading ? "Verifying..." : "Verify OTP"}
              color="success"
              disabled={isLoading}
            />
            <Button
              onClick={() => {
                setShowOtpInput(false);
                setError(null);
                setOtp("");
              }}
              label="Change Number"
              color="lightDark"
              outline
            />
          </Buttons>
        </div>
      )}
    </div>
  );
};

export default StudentLoginForm; 