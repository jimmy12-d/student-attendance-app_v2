"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from "qrcode.react";
import RodwellLogo from '../../_components/JustboilLogo';
import Button from '../../_components/Button';

// Import Firebase and Functions SDK
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "../../../firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase-config";

interface Props {
  studentName?: string;
  studentUid: string;
  qrSize?: number; 
}

const StudentQRCode: React.FC<Props> = ({
  studentName,
  studentUid,
  qrSize = 200,
}) => {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [scanStatus, setScanStatus] = useState<'present' | 'late' | null>(null);
  
  const logoDimension = Math.floor(qrSize * 0.25);

  const generateToken = async () => {
    setIsLoading(true);
    setError(null);
    setQrCodeData(null);
    setScanStatus(null);
    
    try {
      const functions = getFunctions(firebaseApp, "asia-southeast1");
      const generateAttendancePasscode = httpsCallable(functions, 'generateAttendancePasscode');
      const result: any = await generateAttendancePasscode();
      setQrCodeData(result.data.passcode);
      setCountdown(60);
    } catch (err: any) {
      console.error("Error generating token:", err);
      setError(err.message || "Could not generate QR Code.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!qrCodeData || countdown <= 0) {
      if (qrCodeData) setQrCodeData(null);
      return;
    }

    const timerId = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [qrCodeData, countdown]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (qrCodeData) {
      const fetchAttendanceStatus = async () => {
        try {
          const dateStr = new Date().toISOString().split('T')[0];
          const attendanceRef = collection(db, "attendance");
          const q = query(attendanceRef, where("date", "==", dateStr), where("authUid", "==", studentUid));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const attendanceData = querySnapshot.docs[0].data();
            setScanStatus(attendanceData.status);
            setQrCodeData(null);
            return true; // Attendance found
          }
          return false; // No attendance found
        } catch (err) {
          console.error("Error fetching attendance status:", err);
          setError("Failed to fetch attendance status.");
          return false;
        }
      };

      // Check immediately
      fetchAttendanceStatus().then((found) => {
        if (!found) {
          // If not found, start polling every 2 seconds
          intervalId = setInterval(async () => {
            const found = await fetchAttendanceStatus();
            if (found) {
              clearInterval(intervalId);
            }
          }, 2000);
        }
      });
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [qrCodeData, studentUid]);

  // --- NEW: On mount, check if already marked for today ---
  useEffect(() => {
    const checkAttendanceStatus = async () => {
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("date", "==", dateStr), where("authUid", "==", studentUid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const attendanceData = querySnapshot.docs[0].data();
          setScanStatus(attendanceData.status);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    checkAttendanceStatus();
  }, [studentUid]);

  if (scanStatus) {
    return (
      <div className={`text-center p-8 rounded-lg ${scanStatus === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        <p className="text-lg font-bold">
          {scanStatus === 'present' ? 'Present!' : 'Late!'}
        </p>
        <p className="mt-2">
          {studentName} is marked {scanStatus}.
        </p>
      </div>
    );
  }

  if (!qrCodeData) {
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
            value={qrCodeData}
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

export default StudentQRCode; 