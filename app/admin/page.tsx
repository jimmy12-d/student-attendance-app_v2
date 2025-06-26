//"use client";

import React from "react";
import { getPageTitle } from "../_lib/config";
import { Metadata } from 'next';
import AdminPageClient from "./_components/AdminPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getPageTitle('Admin Login'),
  }
}

const AdminLoginPage = () => {
  return <AdminPageClient />;
};

export default AdminLoginPage; 