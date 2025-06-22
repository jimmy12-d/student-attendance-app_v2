"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/app/_hooks/use-auth"; // A custom hook to get user state
import { auth } from "@/firebase-config";
import SectionFullScreen from "@/app/_components/Section/FullScreen";
import CardBox from "@/app/_components/CardBox";
import FormField from "@/app/_components/FormField";
import Button from "@/app/_components/Button";
import Buttons from "@/app/_components/Buttons";
import { getPageTitle } from "@/app/_lib/config";
import { Metadata } from "next";
import OtpInput from '@/app/_components/OtpInput'; // Import the new component
import Image from 'next/image'; // Import the Image component

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
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = getPageTitle("Link Account");
  }, []);

  useEffect(() => {
    if (step === 'otp' && expiryTime) {
      const updateCountdown = () => {
        const remaining = Math.round((expiryTime - Date.now()) / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
      };

      updateCountdown();
      const intervalId = setInterval(updateCountdown, 1000);

      return () => clearInterval(intervalId);
    }
  }, [step, expiryTime]);

  // If auth state is still loading, show a loader
  if (loading) {
    return <SectionFullScreen bg="purplePink"><p className="text-white">Loading...</p></SectionFullScreen>;
  }

  // If user is not logged in, redirect them away
  if (!user) {
    router.replace("/login");
    return null;
  }
  
  const handleSendOtp = async () => {
    setIsLoading(true);
    setError(null);
    if (!phone) {
        setError("Please enter the phone number you registered with.");
        setIsLoading(false);
        return;
    }

    try {
        const functions = getFunctions(auth.app, "asia-southeast1");
        const sendOtpFunction = httpsCallable(functions, 'sendAccountLinkOtp');
        
        const result = await sendOtpFunction({ phoneNumber: phone });

        if ((result.data as any).success) {
            const receivedOtp = (result.data as any).otp;
            const receivedExpires = (result.data as any).expires;
            
            if (receivedOtp) {
              console.log("DEV ONLY: Received OTP:", receivedOtp);
              setOtp(receivedOtp); // Auto-fill the OTP for testing
            }
            if (receivedExpires) {
              setExpiryTime(receivedExpires);
            }
            setStep("otp");
            setError(null);
        } else {
            throw new Error((result.data as any).error || "Failed to send OTP.");
        }
    } catch (err: any) {
        setError(err.message || "An unknown error occurred while sending the OTP.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    setIsLoading(true);
    setError(null);
    if (!otp) {
        setError("Please enter the 6-digit code sent to your phone.");
        setIsLoading(false);
        return;
    }

    try {
        const functions = getFunctions(auth.app, "asia-southeast1");
        const linkAccountFunction = httpsCallable(functions, 'verifyAndConnectAccount');
        
        const result = await linkAccountFunction({ phoneNumber: phone, otp: otp });

        if ((result.data as any).success) {
            router.push("/student/dashboard");
        } else {
            throw new Error((result.data as any).error || "Failed to link account.");
        }
    } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <SectionFullScreen bg="purplePink">
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <div className="flex justify-center mb-2">
          <Image src="/phone_verify.png" alt="Phone Verification" width={140} height={140} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">Link Your Account</h1>

        {error && (
            <div className="p-3 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                {error}
            </div>
        )}

        {step === "phone" ? (
            <>
                <p className="text-center mb-6 px-2">
                Enter the phone number you registered with the school. We'll send you a confirmation code.
                </p>

                <div className="px-4">
                    <FormField label="Registered Phone Number" labelFor="phone">
                        {() => (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            </span>
                            <input
                                type="tel"
                                name="phone"
                                id="phone"
                                placeholder="Enter registered phone number"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-slate-100"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                          </div>
                        )}
                    </FormField>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your account will be linked to {auth.currentUser?.email}.
                    </p>
                    <div className="flex justify-center gap-x-2">
                        <Buttons className="mt-4 mb-2" type="justify-center">
                            <Button
                                onClick={handleSendOtp}
                                label={isLoading ? "Sending Code..." : "Send Code"}
                                color="info"    
                                disabled={isLoading}
                            />
                        </Buttons>
                        <div></div>
                        <Buttons className="mt-4 mb-2 gap-x-4" type="justify-center">
                            <Button
                                onClick={() => router.push('/login')}
                                label="Go Back"
                                color="lightDark"
                                outline
                                disabled={isLoading}
                            />
                        </Buttons>
                    </div>
                </div>
            </>
           
        ) : (
            <>
                <p className="text-center mb-6">
                    Enter the 6-digit code we sent to <strong>{phone}</strong>.
                </p>
                <div className="flex justify-center mb-4">
                  <OtpInput length={6} onChange={setOtp} />
                </div>
                
                {countdown > 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Code expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <p className="text-center text-sm text-red-500 mb-6">
                    Code has expired. Please request a new one.
                  </p>
                )}

                <Buttons className="mt-4 mb-2 gap-x-4" type="justify-center">
                    <Button
                        onClick={handleLinkAccount}
                        label={isLoading ? "Verifying & Linking..." : "Verify & Link"}
                        color="success"
                        disabled={isLoading || countdown === 0}
                    />
                    {countdown > 0 ? (
                      <Button
                        onClick={() => { setStep('phone'); setError(null); setOtp(''); }}
                        label="Change Number"
                        color="lightDark"
                        outline
                        disabled={isLoading}
                      />
                    ) : (
                      <Button
                        onClick={handleSendOtp}
                        label={isLoading ? "Resending..." : "Resend Code"}
                        color="info"
                        outline
                        disabled={isLoading}
                      />
                    )}
                </Buttons>
            </>
        )}
      </CardBox>
    </SectionFullScreen>
  );
};

export default LinkAccountPage; 