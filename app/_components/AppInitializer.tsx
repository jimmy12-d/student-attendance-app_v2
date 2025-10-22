"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render both, but control visibility with CSS to avoid hydration mismatch
  return (
    <>
      {/* Splash screen overlay - shows on initial load, fades out after mount */}
      {!mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-blue-600/10 animate-pulse" />
          
          <div className="relative flex flex-col items-center justify-center space-y-8">
            {/* Logo with glow effect */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 blur-3xl bg-blue-500/30 animate-pulse rounded-full scale-150" />
              
              {/* Logo */}
              <div className="relative animate-bounce-slow">
                <Image
                  src="/rodwell_logo.png"
                  alt="Rodwell Portal"
                  width={120}
                  height={120}
                  className="drop-shadow-2xl"
                  priority
                  unoptimized
                />
              </div>
            </div>

            {/* Loading spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200/20 border-t-blue-500 rounded-full animate-spin" />
            </div>

            {/* Loading text */}
            <div className="text-center space-y-2">
              <p className="text-xl font-medium text-white animate-pulse">
                Rodwell Portal
              </p>
              <div className="flex space-x-1 justify-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes bounce-slow {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-20px);
              }
            }
            .animate-bounce-slow {
              animation: bounce-slow 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {/* Main content */}
      {children}
    </>
  );
}
