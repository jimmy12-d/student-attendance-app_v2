"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { db } from '../../../firebase-config';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { 
  initializeFaceApi, 
  generateFaceDescriptor
} from '../face-scan-faceapi/utils/faceDetection';
import { 
  analyzeImageQuality,
  convertGoogleDriveUrl 
} from '../face-scan-faceapi/utils/imageQualityAnalysis';
import { Student } from '../../_interfaces';
import CardBox from '../../_components/CardBox';
import Button from '../../_components/Button';
import Icon from '../../_components/Icon';
import CustomDropdown from '../students/components/CustomDropdown';
import { 
  mdiFaceRecognition, 
  mdiCamera, 
  mdiAccountPlus, 
  mdiCheckCircle,
  mdiAlertCircle,
  mdiCloseCircle,
  mdiRefresh,
  mdiAccountCheck
} from '@mdi/js';
import { getPageTitle } from '../../_lib/config';

// Extended Student interface for face enrollment
interface FaceEnrollmentStudent extends Student {
  faceDescriptor?: number[];
  imageQualityScore?: number;
  faceApiEnrolledAt?: Timestamp | Date;
  enrollmentMethod?: string;
}

const FaceEnrollmentPage = () => {
  const webcamRef = useRef<Webcam>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [students, setStudents] = useState<FaceEnrollmentStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Photo capture states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  
  // Camera device states
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  // Filter states
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled' | 'unenrolled'>('unenrolled');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load students from Firestore
  const loadStudents = useCallback(async () => {
    try {
      setLoadingMessage('Loading students...');
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      
      const studentsData: FaceEnrollmentStudent[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Only include active students (exclude dropped, break, and waitlist students)
        if (!data.dropped && !data.onBreak && !data.onWaitlist) {
          studentsData.push({
            id: doc.id,
            studentId: data.studentId || '',
            fullName: data.fullName || '',
            class: data.class || '',
            photoUrl: data.photoUrl,
            faceDescriptor: data.faceDescriptor,
            shift: data.shift,
            imageQualityScore: data.imageQualityScore,
            faceApiEnrolledAt: data.faceApiEnrolledAt,
            enrollmentMethod: data.enrollmentMethod
          } as FaceEnrollmentStudent);
        }
      });
      
      // Sort students by name
      studentsData.sort((a, b) => a.fullName.localeCompare(b.fullName));
      
      setStudents(studentsData);
      console.log(`Loaded ${studentsData.length} students`);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    }
  }, []);

  // Get available camera devices
  const getAvailableCameras = useCallback(async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setAvailableCameras(videoDevices);
      
      // Set default camera (first one or user-facing if available)
      if (videoDevices.length > 0 && !selectedCameraId) {
        const userFacingCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user')
        );
        setSelectedCameraId(userFacingCamera?.deviceId || videoDevices[0].deviceId);
      }
      
      console.log(`Found ${videoDevices.length} camera devices`);
    } catch (error) {
      console.error('Error getting camera devices:', error);
      toast.error('Failed to access camera devices');
    }
  }, [selectedCameraId]);

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
          getAvailableCameras()
        ]);
      } else {
        toast.error('Failed to load face detection models');
      }
      setIsLoading(false);
    };

    initialize();
  }, [loadStudents, getAvailableCameras]);

  // Filter students based on enrollment status, shift, and search term
  const filteredStudents = students.filter(student => {
    const matchesFilter = enrollmentFilter === 'all' || 
      (enrollmentFilter === 'enrolled' && student.faceDescriptor) ||
      (enrollmentFilter === 'unenrolled' && !student.faceDescriptor);
    
    const matchesShift = shiftFilter === 'all' || 
      (student.shift && student.shift.toLowerCase() === shiftFilter);
    
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.class && student.class.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesShift && matchesSearch;
  });

  // Enroll student using existing photo URL
  const enrollWithPhotoUrl = async (student: FaceEnrollmentStudent) => {
    if (!student.photoUrl) {
      toast.error('No photo URL available for this student');
      return;
    }

    setIsEnrolling(true);
    setSelectedStudent(student.id);
    
    try {
      // Convert Google Drive URL to proper format
      const convertedPhotoUrl = convertGoogleDriveUrl(student.photoUrl);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
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
            throw new Error('Could not generate face descriptor from photo');
          }

          // Store descriptor in Firestore
          const studentRef = doc(db, 'students', student.id);
          const updateData: any = {
            faceDescriptor: Array.from(descriptor),
            faceApiEnrolledAt: new Date(),
            imageQualityScore: qualityAnalysis.score,
            enrollmentMethod: 'photo_url'
          };
          
          // Update photoUrl if it was converted
          if (convertedPhotoUrl !== student.photoUrl) {
            updateData.photoUrl = convertedPhotoUrl;
          }
          
          await updateDoc(studentRef, updateData);

          // Update local state
          setStudents(prev => prev.map(s => 
            s.id === student.id 
              ? { 
                  ...s, 
                  faceDescriptor: Array.from(descriptor),
                  photoUrl: convertedPhotoUrl,
                  imageQualityScore: qualityAnalysis.score,
                  faceApiEnrolledAt: new Date(),
                  enrollmentMethod: 'photo_url'
                }
              : s
          ));

          toast.success(`${student.fullName} enrolled successfully (Quality: ${qualityAnalysis.score}%)`);
        } catch (error: any) {
          console.error('Enrollment error:', error);
          
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
          setSelectedStudent('');
        }
      };

      img.onerror = () => {
        toast.error('Failed to load student photo');
        setIsEnrolling(false);
        setSelectedStudent('');
      };

      // Use image proxy for Google Drive URLs to avoid CORS issues
      let imageUrl = convertedPhotoUrl;
      if (imageUrl.includes('drive.google.com')) {
        imageUrl = `/api/image-proxy?url=${encodeURIComponent(convertedPhotoUrl)}`;
      }

      img.src = imageUrl;
    } catch (error: any) {
      console.error('Enrollment failed:', error);
      toast.error(error.message || 'Enrollment failed');
      setIsEnrolling(false);
      setSelectedStudent('');
    }
  };

  // Start photo capture enrollment
  const startPhotoCapture = (studentId: string) => {
    setSelectedStudent(studentId);
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
    if (!capturedPhoto || !selectedStudent) {
      toast.error('No photo captured or student selected');
      return;
    }

    setIsEnrolling(true);

    try {
      const student = students.find(s => s.id === selectedStudent);
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
              ? { 
                  ...s, 
                  faceDescriptor: Array.from(descriptor),
                  imageQualityScore: qualityAnalysis.score,
                  faceApiEnrolledAt: new Date(),
                  enrollmentMethod: 'photo_capture'
                }
              : s
          ));

          toast.success(`${student.fullName} enrolled successfully using captured photo (Quality: ${qualityAnalysis.score}%)`);
          
          // Reset photo capture state
          setShowPhotoCapture(false);
          setSelectedStudent('');
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
    setSelectedStudent('');
    setCapturedPhoto(null);
    setIsCameraActive(false);
  };

  // Remove enrollment
  const removeEnrollment = async (student: FaceEnrollmentStudent) => {
    if (!student.faceDescriptor) {
      toast.error('Student is not enrolled');
      return;
    }

    try {
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        faceDescriptor: null,
        faceApiEnrolledAt: null,
        imageQualityScore: null,
        enrollmentMethod: null
      });

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === student.id 
          ? { 
              ...s, 
              faceDescriptor: undefined,
              faceApiEnrolledAt: undefined,
              imageQualityScore: undefined,
              enrollmentMethod: undefined
            }
          : s
      ));

      toast.success(`Removed enrollment for ${student.fullName}`);
    } catch (error) {
      console.error('Failed to remove enrollment:', error);
      toast.error('Failed to remove enrollment');
    }
  };

  const enrolledCount = students.filter(s => s.faceDescriptor).length;
  const totalCount = students.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-slate-800 dark:via-gray-800 dark:to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-full shadow-lg">
              <Icon path={mdiAccountPlus} className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Face Enrollment Management</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Enroll students for face recognition using their existing photos or live camera capture
          </p>
        </div>

        {/* Status Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mr-4">
                  <Icon path={mdiCheckCircle} className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrolledCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Students Enrolled</p>
                </div>
              </div>
            </CardBox>

            <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full mr-4">
                  <Icon path={mdiAlertCircle} className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount - enrolledCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pending Enrollment</p>
                </div>
              </div>
            </CardBox>

            <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mr-4">
                  <Icon path={mdiAccountCheck} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Students</p>
                </div>
              </div>
            </CardBox>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{loadingMessage}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Please wait while we initialize the system...</p>
            </div>
          </CardBox>
        )}

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
         <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Capture Photo for Enrollment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {students.find(s => s.id === selectedStudent)?.fullName}
                </p>
              </div>
              
              <div className="p-6">
                {!capturedPhoto ? (
                  <div className="space-y-4">
                    {/* Camera Selection */}
                    <div className="mb-4">
                      <CustomDropdown
                        id="camera-select"
                        label="Select Camera"
                        options={availableCameras.map(camera => ({
                          value: camera.deviceId,
                          label: camera.label
                        }))}
                        value={selectedCameraId || ''}
                        onChange={(value) => setSelectedCameraId(value)}
                        placeholder="Choose a camera"
                        className="w-full"
                      />
                    </div>

                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                          width: 640,
                          height: 480,
                          facingMode: "user",
                          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined
                        }}
                        className="w-full h-auto"
                        mirrored={true}
                      />
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button 
                        onClick={capturePhotoForEnrollment}
                        disabled={isCapturingPhoto}
                        color="company-purple"
                        className="flex items-center space-x-2"
                      >
                        <Icon path={mdiCamera} size={20} />
                        <span>{isCapturingPhoto ? 'Capturing...' : 'Capture Photo'}</span>
                      </Button>
                      
                      <Button 
                        onClick={cancelPhotoCapture}
                        color="whiteDark"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <img 
                        src={capturedPhoto} 
                        alt="Captured" 
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button 
                        onClick={confirmPhotoEnrollment}
                        disabled={isEnrolling}
                        color="company-purple"
                        className="flex items-center space-x-2"
                      >
                        <Icon path={mdiCheckCircle} size={20} />
                        <span>{isEnrolling ? 'Enrolling...' : 'Confirm & Enroll'}</span>
                      </Button>
                      
                      <Button 
                        onClick={() => setCapturedPhoto(null)}
                        color="whiteDark"
                      >
                        Retake
                      </Button>
                      
                      <Button 
                        onClick={cancelPhotoCapture}
                        color="whiteDark"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {!isLoading && (
          <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
                  <select
                    value={enrollmentFilter}
                    onChange={(e) => setEnrollmentFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Students</option>
                    <option value="enrolled">Enrolled Only</option>
                    <option value="unenrolled">Not Enrolled</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shift:</label>
                  <select
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Name, ID, or class..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <Button 
                onClick={loadStudents}
                color="whiteDark"
                className="flex items-center space-x-2"
              >
                <Icon path={mdiRefresh} size={16} />
                <span>Refresh</span>
              </Button>
            </div>
          </CardBox>
        )}

        {/* Students Grid */}
        {!isLoading && (
          <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Students ({filteredStudents.length})
              </h2>
            </div>
            
            <div className="p-6">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Icon path={mdiAccountPlus} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-300">No students found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {student.fullName}
                          </h3>
                          {student.class && (
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {student.class}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {student.faceDescriptor ? (
                            <div className="flex items-center space-x-1">
                              <Icon path={mdiCheckCircle} className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Enrolled</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <Icon path={mdiAlertCircle} className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {student.faceDescriptor && (
                        <div className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                          <p>Quality: {student.imageQualityScore?.toFixed(1) || 'N/A'}%</p>
                          <p>Method: {student.enrollmentMethod || 'N/A'}</p>
                          {student.faceApiEnrolledAt && (
                            <p>Enrolled: {
                              student.faceApiEnrolledAt instanceof Timestamp 
                                ? student.faceApiEnrolledAt.toDate().toLocaleDateString()
                                : new Date(student.faceApiEnrolledAt).toLocaleDateString()
                            }</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-col space-y-2">
                        {!student.faceDescriptor ? (
                          <>
                            {student.photoUrl && (
                              <>
                                <Button
                                  onClick={() => startPhotoCapture(student.id)}
                                  color="company-purple"
                                  small
                                  className="w-full flex items-center justify-center space-x-2"
                                >
                                  <Icon path={mdiCamera} size={16} />
                                  <span>Capture & Enroll</span>
                                </Button>
                                
                                <Button
                                  onClick={() => enrollWithPhotoUrl(student)}
                                  disabled={isEnrolling && selectedStudent === student.id}
                                  color="whiteDark"
                                  small
                                  className="w-full flex items-center justify-center space-x-2"
                                >
                                  <Icon path={mdiFaceRecognition} size={16} />
                                  <span>
                                    {isEnrolling && selectedStudent === student.id ? 'Enrolling...' : 'Enroll with Photo'}
                                  </span>
                                </Button>
                              </>
                            )}

                          </>
                        ) : (
                          <Button
                            onClick={() => removeEnrollment(student)}
                            color="whiteDark"
                            small
                            className="w-full flex items-center justify-center space-x-2"
                          >
                            <Icon path={mdiCloseCircle} size={16} />
                            <span>Remove Enrollment</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBox>
        )}
      </div>
    </div>
  );
};

export default function FaceEnrollmentPageWrapper() {
  return (
    <>
      <Head>
        <title>{getPageTitle('Face Enrollment')}</title>
      </Head>
      <FaceEnrollmentPage />
    </>
  );
}
