"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
// import { RecaptchaVerifier, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from "firebase/auth";
import { useAuth } from "@/app/_hooks/use-auth";
import { auth, db } from "@/firebase-config";
import { useAppDispatch } from "@/app/_stores/hooks";
import { setUser } from "@/app/_stores/mainSlice";
import SectionFullScreen from "@/app/_components/Section/FullScreen";
import CardBox from "@/app/_components/CardBox";
import FormField from "@/app/_components/FormField";
import Button from "@/app/_components/Button";
import Buttons from "@/app/_components/Buttons";
import Image from 'next/image';
// import OtpInput from "../_components/OtpInput";
import { mdiPhone } from "@mdi/js";
import Icon from "../_components/Icon";
import { navItems } from '../student/_components/StudentBottomNav';
import LoadingSpinner from "../_components/LoadingSpinner";

/*
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}
*/

const LinkAccountPage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const dispatch = useAppDispatch();
  
  const [phone, setPhone] = useState("");
  // const [otp, setOtp] = useState("");
  // const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [timer, setTimer] = useState(60);
  // const [canResend, setCanResend] = useState(false);

  /*
  useEffect(() => {
    if (user && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => console.log('reCAPTCHA solved!'),
      });
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);
  */

  if (loading) {
    return (
      <SectionFullScreen bg="white">
        <div className="flex flex-col items-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg font-semibold text-black">Authenticating...</p>
        </div>
      </SectionFullScreen>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const handleLinkAccount = async () => {
    setIsLoading(true);
    setError(null);

    if (!phone) {
        setError("Please enter a valid phone number.");
        setIsLoading(false);
        return;
    }

    try {
        const functions = getFunctions(auth.app, "asia-southeast1");
        const linkFunction = httpsCallable(functions, 'linkStudentProfileWithVerifiedNumber');

        // Normalize phone to local format (e.g., 0xxxxxxxxx)
        let localPhone = phone.replace(/\D/g, ''); // Remove non-digits
        if (localPhone.startsWith('855')) {
            localPhone = '0' + localPhone.substring(3);
        } else if (!localPhone.startsWith('0')) {
            localPhone = '0' + localPhone;
        }
        
        const result = await linkFunction({ phoneNumber: localPhone });
        const resultData = result.data as { success: boolean, studentData?: any, error?: string };

        if (resultData.success && resultData.studentData) {
            dispatch(
              setUser({
                name: resultData.studentData.fullName,
                email: user.email,
                avatar: user.photoURL,
                uid: user.uid,
                studentDocId: resultData.studentData.id,
                role: "student",
              })
            );
            router.push(navItems[0].href);
        } else {
            throw new Error(resultData.error || "Failed to link your student profile. Please check the phone number.");
        }
    } catch (err: any) {
        setError(err.message || "An unknown error occurred during linking.");
    } finally {
        setIsLoading(false);
    }
  };
  
  /*
  const handleSendOtp = async () => {
    setIsLoading(true);
    setError(null);
    setCanResend(false);
    setTimer(60);

    if (!phone) {
        setError("Please enter a valid phone number.");
        setIsLoading(false);
        return;
    }

    try {
      const appVerifier = window.recaptchaVerifier!;
      let cleanPhone = phone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '855' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('855')) {
        cleanPhone = '855' + cleanPhone;
      }
      const phoneNumber = `+${cleanPhone}`;
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      setError(null);
    } catch (err: any) {
        console.error("Full error object from Firebase:", err);
        if (err.code === 'auth/too-many-requests') {
          setError("Too many requests from this phone number. Please try again later.");
        } else if (err.code === 'auth/internal-error') {
          setError("An internal Firebase error occurred. Please try again later..");
        } else {
          setError(err.message || "Failed to send OTP. Please check the phone number and try again.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyAndLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.confirmationResult) throw new Error("OTP confirmation result not found.");
      
      const credential = PhoneAuthProvider.credential(window.confirmationResult.verificationId, otp);
      await linkWithCredential(auth.currentUser!, credential);

      const functions = getFunctions(auth.app, "asia-southeast1");
      const linkFunction = httpsCallable(functions, 'linkStudentByPhone');
      const result = await linkFunction({ phoneNumber: phone });
      const resultData = result.data as { success: boolean, studentData?: any, error?: string };

      if (resultData.success && resultData.studentData) {
          // Dispatch full user profile
          dispatch(
            setUser({
              name: resultData.studentData.fullName,
              email: auth.currentUser!.email,
              avatar: auth.currentUser!.photoURL,
              uid: auth.currentUser!.uid,
              studentDocId: resultData.studentData.id,
              role: "student",
            })
          );
          router.push(navItems[0].href);
      } else {
          throw new Error(resultData.error || "Failed to link your student profile in the database.");
      }

    } catch (err: any) {
        if (err.code === 'auth/invalid-verification-code') {
          setError("Invalid OTP code. Please try again.");
        } else {
          setError(err.message || "An unknown error occurred during linking.");
        }
    } finally {
        setIsLoading(false);
    }
  };
  */

  const handleBack = () => {
    router.back();
  }

  return (
    <SectionFullScreen bg="white">
      {/* <div id="recaptcha-container"></div> */}
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Image src="/phone_verify.png" alt="Phone Verification" width={100} height={100} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">Link Your Account</h1>
        <p className="text-center mb-6">
          Enter the phone number you registered with to verify your account.
        </p>
        
        {error && (
            <div className="p-3 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                {error}
            </div>
        )}

        <div className="px-4">
          <FormField label="Registered Phone Number" labelFor="phone">
            {() => (
                <div className="relative">
                  <Icon path={mdiPhone} className="w-6 h-6 absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
                  <input
                      type="tel"
                      name="phone"
                      id="phone"
                      placeholder="e.g., 0967639355"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-slate-100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
            )}
          </FormField>

            <p className="text-xs mt-4 text-gray-600 dark:text-gray-400">
                This action will link the phone number to: <span className="font-semibold">{user.email}</span>
            </p>
            
            <Buttons className="mt-4 mb-2 gap-x-4" type="justify-center">
                <Button
                    onClick={handleLinkAccount}
                    label={isLoading ? "Linking..." : "Link Account"}
                    color="success"
                    disabled={isLoading || !phone}
                />
                <Button
                    onClick={handleBack}
                    label="Back"
                    color="info"
                    outline
                />
            </Buttons>
        </div>
      </CardBox>
    </SectionFullScreen>
  );
};

export default LinkAccountPage; 