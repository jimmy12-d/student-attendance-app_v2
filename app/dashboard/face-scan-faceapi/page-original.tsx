"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase-config';

import { mdiFaceRecognition, mdiCamera, mdiCameraOff, mdiCheck, mdiAlert, mdiEye, mdiCog, mdiInformation, mdiClock, mdiFullscreen, mdiClose } from '@mdi/js';
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import CustomDropdown from '../students/components/CustomDropdown';
import Icon from '../../_components/Icon';

// Import utilities
import { Student } from '../../_interfaces';
import { filterStudentsByShift, markAttendance } from '../_lib/attendanceLogic';
import { TrackedFace, initializeFaceApi, detectAllFaces, calculateFaceDistance } from './utils/faceDetection';

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
  
  const [recognitionThreshold, setRecognitionThreshold] = useState(60); // Default 60%
  const [showRecognitionControls, setShowRecognitionControls] = useState(false); // Collapsible Recognition Controls
  const [minFaceSize, setMinFaceSize] = useState(100); // Minimum face width/height in pixels - default to 100
  const [maxFaceSize, setMaxFaceSize] = useState(300); // Maximum face width/height in pixels - default to 300
  const [selectedShift, setSelectedShift] = useState<string>(''); // Selected shift/session
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

  const DWELL_TIME_BEFORE_RECOGNIZE = 1500; // 1.5 seconds
  const RECOGNITION_COOLDOWN = 30000; // 30 seconds (was 1 millisecond!)
  const DETECTION_INTERVAL = 1000; // 1 second

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
        console.log('📡 Students updated via real-time listener:', studentsData.length);
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
    const eveningStart = 15 * 60; // 3:00 PM (900 minutes)

    let autoShift = '';
    if (currentTimeInMinutes >= morningStart && currentTimeInMinutes < morningEnd) {
      autoShift = 'Morning';
    } else if (currentTimeInMinutes >= afternoonStart && currentTimeInMinutes < afternoonEnd) {
      autoShift = 'Afternoon';
    } else {
      autoShift = 'Evening';
    }
    console.log(`🕐 Current time ${currentTimeInMinutes} minutes falls in: ${autoShift} shift`);
    setSelectedShift(autoShift);
  }, []);

  // Clear all localStorage for debugging
  const clearAllSettings = () => {
    localStorage.removeItem('faceapi-min-face-size');
    localStorage.removeItem('faceapi-max-face-size');
    localStorage.removeItem('faceapi-recognition-threshold');
    localStorage.removeItem('faceapi-selected-shift');
    console.log('🧹 All face-api localStorage cleared');
    autoSelectShift(); // Re-auto-select after clearing
  };

  // Load available cameras
  const loadCameras = useCallback(async () => {
    try {
      setLoadingMessage('Loading available cameras...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const cameraOptions = videoDevices.map((device, index) => ({
        value: device.deviceId,
        label: device.label || `Camera ${index + 1}`
      }));

      setAvailableCameras(cameraOptions);
      
      // Auto-select first camera if none selected
      if (cameraOptions.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraOptions[0].value);
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
      toast.error('Failed to load available cameras');
    }
  }, [selectedCamera]);

  // Initialize everything
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

  // Load saved face size settings from localStorage
  useEffect(() => {
    const savedMinFaceSize = localStorage.getItem('faceapi-min-face-size');
    const savedMaxFaceSize = localStorage.getItem('faceapi-max-face-size');
    const savedRecognitionThreshold = localStorage.getItem('faceapi-recognition-threshold');
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
    // Auto-select shift based on current time when component loads
    autoSelectShift();
  }, [autoSelectShift]);

  // Save face size settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('faceapi-min-face-size', minFaceSize.toString());
  }, [minFaceSize]);

  useEffect(() => {
    localStorage.setItem('faceapi-max-face-size', maxFaceSize.toString());
  }, [maxFaceSize]);

  useEffect(() => {
    localStorage.setItem('faceapi-recognition-threshold', recognitionThreshold.toString());
  }, [recognitionThreshold]);

  useEffect(() => {
    if (selectedShift) {
      localStorage.setItem('faceapi-selected-shift', selectedShift);
    }
  }, [selectedShift]);

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

  // Handle zoom mode toggle
  const toggleZoomMode = () => {
    if (!isCameraActive) {
      toast.error('Please start the camera first');
      return;
    }
    
    const newZoomMode = !isZoomMode;
    setIsZoomMode(newZoomMode);
    
    if (newZoomMode) {
      toast.success('Zoom mode activated - Press ESC to exit');
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    } else {
      toast.info('Zoom mode deactivated');
      // Restore body scrolling
      document.body.style.overflow = 'unset';
    }
  };

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

  // Face detection and recognition
  const detectFaces = useCallback(async () => {
    if (!webcamRef.current?.video || !isCameraActive) return; // Removed global scan lock check
    
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    try {
      const detections = await detectAllFaces(video);

      if (detections.length === 0) {
        setTrackedFaces([]);
        return;
      }

      // Filter detections by face size (distance approximation)
      const filteredDetections = detections.filter(detection => {
        const { width, height } = detection.detection.box;
        const faceSize = Math.max(width, height);
        return faceSize >= minFaceSize && faceSize <= maxFaceSize;
      });

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
                  console.log(`⏰ Face scan cooldown active for ${bestMatch.student.fullName} (${Math.round((RECOGNITION_COOLDOWN - (now - lastMarked)) / 1000)}s remaining)`);
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
                console.log('🔥 Dispatching faceDetected event for:', bestMatch.student.fullName);
                window.dispatchEvent(new CustomEvent('faceDetected', {
                  detail: {
                    studentId: bestMatch.student.id,
                    studentName: bestMatch.student.fullName,
                    confidence: finalConfidence,
                    timestamp: new Date()
                  }
                }));
                
                // Play success sound immediately
                playSuccessSound();
                
                // Mark attendance for the recognized student (async)
                markAttendance(bestMatch.student, selectedShift || '', classConfigs || {}, playSuccessSound)
                  .then(attendanceStatus => {
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
                              message: `Attendance marked: ${bestMatch.student.fullName}`,
                              isScanning: false // Stop scanning animation
                            } 
                          : f
                      )
                    );
                    
                    // Wait 2 seconds before removing this face
                    setTimeout(() => {
                      setTrackedFaces(prevFaces => 
                        prevFaces.filter(f => f.id !== face.id) // Remove this face after processing
                      );
                    }, 2000);
                  })
                  .catch(error => {
                    console.error('Attendance marking failed:', error);
                    // Release scan lock even if attendance marking fails
                    setTimeout(() => {
                      setTrackedFaces(prevFaces => 
                        prevFaces.map(f => 
                          f.id === face.id 
                            ? { ...f, isScanning: false, scanMessage: '', status: 'unknown' as const, message: 'Attendance failed' }
                            : f
                        )
                      );
                    }, 1000);
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

  // Start detection loop
  const startDetection = useCallback(() => {
    if (isDetectingRef.current) return;
    
    isDetectingRef.current = true;
    
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
      
      // Clean up old entries from recently marked students (every 10 detection cycles)
      if (Math.random() < 0.1) { // 10% chance each cycle
        const now = Date.now();
        const cutoffTime = now - RECOGNITION_COOLDOWN;
        for (const [key, timestamp] of recentlyMarkedStudents.current.entries()) {
          if (timestamp < cutoffTime) {
            recentlyMarkedStudents.current.delete(key);
          }
        }
      }
    }, DETECTION_INTERVAL);
  }, [detectFaces]);

  // Stop detection
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
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
      {/* Zoom Mode Overlay */}
      {isZoomMode && (
        <div className="fixed inset-0 z-[9999] bg-black">
          {/* Exit Button */}
          <button
            onClick={() => {
              setIsZoomMode(false);
              stopCamera();
            }}
            className="absolute top-6 right-6 z-[10000] p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
            title="Stop Scanning (ESC)"
          >
            <Icon path={mdiClose} className="w-6 h-6" />
          </button>

          {/* Dynamic Instructions */}
          <div className="absolute top-6 left-6 z-[10000] bg-black/70 backdrop-blur-sm rounded-xl p-4 max-w-md">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2 flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Zoom Mode Active</span>
              </h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center space-x-2">
                  <Icon path={mdiEye} className="w-4 h-4 text-blue-400" />
                  <span>Look directly at the camera</span>
                </p>
                <p className="flex items-center space-x-2">
                  <Icon path={mdiFaceRecognition} className="w-4 h-4 text-green-400" />
                  <span>Position your face in the center</span>
                </p>
                <p className="flex items-center space-x-2">
                  <Icon path={mdiClock} className="w-4 h-4 text-yellow-400" />
                  <span>Hold position for 2 seconds</span>
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Student Recognition Display */}
          {trackedFaces.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 z-[10000]">
              <div className="grid grid-cols-1 gap-3">
                {/* Minimal Sophisticated Student Recognition Cards */}
                {trackedFaces.map(face => (
                  <div key={face.id} className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-700 ease-out transform hover:scale-[1.01] ${
                    face.isScanning
                      ? face.attendanceStatus === 'late'
                        ? 'bg-gradient-to-r from-amber-900/80 via-yellow-900/60 to-amber-900/80 border-amber-400/30 shadow-2xl shadow-amber-500/10'
                        : 'bg-gradient-to-r from-slate-900/80 via-blue-900/60 to-slate-900/80 border-blue-400/30 shadow-2xl shadow-blue-500/10'
                      : face.attendanceStatus === 'late'
                      ? 'bg-gradient-to-r from-yellow-900/90 via-amber-900/70 to-yellow-900/90 border-yellow-400/40 shadow-2xl shadow-yellow-500/15'
                      : face.name
                      ? 'bg-gradient-to-r from-green-900/90 via-emerald-900/70 to-green-900/90 border-green-400/40 shadow-2xl shadow-green-500/15'
                      : 'bg-gradient-to-r from-slate-900/80 via-gray-900/60 to-slate-900/80 border-gray-400/30 shadow-2xl shadow-gray-500/10'
                  }`}>
                    {/* Subtle animated background */}
                    <div className="absolute inset-0 opacity-5">
                      <div className={`absolute inset-0 ${
                        face.isScanning 
                          ? face.attendanceStatus === 'late'
                            ? 'bg-gradient-to-r from-amber-500/20 to-transparent animate-pulse'
                            : 'bg-gradient-to-r from-blue-500/20 to-transparent animate-pulse'
                          : face.attendanceStatus === 'late' ? 'bg-gradient-to-r from-amber-500/20 to-transparent' :
                        face.name ? 'bg-gradient-to-r from-emerald-500/20 to-transparent' : 'bg-gradient-to-r from-gray-500/20 to-transparent'
                      }`}></div>
                    </div>

                    <div className="relative p-6">
                      <div className="flex items-center justify-between">
                        {/* Minimal Student Info */}
                        <div className="flex-1 space-y-3">
                          {face.name ? (
                            <>
                              {/* Elegant Name Display */}
                              <div className="flex items-center space-x-4">
                                <div className={`text-7xl font-light tracking-tight ${
                                  face.attendanceStatus === 'late' ? 'text-amber-200' : 'text-emerald-200'
                                }`}>
                                  {face.name}
                                </div>
                                {/* Minimal Status Indicator */}
                                <div className={`px-3 py-1 rounded-full text-xs font-medium tracking-wider ${
                                  face.isScanning
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                                    : face.attendanceStatus === 'late'
                                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                                    : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                                }`}>
                                  {face.isScanning ? '•' : face.attendanceStatus === 'late' ? 'LATE' : '✓'}
                                </div>
                              </div>

                              {/* Clean Status Line */}
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  face.isScanning 
                                    ? face.attendanceStatus === 'late' 
                                      ? 'bg-amber-400 animate-pulse' 
                                      : 'bg-blue-400 animate-pulse'
                                    : face.attendanceStatus === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}></div>
                                <span className="text-2xl font-light text-gray-200 tracking-wide">
                                  {face.isScanning 
                                    ? face.attendanceStatus === 'late' 
                                      ? 'LATE' 
                                      : 'PROCESSING'
                                    : face.attendanceStatus === 'late' ? 'LATE ARRIVAL' : 'PRESENT'}
                                </span>
                              </div>

                              {/* Minimal Time & Confidence */}
                              <div className="flex items-center space-x-6 pt-2">
                                <div className="text-lg font-mono text-gray-400 tracking-wider">
                                  {new Date().toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  })}
                                </div>
                                {face.confidence && (
                                  <div className={`text-sm font-medium px-2 py-1 rounded-md ${
                                    face.confidence >= recognitionThreshold
                                      ? 'bg-emerald-500/10 text-emerald-300'
                                      : 'bg-red-500/10 text-red-300'
                                  }`}>
                                    {face.confidence.toFixed(0)}%
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Minimal Unknown State */}
                              <div className="flex items-center space-x-4">
                                <div className="text-5xl font-light text-gray-400 tracking-tight">
                                  {face.status === 'detecting' ? 'DETECTING' :
                                   face.status === 'recognizing' ? 'RECOGNIZING' :
                                   face.status === 'unknown' ? 'UNKNOWN' : 'PROCESSING'}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                              <div className="text-lg text-gray-500 font-light tracking-wide">
                                {face.message || 'Position face in frame'}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Sophisticated Status Orb */}
                        <div className="flex flex-col items-center space-y-3 ml-8">
                          <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                            face.status === 'scanning'
                              ? 'bg-blue-500/20 border-blue-400/60 shadow-lg shadow-blue-500/20'
                              : face.status === 'recognized'
                              ? face.attendanceStatus === 'late'
                                ? 'bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/20'
                                : 'bg-emerald-500/20 border-emerald-400/60 shadow-lg shadow-emerald-500/20'
                              : face.status === 'recognizing'
                              ? 'bg-blue-500/20 border-blue-400/60 shadow-lg shadow-blue-500/20 animate-pulse'
                              : face.status === 'unknown'
                              ? 'bg-red-500/20 border-red-400/60 shadow-lg shadow-red-500/20'
                              : 'bg-gray-500/20 border-gray-400/60 shadow-lg shadow-gray-500/20'
                          }`}>
                            <div className="w-6 h-6 bg-white/90 rounded-full"></div>
                            {/* Subtle pulsing ring */}
                            <div className={`absolute inset-0 rounded-full border border-white/20 ${
                              face.status === 'scanning' ? 'animate-ping' :
                              face.status === 'recognizing' ? 'animate-ping' :
                              'opacity-0'
                            }`}></div>
                          </div>

                          {/* Minimal status text */}
                          <div className="text-center">
                            <div className={`font-medium uppercase tracking-widest ${
                              face.status === 'scanning' ? 'text-base text-blue-300' :
                              face.status === 'recognized' 
                                ? face.attendanceStatus === 'late' 
                                  ? 'text-2xl text-amber-300' 
                                  : 'text-2xl text-emerald-300'
                                : face.status === 'recognizing' ? 'text-base text-blue-300' :
                              face.status === 'unknown' ? 'text-base text-red-300' : 'text-base text-gray-300'
                            }`}>
                              {face.status === 'scanning' ? 'Active' :
                               face.status === 'recognized' 
                                 ? face.attendanceStatus === 'late' 
                                   ? 'Late Arrival' 
                                   : 'Present'
                                 : face.status === 'recognizing' ? 'Scan' :
                               face.status === 'unknown' ? 'Error' : 'Wait'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Minimal Progress Bar */}
                      {face.isScanning && (
                        <div className="mt-6">
                          <div className="w-full bg-gray-700/30 rounded-full h-1 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full animate-pulse"
                                 style={{width: '100%'}}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Overlay for Camera Initialization */}
          {isCameraLoading && (
            <div className="absolute inset-0 z-[10001] bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-900 flex items-center justify-center">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
              </div>
              
              {/* Subtle Grid Pattern */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                backgroundSize: '20px 20px'
              }}></div>
              
              <div className="relative text-center text-white max-w-md mx-auto px-8">
                <div className="relative mx-auto mb-8">
                  {/* Enhanced Animated Camera Icon */}
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    {/* Outer spinning ring */}
                    <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-400 border-r-indigo-400 rounded-full animate-spin"></div>
                    {/* Inner pulsing ring */}
                    <div className="absolute inset-3 border-2 border-indigo-400/40 border-b-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '3s'}}></div>
                    {/* Camera icon with glow */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full backdrop-blur-sm">
                        <Icon path={mdiCamera} className="w-12 h-12 text-blue-300 drop-shadow-lg animate-pulse" />
                      </div>
                    </div>
                    {/* Orbiting dots */}
                    <div className="absolute inset-0">
                      <div className="w-3 h-3 bg-blue-400 rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2 animate-ping"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full absolute top-1/2 -right-1 transform -translate-y-1/2 animate-ping" style={{animationDelay: '0.5s'}}></div>
                      <div className="w-3 h-3 bg-purple-400 rounded-full absolute -bottom-1 left-1/2 transform -translate-x-1/2 animate-ping" style={{animationDelay: '1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full absolute top-1/2 -left-1 transform -translate-y-1/2 animate-ping" style={{animationDelay: '1.5s'}}></div>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
                  Starting Camera
                </h2>
                <p className="text-xl text-blue-100 mb-8 drop-shadow-md">Initializing face recognition system...</p>
                
                {/* Enhanced Loading Animation */}
                <div className="flex justify-center space-x-3 mb-8">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce drop-shadow-lg"></div>
                  <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full animate-bounce drop-shadow-lg" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full animate-bounce drop-shadow-lg" style={{animationDelay: '0.2s'}}></div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="w-80 mx-auto bg-slate-800/60 backdrop-blur-sm rounded-full h-3 overflow-hidden border border-blue-500/20 shadow-lg">
                  <div className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 h-full rounded-full animate-pulse shadow-lg shadow-blue-500/20"
                       style={{
                         background: 'linear-gradient(90deg, #60a5fa, #6366f1, #8b5cf6)',
                         animation: 'pulse 2s ease-in-out infinite'
                       }}>
                  </div>
                </div>
                
                {/* Status Text */}
                <p className="text-sm text-blue-200/80 mt-6 font-medium tracking-wide">
                  Please allow camera access when prompted
                </p>
              </div>
            </div>
          )}

          {/* Full Screen Camera */}
          <div className="w-full h-full relative">
            {isCameraActive ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ 
                  facingMode: 'user',
                  deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
                style={{ transform: "scaleX(-1)" }}
                onUserMedia={() => {
                  // Camera stream is ready
                  console.log('Camera stream ready');
                  setIsCameraLoading(false);
                }}
                onUserMediaError={(error) => {
                  console.error('Camera error:', error);
                  toast.error('Failed to access camera. Please check permissions.');
                  setIsCameraActive(false);
                  setIsCameraLoading(false);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Icon path={mdiCameraOff} className="w-24 h-24 mx-auto mb-4 text-gray-400" />
                  <p className="text-2xl font-medium">Camera is off</p>
                  <p className="text-gray-400 text-lg mt-2">Start scan to use zoom mode</p>
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            />
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
                  <Icon path={mdiClock} className="w-4 h-4 text-blue-500" />
                  <span>Select Shift/Session</span>
                </h3>
                <button
                  onClick={autoSelectShift}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Auto-select shift based on current time"
                >
                  Auto
                </button>
              </div>
              
              <CustomDropdown
                id="shift-selection-header"
                label=""
                value={selectedShift}
                onChange={setSelectedShift}
                options={availableShifts}
                placeholder="Choose shift/session..."
                searchable={false}
                className="w-full"
              />
              

              {!selectedShift && (
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/30 rounded text-center">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    ⚠️ Please select a shift before starting camera
                  </p>
                </div>
              )}
            </div>
          </div>
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
          <div className="mb-6">
            <CardBox className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Icon path={mdiCog} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Recognition Controls
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {showRecognitionControls 
                        ? 'Fine-tune detection parameters' 
                        : `Current threshold: ${recognitionThreshold}% • Face size: ${minFaceSize}-${maxFaceSize}px`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!showRecognitionControls && (
                    <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold">
                      {recognitionThreshold}%
                    </div>
                  )}
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                    AI Powered
                  </div>
                  <button
                    onClick={() => setShowRecognitionControls(!showRecognitionControls)}
                    className="px-4 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {showRecognitionControls ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              
              {showRecognitionControls && (
                <div className="space-y-6">
                  {/* Recognition Threshold */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-lg font-semibold text-gray-800 dark:text-white">
                        Recognition Threshold
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold">
                          {recognitionThreshold}%
                        </div>
                        <button
                          onClick={() => setRecognitionThreshold(60)}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          title="Reset to default (60%)"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Lenient (50%)</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="70"
                        step="5"
                        value={recognitionThreshold}
                        onChange={(e) => setRecognitionThreshold(Number(e.target.value))}
                        className="flex-1 h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 dark:from-green-800 dark:via-yellow-800 dark:to-red-800 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, 
                            #86efac 0%, 
                            #fcd34d ${((recognitionThreshold - 50) / 20) * 50}%, 
                            #fca5a5 ${((recognitionThreshold - 50) / 20) * 100}%)`
                        }}
                      />
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Strict (70%)</span>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">50%</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Lenient</div>
                        <div className="text-xs text-gray-500 mt-1">Fast recognition</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">60%</div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">Recommended</div>
                        <div className="text-xs text-gray-500 mt-1">Balanced</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">70%</div>
                        <div className="text-xs text-red-600 dark:text-red-400">Strict</div>
                        <div className="text-xs text-gray-500 mt-1">High accuracy</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Current Setting:</strong> {recognitionThreshold}% confidence required for recognition
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        🔍 <strong>Debug:</strong> Recognition threshold = {recognitionThreshold}% (faces must score ≥{recognitionThreshold}% to be recognized)
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {recognitionThreshold >= 70 ? '🛡️ Strict mode - highest accuracy' :
                         recognitionThreshold >= 60 ? '⚖️ Balanced mode - recommended for most use cases' :
                         '🚀 Lenient mode - faster recognition'}
                      </p>
                    </div>
                  </div>

                  {/* Face Size Range */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-lg font-semibold text-gray-800 dark:text-white">
                        Distance Control
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-bold">
                          {minFaceSize}px - {maxFaceSize}px
                        </div>
                        <button
                          onClick={() => {
                            setMinFaceSize(100);
                            setMaxFaceSize(300);
                          }}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          title="Reset to default"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Size (Far Distance)</label>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{minFaceSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="140"
                          step="10"
                          value={minFaceSize}
                          onChange={(e) => setMinFaceSize(Number(e.target.value))}
                          className="w-full h-2 bg-gradient-to-r from-blue-200 to-blue-500 dark:from-blue-800 dark:to-blue-500 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50px (Very Far)</span>
                          <span>140px (Close)</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Size (Near Distance)</label>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{maxFaceSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="150"
                          max="400"
                          step="10"
                          value={maxFaceSize}
                          onChange={(e) => setMaxFaceSize(Number(e.target.value))}
                          className="w-full h-2 bg-gradient-to-r from-orange-200 to-red-500 dark:from-orange-800 dark:to-red-500 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>150px (Far)</span>
                          <span>400px (Very Close)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        <strong>💡 Distance Guide:</strong> Smaller values = farther distance, larger values = closer distance
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Optimal range: 2-4 feet from camera for best recognition results
                      </p>
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Performance Indicators</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Detection Rate: Active</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Model: SSD MobileNet V1</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing: Real-time</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy: High</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardBox>
          </div>
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
                        <span className="text-sm text-gray-600 dark:text-gray-400">Recognition Mode</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedShift ? `${selectedShift} Only` : 'All Students'}
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
