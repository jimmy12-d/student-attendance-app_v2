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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = getPageTitle("Link Account");
  }, []);

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
        const sendOtpFunction = httpsCallable(functions, 'sendLinkOtp');
        
        const result = await sendOtpFunction({ phoneNumber: phone });

        if ((result.data as any).success) {
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
        const linkAccountFunction = httpsCallable(functions, 'linkAccount');
        
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
        <h1 className="text-3xl font-bold text-center mb-6">Link Your Account</h1>

        {error && (
            <div className="p-3 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                {error}
            </div>
        )}

        {step === "phone" ? (
            <>
                <p className="text-center mb-6">
                To complete your setup, please enter the phone number you originally registered with the school. We'll send you a confirmation code.
                </p>
                <FormField label="Registered Phone Number" labelFor="phone">
                    {() => (
                        <input
                            type="tel"
                            name="phone"
                            id="phone"
                            placeholder="e.g., 012345678"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    )}
                </FormField>
                <Buttons className="mt-6 mb-2">
                    <Button
                        onClick={handleSendOtp}
                        label={isLoading ? "Sending Code..." : "Send Code"}
                        color="info"
                        disabled={isLoading}
                    />
                </Buttons>
            </>
        ) : (
            <>
                <p className="text-center mb-6">
                    Enter the 6-digit code we sent to <strong>{phone}</strong>.
                </p>
                <FormField label="Verification Code" labelFor="otp">
                    {() => (
                        <input
                            type="text"
                            name="otp"
                            id="otp"
                            placeholder="123456"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                    )}
                </FormField>
                <Buttons className="mt-6 mb-2">
                    <Button
                        onClick={handleLinkAccount}
                        label={isLoading ? "Verifying & Linking..." : "Verify & Link Account"}
                        color="success"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={() => { setStep('phone'); setError(null); setOtp(''); }}
                        label="Change Number"
                        color="lightDark"
                        outline
                        disabled={isLoading}
                    />
                </Buttons>
            </>
        )}
      </CardBox>
    </SectionFullScreen>
  );
};

export default LinkAccountPage; 