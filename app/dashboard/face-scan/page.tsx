"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

import { mdiFaceRecognition } from '@mdi/js';
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import LoadingSpinner from '../../_components/LoadingSpinner';

interface TrackedFace {
  id: string; // Unique identifier for tracking
  box: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  name?: string;
  status: 'tracking' | 'verifying' | 'recognized' | 'unknown';
  lastVerification: number; // Timestamp of the last time we sent to the cloud
  lastSeen: number; // Timestamp of the last time the face was seen in a frame
  message?: string; // e.g., "Marked On-time"
}

const RealtimeFaceScanner = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);

  const VERIFICATION_COOLDOWN = 20000; // 20 seconds

  // --- Utility Functions ---
  const generateFaceId = () => `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const calculateIoU = (box1: TrackedFace['box'], box2: TrackedFace['box']) => {
    const xA = Math.max(box1.xMin, box2.xMin);
    const yA = Math.max(box1.yMin, box2.yMin);
    const xB = Math.min(box1.xMax, box2.xMax);
    const yB = Math.min(box1.yMax, box2.yMax);
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const iou = interArea / (box1Area + box2Area - interArea);
    return iou;
  };

  // --- Core Logic ---
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Setting up TensorFlow backend...');
      await tf.setBackend('webgl');
      await tf.ready();
      
      setLoadingMessage('Loading face detection model...');
      const model = await blazeface.load();
      modelRef.current = model;

      console.log("Face detection model (BlazeFace) loaded successfully.");
      setIsLoading(false);
    } catch (error) {
      console.error("Initialization failed:", error);
      setLoadingMessage('Error! Could not initialize face model.');
      toast.error('Could not initialize face model.');
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const getCroppedFace = (video: HTMLVideoElement, box: TrackedFace['box']): string | null => {
    const tempCanvas = document.createElement('canvas');
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
  
    // We need to calculate the source coordinates based on the un-flipped video stream
    const sx = videoWidth - box.xMax;
    const sy = box.yMin;
    const sWidth = box.width;
    const sHeight = box.height;
  
    // Add some padding to the crop
    const padding = sWidth * 0.2; // 20% padding
    const paddedSx = Math.max(0, sx - padding);
    const paddedSy = Math.max(0, sy - padding);
    const paddedSWidth = Math.min(videoWidth - paddedSx, sWidth + padding * 2);
    const paddedSHeight = Math.min(videoHeight - paddedSy, sHeight + padding * 2);

    tempCanvas.width = paddedSWidth;
    tempCanvas.height = paddedSHeight;
  
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    
    // Since the video element is flipped via CSS, we need to un-flip it for the canvas draw
    ctx.scale(-1, 1);
    ctx.translate(-paddedSWidth, 0);

    ctx.drawImage(video, paddedSx, paddedSy, paddedSWidth, paddedSHeight, 0, 0, paddedSWidth, paddedSHeight);
  
    return tempCanvas.toDataURL('image/jpeg', 0.9); // Get JPEG with 90% quality
  };

  const verifyAndMarkFace = useCallback(async (face: TrackedFace, imageSrc: string) => {
    console.log(`Verifying face ID: ${face.id}. Cropped image size: ${Math.round(imageSrc.length * 3/4 / 1024)} KB`);
    // No longer need to set status here, it's done atomically before the call
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      
      const idToken = await currentUser.getIdToken();
      const base64Image = imageSrc.split(',')[1];

      const response = await fetch('https://asia-southeast1-rodwell-attendance.cloudfunctions.net/recognizeAndMarkAttendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ image: base64Image })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      toast.success(result.message);

      // Update face with final status
      setTrackedFaces(prev => prev.map(f => f.id === face.id ? {
        ...f,
        status: result.status === 'success' || result.status === 'already_marked' ? 'recognized' : 'unknown',
        name: result.studentName,
        message: result.attendanceStatus ? `${result.studentName} - ${result.attendanceStatus}`: 'Unknown',
      } : f));

    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'An error occurred during verification.');
      // Reset face status on error to allow retry after cooldown
      setTrackedFaces(prev => prev.map(f => f.id === face.id ? { ...f, status: 'unknown', message: 'Verification Failed' } : f));
    }
  }, []);

  const startDetection = useCallback(() => {
    if (isDetectingRef.current || !modelRef.current) return;
    isDetectingRef.current = true;
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!webcamRef.current?.video || webcamRef.current.video.readyState !== 4) return;
      
      const video = webcamRef.current.video;
      const model = modelRef.current;
      if(!model) return;

      const faces = await model.estimateFaces(video, false);
      const now = Date.now();
      
      setTrackedFaces(prevFaces => {
        // --- IMPROVED TRACKING: Keep recognized faces for a grace period after they disappear ---
        const nextFaces: TrackedFace[] = [];
        const unmatchedNewFaces = [...faces];

        // 1. Try to match previous faces with new faces
        for (const prevFace of prevFaces) {
          let bestMatch: { face: blazeface.NormalizedFace, iou: number, index: number } | null = null;

          for (let i = 0; i < unmatchedNewFaces.length; i++) {
            const newFace = unmatchedNewFaces[i];
            const newFaceBox = {
              xMin: newFace.topLeft[0], yMin: newFace.topLeft[1],
              xMax: newFace.bottomRight[0], yMax: newFace.bottomRight[1],
              width: newFace.bottomRight[0] - newFace.topLeft[0],
              height: newFace.bottomRight[1] - newFace.topLeft[1],
            };
            // --- FIX: Lower IoU threshold to make tracking less sensitive to movement ---
            const iou = calculateIoU(prevFace.box, newFaceBox);
            if (iou > 0.2 && (!bestMatch || iou > bestMatch.iou)) {
              bestMatch = { face: newFace, iou, index: i };
            }
          }

          if (bestMatch) {
            // Found a match, update the face and mark it as seen
            const matchedBox = {
              xMin: bestMatch.face.topLeft[0], yMin: bestMatch.face.topLeft[1],
              xMax: bestMatch.face.bottomRight[0], yMax: bestMatch.face.bottomRight[1],
              width: bestMatch.face.bottomRight[0] - bestMatch.face.topLeft[0],
              height: bestMatch.face.bottomRight[1] - bestMatch.face.topLeft[1],
            };
            nextFaces.push({ ...prevFace, box: matchedBox, lastSeen: now });
            unmatchedNewFaces.splice(bestMatch.index, 1); // Remove from pool
          } else {
            // No match found, check if we should keep it for the grace period
            if (now - prevFace.lastSeen < 3000) { // 3-second grace period
              nextFaces.push(prevFace);
            }
          }
        }

        // 2. Add any remaining new faces
        for (const newFace of unmatchedNewFaces) {
          const newFaceBox = {
            xMin: newFace.topLeft[0], yMin: newFace.topLeft[1],
            xMax: newFace.bottomRight[0], yMax: newFace.bottomRight[1],
            width: newFace.bottomRight[0] - newFace.topLeft[0],
            height: newFace.bottomRight[1] - newFace.topLeft[1],
          };
          nextFaces.push({
            id: generateFaceId(),
            box: newFaceBox,
            status: 'tracking',
            lastVerification: 0,
            lastSeen: now,
          });
        }
        
        // 3. Atomically trigger verification for eligible faces
        const facesToVerify: { face: TrackedFace, image: string }[] = [];
        const finalFaces = nextFaces.map(face => {
            if (face.status === 'tracking' && now - face.lastVerification > VERIFICATION_COOLDOWN) {
                if(webcamRef.current?.video){
                    const croppedImage = getCroppedFace(webcamRef.current.video, face.box);
                    if (croppedImage) {
                        facesToVerify.push({ face, image: croppedImage });
                        return { ...face, status: 'verifying' as const, lastVerification: now };
                    }
                }
            }
            return face;
        });

        // 4. Trigger the async verification calls outside the state update loop
        for (const { face, image } of facesToVerify) {
            verifyAndMarkFace(face, image);
        }

        return finalFaces;
      });
    }, 500); // Detect every 500ms
  }, [verifyAndMarkFace]);

  const stopDetection = () => {
    isDetectingRef.current = false;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setTrackedFaces([]);
  };

  useEffect(() => {
    if (isCameraActive) {
      startDetection();
    } else {
      stopDetection();
    }
    return () => stopDetection();
  }, [isCameraActive, startDetection]);
  
  // --- Canvas Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Add a null check for canvas

    const video = webcamRef.current?.video;
    if (!video || !isCameraActive) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    trackedFaces.forEach(face => {
        const { xMin, yMin, width, height } = face.box;
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        const drawX = canvas.width - (xMin * scaleX) - (width * scaleX);
        const drawY = yMin * scaleY;
        const drawWidth = width * scaleX;
        const drawHeight = height * scaleY;
        
        let borderColor = '#6b7280'; // Gray for tracking
        let label = 'Tracking...';

        if (face.status === 'verifying') {
          borderColor = '#3b82f6'; // Blue
          label = 'Verifying...';
        } else if (face.status === 'recognized') {
          borderColor = '#10b981'; // Green
          label = face.message || 'Recognized';
        } else if (face.status === 'unknown') {
          borderColor = '#ef4444'; // Red
          label = face.message || 'Unknown';
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
        
        ctx.fillStyle = borderColor;
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(drawX, drawY - 25, textWidth + 10, 25);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(label, drawX + 5, drawY - 8);
    });
  }, [trackedFaces, isCameraActive]);

  return (
    <CardBox>
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-2xl mx-auto mb-4">
          {isCameraActive ? (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-lg w-full"
              videoConstraints={{ facingMode: 'user' }}
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full bg-black rounded-lg aspect-video flex items-center justify-center">
                {isLoading ? (
                    <div className="text-white text-lg flex items-center">
                        <LoadingSpinner />
                        <span className="ml-2">{loadingMessage}</span>
                    </div>
                ) : (
                    <p className="text-white text-lg">Camera is off.</p>
                )}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
          />
        </div>

        <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            disabled={isLoading}
            className={`px-6 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-150 ease-in-out
            ${
                isLoading 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : isCameraActive
                ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
            }`}
        >
            {isLoading ? 'Loading Model...' : isCameraActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
    </CardBox>
  );
};

export default function FaceScanDashboardPage() {
  return (
    <>
      <Head>
        <title>{getPageTitle('Real-time Attendance')}</title>
      </Head>
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiFaceRecognition} title="Real-time Face Recognition" main />
        <RealtimeFaceScanner />
      </SectionMain>
    </>
  );
} 