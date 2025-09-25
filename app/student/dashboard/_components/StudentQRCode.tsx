"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from "qrcode.react";
import RodwellLogo from '../../../_components/JustboilLogo';
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "../../../../firebase-config.js";

interface Props {
  studentName?: string;
  studentUid: string;
  qrSize?: number; 
}

const StudentQRPayment: React.FC<Props> = ({
  studentName,
  studentUid,
  qrSize = 200,
}) => {
  const [QRPaymentData, setQRPaymentData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  
  const logoDimension = Math.floor(qrSize * 0.25);

  const generateToken = async () => {
    setIsLoading(true);
    setError(null);
    setQRPaymentData(null);
    
    try {
      const functions = getFunctions(firebaseApp, "asia-southeast1");
      const generateAttendancePasscode = httpsCallable(functions, 'generateAttendancePasscode');
      const result: any = await generateAttendancePasscode({ studentUid });
      setQRPaymentData(result.data.passcode);
      setCountdown(60);
    } catch (err: any) {
      console.error("Error generating token:", err);
      setError(err.message || "Could not generate QR Payment.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateToken();
  }, []);

  useEffect(() => {
    if (!QRPaymentData || countdown <= 0) {
      if (QRPaymentData) setQRPaymentData(null);
      return;
    }
    const timerId = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [QRPaymentData, countdown]);

  if (isLoading) {
    return <p className="text-center text-gray-400">Generating QR Payment...</p>;
        }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (!QRPaymentData) {
    return (
      <div className="text-center px-4 py-2">
        <p className="mb-4 text-gray-600 dark:text-gray-400">Code expired. Please close and try again.</p>
      </div>
    );
  }

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
            value={QRPaymentData}
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
        <p className="mt-2 font-mono text-sm text-gray-700">
          Code expires in: <span className="font-bold">{countdown}</span>s
        </p>
      </div>
    </div>
  );
};

export default StudentQRPayment; 