"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/firebase-config";
import { useAppDispatch } from "@/app/_stores/hooks";
import { setUser } from "@/app/_stores/mainSlice";
import SectionFullScreen from "@/app/_components/Section/FullScreen";
import CardBox from "@/app/_components/CardBox";
import FormField from "@/app/_components/FormField";
import Button from "@/app/_components/Button";
import Buttons from "@/app/_components/Buttons";
import Image from 'next/image';
import OtpInput from "@/app/_components/OtpInput";
import { navItems } from '@/app/student/_components/StudentBottomNav';
import LoadingSpinner from "@/app/_components/LoadingSpinner";
import { usePWANavigation } from "@/app/_hooks/usePWANavigation";

const VerifyOtpPage = () => {
    const router = useRouter();
    const { navigateWithinPWA } = usePWANavigation();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phone, setPhone] = useState("");
    const [requestId, setRequestId] = useState("");

    useEffect(() => {
        const phoneFromUrl = searchParams.get("phone");
        const requestIdFromUrl = searchParams.get("requestId");

        if (phoneFromUrl && requestIdFromUrl) {
            setPhone(phoneFromUrl);
            setRequestId(requestIdFromUrl);
        } else {
            // If phone or requestId is missing, the user can't proceed.
            navigateWithinPWA('/login');
        }
    }, [searchParams, router]);

    const handleVerifyAndLogin = async () => {
        setIsLoading(true);
        setError(null);

        if (!otp || otp.length < 6) {
            setError("Please enter the 6-digit OTP.");
            setIsLoading(false);
            return;
        }

        try {
            const functions = getFunctions(auth.app, "asia-southeast1");
            // This function needs to be created in your Firebase Functions backend.
            // It will verify the OTP and, if valid, get a custom token for sign-in.
            const verifyTelegramOtp = httpsCallable(functions, 'verifyTelegramOtp');
            
            const result = await verifyTelegramOtp({ phoneNumber: phone, otp, requestId });
            const resultData = result.data as { success: boolean; token?: string; studentData?: any; error?: string };

            if (resultData.success && resultData.token && resultData.studentData) {
                // Sign in the user with the custom token
                const userCredential = await signInWithCustomToken(auth, resultData.token);
                const firebaseUser = userCredential.user;
                
                // Now that the user is signed in, dispatch their data to the store
                dispatch(
                  setUser({
                    name: resultData.studentData.fullName,
                    email: firebaseUser.email,
                    avatar: firebaseUser.photoURL,
                    uid: firebaseUser.uid,
                    studentDocId: resultData.studentData.id,
                    role: "student",
                  })
                );
                
                // Redirect to the student dashboard
                navigateWithinPWA(navItems[0].href); 

            } else {
                throw new Error(resultData.error || "Failed to verify OTP. Please try again.");
            }
        } catch (err: any) {
            setError(err.message || "An unknown error occurred during verification.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    if (!phone || !requestId) {
        return (
          <SectionFullScreen bg="white">
            <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" />
            </div>
          </SectionFullScreen>
        );
    }

    return (
        <SectionFullScreen bg="white">
            <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
                <div className="flex justify-center mb-6">
                    <Image src="/phone_verify.png" alt="OTP Verification" width={100} height={100} />
                </div>
                <h1 className="text-3xl font-bold text-center mb-6">Enter OTP</h1>
                <p className="text-center mb-6">
                    An OTP has been sent to your Telegram account linked to <span className="font-semibold">{phone}</span>.
                </p>

                {error && (
                    <div className="p-3 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        {error}
                    </div>
                )}

                <div className="px-4">
                    <FormField label="One-Time Password" labelFor="otp">
                        {() => (
                            <div className="relative flex justify-center">
                                <OtpInput
                                    length={6}
                                    onChange={setOtp}
                                />
                            </div>
                        )}
                    </FormField>

                    <Buttons className="mt-8 mb-2 gap-x-4" type="justify-center">
                        <Button
                            onClick={handleVerifyAndLogin}
                            label={isLoading ? "Verifying..." : "Verify & Login"}
                            color="success"
                            disabled={isLoading || otp.length < 6}
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


const SuspendedVerifyOtpPage = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <VerifyOtpPage />
    </Suspense>
);

export default SuspendedVerifyOtpPage; 