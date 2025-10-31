import React from 'react';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Nokora } from "next/font/google";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import DarkModeInit from "./_components/DarkModeInit";
import { Toaster } from 'sonner';
import ClientLayoutWrapper from './_components/ClientLayoutWrapper';
import PWAInstaller from './_components/PWAInstaller';
import PWAUpdatePrompt from './_components/PWAUpdatePrompt';
import { AuthProvider } from './_contexts/AuthContext';

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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <DarkModeInit />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rodwell Portal" />
        <link rel="manifest" href="/manifest.json" />
        {/* Inline splash screen that shows immediately */}
        <style dangerouslySetInnerHTML={{__html: `
          #app-splash {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%);
            opacity: 1;
            transition: opacity 0.5s ease-out;
          }
          #app-splash.loaded {
            opacity: 0;
            pointer-events: none;
          }
          .splash-logo {
            width: 120px;
            height: 120px;
            animation: bounce-slow 2s ease-in-out infinite;
          }
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          .splash-spinner {
            width: 64px;
            height: 64px;
            border: 4px solid rgba(191, 219, 254, 0.2);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
        <script dangerouslySetInnerHTML={{__html: `
          window.addEventListener('load', function() {
            setTimeout(function() {
              var splash = document.getElementById('app-splash');
              if (splash) {
                splash.classList.add('loaded');
                setTimeout(function() {
                  splash.style.display = 'none';
                }, 500);
              }
            }, 300);
          });
        `}} />
      </head>
      <body id="student-attendance-app" className={`min-h-screen bg-white dark:bg-slate-800 text-gray-900 dark:text-white ${inter.variable} ${nokora.variable}`} suppressHydrationWarning>
        {/* Pure HTML/CSS splash screen - no React hydration issues */}
        <div id="app-splash">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <img src="/rodwell_logo.png" alt="Rodwell Portal" className="splash-logo" />
            <div className="splash-spinner"></div>
            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: '500' }}>Rodwell Portal</p>
          </div>
        </div>
        
        <StoreProvider>
          <AuthProvider>
            <ClientLayoutWrapper>
              <div className="flex flex-col min-h-screen">
                <PWAInstaller />
                <PWAUpdatePrompt />
                <main className="flex-grow">
                  {children}
                </main>
              </div>
              <Toaster position="top-center" richColors />
            </ClientLayoutWrapper>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
