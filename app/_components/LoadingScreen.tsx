"use client";

import React from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  message?: string;
}

// Simple loading screen without translation context dependency
export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-blue-600/10 animate-pulse" />
      
      <div className="relative flex flex-col items-center justify-center space-y-8">
        {/* 3D Icon with glow effect */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-3xl bg-blue-500/30 animate-pulse rounded-full scale-150" />
          
          {/* Icon */}
          <div className="relative animate-bounce-slow">
            <Image
              src="/icon-512-512_transparent.png"
              alt="Rodwell Portal"
              width={120}
              height={120}
              className="drop-shadow-2xl"
              priority
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
            {message}
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
  );
}
