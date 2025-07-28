"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import DarkModeInit from "./_components/DarkModeInit";
import { Toaster } from 'sonner';
import { useAppSelector } from './_stores/hooks';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const darkMode = useAppSelector((state) => state.darkMode.isEnabled);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner, or the basic HTML structure without dark mode
  }

  return (
    <html lang="en" className={darkMode ? 'dark' : ''}>
      <body id="student-attendance-app">
        <DarkModeInit />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <LayoutComponent>{children}</LayoutComponent>
    </StoreProvider>
  );
}
