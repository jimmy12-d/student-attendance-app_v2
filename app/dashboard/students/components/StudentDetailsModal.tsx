import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student } from '../../../_interfaces';
import DailyStatusDetailsModal from '../../_components/DailyStatusDetailsModal';
import StarManagementSection from './StarManagementSection';
import ClaimedStarsHistory from './ClaimedStarsHistory';
import BasicInfoTab from './detail-tabs/BasicInfoTab';
import ActionsTab from './detail-tabs/ActionsTab';
import RequestsTab from './detail-tabs/RequestsTab';
import { Timestamp, collection, query, where, getDocs, doc, updateDoc, onSnapshot, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import { RawAttendanceRecord } from '../../_lib/attendanceLogic';
import { PermissionRecord, ClaimedStar } from '../../../_interfaces';
import { AllClassConfigs } from '../../_lib/configForAttendanceLogic';
import { toast } from 'sonner';
import { 
  initializeFaceApi, 
  generateFaceDescriptor
} from '../../face-scan-faceapi/utils/faceDetection';
import { 
  analyzeImageQuality,
  convertGoogleDriveUrl 
} from '../../face-scan-faceapi/utils/imageQualityAnalysis';
import Webcam from 'react-webcam';
import Button from '../../../_components/Button';
import Icon from '../../../_components/Icon';
import CustomDropdown from './CustomDropdown';
import { 
  mdiFaceRecognition, 
  mdiCamera, 
  mdiCheckCircle,
  mdiCalendar,
  mdiClockAlertOutline,
  mdiCheck,
  mdiClose
} from '@mdi/js';

// Utility function to convert Google Drive share URL to thumbnail URL
const getDisplayableImageUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (url.includes("drive.google.com")) {
    // Regex to find the file ID from various Google Drive URL formats
    // Handles /file/d/FILE_ID/, open?id=FILE_ID, and id=FILE_ID
    const regex = /(?:drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|.*[?&]id=([a-zA-Z0-9_-]+)))/;
    const match = url.match(regex);
    
    if (match) {
      // The file ID could be in either capture group
      const fileId = match[1] || match[2];
      if (fileId) {
        // Return the preview URL for iframe embedding (same as AddStudentForm)
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        return previewUrl;
      }
    }
  }
  
  // If it's not a Google Drive link or no ID was found, return it as is
  return url;
};

interface StudentDetailsModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  // Navigation props
  students?: Student[]; // List of students in the same class/context
  currentIndex?: number; // Current student index in the list
  onNavigate?: (student: Student, index: number) => void; // Navigation callback
  onBreak?: () => void; // Callback for when a student is put on break
  // Control visibility of action buttons (edit, delete, break)
  hideActions?: boolean; // When true, hides edit/delete/break buttons
  // Default tab to show when modal opens
  defaultTab?: 'basic' | 'actions' | 'requests'; // Default tab selection
  // View context for BP students
  viewContext?: 'regular' | '12BP'; // Context to determine which class config to use
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  students = [],
  currentIndex = -1,
  onNavigate,
  onBreak,
  hideActions = false,
  defaultTab = 'basic',
  viewContext,
}) => {
  const webcamRef = useRef<Webcam>(null);
  
  // Tab state management
  const [activeTab, setActiveTab] = useState<'basic' | 'actions' | 'requests'>(defaultTab);
  
  // Update activeTab when defaultTab changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [expectedReturnMonth, setExpectedReturnMonth] = useState('');
  const [breakReason, setBreakReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  
  // Monthly attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [approvedPermissions, setApprovedPermissions] = useState<PermissionRecord[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Star management state
  const [claimedStars, setClaimedStars] = useState<ClaimedStar[]>([]);
  const [totalStars, setTotalStars] = useState(0);

  // Photo viewer state
  const [showPhotoInContainer, setShowPhotoInContainer] = useState(false);

  // Face enrollment state
  const [isFaceEnrolling, setIsFaceEnrolling] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  
  // Photo capture states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  
  // Leave early requests state
  const [leaveEarlyRequests, setLeaveEarlyRequests] = useState<any[]>([]);
  const [isLoadingLeaveEarly, setIsLoadingLeaveEarly] = useState(true);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  
  // Camera device states
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Navigation logic
  const canNavigatePrev = students.length > 1 && currentIndex > 0;
  const canNavigateNext = students.length > 1 && currentIndex < students.length - 1;

  const handleNavigatePrev = () => {
    if (canNavigatePrev && onNavigate && !isTransitioning && !showBreakConfirm) {
      setSlideDirection('left');
      setIsTransitioning(true);
      const prevIndex = currentIndex - 1;
      const prevStudent = students[prevIndex];
      setTimeout(() => {
        onNavigate(prevStudent, prevIndex);
        setTimeout(() => {
          setIsTransitioning(false);
          setSlideDirection(null);
        }, 50);
      }, 150);
    }
  };

  const handleNavigateNext = () => {
    if (canNavigateNext && onNavigate && !isTransitioning && !showBreakConfirm) {
      setSlideDirection('right');
      setIsTransitioning(true);
      const nextIndex = currentIndex + 1;
      const nextStudent = students[nextIndex];
      setTimeout(() => {
        onNavigate(nextStudent, nextIndex);
        setTimeout(() => {
          setIsTransitioning(false);
          setSlideDirection(null);
        }, 50);
      }, 150);
    }
  };

  // Fetch monthly attendance data
  const fetchAttendanceData = async (studentId: string) => {
    setIsLoadingAttendance(true);
    try {
      // Fetch records for a wide range to support month navigation in the modal
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Fetch from 6 months ago to 1 month in future to support navigation
      const startMonth = now.getMonth() - 5; // 6 months back
      const endMonth = now.getMonth() + 1; // 1 month forward
      
      let startDate, endDate;
      
      if (startMonth >= 0) {
        startDate = `${currentYear}-${(startMonth + 1).toString().padStart(2, '0')}-01`;
      } else {
        const prevYear = currentYear - 1;
        const adjustedStartMonth = 12 + startMonth + 1;
        startDate = `${prevYear}-${adjustedStartMonth.toString().padStart(2, '0')}-01`;
      }
      
      if (endMonth <= 12) {
        endDate = `${currentYear}-${endMonth.toString().padStart(2, '0')}-31`;
      } else {
        const nextYear = currentYear + 1;
        const adjustedEndMonth = endMonth - 12;
        endDate = `${nextYear}-${adjustedEndMonth.toString().padStart(2, '0')}-31`;
      }
      
      // Fetch attendance records with wider date range
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData: RawAttendanceRecord[] = [];
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        attendanceData.push({
          id: doc.id,
          studentId: data.studentId,
          date: data.date,
          status: data.status,
          timestamp: data.timestamp,
          // Add other fields as needed
        });
      });
      
      // Fetch all class configs from 'classes' collection
      const classConfigSnapshot = await getDocs(collection(db, 'classes'));
      
      const classConfigsData: AllClassConfigs = {};
      classConfigSnapshot.docs.forEach(doc => {
        const data = doc.data();

        if (data.shifts) { // Only add if shifts property exists
          classConfigsData[doc.id] = data as any;
        }
      });

      // Fetch permissions from the 'permissions' collection
      const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
      
      const permissionsData = permissionsSnapshot.docs
        .map(doc => {
          return { id: doc.id, ...doc.data() };
        })
        .filter((record: any) => {
          // Filter for permissions that belong to this student
          return record.studentId === studentId;
        }) as PermissionRecord[];
      
      // Separate approved and pending permissions
      const approvedPerms = permissionsData.filter(record => record.status === 'approved');
      const pendingPerms = permissionsData.filter(record => record.status === 'pending');
      
      setAttendanceRecords(attendanceData);
      setApprovedPermissions(approvedPerms);
      setPendingPermissions(pendingPerms);
      setAllClassConfigs(classConfigsData);
  
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceRecords([]);
      setApprovedPermissions([]);
      setPendingPermissions([]);
      setAllClassConfigs({});
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Fetch attendance when student changes
  useEffect(() => {
    if (student?.id && isOpen) {
      fetchAttendanceData(student.id);
    }
  }, [student?.id, isOpen]);

  // Fetch claimed stars when student changes
  useEffect(() => {
    if (!student?.id || !isOpen) return;

    const claimedStarsQuery = query(
      collection(db, 'students', student.id, 'claimedStars')
    );

    const unsubscribe = onSnapshot(claimedStarsQuery, (snapshot) => {
      const claimed = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClaimedStar));
      
      // Sort in memory to avoid orderBy issues
      claimed.sort((a, b) => {
        const aTime = a.claimedAt?.toDate?.() || new Date(0);
        const bTime = b.claimedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setClaimedStars(claimed);
      setTotalStars(claimed.reduce((sum, claim) => sum + claim.amount, 0));
    }, (error) => {
      console.error('Error fetching claimed stars:', error);
      setClaimedStars([]);
      setTotalStars(0);
    });

    return () => unsubscribe();
  }, [student?.id, isOpen]);

  // Fetch leave early requests when student changes
  useEffect(() => {
    if (!student?.id || !isOpen) return;

    setIsLoadingLeaveEarly(true);

    const leaveEarlyQuery = query(
      collection(db, 'leaveEarlyRequests'),
      where('studentId', '==', student.id),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(leaveEarlyQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLeaveEarlyRequests(requests);
      setIsLoadingLeaveEarly(false);
    }, (error) => {
      console.error('Error fetching leave early requests:', error);
      setLeaveEarlyRequests([]);
      setIsLoadingLeaveEarly(false);
    });

    return () => unsubscribe();
  }, [student?.id, isOpen]);

  // Reset photo state when student changes (but keep open if new student also has photo)
  useEffect(() => {
    if (student?.id) {
      // Only reset if the new student doesn't have a photo
      if (!student.photoUrl) {
        setShowPhotoInContainer(false);
      }
      // If new student has photo and photo was open, keep it open for seamless navigation
    }
  }, [student?.id, student?.photoUrl]);

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

  // Initialize face detection models and camera when modal opens
  useEffect(() => {
    if (isOpen && student?.id) {
      const initializeFaceDetection = async () => {
        if (!faceModelsLoaded) {
          const modelsLoaded = await initializeFaceApi();
          if (modelsLoaded) {
            setFaceModelsLoaded(true);
          } else {
            toast.error('Failed to load face detection models');
          }
        }
      };
      
      initializeFaceDetection();
    }
  }, [isOpen, student?.id, faceModelsLoaded]);

  // Initialize camera devices only when photo capture modal is opened
  useEffect(() => {
    if (showPhotoCapture && isOpen && student?.id) {
      getAvailableCameras();
    }
  }, [showPhotoCapture, isOpen, student?.id, getAvailableCameras]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      // If attendance modal or break confirmation modal is open, don't handle ESC here - let them close first
      if (showAttendanceModal && event.key === 'Escape') {
        event.preventDefault();
        setShowAttendanceModal(false);
        return;
      }
      
      // Handle photo viewer modal ESC
      if (showPhotoInContainer && event.key === 'Escape') {
        event.preventDefault();
        setShowPhotoInContainer(false);
        return;
      }
      
      if (showBreakConfirm && event.key === 'Escape') {
        event.preventDefault();
        cancelBreak();
        return;
      }

      // Handle photo capture modal ESC
      if (showPhotoCapture && event.key === 'Escape') {
        event.preventDefault();
        cancelPhotoCapture();
        return;
      }
      
      // Disable arrow navigation when modals are open (but allow when photo is shown in container)
      if (showBreakConfirm || showPhotoCapture) {
        return;
      }
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleNavigatePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNavigateNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Home' && students.length > 1) {
        event.preventDefault();
        if (onNavigate && currentIndex > 0 && !isTransitioning) {
          setSlideDirection('left');
          setIsTransitioning(true);
          setTimeout(() => {
            onNavigate(students[0], 0);
            setTimeout(() => {
              setIsTransitioning(false);
              setSlideDirection(null);
            }, 50);
          }, 150);
        }
      } else if (event.key === 'End' && students.length > 1) {
        event.preventDefault();
        if (onNavigate && currentIndex < students.length - 1 && !isTransitioning) {
          setSlideDirection('right');
          setIsTransitioning(true);
          const lastIndex = students.length - 1;
          setTimeout(() => {
            onNavigate(students[lastIndex], lastIndex);
            setTimeout(() => {
              setIsTransitioning(false);
              setSlideDirection(null);
            }, 50);
          }, 150);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canNavigatePrev, canNavigateNext, isTransitioning, currentIndex, students, onNavigate, showAttendanceModal, showBreakConfirm, showPhotoInContainer]);

  if (!isOpen || !student) return null;

  const formatPhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return 'N/A';
    const cleaned = ('' + phone).replace(/\D/g, '');

    let digits = cleaned;
    // Standardize to 10 digits if it's a 9-digit number missing the leading 0
    if (digits.length === 9 && !digits.startsWith('0')) {
      digits = '0' + digits;
    }
    
    // Format 10-digit numbers (0XX-XXX-XXXX)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }

    // Format 9-digit numbers (0XX-XXX-XXX)
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
    }
    
    return phone; // Return original if it doesn't match formats
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(student);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Break functionality handlers
  const handleBreakClick = () => {
    // Set default expected return month to next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const defaultReturnMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setExpectedReturnMonth(defaultReturnMonth);
    setBreakReason('');
    setShowBreakConfirm(true);
  };

  const confirmBreak = async () => {
    if (!expectedReturnMonth.trim()) {
      toast.error('Please select expected return month');
      return;
    }

    try {
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        onBreak: true,
        breakStartDate: Timestamp.now(),
        expectedReturnMonth: expectedReturnMonth.trim(),
        breakReason: breakReason.trim() || 'Not specified'
      });

      toast.success(`${student.fullName} has been marked as on break`);
      setShowBreakConfirm(false);
      setExpectedReturnMonth('');
      setBreakReason('');
      
      // Call the onBreak callback to refresh data
      if (onBreak) {
        onBreak();
      }
      
      onClose(); // Close modal after successful break
    } catch (error) {
      toast.error('Failed to mark student as on break. Please try again.');
      console.error('Break error:', error);
    }
  };

  const cancelBreak = () => {
    setShowBreakConfirm(false);
    setExpectedReturnMonth('');
    setBreakReason('');
  };

  // Leave early request handlers
  const handleApproveLeaveEarly = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'leaveEarlyRequests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedAt: Timestamp.now(),
        approvedBy: 'admin' // You might want to get the actual admin user
      });
      
      toast.success('Leave early request approved');
    } catch (error) {
      console.error('Error approving leave early request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleRejectLeaveEarly = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'leaveEarlyRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: 'admin' // You might want to get the actual admin user
      });
      
      toast.success('Leave early request rejected');
    } catch (error) {
      console.error('Error rejecting leave early request:', error);
      toast.error('Failed to reject request');
    }
  };

  // Permission request handlers
  const handleApprovePermission = async (permissionId: string) => {
    try {
      setIsLoadingPermissions(true);
      const permissionRef = doc(db, 'permissions', permissionId);
      await updateDoc(permissionRef, {
        status: 'approved',
        approvedAt: Timestamp.now(),
        approvedBy: 'admin' // You might want to get the actual admin user
      });
      
      // Update local state
      const approvedPermission = pendingPermissions.find(p => p.id === permissionId);
      if (approvedPermission) {
        setApprovedPermissions(prev => [...prev, { ...approvedPermission, status: 'approved' }]);
      }
      setPendingPermissions(prev => prev.filter(p => p.id !== permissionId));
      
      toast.success('Permission request approved');
    } catch (error) {
      console.error('Error approving permission request:', error);
      toast.error('Failed to approve permission');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleRejectPermission = async (permissionId: string) => {
    try {
      setIsLoadingPermissions(true);
      const permissionRef = doc(db, 'permissions', permissionId);
      await updateDoc(permissionRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: 'admin' // You might want to get the actual admin user
      });
      
      // Remove from pending permissions
      setPendingPermissions(prev => prev.filter(p => p.id !== permissionId));
      
      toast.success('Permission request rejected');
    } catch (error) {
      console.error('Error rejecting permission request:', error);
      toast.error('Failed to reject permission');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Face enrollment function - starts photo capture
  const enrollStudentWithPhoto = async (studentToEnroll: Student) => {
    setShowPhotoCapture(true);
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
    if (!capturedPhoto || !student) {
      toast.error('No photo captured or student not found');
      return;
    }

    setIsFaceEnrolling(true);

    try {
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

          toast.success(`${student.fullName} enrolled successfully using captured photo (Quality: ${qualityAnalysis.score}%)`);
          
          // Reset photo capture state
          setShowPhotoCapture(false);
          setCapturedPhoto(null);
          
        } catch (error: any) {
          console.error('Photo enrollment error:', error);
          toast.error(error.message || 'Failed to enroll student with captured photo');
        } finally {
          setIsFaceEnrolling(false);
        }
      };

      img.src = capturedPhoto;
    } catch (error: any) {
      console.error('Photo enrollment failed:', error);
      toast.error(error.message || 'Photo enrollment failed');
      setIsFaceEnrolling(false);
    }
  };

  // Cancel photo capture
  const cancelPhotoCapture = () => {
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    setIsCapturingPhoto(false);
  };

  return (
    <div className="fixed inset-0 z-115 overflow-y-auto mt-10">
      {/* Backdrop */}
    <div 
      className="fixed inset-0 transition-opacity"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={() => {
        onClose();
        setShowPhotoInContainer(false);
      }}
    ></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className={`relative transform rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all duration-200 sm:my-8 sm:w-full sm:max-w-4xl h-[90vh] max-h-[800px] flex flex-col ${
          isTransitioning 
            ? slideDirection === 'left' 
              ? 'translate-x-4 opacity-80' 
              : slideDirection === 'right'
              ? '-translate-x-4 opacity-80'
              : 'scale-95 opacity-75'
            : 'translate-x-0 scale-100 opacity-100'
        }`} style={{ transform: isTransitioning && slideDirection ? `translateX(${slideDirection === 'left' ? '8px' : '-8px'}) scale(0.98)` : undefined }}>
          {/* Header with Navigation */}
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4 rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              {/* Left Arrow */}
              <div className="relative group">
                <button
                  onClick={handleNavigatePrev}
                  disabled={!canNavigatePrev || isTransitioning || showBreakConfirm}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigatePrev && !isTransitioning && !showBreakConfirm
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigatePrev && !showBreakConfirm ? 'Previous student (←)' : 'Navigation disabled'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Hover preview for previous student */}
                {canNavigatePrev && students[currentIndex - 1] && !showBreakConfirm && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                    {students[currentIndex - 1].fullName}
                  </div>
                )}
              </div>

              {/* Title with Student Counter */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Student Details
                </h3>
                {students.length > 1 && (
                  <div className="flex flex-col items-center space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentIndex + 1} of {students.length} in {student.class} - {student.shift}
                    </p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {student.fullName}
                    </p>
                    {/* Progress dots */}
                    <div className="flex space-x-1">
                      {students.slice(Math.max(0, currentIndex - 2), Math.min(students.length, currentIndex + 3)).map((_, idx) => {
                        const actualIndex = Math.max(0, currentIndex - 2) + idx;
                        return (
                          <div
                            key={actualIndex}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                              actualIndex === currentIndex
                                ? 'bg-blue-500 scale-125'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          />
                        );
                      })}
                    </div>
                    {/* Loading indicator during transition */}
                    {isTransitioning && (
                      <div className="flex items-center ml-2">
                        <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Arrow */}
              <div className="relative group">
                <button
                  onClick={handleNavigateNext}
                  disabled={!canNavigateNext || isTransitioning || showBreakConfirm}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigateNext && !isTransitioning && !showBreakConfirm
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigateNext && !showBreakConfirm ? 'Next student (→)' : 'Navigation disabled'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Hover preview for next student */}
                {canNavigateNext && students[currentIndex + 1] && !showBreakConfirm && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                    {students[currentIndex + 1].fullName}
                  </div>
                )}
              </div>
            </div>

            {/* Close button moved to absolute position */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-md bg-white dark:bg-slate-700 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 z-10"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-slate-600 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'basic'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Basic Info</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'actions'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Actions</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'requests'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Requests</span>
                  {(pendingPermissions.length > 0 || leaveEarlyRequests.filter(req => req.status === 'pending').length > 0) && (
                    <div className="flex items-center space-x-1 ml-2">
                      {pendingPermissions.length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-sm border border-purple-300">
                          {pendingPermissions.length}
                        </span>
                      )}
                      {leaveEarlyRequests.filter(req => req.status === 'pending').length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm border border-orange-300">
                          {leaveEarlyRequests.filter(req => req.status === 'pending').length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content - Fixed Height Container */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 pb-4 sm:px-6">
              {/* Tab Content */}
              {activeTab === 'basic' ? (
                <BasicInfoTab
                  student={student}
                  showPhotoInContainer={showPhotoInContainer}
                  setShowPhotoInContainer={setShowPhotoInContainer}
                  isTransitioning={isTransitioning}
                  slideDirection={slideDirection}
                />
              ) : activeTab === 'actions' ? (
                <ActionsTab
                  student={student}
                  attendanceRecords={attendanceRecords}
                  approvedPermissions={approvedPermissions}
                  allClassConfigs={allClassConfigs}
                  isLoadingAttendance={isLoadingAttendance}
                  setShowAttendanceModal={setShowAttendanceModal}
                  claimedStars={claimedStars}
                  totalStars={totalStars}
                  onBreak={onBreak}
                  isFaceEnrolling={isFaceEnrolling}
                  enrollStudentWithPhoto={enrollStudentWithPhoto}
                  showPhotoCapture={showPhotoCapture}
                  setShowPhotoCapture={setShowPhotoCapture}
                  capturedPhoto={capturedPhoto}
                  setCapturedPhoto={setCapturedPhoto}
                  isCapturingPhoto={isCapturingPhoto}
                  capturePhotoForEnrollment={capturePhotoForEnrollment}
                  confirmPhotoEnrollment={confirmPhotoEnrollment}
                  cancelPhotoCapture={cancelPhotoCapture}
                  webcamRef={webcamRef as React.RefObject<Webcam>}
                  availableCameras={availableCameras}
                  selectedCameraId={selectedCameraId}
                  setSelectedCameraId={setSelectedCameraId}
                />
              ) : (
                <RequestsTab
                  student={student}
                  leaveEarlyRequests={leaveEarlyRequests}
                  isLoadingLeaveEarly={isLoadingLeaveEarly}
                  handleApproveLeaveEarly={handleApproveLeaveEarly}
                  handleRejectLeaveEarly={handleRejectLeaveEarly}
                  approvedPermissions={approvedPermissions}
                  pendingPermissions={pendingPermissions}
                  handleApprovePermission={handleApprovePermission}
                  handleRejectPermission={handleRejectPermission}
                  isLoadingPermissions={isLoadingPermissions}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:justify-between sm:px-6 gap-3 rounded-b-lg flex-shrink-0">
            {/* Delete and Break buttons on the left - hidden when hideActions is true */}
            {!hideActions && (
              <div className="flex gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                  onClick={handleDeleteClick}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Drop
                </button>
                
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
                  onClick={handleBreakClick}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Break
                </button>
              </div>
            )}

            {/* Edit and Close buttons on the right */}
            <div className={`flex gap-3 ${hideActions ? 'ml-auto' : 'sm:flex-row-reverse'}`}>
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Close
              </button>
              {!hideActions && (
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
                  onClick={() => {
                    onClose();
                    onEdit(student);
                  }}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
            onClick={cancelDelete}
          ></div>
          
          {/* Confirmation Modal */}
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                      Delete Student
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to drop <span className="font-semibold text-gray-900 dark:text-gray-100">{student.fullName}</span>? 
                        This action cannot be undone and will permanently remove all student data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto"
                  onClick={confirmDelete}
                >
                  Drop
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Break Confirmation Modal */}
      {showBreakConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
            onClick={cancelBreak}
          ></div>
          
          {/* Confirmation Modal */}
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                      Put Student on Break
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{student.fullName}</span> will be marked as on break. 
                        They can rejoin when ready.
                      </p>
                      
                      {/* Expected Return Month Input */}
                      <div className="mb-4">
                        <label htmlFor="expectedReturnMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Expected Return Month <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="month"
                          id="expectedReturnMonth"
                          value={expectedReturnMonth}
                          onChange={(e) => setExpectedReturnMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-700 dark:text-gray-100"
                          min={new Date().toISOString().slice(0, 7)} // Current month as minimum
                        />
                      </div>
                      
                      {/* Break Reason Input */}
                      <div className="mb-4">
                        <label htmlFor="breakReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reason (Optional)
                        </label>
                        <textarea
                          id="breakReason"
                          value={breakReason}
                          onChange={(e) => setBreakReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-700 dark:text-gray-100 resize-none"
                          placeholder="Enter reason for break (optional)..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:ml-3 sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={confirmBreak}
                  disabled={!expectedReturnMonth.trim()}
                >
                  Put on Break
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                  onClick={cancelBreak}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Status Details Modal */}
      {showAttendanceModal && (
        <DailyStatusDetailsModal
          student={student}
          attendanceRecords={attendanceRecords}
          allClassConfigs={allClassConfigs}
          approvedPermissions={approvedPermissions}
          isActive={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          viewContext={viewContext}
        />
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Capture Photo for Enrollment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {student?.fullName}
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
                      onChange={(value) => setSelectedCameraId(String(value))}
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
                      disabled={isFaceEnrolling}
                      color="company-purple"
                      className="flex items-center space-x-2"
                    >
                      <Icon path={mdiCheckCircle} size={20} />
                      <span>{isFaceEnrolling ? 'Enrolling...' : 'Confirm & Enroll'}</span>
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
    </div>
  );
};
