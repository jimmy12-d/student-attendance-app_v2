"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase-config';

import { mdiFaceRecognition, mdiCamera, mdiCameraOff, mdiAccount, mdiCheck, mdiAlert, mdiEye, mdiCog, mdiInformation, mdiClock } from '@mdi/js';
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import LoadingSpinner from '../../_components/LoadingSpinner';
import CustomDropdown from '../students/components/CustomDropdown';
import Icon from '../../_components/Icon';

// Import utilities
import { analyzeImageQuality, convertGoogleDriveUrl } from './utils/imageQualityAnalysis';
import { Student, filterStudentsByShift, markAttendance } from './utils/attendanceLogic';
import { TrackedFace, initializeFaceApi, generateFaceDescriptor, detectFaces, detectAllFaces, calculateFaceDistance } from './utils/faceDetection';

const FaceApiAttendanceScanner = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [showEnrollment, setShowEnrollment] = useState(false);
  
  // New photo capture enrollment states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedStudentForPhoto, setSelectedStudentForPhoto] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  
  const [recognitionThreshold, setRecognitionThreshold] = useState(0.6); // Default 60%
  const [minFaceSize, setMinFaceSize] = useState(80); // Minimum face width/height in pixels
  const [maxFaceSize, setMaxFaceSize] = useState(300); // Maximum face width/height in pixels
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

  const DWELL_TIME_BEFORE_RECOGNIZE = 2000; // 2 seconds
  const RECOGNITION_COOLDOWN = 30000; // 30 seconds
  const DETECTION_INTERVAL = 1000; // 1 second
  
  // Use the configurable threshold
  const RECOGNITION_THRESHOLD = recognitionThreshold;

  const enrolledStudents = students.filter(s => s.faceDescriptor);
  const unenrolledStudents = students.filter(s => !s.faceDescriptor);

  // Load students from Firestore
  const loadStudents = useCallback(async () => {
    try {
      setLoadingMessage('Loading students...');
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      
      const studentsData: Student[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          studentId: data.studentId || '',
          fullName: data.fullName || '',
          photoUrl: data.photoUrl,
          faceDescriptor: data.faceDescriptor,
          // Only include shift data
          shift: data.shift
        } as any);
      });
      
      setStudents(studentsData);
      console.log(`Loaded ${studentsData.length} students`);
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
      console.log('Loaded class configurations:', configs);
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

    // Define typical shift time ranges (you can adjust these)
    const morningStart = 6 * 60; // 6:00 AM
    const morningEnd = 11 * 60; // 11:00 AM
    const afternoonEnd = 16 * 60; // 4:00 PM

    let autoShift = '';
    if (currentTimeInMinutes >= morningStart && currentTimeInMinutes < morningEnd) {
      autoShift = 'Morning';
    } else if (currentTimeInMinutes >= morningEnd && currentTimeInMinutes < afternoonEnd) {
      autoShift = 'Afternoon';
    } else {
      autoShift = 'Evening';
    }

    setSelectedShift(autoShift);
    console.log(`Auto-selected shift: ${autoShift} based on current time ${now.toLocaleTimeString()}`);
  }, []);

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
          loadClassConfigs()
        ]);
        
        // Auto-select shift after loading configs
        autoSelectShift();
      }
      setIsLoading(false);
    };

    initialize();
  }, [loadStudents, loadClassConfigs, autoSelectShift]);

  // Initialize success sound
  useEffect(() => {
    audioRef.current = new Audio('/success_sound_2.mp3');
  }, []);

  const playSuccessSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  // Enroll student with face descriptor
  const handleEnrollment = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    setIsEnrolling(true);
    
    try {
      const student = students.find(s => s.id === selectedStudent);
      if (!student) {
        throw new Error('Selected student not found');
      }

      if (student.photoUrl) {
        // Convert Google Drive URL to proper format
        const convertedPhotoUrl = convertGoogleDriveUrl(student.photoUrl);
        
        // Use existing photo URL
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            // First, analyze image quality
            const qualityAnalysis = await analyzeImageQuality(img);
            
            if (!qualityAnalysis.pass) {
              throw new Error(`Image quality check failed: ${qualityAnalysis.reason}`);
            }
            
            // Show quality score if there are minor issues
            if (qualityAnalysis.reason && qualityAnalysis.score < 90) {
              toast.warning(`Image quality: ${qualityAnalysis.score}% - ${qualityAnalysis.reason}`, {
                duration: 5000
              });
            }

            const descriptor = await generateFaceDescriptor(img);
            if (!descriptor) {
              throw new Error('Could not generate face descriptor from photo');
            }

            // Store descriptor AND corrected photoUrl in Firestore
            const studentRef = doc(db, 'students', student.id);
            const updateData: any = {
              faceDescriptor: Array.from(descriptor),
              faceApiEnrolledAt: new Date(),
              imageQualityScore: qualityAnalysis.score
            };
            
            // Update photoUrl if it was converted
            if (convertedPhotoUrl !== student.photoUrl) {
              updateData.photoUrl = convertedPhotoUrl;
              console.log(`📝 Updated photoUrl for ${student.fullName}`);
            }
            
            await updateDoc(studentRef, updateData);

            // Update local state with both descriptor and corrected photoUrl
            setStudents(prev => prev.map(s => 
              s.id === student.id 
                ? { 
                    ...s, 
                    faceDescriptor: Array.from(descriptor),
                    photoUrl: convertedPhotoUrl
                  }
                : s
            ));

            toast.success(`${student.fullName} enrolled successfully (Quality: ${qualityAnalysis.score}%)`);
            setSelectedStudent('');
            setShowEnrollment(false);
          } catch (error: any) {
            console.error('Enrollment error:', error);
            
            // Provide specific error messages for common issues
            let errorMessage = 'Failed to enroll student';
            if (error.message?.includes('CORS')) {
              errorMessage = 'Image access blocked. Please ensure the photo is publicly accessible.';
            } else if (error.message?.includes('fetch')) {
              errorMessage = 'Failed to load image. Please check the photo URL.';
            } else if (error.message?.includes('face')) {
              errorMessage = 'Could not detect a clear face in the photo. Please use a different image.';
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            toast.error(errorMessage);
          } finally {
            setIsEnrolling(false);
          }
        };

        img.onerror = () => {
          toast.error('Failed to load student photo');
          setIsEnrolling(false);
        };

        // Use image proxy for Google Drive URLs to avoid CORS issues
        let imageUrl = convertedPhotoUrl;
        if (imageUrl.includes('drive.google.com')) {
          imageUrl = `/api/image-proxy?url=${encodeURIComponent(convertedPhotoUrl)}`;
        }

        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
      } else {
        // Capture from webcam
        if (!webcamRef.current) {
          throw new Error('Camera not available');
        }

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          throw new Error('Failed to capture image');
        }

        const img = new Image();
        img.onload = async () => {
          try {
            // Analyze image quality for webcam capture
            const qualityAnalysis = await analyzeImageQuality(img);
            
            if (!qualityAnalysis.pass) {
              throw new Error(`Image quality check failed: ${qualityAnalysis.reason}`);
            }

            const descriptor = await generateFaceDescriptor(img);
            if (!descriptor) {
              throw new Error('Could not detect face in captured image');
            }

            // Store descriptor in Firestore
            const studentRef = doc(db, 'students', student.id);
            await updateDoc(studentRef, {
              faceDescriptor: Array.from(descriptor),
              faceApiEnrolledAt: new Date(),
              imageQualityScore: qualityAnalysis.score,
              enrollmentMethod: 'webcam'
            });

            // Update local state
            setStudents(prev => prev.map(s => 
              s.id === student.id 
                ? { ...s, faceDescriptor: Array.from(descriptor) }
                : s
            ));

            toast.success(`${student.fullName} enrolled successfully using camera (Quality: ${qualityAnalysis.score}%)`);
            setSelectedStudent('');
            setShowEnrollment(false);
          } catch (error: any) {
            console.error('Enrollment error:', error);
            toast.error(error.message || 'Failed to enroll student');
          } finally {
            setIsEnrolling(false);
          }
        };

        img.src = imageSrc;
      }
    } catch (error: any) {
      console.error('Enrollment failed:', error);
      toast.error(error.message || 'Enrollment failed');
      setIsEnrolling(false);
    }
  };

  // Start photo capture enrollment
  const startPhotoCapture = () => {
    if (!selectedStudentForPhoto) {
      toast.error('Please select a student first');
      return;
    }

    setShowPhotoCapture(true);
    setCapturedPhoto(null);
    
    // Start camera if not already active
    if (!isCameraActive) {
      setIsCameraActive(true);
    }
  };

  // Capture photo for enrollment
  const capturePhotoForEnrollment = () => {
    if (!webcamRef.current) {
      toast.error('Camera not available');
      return;
    }

    try {
      setIsCapturingPhoto(true);
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        toast.error('Failed to capture photo');
        return;
      }

      setCapturedPhoto(imageSrc);
      toast.success('Photo captured! Review and confirm to enroll.');
    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  // Confirm photo and enroll student
  const confirmPhotoEnrollment = async () => {
    if (!capturedPhoto || !selectedStudentForPhoto) {
      toast.error('No photo captured or student selected');
      return;
    }

    setIsEnrolling(true);

    try {
      const student = students.find(s => s.id === selectedStudentForPhoto);
      if (!student) {
        throw new Error('Selected student not found');
      }

      const img = new Image();
      img.onload = async () => {
        try {
          // Analyze image quality
          const qualityAnalysis = await analyzeImageQuality(img);
          
          if (!qualityAnalysis.pass) {
            throw new Error(`Image quality check failed: ${qualityAnalysis.reason}`);
          }

          // Show quality score if there are minor issues
          if (qualityAnalysis.reason && qualityAnalysis.score < 90) {
            toast.warning(`Image quality: ${qualityAnalysis.score}% - ${qualityAnalysis.reason}`, {
              duration: 5000
            });
          }

          const descriptor = await generateFaceDescriptor(img);
          if (!descriptor) {
            throw new Error('Could not detect face in captured photo');
          }

          // Store descriptor in Firestore
          const studentRef = doc(db, 'students', student.id);
          await updateDoc(studentRef, {
            faceDescriptor: Array.from(descriptor),
            faceApiEnrolledAt: new Date(),
            imageQualityScore: qualityAnalysis.score,
            enrollmentMethod: 'photo_capture'
          });

          // Update local state
          setStudents(prev => prev.map(s => 
            s.id === student.id 
              ? { ...s, faceDescriptor: Array.from(descriptor) }
              : s
          ));

          toast.success(`${student.fullName} enrolled successfully using captured photo (Quality: ${qualityAnalysis.score}%)`);
          
          // Reset photo capture state
          setShowPhotoCapture(false);
          setSelectedStudentForPhoto('');
          setCapturedPhoto(null);
          
        } catch (error: any) {
          console.error('Photo enrollment error:', error);
          toast.error(error.message || 'Failed to enroll student with captured photo');
        } finally {
          setIsEnrolling(false);
        }
      };

      img.src = capturedPhoto;
    } catch (error: any) {
      console.error('Photo enrollment failed:', error);
      toast.error(error.message || 'Photo enrollment failed');
      setIsEnrolling(false);
    }
  };

  // Cancel photo capture
  const cancelPhotoCapture = () => {
    setShowPhotoCapture(false);
    setSelectedStudentForPhoto('');
    setCapturedPhoto(null);
  };

  // Face detection and recognition
  const detectFaces = useCallback(async () => {
    if (!webcamRef.current?.video || !isCameraActive) return;
    
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    try {
      const detections = await detectAllFaces(video);

      // Filter detections by face size (distance approximation)
      const filteredDetections = detections.filter(detection => {
        const { width, height } = detection.detection.box;
        const faceSize = Math.max(width, height);
        
        const isValidSize = faceSize >= minFaceSize && faceSize <= maxFaceSize;
        
        if (!isValidSize) {
          console.log(`👁️ Face filtered out: size=${faceSize.toFixed(0)}px (range: ${minFaceSize}-${maxFaceSize}px)`);
        }
        
        return isValidSize;
      });

      console.log(`📊 Face detection: ${detections.length} total, ${filteredDetections.length} within size range`);

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
            message: 'Hold position...'
          });
        }

        // Process faces for recognition
        return nextFaces.map(face => {
          // Check if face has been stable long enough
          if (now - face.firstSeen < DWELL_TIME_BEFORE_RECOGNIZE) {
            return { ...face, status: 'detecting', message: 'Hold position...' };
          }

          // Skip if already recognized recently
          if (face.status === 'recognized' && now - face.firstSeen < RECOGNITION_COOLDOWN) {
            return face;
          }

          // Perform recognition
          if (face.descriptor && face.status !== 'recognized') {
            // Filter students by shift using helper function
            const targetStudents = filterStudentsByShift(students.filter(s => s.faceDescriptor), selectedShift || 'All');

            console.log(`🔍 Recognition pool: ${targetStudents.length} students for shift "${selectedShift || 'All'}"`);

            let bestMatch: { student: Student, distance: number } | null = null;

            for (const student of targetStudents) {
              if (!student.faceDescriptor) continue;
              
              const storedDescriptor = new Float32Array(student.faceDescriptor);
              const distance = calculateFaceDistance(face.descriptor, storedDescriptor);
              const confidence = (1 - distance) * 100;
              const requiredConfidence = (1 - RECOGNITION_THRESHOLD) * 100;
              
              console.log(`Comparing with ${student.fullName}: distance=${distance.toFixed(3)}, confidence=${confidence.toFixed(1)}%, required=${requiredConfidence.toFixed(0)}%`);
              
              // Check if confidence meets the threshold
              if (confidence >= requiredConfidence && (!bestMatch || distance < bestMatch.distance)) {
                console.log(`✅ Valid match: ${student.fullName} with ${confidence.toFixed(1)}% confidence (need ${requiredConfidence.toFixed(0)}%+)`);
                bestMatch = { student, distance };
              } else if (confidence < requiredConfidence) {
                console.log(`❌ Below threshold: ${student.fullName} with ${confidence.toFixed(1)}% confidence (need ${requiredConfidence.toFixed(0)}%+)`);
              }
            }

            if (bestMatch) {
              const finalConfidence = (1 - bestMatch.distance) * 100;
              const requiredConfidence = (1 - RECOGNITION_THRESHOLD) * 100;
              console.log(`🎯 Final recognition: ${bestMatch.student.fullName} with ${finalConfidence.toFixed(1)}% confidence`);
              
              // Double-check confidence threshold before marking attendance
              if (finalConfidence >= requiredConfidence) {
                // Mark attendance for the recognized student
                markAttendance(bestMatch.student, selectedShift || '', {}, playSuccessSound);
                
                return {
                  ...face,
                  status: 'recognized',
                  name: bestMatch.student.fullName,
                  confidence: finalConfidence,
                  message: `Recognized: ${bestMatch.student.fullName} (${finalConfidence.toFixed(1)}%)`
                };
              } else {
                console.log(`⚠️ Best match still below threshold, marking as unknown`);
                return {
                  ...face,
                  status: 'unknown',
                  message: `Low confidence (${finalConfidence.toFixed(1)}% < ${requiredConfidence.toFixed(0)}%)`
                };
              }
            } else {
              console.log('❌ No valid matches found above threshold');
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
  }, [isCameraActive, students, minFaceSize, maxFaceSize]);

  // Start detection loop
  const startDetection = useCallback(() => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;
    
    detectionIntervalRef.current = setInterval(detectFaces, DETECTION_INTERVAL);
  }, [detectFaces]);

  // Stop detection
  const stopDetection = () => {
    isDetectingRef.current = false;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setTrackedFaces([]);
  };

  useEffect(() => {
    if (isCameraActive && !isLoading) {
      startDetection();
    } else {
      stopDetection();
    }
    return () => stopDetection();
  }, [isCameraActive, isLoading, startDetection]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    
    if (!canvas || !video || !isCameraActive) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

      if (!isValidDistance) {
        borderColor = '#f59e0b'; // Orange for distance issues
        if (actualFaceSize < minFaceSize) {
          label = `Too far (${actualFaceSize.toFixed(0)}px)`;
        } else {
          label = `Too close (${actualFaceSize.toFixed(0)}px)`;
        }
      } else if (face.status === 'recognizing') {
        borderColor = '#3b82f6'; // Blue
        label = 'Recognizing...';
      } else if (face.status === 'recognized') {
        borderColor = '#10b981'; // Green
        label = face.name || 'Recognized';
      } else if (face.status === 'unknown') {
        borderColor = '#ef4444'; // Red
        label = 'Unknown';
      }

      // Draw bounding box
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isValidDistance ? 3 : 2;
      ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-800 dark:via-gray-800 dark:to-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full shadow-lg">
              <Icon path={mdiFaceRecognition} className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Face-API.js Attendance System</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Advanced facial recognition using SSD MobileNet V1 model with automatic photo enrollment capabilities
          </p>
        </div>

        {/* Status Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrolled Students</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{enrolledStudents.length}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Icon path={mdiCheck} className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Enrollment</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{unenrolledStudents.length}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Icon path={mdiAlert} className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faces Tracked</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{trackedFaces.length}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Icon path={mdiEye} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {isCameraActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Icon path={isCameraActive ? mdiCamera : mdiCameraOff} className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
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

        {/* Shift Selector and Controls */}
        {!isLoading && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shift Selector */}
              <CardBox className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Select Shift/Session
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Icon path={mdiClock} className="w-6 h-6 text-blue-500" />
                    <button
                      onClick={autoSelectShift}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Auto-select shift based on current time"
                    >
                      Auto
                    </button>
                  </div>
                </div>
                
                <CustomDropdown
                  id="shift-selection"
                  label=""
                  value={selectedShift}
                  onChange={setSelectedShift}
                  options={availableShifts}
                  placeholder="Choose shift/session..."
                  searchable={false}
                  className="w-full"
                />
                
                {selectedShift && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      📍 Recognition will be limited to students in {selectedShift === 'All' ? 'all shifts' : `${selectedShift} shift only`}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {selectedShift !== 'All' ? `Auto-selected based on current time: ${new Date().toLocaleTimeString()}` : 'Manually selected: All shifts'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Students in this shift: {filterStudentsByShift(students, selectedShift).length} ({filterStudentsByShift(students, selectedShift, true).length} enrolled)
                    </p>
                  </div>
                )}
                
                {!selectedShift && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      ⚠️ Please select a shift before starting camera
                    </p>
                  </div>
                )}
              </CardBox>

              {/* Recognition Controls */}
              <CardBox className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Recognition Controls
                  </h3>
                  <Icon path={mdiCog} className="w-6 h-6 text-gray-500" />
                </div>
                
                <div className="space-y-4">
                  {/* Recognition Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recognition Threshold: {recognitionThreshold}%
                    </label>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">Strict</span>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={recognitionThreshold}
                        onChange={(e) => setRecognitionThreshold(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">Lenient</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Higher values = more accurate but may miss some valid students
                    </p>
                  </div>

                  {/* Face Size Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Face Size Range: {minFaceSize}px - {maxFaceSize}px
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Size</label>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="10"
                          value={minFaceSize}
                          onChange={(e) => setMinFaceSize(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Size</label>
                        <input
                          type="range"
                          min="150"
                          max="400"
                          step="10"
                          value={maxFaceSize}
                          onChange={(e) => setMaxFaceSize(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Adjust based on camera distance - smaller for closer, larger for farther
                    </p>
                  </div>
                </div>
              </CardBox>
            </div>
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Camera Feed</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Real-time face detection and recognition</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Only start camera if shift is selected
                        if (!selectedShift && !isCameraActive) {
                          toast.error('Please select a shift before starting camera');
                          return;
                        }
                        setIsCameraActive(!isCameraActive);
                      }}
                      disabled={!selectedShift && !isCameraActive}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md ${
                        !selectedShift && !isCameraActive
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : isCameraActive
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      }`}
                    >
                      {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden aspect-video">
                    {isCameraActive ? (
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{ facingMode: 'user' }}
                        style={{ transform: "scaleX(-1)" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Icon path={mdiCameraOff} className="w-16 h-16 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                          <p className="text-white text-lg font-medium">Camera is off</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Click "Start Camera" to begin recognition</p>
                        </div>
                      </div>
                    )}
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>

                  {/* Detection Status */}
                  {trackedFaces.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Detection Status:</h4>
                      <div className="space-y-2">
                        {trackedFaces.map(face => (
                          <div key={face.id} className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              face.status === 'recognized' ? 'bg-green-500 dark:bg-green-400' :
                              face.status === 'recognizing' ? 'bg-blue-500 dark:bg-blue-400' :
                              face.status === 'unknown' ? 'bg-red-500 dark:bg-red-400' : 'bg-gray-500 dark:bg-gray-400'
                            }`}></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {face.message || 'Detecting...'}
                              {face.confidence && (
                                <span className={`ml-2 ${
                                  face.confidence >= ((1 - recognitionThreshold) * 100) 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-500 dark:text-red-400'
                                }`}>
                                  ({face.confidence.toFixed(1)}% / {((1 - recognitionThreshold) * 100).toFixed(0)}% req)
                                </span>
                              )}
                            </span>
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
              
              {/* Enrollment Section */}
              <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Icon path={mdiAccount} className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Enrollment</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Enroll students for recognition</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEnrollment(!showEnrollment)}
                      className="px-4 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      {showEnrollment ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {showEnrollment && (
                  <div className="p-6 space-y-4">
                    <CustomDropdown
                      id="student-selection"
                      label="Select Student to Enroll"
                      value={selectedStudent}
                      onChange={setSelectedStudent}
                      options={unenrolledStudents.map(student => ({
                        value: student.id,
                        label: `${student.fullName} (${student.studentId})${student.photoUrl ? ' - Has Photo' : ' - No Photo'}`
                      }))}
                      placeholder="Choose a student..."
                      searchable={true}
                      disabled={isEnrolling}
                      className="w-full"
                    />

                    <button
                      onClick={handleEnrollment}
                      disabled={!selectedStudent || isEnrolling}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                    >
                      {isEnrolling ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Enrolling...</span>
                        </div>
                      ) : (
                        'Enroll Student'
                      )}
                    </button>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Auto-enrollment:</strong> Students with photos will be enrolled automatically. 
                        Students without photos will use the current camera view.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start space-x-2">
                        <Icon path={mdiInformation} className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Image Quality Requirements:</p>
                          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                            <li>• <strong>Face Position:</strong> Frontal view, looking directly at camera</li>
                            <li>• <strong>Expression:</strong> Neutral expression, eyes open</li>
                            <li>• <strong>Lighting:</strong> Good, even lighting without harsh shadows</li>
                            <li>• <strong>Background:</strong> Simple, uncluttered background preferred</li>
                            <li>• <strong>Obstructions:</strong> No hands, hair, or objects covering face</li>
                            <li>• <strong>Size:</strong> Face should be clearly visible and well-centered</li>
                            <li>• <strong>Focus:</strong> Image should be sharp and in focus</li>
                          </ul>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            Images will be automatically analyzed for quality before enrollment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardBox>

              {/* Photo Capture Enrollment Section */}
              <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Icon path={mdiCamera} className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Photo Capture Enrollment</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Take a fresh photo for enrollment</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPhotoCapture(!showPhotoCapture)}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                    >
                      {showPhotoCapture ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {showPhotoCapture && (
                  <div className="p-6 space-y-4">
                    
                    {!capturedPhoto ? (
                      // Step 1: Select student and capture photo
                      <>
                        <CustomDropdown
                          id="student-selection-photo"
                          label="Select Student for Photo Enrollment"
                          value={selectedStudentForPhoto}
                          onChange={setSelectedStudentForPhoto}
                          options={unenrolledStudents.map(student => ({
                            value: student.id,
                            label: `${student.fullName} (${student.studentId})`
                          }))}
                          placeholder="Choose a student..."
                          searchable={true}
                          disabled={isCapturingPhoto || isEnrolling}
                          className="w-full"
                        />

                        <div className="flex space-x-3">
                          <button
                            onClick={startPhotoCapture}
                            disabled={!selectedStudentForPhoto || isCapturingPhoto}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                          >
                            Start Camera
                          </button>
                          
                          <button
                            onClick={capturePhotoForEnrollment}
                            disabled={!selectedStudentForPhoto || !isCameraActive || isCapturingPhoto}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 dark:hover:from-green-700 dark:hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                          >
                            {isCapturingPhoto ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Capturing...</span>
                              </div>
                            ) : (
                              'Capture Photo'
                            )}
                          </button>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Instructions:</strong> 
                            <br />1. Select a student from the dropdown
                            <br />2. Position the student in front of the camera
                            <br />3. Click "Capture Photo" when ready
                            <br />4. Review and confirm the captured photo
                          </p>
                        </div>
                      </>
                    ) : (
                      // Step 2: Review captured photo and confirm enrollment
                      <>
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Review Captured Photo</h4>
                          
                          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                            <img 
                              src={capturedPhoto} 
                              alt="Captured for enrollment" 
                              className="w-full max-w-md mx-auto rounded-lg shadow-md"
                            />
                          </div>

                          <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Student: <strong>{students.find(s => s.id === selectedStudentForPhoto)?.fullName}</strong>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Review the photo quality and confirm enrollment or retake if needed.
                            </p>
                          </div>

                          <div className="flex space-x-3">
                            <button
                              onClick={cancelPhotoCapture}
                              disabled={isEnrolling}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                            >
                              Cancel
                            </button>
                            
                            <button
                              onClick={() => setCapturedPhoto(null)}
                              disabled={isEnrolling}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                            >
                              Retake Photo
                            </button>

                            <button
                              onClick={confirmPhotoEnrollment}
                              disabled={isEnrolling}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:transform-none disabled:shadow-none"
                            >
                              {isEnrolling ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Enrolling...</span>
                                </div>
                              ) : (
                                'Confirm & Enroll'
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start space-x-2">
                        <Icon path={mdiInformation} className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Photo Capture Tips:</p>
                          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                            <li>• <strong>Position:</strong> Student should face the camera directly</li>
                            <li>• <strong>Distance:</strong> Stand 2-3 feet away from the camera</li>
                            <li>• <strong>Lighting:</strong> Ensure good lighting on the face</li>
                            <li>• <strong>Expression:</strong> Neutral expression, eyes open and visible</li>
                            <li>• <strong>Background:</strong> Simple background works best</li>
                            <li>• <strong>Stability:</strong> Hold still when capturing</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardBox>

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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Enrolled</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{enrolledStudents.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{unenrolledStudents.length}</span>
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
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {selectedShift === 'All' ? 'Enrolled (All Shifts)' : `Enrolled in ${selectedShift}`}
                            </span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {filterStudentsByShift(students, selectedShift, true).length}
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

        {/* Enrolled Students Grid */}
        {!isLoading && enrolledStudents.length > 0 && (
          <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Icon path={mdiCheck} className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Enrolled Students ({enrolledStudents.length})
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Students ready for recognition</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {enrolledStudents.map(student => (
                  <div key={student.id} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 truncate">{student.fullName}</h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-2">ID: {student.studentId}</p>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {student.photoUrl ? 'Photo enrollment' : 'Camera enrollment'}
                          </span>
                        </div>
                      </div>
                      <div className="p-1 bg-green-200 dark:bg-green-800 rounded-full">
                        <Icon path={mdiCheck} className="w-4 h-4 text-green-700 dark:text-green-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBox>
        )}
      </div>
    </div>
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
