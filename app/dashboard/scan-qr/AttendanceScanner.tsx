"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import CardBox from "../../_components/CardBox";

// Import Firebase SDKs for calling the function
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "../../../firebase-config";

const VIDEO_ELEMENT_ID = "qr-video-reader-container";
const SCAN_COOLDOWN_MS = 3500; // Increased cooldown slightly
const FEEDBACK_DISPLAY_MS = 4000;

const AttendanceScanner: React.FC = () => {
  // State management
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  // Add humorous late messages
  const lateHumorMessages = [
    "You're late, but at least you're here!",
    "Better late than never, right?",
    "Did you bring coffee for everyone?",
    "Fashionably late, as always!",
    "The early bird gets the worm, but the late one gets... this message!"
  ];

  // --- Audio Setup ---
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      successSoundRef.current = new Audio(`${basePath}/success_sound_2.mp3`);
    }
  }, []);

  const playSuccessSound = useCallback(() => {
    successSoundRef.current?.play().catch(e => console.warn("Audio play error:", e));
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), FEEDBACK_DISPLAY_MS);
  }, []);

  // --- Core Scan Logic ---
  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (cooldownRef.current) return; // Exit if in cooldown

    cooldownRef.current = true;
    setIsLoading(true);

    // The incorrect JWT check has been removed. We now send the code directly to the backend.

    try {
      const functions = getFunctions(firebaseApp, "asia-southeast1"); // <-- ADD REGION HERE
      const redeemAttendancePasscode = httpsCallable(functions, 'redeemAttendancePasscode');
      
      // Call the cloud function with the scanned passcode
      const result: any = await redeemAttendancePasscode({ passcode: decodedText });
      
      playSuccessSound();
      // Check for 'late' in the message (case-insensitive)
      if (typeof result.data.message === 'string' && result.data.message.toLowerCase().includes('late')) {
        // Pick a random humor message
        const humor = lateHumorMessages[Math.floor(Math.random() * lateHumorMessages.length)];
        showFeedback('warning', `${result.data.message} 😅 ${humor}`);
      } else {
        showFeedback('success', result.data.message); // Display success message from function
      }
    } catch (err: any) {
      console.error('Error redeeming passcode:', err);
      showFeedback('error', `Scan Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
      // Restart cooldown timer after processing
      setTimeout(() => { cooldownRef.current = false; }, SCAN_COOLDOWN_MS);
    }
  }, [playSuccessSound, showFeedback]);

  // --- UPDATED onScanFailure ---
  // This now ignores the common "No QR code found" messages to keep the console clean.
  const onScanFailure = useCallback((errorMessage: string) => {
    if (errorMessage.includes("No QR code found") || errorMessage.includes("NotFound")) {
      return; // This is expected, do nothing.
    }
    console.warn(`QR Scan Failure: ${errorMessage}`);
  }, []);

  // --- CAMERA CONTROL ---
  const handleStartScan = useCallback(() => {
    if (isScanning) return;

    const newScanner = new Html5Qrcode(VIDEO_ELEMENT_ID);
    html5QrCodeRef.current = newScanner;

    const config: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: { width: 400, height: 400 },
      // Removed experimentalFeatures as it is not supported by the type
    };

    setIsScanning(true);
    newScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
      .catch(err => {
        showFeedback('error', 'Could not start camera. Please grant permission.');
        setIsScanning(false);
      });
  }, [isScanning, onScanSuccess, onScanFailure, showFeedback]);

  const handleStopScan = useCallback(() => {
    if (html5QrCodeRef.current?.isScanning) {
      html5QrCodeRef.current.stop()
        .then(() => setIsScanning(false))
        .catch(err => console.error("Failed to stop scanner cleanly.", err));
    }
  }, []);
  
  // Cleanup effect to stop the camera when the component is removed
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        handleStopScan();
      }
    };
  }, [handleStopScan]);

  // --- RENDER ---
  return (
    <CardBox className="mx-auto max-w-3xl p-6 bg-gray-800 shadow-lg rounded-lg">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">
        Scan Student QR
      </h2>
      <div className="w-full rounded-md overflow-hidden mb-4 border-2 border-gray-500 bg-gray-900" style={{ minHeight: '280px' }}>
        <div id={VIDEO_ELEMENT_ID} />
      </div>

      {!isScanning && (
        <div className="flex items-center justify-center -mt-10 mb-6">
          <p className="text-gray-400 text-center">Camera is off.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
        <button onClick={handleStartScan} disabled={isScanning || isLoading} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-60 transition duration-150 ease-in-out">
          {isLoading ? "Processing..." : "Start Scan"}
        </button>
        <button onClick={handleStopScan} disabled={!isScanning} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 disabled:opacity-60 transition duration-150 ease-in-out">
          Stop Scan
        </button>
      </div>

      {feedbackMessage && (
        <div className={`text-center p-3 my-3 rounded-md text-base font-medium border
          ${feedbackMessage.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : ''}
          ${feedbackMessage.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' : ''}
          ${feedbackMessage.type === 'info' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
          ${feedbackMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
        `}>
          {feedbackMessage.text}
        </div>
      )}
    </CardBox>
  );
};

export default AttendanceScanner;