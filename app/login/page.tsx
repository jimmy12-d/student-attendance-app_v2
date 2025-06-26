import React from "react";
import { getPageTitle } from "../_lib/config";
import { Metadata } from "next";
import LoginClient from "./_components/LoginClient";

export const metadata: Metadata = {
  title: getPageTitle("Login"),
};

const LoginPage = () => {
  return <LoginClient />;
};

export default LoginPage;
