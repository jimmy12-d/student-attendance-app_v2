"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from "firebase/auth";
import { useAuth } from "@/app/_hooks/use-auth";
import { auth } from "@/firebase-config";
import SectionFullScreen from "@/app/_components/Section/FullScreen";
import CardBox from "@/app/_components/CardBox";
import FormField from "@/app/_components/FormField";
import Button from "@/app/_components/Button";
import Buttons from "@/app/_components/Buttons";
import Image from 'next/image';
import OtpInput from "../_components/OtpInput";
import { mdiPhone } from "@mdi/js";
import Icon from "../_components/Icon";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

/*
// This is how the metadata would be defined in a server component.
// In a client component, we can't export it directly.
// We'd typically set the title using useEffect.
export const metadata: Metadata = {
  title: getPageTitle("Link Account"),
};
*/

const LinkAccountPage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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


  if (loading) {
    return <SectionFullScreen bg="white"><p className="text-black">Loading...</p></SectionFullScreen>;
  }

  if (!user) {
    router.replace("/login");
    return null;
  }
  
  const handleSendOtp = async () => {
    console.log("handleSendOtp function started.");
    setIsLoading(true);
    setError(null);
    setCanResend(false);
    setTimer(60);

    if (!phone) {
        console.log("No phone number entered.");
        setError("Please enter a valid phone number.");
        setIsLoading(false);
        return;
    }

    try {
      console.log("Attempting to send OTP...");
      const appVerifier = window.recaptchaVerifier!;
      let cleanPhone = phone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '855' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('855')) {
        cleanPhone = '855' + cleanPhone;
      }
      const phoneNumber = `+${cleanPhone}`;
      console.log("Formatted phone number:", phoneNumber);
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      console.log("OTP sent successfully, confirmation result received.");
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
        console.log("handleSendOtp function finished.");
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

      if ((result.data as any).success) {
          router.push("/student/dashboard");
      } else {
          throw new Error((result.data as any).error || "Failed to link your student profile in the database.");
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

  const handleBack = () => {
    if (otpSent) {
      setOtpSent(false);
      setError(null);
      setOtp("");
    } else {
      router.back();
    }
  }

  return (
    <SectionFullScreen bg="white">
      <div id="recaptcha-container"></div>
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Image src="/phone_verify.png" alt="Phone Verification" width={100} height={100} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">{otpSent ? "Enter Verification Code" : "Link Your Account"}</h1>
        <p className="text-center mb-6">
          {otpSent 
            ? `We've sent a code to ${phone}. Please enter it below.`
            : "Enter the phone number you registered with to verify your account."
          }
        </p>
        
        {error && (
            <div className="p-3 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                {error}
            </div>
        )}

        <div className="px-4">
          {!otpSent ? (
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
          ) : (
            <>
              <FormField label="Verification Code" labelFor="otp">
                {() => (
                  <OtpInput length={6} onChange={setOtp} />
                )}
              </FormField>
              <div className="text-center text-sm mt-4">
                {canResend ? (
                   <button
                     onClick={handleSendOtp}
                     className="font-medium text-purple-600 hover:text-purple-500 disabled:text-gray-400"
                     disabled={isLoading}
                   >
                     Resend OTP
                   </button>
                ) : (
                  <p>Resend OTP in {timer}s</p>
                )}
              </div>
            </>
          )}

            <p className="text-xs mt-4 text-gray-600 dark:text-gray-400">
                This action will link the phone number to: <span className="font-semibold">{user.email}</span>
            </p>
            
            <Buttons className="mt-4 mb-2 gap-x-4" type="justify-center">
              {!otpSent ? (
                <Button
                    onClick={handleSendOtp}
                    label={isLoading ? "Sending..." : "Send OTP"}
                    color="success"
                    disabled={isLoading || !phone}
                />
              ) : (
                <Button
                    onClick={handleVerifyAndLink}
                    label={isLoading ? "Verifying..." : "Verify & Link Account"}
                    color="success"
                    disabled={isLoading || otp.length < 6}
                />
              )}
                <Button
                    onClick={handleBack}
                    label="Back"
                    color="info"
                    outline
                    disabled={isLoading}
                />
            </Buttons>
        </div>
      </CardBox>
    </SectionFullScreen>
  );
};

export default LinkAccountPage; 