import React, { ReactNode } from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import DarkModeInit from "./_components/DarkModeInit";
import { Toaster } from 'sonner';
import ClientLayoutWrapper from './_components/ClientLayoutWrapper';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Rodwell Portal",
  description: "Rodwell Learning Center Student Attendance App",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body id="student-attendance-app" className="h-full bg-gray-800 text-gray-100">
        <StoreProvider>
          <ClientLayoutWrapper>
            <div className="flex flex-col min-h-screen">
              <DarkModeInit />
              <main className="flex-grow">
                {children}
              </main>
            </div>
            <Toaster position="top-center" richColors />
          </ClientLayoutWrapper>
        </StoreProvider>
      </body>
    </html>
  );
}
