"use client";

import React, { useState } from 'react';
import { usePWAInstall } from '../../_hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';
import { usePromptManager } from '@/app/_hooks/usePromptManager';

// Icons
const DownloadCloud = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download-cloud">
    <polyline points="8 17 12 21 16 17"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>
  </svg>
);

const ShareIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M16 13v6.993A1.007 1.007 0 0 1 14.993 21H3.007A1.007 1.007 0 0 1 2 19.993V9.007C2 7.898 2.898 7 4.007 7H9v2H4.007A1.007 1.007 0 0 0 3 9.007v10.986C3 20.556 3.444 21 4.007 21h10.986c.563 0 1.007-.444 1.007-1.007V13h-2z"/><path d="m11 7-4 4 1.41 1.41L11 9.83V16h2V9.83l2.59 2.58L17 11l-4-4-2-2z"/></svg>
);

const AddToHomeScreenIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
);

const XIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);


const IOSInstallSheet = ({ onClose }: { onClose: () => void }) => {
    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="fixed bottom-0 left-0 right-0 p-4 pt-6 bg-slate-900 backdrop-blur-md rounded-t-3xl shadow-2xl z-50 text-white"
        >
            <button onClick={onClose} className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors">
                <XIcon size={20} />
            </button>
            <div className="text-center max-w-2xl mx-auto">
                <h3 className="font-bold text-xl mb-2 text-white">Install the App</h3>
                <p className="text-slate-300 text-sm mb-6">To install the app on your iOS device, follow these simple steps:</p>
            </div>
            <div className="space-y-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500 rounded-lg p-2 flex-shrink-0"><ShareIcon /></div>
                    <p className="text-slate-200">1. Tap the <span className="font-semibold">'Share'</span> icon in the Safari menu bar.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-700 rounded-lg p-2 flex-shrink-0"><AddToHomeScreenIcon /></div>
                    <p className="text-slate-200">2. Scroll down and tap on <span className="font-semibold">'Add to Home Screen'</span>.</p>
                </div>
            </div>
        </motion.div>
    );
};


export const InstallPWA = ({ as_banner = false, as_button = false }) => {
  const { canInstallPWA, triggerInstall, isIOS } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const { activePrompt, setActivePrompt } = usePromptManager();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (canInstallPWA && as_banner && !activePrompt) {
        setShowBanner(true);
        setActivePrompt('pwa');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [canInstallPWA, as_banner, activePrompt, setActivePrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    setActivePrompt(null);
  };

  const handleInstallClick = () => {
    if (isIOS) {
      setIosSheetOpen(true);
    } else {
      triggerInstall();
    }
  };
  
  if (!canInstallPWA) {
    return null;
  }

  if (as_button) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
        >
          <DownloadCloud />
          Install App on Your Device
        </button>
        <AnimatePresence>
            {iosSheetOpen && <IOSInstallSheet onClose={() => setIosSheetOpen(false)} />}
        </AnimatePresence>
      </>
    );
  }

  if (as_banner && showBanner) {
    return (
        <AnimatePresence>
            <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-2xl px-3 py-2 bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl relative"
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-1.5 left-1.5 flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1"
                    >
                        <XIcon size={20} />
                    </button>
                    <div className="flex items-center justify-between pl-6 pr-2">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block bg-indigo-500 p-1.5 rounded-lg">
                        <DownloadCloud />
                        </div>
                        <div>
                        <h4 className="font-semibold text-white leading-tight">Install the App</h4>
                        <p className="pt-2 text-xs text-slate-300 sm:hidden">Instant access and offline,</p>
                        <p className="text-xs text-slate-300 sm:hidden">view right from your homescreen.</p>
                        <p className="hidden sm:block text-sm text-slate-300">For quick access and offline features.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallClick}
                        className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                    >
                        Install
                    </button>
                    </div>
                </motion.div>
            </div>
            {iosSheetOpen && <IOSInstallSheet onClose={() => setIosSheetOpen(false)} />}
        </AnimatePresence>
    );
  }
  
  return null;
}; 