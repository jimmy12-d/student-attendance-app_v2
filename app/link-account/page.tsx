"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/app/_hooks/use-auth";
import { auth } from "@/firebase-config";
import SectionFullScreen from "@/app/_components/Section/FullScreen";
import CardBox from "@/app/_components/CardBox";
import FormField from "@/app/_components/FormField";
import Button from "@/app/_components/Button";
import Buttons from "@/app/_components/Buttons";
import Image from 'next/image';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <SectionFullScreen bg="white"><p className="text-black">Loading...</p></SectionFullScreen>;
  }

  if (!user) {
    router.replace("/login");
    return null;
  }
  
  const handleLinkAccount = async () => {
    setIsLoading(true);
    setError(null);
    if (!phone) {
        setError("Please enter the phone number you registered with.");
        setIsLoading(false);
        return;
    }

    try {
      const functions = getFunctions(auth.app, "asia-southeast1");
      const linkFunction = httpsCallable(functions, 'linkStudentByPhone');
      
      const result = await linkFunction({ phoneNumber: phone });

      if ((result.data as any).success) {
          router.push("/student/dashboard");
      } else {
          throw new Error((result.data as any).error || "Failed to link your student profile.");
      }
    } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <SectionFullScreen bg="white">
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Image src="/phone_verify.png" alt="Phone Verification" width={100} height={100} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">Link Your Student Account</h1>
        <p className="text-center mb-6">
          Enter the phone number you registered with to connect it to your Google account.
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
          
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your account will be linked to: <span className="font-semibold">{user.email}</span>
              </p>
            <div className="flex col-auto gap-4">
                <Buttons className="mt-6 mb-2" type="justify-center">
                    <Button
                        onClick={handleLinkAccount}
                        label={isLoading ? "Linking Account..." : "Link Account"}
                        color="success"
                        disabled={isLoading}
                    />
                </Buttons>
                <Buttons className="mt-6 mb-2" type="justify-center">
                    <Button
                        onClick={() => window.history.back()}
                        label="Go Back"
                        color="info"
                        outline
                    />
                </Buttons>
            </div>
        </div>
      </CardBox>
    </SectionFullScreen>
  );
};

export default LinkAccountPage; 