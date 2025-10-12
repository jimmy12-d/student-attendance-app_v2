"use client";

import { useEffect, useState } from 'react';
import Icon from '../../../_components/Icon';
import { mdiAlertOctagon, mdiHome, mdiClockAlert } from '@mdi/js';

interface SendHomeOverlayProps {
  isVisible: boolean;
  studentName: string;
  sendHomeCutoff?: string;
  onDismiss?: () => void;
}

export const SendHomeOverlay = ({ 
  isVisible, 
  studentName, 
  sendHomeCutoff,
  onDismiss 
}: SendHomeOverlayProps) => {
  const [showDismissButton, setShowDismissButton] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Show dismiss button after 3 seconds
      const timer = setTimeout(() => {
        setShowDismissButton(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowDismissButton(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Main Content */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 border-red-400/50 animate-in zoom-in-95 duration-500">
        {/* Pulsing Alert Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-400 rounded-full opacity-50 animate-ping"></div>
            <div className="relative bg-white rounded-full p-6">
              <svg width="48" height="48" viewBox="0 0 24 24" className="text-red-600">
                <path d={mdiAlertOctagon} />
              </svg>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            ⚠️ TOO LATE
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-red-100">
            {studentName}
          </p>
          <div className="bg-red-900/50 rounded-2xl p-6 border-2 border-red-400/30">
            <p className="text-xl md:text-2xl text-white font-medium mb-2">
              PLEASE GO HOME
            </p>
            <p className="text-lg text-red-200 flex items-center justify-center gap-2">
              <Icon path={mdiClockAlert} size={16} />
              Late arrival limit: {sendHomeCutoff || 'exceeded'}
            </p>
          </div>
        </div>

        {/* Icon Row */}
        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="flex flex-col items-center">
            <div className="bg-white/20 rounded-full p-4 mb-2">
              <Icon path={mdiHome} size={24} className="text-white" />
            </div>
            <p className="text-white font-semibold text-lg">Return Home</p>
          </div>
        </div>

        {/* Policy Notice */}
        <div className="bg-red-900/60 rounded-xl p-4 border border-red-400/30">
          <p className="text-center text-red-100 text-sm md:text-base">
            According to school policy, students arriving after 30 minutes must return home.
          </p>
        </div>

        {/* Dismiss Button (appears after 3 seconds) */}
        {showDismissButton && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
