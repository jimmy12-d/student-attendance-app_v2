"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../../_contexts/AuthContext";
import CardBox from "../../_components/CardBox";
import SectionFullScreen from "../../_components/Section/FullScreen";
import AdminLoginForm from "./AdminLoginForm";

const AdminPageClient = () => {
  const router = useRouter();
  const { isAuthenticated, isAuthorizedAdmin, isLoading } = useAuthContext();

  // If loading, show loading state
  if (isLoading) {
    return (
      <SectionFullScreen bg="purplePink">
        <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        </CardBox>
      </SectionFullScreen>
    );
  }

  // If already authenticated and authorized as admin, redirect to dashboard
  if (isAuthenticated && isAuthorizedAdmin) {
    router.replace("/dashboard");
    return null;
  }

  // Show login form for non-authenticated or non-admin users
  return (
    <SectionFullScreen bg="purplePink">
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <AdminLoginForm />
      </CardBox>
    </SectionFullScreen>
  );
};

export default AdminPageClient; 