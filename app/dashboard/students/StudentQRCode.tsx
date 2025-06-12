// app/dashboard/students/StudentQRCode.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from "qrcode.react";
import RodwellLogo from "../../_components/JustboilLogo";
import Button from '../../_components/Button'; // Assuming Button component path

// Import Firebase and Functions SDK
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "../../../firebase-config"; // Ensure you have 'app' exported from your config

// Props for the component. studentId is no longer needed.
interface Props {
  studentName?: string;
  qrSize?: number; 
}

const StudentQRCode: React.FC<Props> = ({
  studentName,
  qrSize = 200,
}) => {
  // --- NEW: State for handling the dynamic token ---
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  
  // Calculate logo size relative to QR code size, same as before
  const logoDimension = Math.floor(qrSize * 0.25);

  // --- NEW: Function to call the Cloud Function and get a token ---
  const generateToken = async () => {
    setIsLoading(true);
    setError(null);
    setQrToken(null);
    
    try {
      const functions = getFunctions(firebaseApp);
      const generateAttendanceToken = httpsCallable(functions, 'generateAttendanceToken');
      const result: any = await generateAttendanceToken();
      setQrToken(result.data.token);
      setCountdown(60); // Reset countdown on new token
    } catch (err: any) {
      console.error("Error generating token:", err);
      setError(err.message || "Could not generate QR Code.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Effect for the countdown timer ---
  useEffect(() => {
    if (!qrToken || countdown <= 0) {
      if (qrToken) setQrToken(null); // Clear expired QR code
      return;
    };

    const timerId = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId); // Cleanup timer
  }, [qrToken, countdown]);

  // --- NEW: Render a button if there is no QR code yet ---
  if (!qrToken) {
    return (
      <div className="text-center p-8">
        <p className="mb-4 text-gray-600 dark:text-gray-400">Click the button to generate a temporary QR code for attendance.</p>
        <Button
          label={isLoading ? 'Generating...' : 'Generate Secure QR Code'}
          onClick={generateToken}
          color="info"
          disabled={isLoading}
        />
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  // --- EXISTING UI: This renders when a token is successfully fetched ---
  return (
    <div className="inline-block rounded-xl overflow-hidden shadow-lg bg-white">
      <div className="bg-purple-800 p-2 text-center">
        {studentName && (
          <h3 className="text-lg font-bold text-white truncate" title={studentName}>
            {studentName}
          </h3>
        )}
      </div>
      <div className="bg-white p-2 flex flex-col items-center">
        <div
          className="rounded-lg shadow-inner bg-white p-2"
          style={{
            position: 'relative',
            width: qrSize,
            height: qrSize,
          }}
        >
          <QRCodeSVG
            value={qrToken} // <-- Use the dynamic qrToken here
            size={qrSize - 16} 
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '4px',
              borderRadius: '6px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: logoDimension,
              height: logoDimension,
            }}
          >
            <RodwellLogo
              width={logoDimension - 8}
              height={logoDimension - 8}
            />
          </div>
        </div>
         {/* --- NEW: Display the countdown timer --- */}
        <p className="mt-2 font-mono text-sm text-gray-700">
          Code expires in: <span className="font-bold">{countdown}</span>s
        </p>
      </div>
    </div>
  );
};

export default StudentQRCode;