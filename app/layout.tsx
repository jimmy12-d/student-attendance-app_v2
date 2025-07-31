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
    <html lang="en" className={`h-full ${darkMode ? 'dark' : ''}`}>
      <head>
        <title>Rodwell Portal</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="description" content="Rodwell Learning Center Student Attendance App" />
      </head>
      <body id="student-attendance-app" className={`h-full ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        <div className="flex flex-col min-h-screen">
          <DarkModeInit />
          <main className="flex-grow">
            {children}
          </main>
        </div>
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
