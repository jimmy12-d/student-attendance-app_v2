"use client";

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface CameraShutdownHandlerProps {
  isZoomMode: boolean;
  isCameraActive: boolean;
  isCameraShutdown: boolean;
  cameraShutdownCountdown: number | null;
  lastFaceDetectionTimeRef: React.MutableRefObject<number>;
  shutdownTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  countdownTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  detectionIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  webcamRef: React.RefObject<any>;
  onCameraShutdown: () => void;
  onCountdownUpdate: (countdown: number | null) => void;
  NO_FACE_TIMEOUT: number;
  COUNTDOWN_START: number;
}

const CameraShutdownHandler: React.FC<CameraShutdownHandlerProps> = ({
  isZoomMode,
  isCameraActive,
  isCameraShutdown,
  cameraShutdownCountdown,
  lastFaceDetectionTimeRef,
  shutdownTimerRef,
  countdownTimerRef,
  detectionIntervalRef,
  webcamRef,
  onCameraShutdown,
  onCountdownUpdate,
  NO_FACE_TIMEOUT,
  COUNTDOWN_START
}) => {
  const shutdownInProgressRef = useRef(false);

  // Enhanced camera shutdown with smooth animation
  const handleSmoothCameraShutdown = async () => {
    if (shutdownInProgressRef.current || !isZoomMode || !isCameraActive) return;
    
    shutdownInProgressRef.current = true;
    
    try {
      // Clear countdown immediately
      onCountdownUpdate(null);
      
      // Clear detection interval first
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      
      // Clear shutdown timers
      if (shutdownTimerRef.current) {
        clearTimeout(shutdownTimerRef.current);
        shutdownTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      
      // Show shutdown notification
      toast.info('Camera shutting down...', {
        description: 'No faces detected for 10 seconds'
      });
      
      // Add a small delay for UI smoothness
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stop camera stream gradually
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        
        // Stop tracks one by one for smoother shutdown
        for (const track of tracks) {
          track.stop();
        }
        
        webcamRef.current.video.srcObject = null;
      }
      
      // Small delay before final state change
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Call the shutdown callback
      onCameraShutdown();
            
    } catch (error) {
      console.error('❌ Error during camera shutdown:', error);
      // Fallback to immediate shutdown
      onCameraShutdown();
    } finally {
      shutdownInProgressRef.current = false;
    }
  };

  // Monitor for auto-shutdown conditions
  useEffect(() => {
    if (!isZoomMode || !isCameraActive || isCameraShutdown || shutdownInProgressRef.current) {
      return;
    }

    const checkShutdownConditions = () => {
      const now = Date.now();
      const timeSinceLastFace = now - lastFaceDetectionTimeRef.current;
      
      // Start countdown when reaching the threshold
      if (timeSinceLastFace >= (NO_FACE_TIMEOUT - COUNTDOWN_START * 1000) && cameraShutdownCountdown === null) {
        const remainingTime = Math.ceil((NO_FACE_TIMEOUT - timeSinceLastFace) / 1000);
        
        if (remainingTime > 0) {
          onCountdownUpdate(remainingTime);
          
          // Start countdown timer with a ref to track current countdown
          let currentCountdownValue = remainingTime;
          
          countdownTimerRef.current = setInterval(() => {
            currentCountdownValue -= 1;
            
            if (currentCountdownValue <= 0) {
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              onCountdownUpdate(null);
            } else {
              onCountdownUpdate(currentCountdownValue);
            }
          }, 1000);
        }
      }
      
      // Trigger shutdown when timeout is reached
      if (timeSinceLastFace >= NO_FACE_TIMEOUT) {
        handleSmoothCameraShutdown();
      }
    };

    // Set up monitoring interval
    const monitorInterval = setInterval(checkShutdownConditions, 1000);
    
    return () => {
      clearInterval(monitorInterval);
    };
  }, [
    isZoomMode,
    isCameraActive,
    isCameraShutdown,
    cameraShutdownCountdown,
    NO_FACE_TIMEOUT,
    COUNTDOWN_START,
    onCameraShutdown,
    onCountdownUpdate
  ]);

  // Reset shutdown progress when camera becomes active
  useEffect(() => {
    if (isCameraActive && !isCameraShutdown) {
      shutdownInProgressRef.current = false;
    }
  }, [isCameraActive, isCameraShutdown]);

  // This component doesn't render anything, it just handles the shutdown logic
  return null;
};

export default CameraShutdownHandler;
