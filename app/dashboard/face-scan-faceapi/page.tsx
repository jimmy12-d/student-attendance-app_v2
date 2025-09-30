"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase-config';

import { mdiFaceRecognition, mdiCamera, mdiCameraOff, mdiCheck, mdiCog, mdiInformation } from '@mdi/js';
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import CustomDropdown from '../students/components/CustomDropdown';
import Icon from '../../_components/Icon';

// Import utilities
import { Student } from '../../_interfaces';
import { filterStudentsByShift, markAttendance } from '../_lib/attendanceLogic';
import { TrackedFace, initializeFaceApi, detectAllFaces, calculateFaceDistance } from './utils/faceDetection';
import ZoomModeOverlay from './components/ZoomModeOverlay';
import RecognitionControls from './components/RecognitionControls';
import ShiftSelector from './components/ShiftSelector';
import CameraShutdownHandler from './components/CameraShutdownHandler';
import ShutdownTransition from './components/ShutdownTransition';
import FailedAttendanceManager from './components/FailedAttendanceManager';
import { failedAttendanceRetryManager, FailedAttendanceRecord } from './utils/failedAttendanceRetryManager';

const FaceApiAttendanceScanner = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ value: string, label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraShutdownCountdown, setCameraShutdownCountdown] = useState<number | null>(null);
  const [isCameraShutdown, setIsCameraShutdown] = useState(false);
  const [shutdownStage, setShutdownStage] = useState<'countdown' | 'shutting-down' | 'shutdown-complete' | null>(null);

  const [recognitionThreshold, setRecognitionThreshold] = useState(65); // Default 65%
  const [showRecognitionControls, setShowRecognitionControls] = useState(false); // Collapsible Recognition Controls
  const [minFaceSize, setMinFaceSize] = useState(130); // Minimum face width/height in pixels - default to 130
  const [maxFaceSize, setMaxFaceSize] = useState(350); // Maximum face width/height in pixels - default to 350
  const [detectionInterval, setDetectionInterval] = useState(1000); // Detection interval in milliseconds - default to 1000ms
  const [selectedShift, setSelectedShift] = useState<string>(''); // Selected shift/session
  const [isInitialized, setIsInitialized] = useState(false); // Flag to prevent overwriting localStorage on initial mount
  const [availableShifts] = useState([
    { value: 'All', label: 'All Shifts' },
    { value: 'Morning', label: 'Morning Session' },
    { value: 'Afternoon', label: 'Afternoon Session' },
    { value: 'Evening', label: 'Evening Session' }
  ]);
  const [classConfigs, setClassConfigs] = useState<any>(null); // Store class configurations
  
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);
  const recentlyMarkedStudents = useRef<Map<string, number>>(new Map()); // Track recently marked students
  const studentsUnsubRef = useRef<(() => void) | null>(null);
  const lastFaceDetectionTimeRef = useRef<number>(Date.now()); // Track last face detection time
  const shutdownTimerRef = useRef<NodeJS.Timeout | null>(null);
const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);  
  const DWELL_TIME_BEFORE_RECOGNIZE = 500; // 0.8 seconds
  const RECOGNITION_COOLDOWN = 10000; // 10 seconds (was 1 millisecond!)
  // DETECTION_INTERVAL is now configurable via state: detectionInterval
  const NO_FACE_TIMEOUT = 60000; // 60 seconds before camera shutdown (changed from 30s for easier debugging)
  const COUNTDOWN_START = 5; // Start countdown 5 seconds before shutdown

  // Load students from Firestore (real-time)
  const loadStudents = useCallback(async () => {
    try {
      setLoadingMessage('Loading students...');
      const studentsRef = collection(db, 'students');
      
      // Unsubscribe previous listener if any
      if (studentsUnsubRef.current) {
        studentsUnsubRef.current();
        studentsUnsubRef.current = null;
      }

      // Attach real-time listener
      const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
        const studentsData: Student[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          studentsData.push({
            id: doc.id,
            studentId: data.studentId || '',
            fullName: data.fullName || '',
            photoUrl: data.photoUrl,
            faceDescriptor: data.faceDescriptor,
            // Include shift and class data
            shift: data.shift,
            class: data.class,
            authUid: data.authUid // Add authUid for student portal access
          } as any);
        });
        
        setStudents(studentsData);
      }, (error) => {
        console.error('Students listener error:', error);
        toast.error('Failed to load students');
      });

      studentsUnsubRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    }
  }, []);

  // Load class configurations for shift start times
  const loadClassConfigs = useCallback(async () => {
    try {
      setLoadingMessage('Loading class configurations...');
      const classesRef = collection(db, 'classes');
      const snapshot = await getDocs(classesRef);
      
      const configs: any = {};
      snapshot.forEach(doc => {
        configs[doc.id] = doc.data();
      });
      
      setClassConfigs(configs);
    } catch (error) {
      console.error('Failed to load class configurations:', error);
      toast.error('Failed to load class configurations');
    }
  }, []);

  // Auto-select shift based on current time
  const autoSelectShift = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Define typical shift time ranges
    const morningStart = 6 * 60; // 6:00 AM (360 minutes)
    const morningEnd = 10 * 60; // 10:00 AM (600 minutes)
    const afternoonStart = 10 * 60; // 10:00 AM (600 minutes)
    const afternoonEnd = 15 * 60; // 3:00 PM (900 minutes)

    let autoShift = '';
    if (currentTimeInMinutes >= morningStart && currentTimeInMinutes < morningEnd) {
      autoShift = 'Morning';
    } else if (currentTimeInMinutes >= afternoonStart && currentTimeInMinutes < afternoonEnd) {
      autoShift = 'Afternoon';
    } else {
      autoShift = 'Evening';
    }
    setSelectedShift(autoShift);
  }, []);

  // Load available cameras
  const loadCameras = useCallback(async () => {
    try {
      setLoadingMessage('Loading available cameras...');

      // First, request camera access to ensure permissions are granted and device labels are populated
      let tempStream = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: undefined },
          audio: false
        });
      } catch (permissionError) {
        console.warn('Camera permission request failed, but continuing with device enumeration:', permissionError);
      }

      // Now enumerate devices - labels should be populated after permission request
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      // Stop the temporary stream if it was created
      if (tempStream) {
        tempStream.getTracks().forEach(track => track.stop());
      }

      const cameraOptions = videoDevices.map((device, index) => ({
        value: device.deviceId,
        label: device.label || `Camera ${index + 1} (${device.deviceId.slice(0, 8)}...)`
      }));

      setAvailableCameras(cameraOptions);

      // Auto-select first camera if none selected
      if (cameraOptions.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraOptions[0].value);
      }

      console.log(`Loaded ${cameraOptions.length} cameras:`, cameraOptions);
    } catch (error) {
      console.error('Failed to load cameras:', error);
      toast.error('Failed to load available cameras');
    }
  }, [selectedCamera]);

  // Initialize everything (only once)
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setLoadingMessage('Loading face detection models...');
      
      const modelsLoaded = await initializeFaceApi();
      
      if (modelsLoaded) {
        setLoadingMessage('Models loaded successfully');
        
        await Promise.all([
          loadStudents(),
          loadClassConfigs(),
          loadCameras()
        ]);
        
        // Auto-select shift after loading configs (always auto-select on page load)
        autoSelectShift();
      } else {
        setLoadingMessage('Failed to load face detection models');
      }
      setIsLoading(false);
    };

    initialize();
  }, [loadStudents, loadClassConfigs, autoSelectShift, loadCameras]);

  // Setup retry manager callback when students or classConfigs change
  useEffect(() => {
    if (students.length > 0 && classConfigs) {
      // Setup failed attendance retry manager with current data
      failedAttendanceRetryManager.setRetryCallback(async (record: FailedAttendanceRecord) => {
        try {
          // Find the student from the record
          const student = students.find(s => s.id === record.studentId);
          if (!student) {
            console.error(`Student not found for retry: ${record.studentId}`);
            return false;
          }

          // Use the enhanced markAttendance with retry logic
          const result = await markAttendance(student, record.shift, classConfigs || {}, () => {}, 2); // 2 retry attempts for auto-retry
          return result !== 'present'; // Return true if not default fallback
        } catch (error) {
          console.error('Retry callback failed:', error);
          return false;
        }
      });
      
      console.log('🔄 Updated retry manager callback with current data');
    }
  }, [students, classConfigs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      failedAttendanceRetryManager.stopRetryManager();
    };
  }, []);

  // Load saved face size settings from localStorage
  useEffect(() => {
    const savedMinFaceSize = localStorage.getItem('faceapi-min-face-size');
    const savedMaxFaceSize = localStorage.getItem('faceapi-max-face-size');
    const savedRecognitionThreshold = localStorage.getItem('faceapi-recognition-threshold');
    const savedDetectionInterval = localStorage.getItem('faceapi-detection-interval');
    // Note: We don't load savedSelectedShift anymore - always auto-select based on time
    
    if (savedMinFaceSize) {
      setMinFaceSize(Number(savedMinFaceSize));
    }
    if (savedMaxFaceSize) {
      setMaxFaceSize(Number(savedMaxFaceSize));
    }
    if (savedRecognitionThreshold) {
      setRecognitionThreshold(Number(savedRecognitionThreshold));
    }
    if (savedDetectionInterval) {
      setDetectionInterval(Number(savedDetectionInterval));
    }
    // Auto-select shift based on current time when component loads
    autoSelectShift();
    
    // Mark as initialized to allow localStorage saving
    setIsInitialized(true);
  }, [autoSelectShift]);

  // Save face size settings to localStorage whenever they change
  useEffect(() => {
    // Only save to localStorage after initial loading is complete
    if (!isInitialized) return;
    
    localStorage.setItem('faceapi-min-face-size', minFaceSize.toString());
    localStorage.setItem('faceapi-max-face-size', maxFaceSize.toString());
    localStorage.setItem('faceapi-recognition-threshold', recognitionThreshold.toString());
    localStorage.setItem('faceapi-detection-interval', detectionInterval.toString());
    if (selectedShift) {
      localStorage.setItem('faceapi-selected-shift', selectedShift);
    }
  }, [minFaceSize, maxFaceSize, recognitionThreshold, detectionInterval, selectedShift, isInitialized]);

  // Initialize success sound
  useEffect(() => {
    const audio = new Audio('/success_sound_3.mp3');
    audio.preload = 'auto';
    audio.volume = 0.8;
    audioRef.current = audio;
    
    // Test if audio can be played
    const testAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(e => {
          // Audio test failed silently
        });
      }
    };
    
    // Test audio on first user interaction
    const enableAudio = () => {
      testAudio();
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
    
    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  const playSuccessSound = () => {
    if (audioRef.current) {
      // Reset audio to beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.error("❌ Error playing sound:", e);
        // Fallback: try to create a new audio instance
        try {
          const fallbackAudio = new Audio('/success_sound_3.mp3');
          fallbackAudio.volume = 0.8;
          fallbackAudio.play();
        } catch (fallbackError) {
          console.error("❌ Fallback audio also failed:", fallbackError);
        }
      });
    }
  };

  // Function to restart camera in zoom mode
  const restartCameraInZoomMode = useCallback(() => {
    if (!isZoomMode) return;
    
    setIsCameraShutdown(false);
    setCameraShutdownCountdown(null);
    setIsCameraLoading(true);
    setIsCameraActive(true);
    lastFaceDetectionTimeRef.current = Date.now();
    
    // Clear any existing timers
    if (shutdownTimerRef.current) {
      clearTimeout(shutdownTimerRef.current);
      shutdownTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    toast.success('Camera restarted');
  }, [isZoomMode]);

  // Function to handle camera auto-shutdown
  const handleCameraShutdown = useCallback(() => {
    if (!isZoomMode || !isCameraActive) return;
    
    // Start shutdown transition
    setShutdownStage('shutting-down');
    
    // After a brief delay, complete the shutdown
    setTimeout(() => {
      setIsCameraActive(false);
      setIsCameraShutdown(true);
      setCameraShutdownCountdown(null);
      setShutdownStage('shutdown-complete');
      
      // Clear tracked faces
      setTrackedFaces([]);
      
      // Reset to normal state after showing the complete message
      setTimeout(() => {
        setShutdownStage(null);
      }, 2000);
    }, 1000); // 1 second transition
  }, [isZoomMode, isCameraActive]);

  // Handle countdown stage changes
  useEffect(() => {
    if (cameraShutdownCountdown !== null && cameraShutdownCountdown > 0) {
      setShutdownStage('countdown');
    } else if (cameraShutdownCountdown === null && shutdownStage === 'countdown') {
      setShutdownStage(null);
    }
  }, [cameraShutdownCountdown, shutdownStage]);


  // Handle escape key to exit zoom mode
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isZoomMode) {
        setIsZoomMode(false);
        stopCamera();
        toast.info('Face scanning stopped');
      }
    };

    if (isZoomMode) {
      // Prevent scrolling when zoom mode is active
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // Restore scrolling when zoom mode is deactivated
      document.body.style.overflow = 'unset';
    }
  }, [isZoomMode, isCameraActive]);

  // Handle click to reset countdown during shutdown countdown
  useEffect(() => {
    const handleClickReset = (event: MouseEvent) => {
      // Only reset if we're in zoom mode, camera is active, and countdown is running
      if (isZoomMode && isCameraActive && cameraShutdownCountdown !== null && cameraShutdownCountdown > 0) {
        // Clear any existing timers
        if (shutdownTimerRef.current) {
          clearTimeout(shutdownTimerRef.current);
          shutdownTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        
        // Reset countdown
        setCameraShutdownCountdown(null);
        
        // Reset shutdown stage
        setShutdownStage(null);
        
        // Update last face detection time to prevent immediate shutdown
        lastFaceDetectionTimeRef.current = Date.now();
        
        toast.info('Camera shutdown cancelled');
      }
    };

    if (isZoomMode) {
      document.addEventListener('click', handleClickReset);
      return () => {
        document.removeEventListener('click', handleClickReset);
      };
    }
  }, [isZoomMode, isCameraActive, cameraShutdownCountdown]);

  // Face detection and recognition
  const detectFaces = useCallback(async () => {
    if (!webcamRef.current?.video || !isCameraActive || isCameraShutdown) return; // Removed global scan lock check
    
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    try {
      const detections = await detectAllFaces(video);

      if (detections.length === 0) {
        setTrackedFaces([]);
        // No faces detected - don't update last face detection time
        return;
      }

      // Filter detections by face size (distance approximation)
      const filteredDetections = detections.filter(detection => {
        const { width, height } = detection.detection.box;
        const faceSize = Math.max(width, height);
        return faceSize >= minFaceSize && faceSize <= maxFaceSize;
      });

      // Only update last face detection time when we have valid filtered faces
      if (filteredDetections.length > 0) {
        const previousTime = lastFaceDetectionTimeRef.current;
        lastFaceDetectionTimeRef.current = Date.now();
        
        // Clear any shutdown timers since we detected valid faces
        if (shutdownTimerRef.current) {
          clearTimeout(shutdownTimerRef.current);
          shutdownTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCameraShutdownCountdown(null);
      } else {
        // No valid faces within size criteria - clear tracked faces but don't update timestamp
        setTrackedFaces([]);
        return;
      }

      const now = Date.now();
      
      setTrackedFaces(prevFaces => {
        const nextFaces: TrackedFace[] = [];
        const unmatchedDetections = [...filteredDetections];

        // Try to match existing faces with new detections
        for (const prevFace of prevFaces) {
          let bestMatch: { detection: any, distance: number, index: number } | null = null;

          for (let i = 0; i < unmatchedDetections.length; i++) {
            const detection = unmatchedDetections[i];
            const box = detection.detection.box;
            
            // Calculate distance between face centers
            const prevCenter = {
              x: prevFace.box.x + prevFace.box.width / 2,
              y: prevFace.box.y + prevFace.box.height / 2
            };
            const newCenter = {
              x: box.x + box.width / 2,
              y: box.y + box.height / 2
            };
            
            const distance = Math.sqrt(
              Math.pow(prevCenter.x - newCenter.x, 2) + 
              Math.pow(prevCenter.y - newCenter.y, 2)
            );

            if (distance < 100 && (!bestMatch || distance < bestMatch.distance)) {
              bestMatch = { detection, distance, index: i };
            }
          }

          if (bestMatch) {
            const detection = bestMatch.detection;
            const box = detection.detection.box;
            
            nextFaces.push({
              ...prevFace,
              box: { x: box.x, y: box.y, width: box.width, height: box.height },
              descriptor: detection.descriptor,
              lastSeen: now
            });
            
            unmatchedDetections.splice(bestMatch.index, 1);
          } else {
            // Keep face for a short time after it disappears
            if (now - prevFace.lastSeen < 2000) {
              nextFaces.push(prevFace);
            }
          }
        }

        // Add new faces
        for (const detection of unmatchedDetections) {
          const box = detection.detection.box;
          nextFaces.push({
            id: `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            descriptor: detection.descriptor,
            status: 'detecting',
            firstSeen: now,
            lastSeen: now,
            message: 'Hold position...',
            isScanning: false
          });
        }

        // Process faces for recognition
        return nextFaces.map(face => {
          // Skip processing if this face is currently being scanned
          if (face.isScanning) {
            return face;
          }

          // Check if face has been stable long enough
          if (now - face.firstSeen < DWELL_TIME_BEFORE_RECOGNIZE) {
            return { ...face, status: 'detecting', message: 'Hold position...' };
          }

          // Skip if already recognized recently
          if (face.status === 'recognized' && face.lastRecognized && now - face.lastRecognized < RECOGNITION_COOLDOWN) {
            return face;
          }

          // Perform recognition
          if (face.descriptor && face.status !== 'recognized') {
            // Filter students by shift using helper function
            const targetStudents = filterStudentsByShift(students.filter(s => s.faceDescriptor), selectedShift || 'All');

            let bestMatch: { student: Student, distance: number } | null = null;

            for (const student of targetStudents) {
              if (!student.faceDescriptor) continue;
              
              const storedDescriptor = new Float32Array(student.faceDescriptor);
              const distance = calculateFaceDistance(face.descriptor, storedDescriptor);
              const confidence = (1 - distance) * 100;
              const requiredConfidence = recognitionThreshold;
              
              // Check if confidence meets the threshold
              if (confidence >= requiredConfidence && (!bestMatch || distance < bestMatch.distance)) {
                bestMatch = { student, distance };
              }
            }

            if (bestMatch) {
              const finalConfidence = (1 - bestMatch.distance) * 100;
              const requiredConfidence = recognitionThreshold;
              
              // Double-check confidence threshold before marking attendance
              if (finalConfidence >= requiredConfidence) {
                // Check if this student was recently marked (global cooldown)
                const studentKey = `${bestMatch.student.id}_${selectedShift || 'All'}_${new Date().toDateString()}`;
                const lastMarked = recentlyMarkedStudents.current.get(studentKey);
                const now = Date.now();
                
                if (lastMarked && now - lastMarked < RECOGNITION_COOLDOWN) {
                  return {
                    ...face,
                    status: 'recognized',
                    name: bestMatch.student.fullName,
                    confidence: finalConfidence,
                    lastRecognized: lastMarked, // Use the original mark time
                    message: `Already marked: ${bestMatch.student.fullName} (${finalConfidence.toFixed(1)}%)`,
                    // Preserve the attendance status for proper color coding
                    attendanceStatus: face.attendanceStatus || 'present' // Default to present if not set
                  };
                }
                
                // Mark the student as recently processed
                recentlyMarkedStudents.current.set(studentKey, now);
                
                // Start per-face scan lock process
                const updatedFace = {
                  ...face,
                  status: 'scanning' as const,
                  name: bestMatch.student.fullName,
                  confidence: finalConfidence,
                  lastRecognized: now,
                  message: `Recognized: ${bestMatch.student.fullName} (${finalConfidence.toFixed(1)}%)`,
                  isScanning: true,
                  scanMessage: `✅ ${bestMatch.student.fullName} detected!`
                };
                
                // Notify attendance table that a face was detected (start loading state)
                window.dispatchEvent(new CustomEvent('faceDetected', {
                  detail: {
                    studentId: bestMatch.student.id,
                    studentName: bestMatch.student.fullName,
                    confidence: finalConfidence,
                    timestamp: new Date()
                  }
                }));
                
                // Play success sound immediately when face is recognized
                playSuccessSound();
                
                // Mark attendance for the recognized student (async) with enhanced error handling
                // Don't pass playSuccessSound since we already played it
                markAttendance(bestMatch.student, selectedShift || '', classConfigs || {}, () => {}, 3) // 3 retry attempts
                  .then((attendanceStatus) => {
                    console.log(`✅ Attendance marking completed for ${bestMatch.student.fullName}: ${attendanceStatus}`);
                    
                    // Notify other components that new attendance was marked
                    window.dispatchEvent(new CustomEvent('attendanceMarked', {
                      detail: {
                        studentId: bestMatch.student.id,
                        studentName: bestMatch.student.fullName,
                        status: attendanceStatus,
                        shift: selectedShift || '',
                        timestamp: new Date(),
                        method: 'face-api'
                      }
                    }));
                    
                    // Update this specific face after attendance marking
                    setTrackedFaces(prevFaces => 
                      prevFaces.map(f => 
                        f.id === face.id 
                          ? { 
                              ...f, 
                              attendanceStatus,
                              status: 'recognized' as const,
                              message: `✅ Attendance marked: ${bestMatch.student.fullName} (${attendanceStatus})`,
                              isScanning: false // Stop scanning animation
                            } 
                          : f
                      )
                    );
                    
                    // Wait 3 seconds before removing this face to show success state
                    setTimeout(() => {
                      setTrackedFaces(prevFaces => 
                        prevFaces.filter(f => f.id !== face.id) // Remove this face after processing
                      );
                    }, 3000); // Increased from 2s to 3s to show success state longer
                  })
                  .catch(error => {
                    console.error('❌ All attendance marking attempts failed:', error);
                    
                    // Show detailed error information to user
                    const errorMessage = error.message || 'Unknown error occurred';
                    toast.error(`Failed to mark attendance for ${bestMatch.student.fullName}: ${errorMessage}`, {
                      duration: 8000 // Show error longer
                    });
                    
                    // Try to extract student info for manual fallback
                    const failedAttendanceInfo = {
                      studentName: bestMatch.student.fullName,
                      studentId: bestMatch.student.id,
                      shift: selectedShift || '',
                      date: new Date().toISOString().split('T')[0],
                      time: new Date().toLocaleTimeString(),
                      confidence: finalConfidence,
                      error: errorMessage
                    };
                    
                    // Dispatch event for manual review system
                    window.dispatchEvent(new CustomEvent('attendanceMarkingFailed', {
                      detail: failedAttendanceInfo
                    }));
                    
                    // Update face status to show failure with retry option
                    setTrackedFaces(prevFaces => 
                      prevFaces.map(f => 
                        f.id === face.id 
                          ? { 
                              ...f, 
                              isScanning: false, 
                              scanMessage: '', 
                              status: 'unknown' as const, 
                              message: `⚠️ Attendance failed - saved for manual review`,
                              attendanceStatus: 'failed'
                            }
                          : f
                      )
                    );
                    
                    // Keep the failed face visible longer for user awareness
                    setTimeout(() => {
                      setTrackedFaces(prevFaces => 
                        prevFaces.filter(f => f.id !== face.id)
                      );
                    }, 8000); // Keep failed faces visible for 8 seconds
                  });
                
                return updatedFace;
              } else {
                return {
                  ...face,
                  status: 'unknown',
                  message: `Low confidence (${finalConfidence.toFixed(1)}% < ${requiredConfidence.toFixed(0)}%)`
                };
              }
            } else {
              return {
                ...face,
                status: 'unknown',
                message: 'No matches above confidence threshold'
              };
            }
          }

          return face;
        });
      });
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [isCameraActive, minFaceSize, maxFaceSize, recognitionThreshold, selectedShift, students]);

  // Helper function to get start time for a student's class/shift combination
  const getStudentStartTime = useCallback((student: Student): Date | null => {
    try {
      if (!classConfigs || !student.class || !student.shift) {
        return null;
      }
      
      // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
      const studentClassKey = student.class.replace(/^Class\s+/, '');
      const classConfig = classConfigs[studentClassKey];
      
      if (!classConfig?.shifts) {
        return null;
      }
      
      let shiftConfig = classConfig.shifts[student.shift];
      
      // Special handling for Class 12NKGS on Saturday
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      if (studentClassKey === '12NKGS' && dayOfWeek === 6) {
        // Override start time to 13:00 for Class 12NKGS on Saturday
        shiftConfig = { startTime: '13:00' };
      }
      
      if (!shiftConfig?.startTime) {
        return null;
      }
      
      const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(startHour, startMinute, 0, 0);
      
      return startTime;
    } catch (error) {
      console.error('Error getting student start time:', error);
      return null;
    }
  }, [classConfigs]);

  // Start detection loop
  const startDetection = useCallback(() => {
    if (isDetectingRef.current) return;
    
    isDetectingRef.current = true;
    lastFaceDetectionTimeRef.current = Date.now(); // Reset timer when starting detection
    
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
      
      // Clean up old entries from recently marked students (every 10 detection cycles)
      if (Math.random() < 0.1) { // 10% chance each cycle
        const now = new Date();
        
        for (const [key, timestamp] of recentlyMarkedStudents.current.entries()) {
          // Parse the key to get student info (assuming format includes student data)
          // For now, use the standard cooldown as fallback if no startTime available
          let shouldRemove = timestamp < (now.getTime() - RECOGNITION_COOLDOWN);
          
          // Try to find the student from the key and use their actual start time
          const student = students.find(s => key.includes(s.id) || key.includes(s.studentId));
          if (student) {
            const startTime = getStudentStartTime(student);
            if (startTime) {
              // Use start time as the basis for cleanup instead of fixed cooldown
              // Keep entries until after the class start time has passed
              shouldRemove = now > startTime && timestamp < startTime.getTime();
            }
          }
          
          if (shouldRemove) {
            recentlyMarkedStudents.current.delete(key);
          }
        }
      }
    }, detectionInterval);
  }, [detectFaces, isZoomMode, isCameraActive, isCameraShutdown, handleCameraShutdown, getStudentStartTime, students, detectionInterval]);

  // Stop detection
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
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
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCameraShutdownCountdown(null);
    
    setTrackedFaces([]);
    // Clear recently marked students when stopping detection
    recentlyMarkedStudents.current.clear();
    
    // Clear canvas when stopping detection
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Dedicated function to properly stop camera
  const stopCamera = useCallback(() => {
    // Stop detection first
    stopDetection();
    
    // Clear zoom mode if active
    if (isZoomMode) {
      setIsZoomMode(false);
      document.body.style.overflow = 'unset';
      toast.info('Face scanning stopped');
    }
    
    // Reset loading state
    setIsCameraLoading(false);
    
    // Then cleanup camera streams
    if (webcamRef.current?.video?.srcObject) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      webcamRef.current.video.srcObject = null;
    }
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // Set camera inactive
    setIsCameraActive(false);
    
    // Reset shutdown state
    setIsCameraShutdown(false);
    setCameraShutdownCountdown(null);
  }, [stopDetection]);

  useEffect(() => {
    if (isCameraActive && !isLoading) {
      startDetection();
    } else {
      stopDetection();
    }
    return () => {
      stopDetection();
    };
  }, [isCameraActive, isLoading, startDetection, stopDetection]);

  // Enhanced cleanup effect with proper camera stream cleanup
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
      
      // Stop detection and cleanup camera
      stopDetection();
      
      // Cleanup students listener
      if (studentsUnsubRef.current) {
        studentsUnsubRef.current();
        studentsUnsubRef.current = null;
      }
      
      // Force cleanup of any remaining camera streams
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
        });
        webcamRef.current.video.srcObject = null;
      }
    };
  }, [stopDetection]);

  // Additional effect to cleanup camera when component unmounts or camera is turned off
  useEffect(() => {
    if (!isCameraActive) {
      // Clear tracked faces immediately when camera is turned off
      setTrackedFaces([]);
      
      // Clear canvas immediately
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      // Small delay to ensure proper cleanup
      const timer = setTimeout(() => {
        if (webcamRef.current?.video?.srcObject) {
          const stream = webcamRef.current.video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
          });
          webcamRef.current.video.srcObject = null;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isCameraActive]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Always clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!video || !isCameraActive || trackedFaces.length === 0) {
      // Clear canvas when camera is off or no faces detected - and exit early
      return;
    }

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    trackedFaces.forEach(face => {
      const { x, y, width, height } = face.box;
      
      // Adjust for mirrored video
      const drawX = canvas.width - (x * scaleX) - (width * scaleX);
      const drawY = y * scaleY;
      const drawWidth = width * scaleX;
      const drawHeight = height * scaleY;

      // Calculate actual face size for distance estimation
      const actualFaceSize = Math.max(width, height);
      const isValidDistance = actualFaceSize >= minFaceSize && actualFaceSize <= maxFaceSize;

      let borderColor = '#6b7280'; // Gray for detecting
      let label = face.message || 'Detecting...';

      // Dynamic color logic - prioritize current state but respect attendance status
      if (face.isScanning) {
        // Scanning state - use color based on attendance status
        if (face.attendanceStatus === 'late') {
          borderColor = '#f59e0b'; // Amber for late scanning
          label = face.name ? `${face.name} - Late...` : 'Late...';
        } else {
          borderColor = '#22c55e'; // Green for on-time scanning
          label = face.name ? `${face.name} - Processing...` : 'Processing...';
        }
      } else if (!isValidDistance) {
        // Distance issues - orange/amber for guidance
        borderColor = '#f59e0b'; // Orange for distance issues
        if (actualFaceSize < minFaceSize) {
          label = `Move closer (${actualFaceSize.toFixed(0)}px)`;
        } else {
          label = `Move back (${actualFaceSize.toFixed(0)}px)`;
        }
      } else if (face.status === 'recognizing') {
        // Currently recognizing - blue with pulse
        borderColor = '#3b82f6'; // Blue for processing
        label = 'Recognizing...';
      } else if (face.status === 'recognized' && face.name) {
        // Successfully recognized - use attendance status for color
        if (face.attendanceStatus === 'late') {
          borderColor = '#f59e0b'; // Amber for late arrival
          label = `${face.name} - Late Arrival`;
        } else {
          borderColor = '#10b981'; // Green for present/on-time
          label = `${face.name} - Present`;
        }
      } else if (face.status === 'unknown') {
        // Unknown face - red for error
        borderColor = '#ef4444'; // Red for unknown
        label = 'Unknown Person';
      } else if (face.status === 'detecting') {
        // Still detecting - gray for neutral state
        borderColor = '#6b7280'; // Gray for detecting
        label = 'Detecting...';
      } else {
        // Default state - light gray
        borderColor = '#9ca3af'; // Light gray for default
        label = face.message || 'Waiting...';
      }

      // Draw bounding box with dynamic styling
      ctx.strokeStyle = borderColor;
      
      // Dynamic line width and style based on status
      if (face.isScanning) {
        ctx.lineWidth = 4; // Thicker for scanning
        ctx.setLineDash([5, 5]); // Dashed line for scanning animation effect
      } else if (face.status === 'recognized') {
        ctx.lineWidth = 3; // Medium thickness for recognized
        ctx.setLineDash([]); // Solid line for recognized
      } else if (face.status === 'recognizing') {
        ctx.lineWidth = 3; // Medium thickness for recognizing
        ctx.setLineDash([10, 5]); // Longer dashes for recognizing
      } else if (!isValidDistance) {
        ctx.lineWidth = 2; // Thinner for distance issues
        ctx.setLineDash([3, 3]); // Short dashes for distance guidance
      } else {
        ctx.lineWidth = isValidDistance ? 2 : 1; // Default thickness
        ctx.setLineDash([]); // Solid line for default
      }
      
      ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
      
      // Reset line dash for other drawings
      ctx.setLineDash([]);

      // Draw label background
      ctx.fillStyle = borderColor;
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(drawX, drawY - 30, Math.max(textWidth + 20, 120), 30);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(label, drawX + 5, drawY - 12);

      // Draw distance info
      if (isValidDistance) {
        ctx.font = '12px Arial';
        ctx.fillText(`${actualFaceSize.toFixed(0)}px`, drawX + 5, drawY + drawHeight + 15);
        
        // Draw confidence if available
        if (face.confidence) {
          ctx.fillText(`${face.confidence.toFixed(1)}%`, drawX + 60, drawY + drawHeight + 15);
        }
      } else {
        // Show distance guidance
        ctx.font = '11px Arial';
        ctx.fillStyle = '#f59e0b';
        const guidance = actualFaceSize < minFaceSize ? 'Move closer' : 'Move back';
        ctx.fillText(guidance, drawX + 5, drawY + drawHeight + 15);
      }
    });
  }, [trackedFaces, isCameraActive, minFaceSize, maxFaceSize]);

  // Handle zoom mode state changes - keep detection running smoothly
  useEffect(() => {
    // Only handle UI cleanup when exiting zoom mode - don't interfere with detection
    if (!isZoomMode) {
      // Just ensure body scrolling is restored if needed
      document.body.style.overflow = 'unset';
    }
  }, [isZoomMode]);

  return (
    <>
      {/* Camera Shutdown Handler */}
      <CameraShutdownHandler
        isZoomMode={isZoomMode}
        isCameraActive={isCameraActive}
        isCameraShutdown={isCameraShutdown}
        cameraShutdownCountdown={cameraShutdownCountdown}
        lastFaceDetectionTimeRef={lastFaceDetectionTimeRef}
        shutdownTimerRef={shutdownTimerRef}
        countdownTimerRef={countdownTimerRef}
        detectionIntervalRef={detectionIntervalRef}
        webcamRef={webcamRef}
        onCameraShutdown={handleCameraShutdown}
        onCountdownUpdate={setCameraShutdownCountdown}
        NO_FACE_TIMEOUT={NO_FACE_TIMEOUT}
        COUNTDOWN_START={COUNTDOWN_START}
      />

      {/* Shutdown Transition Overlay */}
      {isZoomMode && shutdownStage && (
        <ShutdownTransition
          isVisible={true}
          stage={shutdownStage}
          countdown={cameraShutdownCountdown}
        />
      )}

      {/* Zoom Mode Overlay */}
      <ZoomModeOverlay
        isZoomMode={isZoomMode}
        isCameraActive={isCameraActive}
        isCameraLoading={isCameraLoading}
        isCameraShutdown={isCameraShutdown}
        cameraShutdownCountdown={cameraShutdownCountdown}
        selectedCamera={selectedCamera}
        webcamRef={webcamRef}
        canvasRef={canvasRef}
        trackedFaces={trackedFaces}
        recognitionThreshold={recognitionThreshold}
        onExitZoomMode={() => {
          setIsZoomMode(false);
          stopCamera();
        }}
        onRestartCamera={restartCameraInZoomMode}
        onUserMedia={() => {
          setIsCameraLoading(false);
          setIsCameraActive(true);
        }}
        onUserMediaError={(error: any) => {
          console.error('Camera access error:', error);
          setIsCameraLoading(false);
          setIsCameraActive(false);
          toast.error('Failed to access camera');
        }}
      />

      {/* Main Application */}
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-800 dark:via-gray-800 dark:to-blue-900 ${isZoomMode ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full shadow-lg">
              <Icon path={mdiFaceRecognition} className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Face-API.js Attendance System</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Advanced facial recognition using SSD MobileNet V1 model with automatic photo enrollment capabilities
          </p>
        </div>

        {/* Status Cards */}
        {!isLoading && (
          <ShiftSelector
            selectedShift={selectedShift}
            setSelectedShift={setSelectedShift}
            availableShifts={availableShifts}
            autoSelectShift={autoSelectShift}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Icon path={mdiCog} className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Initializing System</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{loadingMessage}</p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
            </div>
          </CardBox>
        )}

        {/* Recognition Controls - Full Width & Collapsible */}
        {!isLoading && (
          <RecognitionControls
            recognitionThreshold={recognitionThreshold}
            setRecognitionThreshold={setRecognitionThreshold}
            showRecognitionControls={showRecognitionControls}
            setShowRecognitionControls={setShowRecognitionControls}
            minFaceSize={minFaceSize}
            setMinFaceSize={setMinFaceSize}
            maxFaceSize={maxFaceSize}
            setMaxFaceSize={setMaxFaceSize}
            detectionInterval={detectionInterval}
            setDetectionInterval={setDetectionInterval}
          />
        )}

        {/* Camera Section */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Camera Feed */}
            <div className="lg:col-span-2">
              <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon path={mdiCamera} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Face Recognition Scanner</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered attendance scanning</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={async () => {
                          if (isCameraActive) {
                            // Use proper stop camera function when stopping
                            stopCamera();
                          } else {
                            // Only start camera if shift is selected
                            if (!selectedShift) {
                              toast.error('Please select a shift before starting scan');
                              return;
                            }
                            setIsCameraLoading(true);
                            toast.info('Starting camera...');
                            
                            // Immediately activate zoom mode and camera
                            setIsCameraActive(true);
                            setIsZoomMode(true);
                            document.body.style.overflow = 'hidden';
                            
                            // Keep loading state - will be cleared by onUserMedia when camera is ready
                            toast.success('Initializing face recognition...');
                          }
                        }}
                        disabled={(!selectedShift && !isCameraActive) || isCameraLoading}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center space-x-2 ${
                          (!selectedShift && !isCameraActive) || isCameraLoading
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : isCameraActive
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                        }`}
                      >
                        {isCameraLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Starting...</span>
                          </>
                        ) : (
                          <span>{isCameraActive ? 'Stop Scan' : 'Start Scan'}</span>
                        )}
                      </button>
                    </div>
                    
                    {/* test sound removed */}
                  </div>
                </div>

                <div className="p-6">
                  {/* Camera Selection */}
                  <div className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDropdown
                        id="camera-selection"
                        label="Select Camera"
                        value={selectedCamera}
                        onChange={setSelectedCamera}
                        options={availableCameras}
                        placeholder="Choose camera..."
                        searchable={false}
                        className="w-full"
                        disabled={isCameraActive}
                      />
                      
                      <div className="flex items-end">
                        <button
                          onClick={loadCameras}
                          disabled={isCameraActive}
                          className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm flex items-center space-x-2 ${
                            isCameraActive
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                          title="Refresh camera list"
                        >
                          <span>Refresh Cameras</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden aspect-video ${isZoomMode ? 'hidden' : ''}`}>
                    {!isCameraActive && !isCameraLoading ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-gray-900 to-slate-800">
                        <div className="text-center max-w-md mx-auto p-8">
                          <div className="relative mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <Icon path={mdiFaceRecognition} className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                              <Icon path={mdiCameraOff} className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                          <h3 className="text-white text-xl font-semibold mb-3">Face Recognition Ready</h3>
                          <p className="text-gray-300 text-sm mb-4">Select a shift and click "Start Scan" to begin attendance recognition</p>
                          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span>Ready</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span>AI Powered</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isCameraLoading ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="relative mb-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-300 border-t-transparent mx-auto"></div>
                            <Icon path={mdiCamera} className="w-8 h-8 text-blue-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <p className="text-white text-lg font-medium mb-2">Initializing Camera</p>
                          <p className="text-blue-200 text-sm">Please wait while we connect to your camera...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900">
                        <div className="text-center">
                          <Icon path={mdiCheck} className="w-16 h-16 text-green-300 mx-auto mb-4" />
                          <p className="text-white text-lg font-medium">Camera Active</p>
                          <p className="text-green-200 text-sm">Face recognition is running in full-screen mode</p>
                        </div>
                      </div>
                    )}
                    <canvas
                      ref={canvasRef}
                      className={`absolute top-0 left-0 w-full h-full pointer-events-none z-10 ${isZoomMode ? 'hidden' : ''}`}
                    />
                  </div>

                  {/* Detection Status */}
                  {trackedFaces.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Recognition Status:
                      </h4>
                      
                      <div className="space-y-3">
                        {trackedFaces.map(face => (
                          <div key={face.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded-full ${
                                  face.status === 'scanning' ? 'bg-green-500 animate-pulse' :
                                  face.status === 'recognized' ? 'bg-green-500 dark:bg-green-400' :
                                  face.status === 'recognizing' ? 'bg-blue-500 dark:bg-blue-400' :
                                  face.status === 'unknown' ? 'bg-red-500 dark:bg-red-400' : 'bg-gray-500 dark:bg-gray-400'
                                }`}></div>
                                
                                <div>
                                  {face.name ? (
                                    <>
                                      <div className={`text-2xl font-bold ${
                                        face.attendanceStatus === 'late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {face.name}
                                      </div>
                                      <div className={`text-sm font-medium ${
                                        face.isScanning ? 'text-blue-600 dark:text-blue-400' :
                                        face.attendanceStatus === 'late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {face.isScanning ? 'Marking Attendance...' : 
                                         face.attendanceStatus === 'late' ? 'Late Arrival' : 'Present'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        {face.status === 'detecting' ? 'Detecting...' :
                                         face.status === 'recognizing' ? 'Recognizing...' :
                                         face.status === 'unknown' ? 'Unknown Person' : 'Processing...'}
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {face.message || 'Hold position for recognition'}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {face.confidence && !face.isScanning && (
                                <div className={`text-lg font-bold ${
                                  face.confidence >= recognitionThreshold 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-500 dark:text-red-400'
                                }`}>
                                  {face.confidence.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            
                            {face.isScanning && (
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBox>
            </div>

            {/* Control Panel */}
            <div className="space-y-6">
              

              {/* Student Information */}
              <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Icon path={mdiInformation} className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Statistics</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current enrollment status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Students</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{students.length}</span>
                    </div>
                    
                    {selectedShift && (
                      <>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedShift === 'All' ? 'All Shifts Students' : `${selectedShift} Shift Students`}
                            </span>
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {filterStudentsByShift(students, selectedShift).length}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Faces Tracked</span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{trackedFaces.length}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Currently Scanning</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {trackedFaces.filter(f => f.isScanning).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Auto-Retry System</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {failedAttendanceRetryManager.getFailedRecordsCount() > 0 ? 'Active' : 'Monitoring'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Failed Records</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {failedAttendanceRetryManager.getFailedRecordsCount()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBox>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Failed Attendance Manager */}
      <FailedAttendanceManager 
        onRetryAttendance={(studentId, studentName) => {
          toast.info(`Please position ${studentName} in front of the camera to retry attendance marking`);
        }}
      />
    </>
  );
};

export default function FaceApiAttendancePage() {
  return (
    <>
      <Head>
        <title>{getPageTitle('Face-API Attendance')}</title>
      </Head>
      <FaceApiAttendanceScanner />
    </>
  );
}