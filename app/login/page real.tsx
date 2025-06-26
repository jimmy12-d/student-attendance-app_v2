import React from "react";
import CardBox from "../_components/CardBox";
import SectionFullScreen from "../_components/Section/FullScreen";
import { getPageTitle } from "../_lib/config";
import { Metadata } from "next";
import StudentGoogleSignIn from "./_components/StudentGoogleSignIn";

export const metadata: Metadata = {
  title: getPageTitle("Login"),
};

const LoginPage = () => {
  return (
    <SectionFullScreen bg="white">
      <CardBox className="w-11/12 md:w-7/12 lg:w-6/12 xl:w-4/12 shadow-2xl">
      <StudentGoogleSignIn />
      </CardBox>
    </SectionFullScreen>
  );
};

export default LoginPage;
