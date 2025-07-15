"use client";

import React, { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { mdiFaceRecognition } from '@mdi/js';
import { toast } from 'sonner';
import LoadingSpinner from "../../_components/LoadingSpinner";

// Dashboard shared components
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import Button from "../../_components/Button";
import { getPageTitle } from "../../_lib/config";

const FaceScanner = () => {
  const webcamRef = useRef<Webcam>(null);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'danger'; message: string }>({ type: 'info', message: 'Align student face inside the frame and tap scan.' });
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);

  const verifyFace = useCallback(async () => {
    if (!webcamRef.current) {
      setFeedback({ type: 'danger', message: 'Camera not available.' });
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setFeedback({ type: 'danger', message: 'Could not capture image.' });
      return;
    }

    setIsLoading(true);
    setFeedback({ type: 'info', message: 'Verifying face... Please wait.' });
    setCapturedImg(imageSrc);

    const base64Image = imageSrc.split(',')[1]; // Strip the data URL prefix
    const functions = getFunctions();
    const verifyFaceForAttendance = httpsCallable(functions, 'verifyFaceForAttendance');

    try {
      const result: any = await verifyFaceForAttendance({ image: base64Image });
      if (result.data.success) {
        toast.success(result.data.message || 'Face verified successfully');
        setFeedback({ type: 'success', message: result.data.message });
      } else {
        toast.error(result.data.message || 'Verification failed');
        setFeedback({ type: 'danger', message: result.data.message || 'Verification failed.' });
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      toast.error(error.message || 'An unknown error occurred');
      setFeedback({ type: 'danger', message: `Error: ${error.message || 'An unknown error occurred.'}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setFeedback({ type: 'info', message: 'Align student face inside the frame and tap scan.' });
        setCapturedImg(null);
      }, 5000);
    }
  }, []);

  const getFeedbackColor = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-green-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <CardBox>
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-md">
          {/* Live camera view */}
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="rounded-lg w-full"
            videoConstraints={{ facingMode: 'environment' }}
          />
          {/* Guide overlay */}
          <div className="absolute inset-0 rounded-lg border-4 border-dashed border-company-purple pointer-events-none"></div>

          {/* Captured preview overlay */}
          {capturedImg && !isLoading && (
            <img src={capturedImg} alt="captured" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
              <LoadingSpinner size="lg" />
              <p className="text-white text-xl mt-4">Processing...</p>
            </div>
          )}
        </div>

        <div className={`mt-4 p-3 rounded-lg text-white text-center w-full max-w-md ${getFeedbackColor()} transition-all`}>
          {feedback.message}
        </div>

        <div className="flex gap-4 mt-4">
          <Button
            color="info"
            label={isLoading ? 'Verifying...' : 'Verify & Mark'}
            onClick={verifyFace}
            disabled={isLoading}
          />
          {capturedImg && !isLoading && (
            <Button
              color="white"
              label="Retake"
              onClick={() => { setCapturedImg(null); setFeedback({ type: 'info', message: 'Align student face inside the frame and tap scan.' }); }}
              outline
            />
          )}
        </div>
      </div>
    </CardBox>
  );
};

export default function FaceScanDashboardPage() {
  return (
    <>
      <Head>
        <title>{getPageTitle('Face Scan')}</title>
      </Head>

      <SectionMain>
        <SectionTitleLineWithButton icon={mdiFaceRecognition} title="Face Scan Attendance" main />
        <FaceScanner />
      </SectionMain>
    </>
  );
} 