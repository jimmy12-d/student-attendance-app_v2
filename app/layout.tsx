import React, { ReactNode } from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nokora } from "next/font/google";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import DarkModeInit from "./_components/DarkModeInit";
import { Toaster } from 'sonner';
import ClientLayoutWrapper from './_components/ClientLayoutWrapper';
import PWAInstaller from './_components/PWAInstaller';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const nokora = Nokora({
  subsets: ["khmer", "latin"],
  weight: ["100", "300", "400", "700", "900"],
  variable: "--font-nokora",
});

export const metadata: Metadata = {
  title: "Rodwell Portal",
  description: "Rodwell Learning Center Student Attendance App",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Rodwell Portal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rodwell Portal" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body id="student-attendance-app" className={`h-full ${inter.variable} ${nokora.variable}`} style={{backgroundColor: '#ffffff', color: '#111827'}}>
        <StoreProvider>
          <ClientLayoutWrapper>
            <div className="flex flex-col min-h-screen">
              <DarkModeInit />
              <PWAInstaller />
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
