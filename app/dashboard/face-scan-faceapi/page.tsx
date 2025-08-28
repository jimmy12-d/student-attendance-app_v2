"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase-config';

import { mdiFaceRecognition, mdiCamera, mdiCameraOff, mdiCheck, mdiAlert, mdiEye, mdiCog, mdiInformation, mdiClock } from '@mdi/js';
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import CustomDropdown from '../students/components/CustomDropdown';
import Icon from '../../_components/Icon';

// Import utilities
import { Student, filterStudentsByShift, markAttendance } from './utils/attendanceLogic';
import { TrackedFace, initializeFaceApi, detectAllFaces, calculateFaceDistance } from './utils/faceDetection';

const FaceApiAttendanceScanner = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  
  const [recognitionThreshold, setRecognitionThreshold] = useState(60); // Default 60%
  const [showRecognitionControls, setShowRecognitionControls] = useState(false); // Collapsible Recognition Controls
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
    const audio = new Audio('/success_sound_2.mp3');
    audio.preload = 'auto';
    audio.volume = 0.8;
    audioRef.current = audio;
    
    // Test if audio can be played
    const testAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          console.log('✅ Audio test successful');
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(e => {
          console.log('❌ Audio test failed:', e.message);
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
      console.log('🔊 Playing success sound for student recognition');
      // Reset audio to beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.error("❌ Error playing sound:", e);
        // Fallback: try to create a new audio instance
        try {
          const fallbackAudio = new Audio('/success_sound_2.mp3');
          fallbackAudio.volume = 0.8;
          fallbackAudio.play();
        } catch (fallbackError) {
          console.error("❌ Fallback audio also failed:", fallbackError);
        }
      });
    } else {
      console.warn('⚠️ Audio reference not available');
    }
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
              const requiredConfidence = recognitionThreshold;
              
              console.log(`🔍 Recognition Debug for ${student.fullName}:`);
              console.log(`   - Distance: ${distance.toFixed(4)}`);
              console.log(`   - Confidence: ${confidence.toFixed(2)}%`);
              console.log(`   - Required: ${requiredConfidence}%`);
              console.log(`   - Pass: ${confidence >= requiredConfidence ? 'YES' : 'NO'}`);
              
              // Check if confidence meets the threshold
              if (confidence >= requiredConfidence && (!bestMatch || distance < bestMatch.distance)) {
                console.log(`✅ VALID MATCH: ${student.fullName} - ${confidence.toFixed(1)}% confidence (≥${requiredConfidence}%)`);
                bestMatch = { student, distance };
              } else if (confidence < requiredConfidence) {
                console.log(`❌ BELOW THRESHOLD: ${student.fullName} - ${confidence.toFixed(1)}% confidence (<${requiredConfidence}%)`);
              }
            }

            if (bestMatch) {
              const finalConfidence = (1 - bestMatch.distance) * 100;
              const requiredConfidence = recognitionThreshold;
              console.log(`🎯 FINAL RECOGNITION CHECK:`);
              console.log(`   - Student: ${bestMatch.student.fullName}`);
              console.log(`   - Final Confidence: ${finalConfidence.toFixed(2)}%`);
              console.log(`   - Required Threshold: ${requiredConfidence}%`);
              console.log(`   - Decision: ${finalConfidence >= requiredConfidence ? 'RECOGNIZE' : 'REJECT'}`);
              
              // Double-check confidence threshold before marking attendance
              if (finalConfidence >= requiredConfidence) {
                // Play success sound immediately
                playSuccessSound();
                
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
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Advanced facial recognition using SSD MobileNet V1 model with automatic photo enrollment capabilities
          </p>
        </div>

        {/* Status Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              
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
                            setMinFaceSize(80);
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
                    
                    {/* test sound removed */}
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
                                  face.confidence >= recognitionThreshold 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-500 dark:text-red-400'
                                }`}>
                                  ({face.confidence.toFixed(1)}% / {recognitionThreshold.toFixed(0)}% req)
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
