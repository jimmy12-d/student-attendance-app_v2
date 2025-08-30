"use client";

import React, { useState, useEffect } from "react";
import {
  mdiAccountPlus,
  mdiMonitorCellphone,
  mdiTableBorder,
  mdiPencilBox,
  mdiClipboardCheck,
  mdiDownload,
  mdiAccountOff,
  mdiChevronDown,
  mdiChevronUp,
} from "@mdi/js";
import Button from "../../_components/Button";
import CardBox from "../../_components/CardBox";
// CardBoxComponentEmpty might be needed if you use it for empty states
// import CardBoxComponentEmpty from "../../_components/CardBox/Component/Empty";
import NotificationBar from "../../_components/NotificationBar";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import AddStudentForm from "./AddStudentForm";
import EditStudentForm from "./EditStudentForm";
import TableStudents from "./TableStudents";
import CardBoxModal from "../../_components/CardBox/Modal";
import DroppedStudentsSection from "./components/DroppedStudentsSection";
import WaitlistStudentsSection from "./components/WaitlistStudentsSection";
import { StudentDetailsModal } from "./components/StudentDetailsModal";
import { ExportStudentsModal } from "./components/ExportStudentsModal";
import { AbsentFollowUpDashboard } from "./components/AbsentFollowUpDashboard";
import { FlipFlopStatusIndicator } from "./components/FlipFlopStatusIndicator";
import { flipFlopService } from "./_services/flipFlopService";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { collection, doc, Timestamp, query, where, updateDoc, serverTimestamp, onSnapshot, getDocs } from "firebase/firestore";

// Interface
import { Student } from "../../_interfaces"; // Ensure this path is correct

export default function StudentsPage() {
  const [isFormActive, setIsFormActive] = useState(false); // Renamed from isAddingStudent
  const [students, setStudents] = useState<Student[]>([]);
  const [droppedStudents, setDroppedStudents] = useState<Student[]>([]);
  const [waitlistStudents, setWaitlistStudents] = useState<Student[]>([]);
  const [showDroppedStudents, setShowDroppedStudents] = useState(false);
  const [showWaitlistStudents, setShowWaitlistStudents] = useState(false);
  const [showAbsentFollowUp, setShowAbsentFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Absent Follow-Up Dashboard filters
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteModalActive, setIsDeleteModalActive] = useState(false);

  // State for student to be edited
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Batch edit state
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  
  // Take attendance state
  const [isTakeAttendanceMode, setIsTakeAttendanceMode] = useState(false);

  // Flip-flop preview state
  const [isFlipFlopPreviewMode, setIsFlipFlopPreviewMode] = useState(false);

  // Modal state for viewing student details
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentStudentList, setCurrentStudentList] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Expand buttons state
  const [isButtonsExpanded, setIsButtonsExpanded] = useState(false);

  // Set up real-time listener for students
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("ay", "==", "2026"));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const fetchTokensAndMerge = async () => {
          try {
            const studentsData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
            })) as Student[];

            // Fetch tokens from tempRegistrationTokens collection
            const tokensRef = collection(db, "tempRegistrationTokens");
            const tokensSnapshot = await getDocs(tokensRef);
            
            // Create a map of studentId -> token data
            const tokensMap = new Map();
            tokensSnapshot.docs.forEach(doc => {
              const tokenData = doc.data();
              tokensMap.set(tokenData.studentId, {
                registrationToken: tokenData.token,
                tokenExpiresAt: tokenData.expiresAt,
                tokenCreatedAt: tokenData.createdAt
              });
            });

            // Merge token data with student data
            const studentsWithTokens = studentsData.map(student => {
              const tokenData = tokensMap.get(student.id);
              return tokenData ? { ...student, ...tokenData } : student;
            });
          
            // Separate active, waitlist, dropped, and break students
            const activeStudents = studentsWithTokens.filter(student => !student.dropped && !student.onBreak && !student.onWaitlist);
            const waitlistStudentsData = studentsWithTokens.filter(student => student.onWaitlist && !student.dropped && !student.onBreak);
            const droppedStudentsData = studentsWithTokens.filter(student => student.dropped || student.onBreak);
            
            setStudents(activeStudents);
            setWaitlistStudents(waitlistStudentsData);
            setDroppedStudents(droppedStudentsData);
            setLoading(false);
            setError(null);
          } catch (err) {
            console.error("Error processing students data: ", err);
            setError("Failed to process students data. Please try again.");
            setStudents([]);
            setWaitlistStudents([]);
            setDroppedStudents([]);
            setLoading(false);
          }
        };
        
        fetchTokensAndMerge();
      },
      (err) => {
        console.error("Error listening to students: ", err);
        setError("Failed to fetch students. Please try again.");
        setLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  const handleShowCreateForm = () => {
    setStudentToEdit(null); // Ensure no student is being edited
    setIsFormActive(true);  // Show the form
  };
  
  const handleFormClose = () => {
    setIsFormActive(false);
    setStudentToEdit(null); // Clear studentToEdit when form closes
  };

  const handleStudentFormSubmit = (studentId: string) => { // Renamed from handleStudentAdded
    setIsFormActive(false);
    setStudentToEdit(null); // Clear studentToEdit after submission
    console.log(`Student ${studentToEdit ? 'updated' : 'added'}: ${studentId}. Data will update automatically via real-time listener.`);
    // No need to manually refresh - real-time listener will handle updates
  };

  const confirmDeleteStudent = async () => {
    if (studentToDelete) {
      try {
        // Soft delete: set dropped field to true instead of deleting the document
        await updateDoc(doc(db, "students", studentToDelete.id), {
          dropped: true,
          droppedAt: serverTimestamp() // Use server timestamp for consistency
        });
        
        // Real-time listener will automatically update the state
        toast.success(`${studentToDelete.fullName} has been moved to dropped students`);
        console.log("Student marked as dropped:", studentToDelete.id);
      } catch (err) {
        console.error("Error dropping student:", err);
        toast.error("Failed to drop student. Please try again.");
        setError("Failed to drop student.");
      }
    }
    setIsDeleteModalActive(false);
    setStudentToDelete(null);
  };

  // Delete function for modal (used by the new modal delete button)
  const handleDeleteStudent = async (student: Student) => {
    try {
      // Soft delete: set dropped field to true instead of deleting the document
      await updateDoc(doc(db, "students", student.id), {
        dropped: true,
        droppedAt: serverTimestamp() // Use server timestamp for consistency
      });
      
      // Real-time listener will automatically update the state
      console.log("Student marked as dropped:", student.id);
    } catch (err) {
      console.error("Error dropping student:", err);
      throw err; // Re-throw to be handled by the toast in TableStudents
    }
  };

  // --- Edit Logic ---
  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student); // Set the student to edit
    setIsFormActive(true);     // Show the form
  };

  // Batch edit functions
  const handleToggleBatchEdit = () => {
    setIsBatchEditMode(!isBatchEditMode);
    // Exit take attendance mode when entering batch edit mode
    if (!isBatchEditMode) {
      setIsTakeAttendanceMode(false);
    }
  };

  // Take attendance functions
  const handleToggleTakeAttendance = () => {
    setIsTakeAttendanceMode(!isTakeAttendanceMode);
    // Exit batch edit mode when entering take attendance mode
    if (!isTakeAttendanceMode) {
      setIsBatchEditMode(false);
    }
  };

  // Flip-flop preview functions
  const handleToggleFlipFlopPreview = () => {
    setIsFlipFlopPreviewMode(!isFlipFlopPreviewMode);
  };

  // Function to toggle shift for flip-flop students
  const toggleFlipFlopShift = (shift: string): string => {
    if (shift.toLowerCase() === 'morning') {
      return 'Afternoon';
    } else if (shift.toLowerCase() === 'afternoon') {
      return 'Morning';
    }
    return shift; // Return original shift if not morning/afternoon
  };

  // Function to get students with flipped shifts for preview
  const getFlippedStudents = (originalStudents: Student[]): Student[] => {
    if (!isFlipFlopPreviewMode) return originalStudents;
    
    return originalStudents.map(student => {
      if (student.scheduleType?.toLowerCase() === 'flip-flop') {
        return {
          ...student,
          shift: toggleFlipFlopShift(student.shift),
          // Add a flag to indicate this is preview data
          isFlipPreview: true
        };
      }
      return student;
    });
  };

  // Get the students to display (either normal or flipped for preview)
  const displayStudents = getFlippedStudents(students);

  // Function to automatically change flip-flop students' schedules monthly
  const handleFlipFlopScheduleChange = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const currentDay = currentDate.getDate();
      
      // Load settings for early application period
      const settingsStr = localStorage.getItem('flipFlopSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {
        earlyApplicationDays: 2
      };
      
      // Calculate if we're in early application period
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const isInEarlyApplicationPeriod = currentDay > (daysInCurrentMonth - (settings.earlyApplicationDays || 2));
      
      // Determine target month for flip-flop application
      let targetYear = currentYear;
      let targetMonth = currentMonth;
      
      if (isInEarlyApplicationPeriod) {
        if (currentMonth === 11) { // December
          targetYear = currentYear + 1;
          targetMonth = 0; // January
        } else {
          targetMonth = currentMonth + 1;
        }
      }
      
      // Check if already applied for the target month
      const isAlreadyApplied = await flipFlopService.isAppliedForMonth(targetYear, targetMonth);
      if (isAlreadyApplied) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonthName = monthNames[targetMonth];
        toast.info(`Flip-flop schedules have already been updated for ${targetMonthName} ${targetYear}`);
        return;
      }
      
      const flipFlopStudents = students.filter(student => 
        student.scheduleType?.toLowerCase() === 'flip-flop'
      );

      if (flipFlopStudents.length === 0) {
        toast.info('No flip-flop students found to update');
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading(`Updating ${flipFlopStudents.length} flip-flop students...`);

      // Update each flip-flop student's shift
      const updatePromises = flipFlopStudents.map(async (student) => {
        const newShift = toggleFlipFlopShift(student.shift);
        await updateDoc(doc(db, "students", student.id), {
          shift: newShift,
          lastFlipFlopUpdate: serverTimestamp(),
          [`flipFlopHistory.${targetYear}_${targetMonth}`]: {
            previousShift: student.shift,
            newShift: newShift,
            updatedAt: serverTimestamp(),
            updatedBy: 'manual-apply' // You can pass user email here if available
          }
        });
        return { 
          id: student.id,
          name: student.fullName, 
          oldShift: student.shift, 
          newShift,
          class: student.class
        };
      });

      const results = await Promise.all(updatePromises);
      
      // Create tracking record in Firestore
      await flipFlopService.createTrackingRecord(
        targetYear,
        targetMonth,
        students,
        'manual-apply', // You can pass user email here if available
        false // Not baseline
      );
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Mark as applied for the target month in localStorage (for faster client-side checks)
      const monthKey = `flipFlop_${targetYear}_${targetMonth}`;
      localStorage.setItem(monthKey, 'applied');
      localStorage.setItem('flipFlop_lastApplied', currentDate.toISOString());
      
      // Group results by class for better reporting
      const resultsByClass = results.reduce((acc, result) => {
        if (!acc[result.class]) acc[result.class] = [];
        acc[result.class].push(result);
        return acc;
      }, {} as Record<string, typeof results>);

      // Show detailed success message
      const summaryLines = Object.entries(resultsByClass).map(([className, classResults]) => 
        `${className}: ${classResults.length} students`
      ).join(', ');

      toast.success(
        <div className="space-y-2">
          <div className="font-semibold">✅ Flip-flop schedules updated successfully!</div>
          <div className="text-sm">{summaryLines}</div>
          <div className="text-xs text-gray-600">
            Updated on {currentDate.toLocaleDateString()} - Tracked in Firestore
          </div>
        </div>,
        { duration: 8000 }
      );
      
    } catch (error) {
      console.error('Error updating flip-flop schedules:', error);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">❌ Failed to update flip-flop schedules</div>
          <div className="text-sm">Please try again or contact support</div>
        </div>,
        { duration: 6000 }
      );
      throw error; // Re-throw for caller to handle
    }
  };

  // Auto flip-flop check system
  useEffect(() => {
    const checkAndApplyFlipFlopSchedule = async () => {
      // Load user settings
      const settingsStr = localStorage.getItem('flipFlopSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {
        autoApplyEnabled: true,
        autoApplyDelay: 10,
        gracePeriodDays: 7,
        earlyApplicationDays: 2, // Allow application 2 days before month ends
        notificationEnabled: true
      };

      if (!settings.notificationEnabled) return; // Skip if notifications disabled

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based (0 = January, 11 = December)
      const currentDay = now.getDate();
      
      // Calculate if we're in early application period (last 2 days of previous month)
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const isInEarlyApplicationPeriod = currentDay > (daysInCurrentMonth - (settings.earlyApplicationDays || 2));
      
      // Determine target month for flip-flop application
      let targetYear = currentYear;
      let targetMonth = currentMonth;
      
      // If in early application period, target next month
      if (isInEarlyApplicationPeriod) {
        if (currentMonth === 11) { // December
          targetYear = currentYear + 1;
          targetMonth = 0; // January
        } else {
          targetMonth = currentMonth + 1;
        }
      }
      
      // Check if already applied for the target month using Firestore
      try {
        const isAlreadyApplied = await flipFlopService.isAppliedForMonth(targetYear, targetMonth);
        
        // Also check localStorage for faster client-side detection
        const targetMonthKey = `flipFlop_${targetYear}_${targetMonth}`;
        const lastCheckKey = 'flipFlop_lastCheck';
        
        const lastAppliedMonth = localStorage.getItem(targetMonthKey);
        const lastCheckDate = localStorage.getItem(lastCheckKey);
        
        // Parse last check date
        const lastCheck = lastCheckDate ? new Date(lastCheckDate) : null;
        const isNewMonth = !lastCheck || 
                          lastCheck.getMonth() !== currentMonth || 
                          lastCheck.getFullYear() !== currentYear;
        
        // Update last check date
        localStorage.setItem(lastCheckKey, now.toISOString());
        
        // Auto-apply conditions:
        // 1. It's a new month and we haven't applied for the target month yet
        // 2. It's within the grace period OR early application period
        // 3. There are flip-flop students to update
        // 4. Auto-apply is enabled
        const isInGracePeriod = currentDay <= settings.gracePeriodDays && targetMonth === currentMonth;
        const canApply = (isNewMonth && !isAlreadyApplied && !lastAppliedMonth) && 
                        (isInGracePeriod || isInEarlyApplicationPeriod);
        
        if (canApply) {
          const flipFlopStudents = students.filter(student => 
            student.scheduleType?.toLowerCase() === 'flip-flop'
          );

          if (flipFlopStudents.length > 0) {
            if (settings.autoApplyEnabled) {
              // Show notification with auto-apply countdown
              const shouldAutoApply = await showAutoFlipFlopNotification(flipFlopStudents.length, settings.autoApplyDelay);
              
              if (shouldAutoApply) {
                try {
                  await handleFlipFlopScheduleChange();
                  
                  // Show success notification
                  toast.success(`🔄 Flip-flop schedules automatically updated for ${flipFlopStudents.length} students!`, {
                    duration: 5000,
                  });
                } catch (error) {
                  console.error('Auto flip-flop failed:', error);
                  toast.error('Auto flip-flop update failed. Please apply manually.');
                }
              } else {
                // User declined, mark as declined for this month
                localStorage.setItem(targetMonthKey, 'declined');
              }
            } else {
              // Auto-apply disabled, just show reminder
              toast.info(`📅 New month detected! ${flipFlopStudents.length} flip-flop students need schedule updates.`, {
                duration: 7000,
                action: {
                  label: 'Update Now',
                  onClick: () => handleFlipFlopScheduleChange()
                }
              });
            }
          }
        }
        
        // Manual check for users who want to force apply
        const checkDay = isInEarlyApplicationPeriod ? currentDay : 1;
        if ((currentDay === 1 || isInEarlyApplicationPeriod) && lastAppliedMonth === 'declined' && !isAlreadyApplied) {
          const periodText = isInEarlyApplicationPeriod ? 'early application period' : 'new month';
          toast.info(`💡 Reminder: Flip-flop schedules can be updated manually during ${periodText} using the "Apply Flip-Flop" button.`, {
            duration: 7000,
          });
        }
      } catch (error) {
        console.error('Error checking flip-flop status:', error);
        // Fallback to localStorage-only mode if Firestore fails
        const fallbackMonthKey = `flipFlop_${targetYear}_${targetMonth}`;
        const lastAppliedMonth = localStorage.getItem(fallbackMonthKey);
        
        const isInGracePeriod = currentDay <= settings.gracePeriodDays && targetMonth === currentMonth;
        if (!lastAppliedMonth && (isInGracePeriod || isInEarlyApplicationPeriod)) {
          toast.warning('Could not verify flip-flop status. Please check manually.', {
            duration: 5000,
          });
        }
      }
    };

    // Function to show auto-apply notification with countdown
    const showAutoFlipFlopNotification = (studentCount: number, delaySeconds: number): Promise<boolean> => {
      return new Promise((resolve) => {
        let countdown = delaySeconds;
        
        const updateToast = (timeLeft: number) => {
          const toastId = toast.info(
            <div className="flex flex-col space-y-2">
              <div className="font-semibold">🗓️ New Month Detected!</div>
              <div>Auto-updating flip-flop schedules for {studentCount} students...</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-applying in {timeLeft}s</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      toast.dismiss(toastId);
                      resolve(true);
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Apply Now
                  </button>
                  <button 
                    onClick={() => {
                      toast.dismiss(toastId);
                      resolve(false);
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>,
            {
              duration: 1000,
              id: 'auto-flip-flop',
            }
          );
        };

        // Start countdown
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            updateToast(countdown);
          } else {
            clearInterval(countdownInterval);
            toast.dismiss('auto-flip-flop');
            resolve(true); // Auto-apply after countdown
          }
        }, 1000);

        // Initial toast
        updateToast(countdown);
      });
    };

    // Run check after students are loaded and on component mount
    if (students.length > 0) {
      checkAndApplyFlipFlopSchedule();
    }
  }, [students]);

  // Additional effect to check on app focus (when user returns to the app)
  useEffect(() => {
    const handleFocus = () => {
      // Load settings
      const settingsStr = localStorage.getItem('flipFlopSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : { 
        gracePeriodDays: 7, 
        earlyApplicationDays: 2,
        notificationEnabled: true 
      };
      
      if (!settings.notificationEnabled) return;

      // Re-check when user returns to the app (in case they missed the new month)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();
      
      // Calculate if we're in early application period
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const isInEarlyApplicationPeriod = currentDay > (daysInCurrentMonth - (settings.earlyApplicationDays || 2));
      
      // Determine target month
      let targetYear = currentYear;
      let targetMonth = currentMonth;
      
      if (isInEarlyApplicationPeriod) {
        if (currentMonth === 11) { // December
          targetYear = currentYear + 1;
          targetMonth = 0; // January
        } else {
          targetMonth = currentMonth + 1;
        }
      }
      
      const targetMonthKey = `flipFlop_${targetYear}_${targetMonth}`;
      const lastAppliedMonth = localStorage.getItem(targetMonthKey);
      
      // If it's within the grace period or early application period and nothing was applied yet
      const isInGracePeriod = currentDay <= settings.gracePeriodDays && targetMonth === currentMonth;
      if ((isInGracePeriod || isInEarlyApplicationPeriod) && !lastAppliedMonth && students.length > 0) {
        const flipFlopStudents = students.filter(student => 
          student.scheduleType?.toLowerCase() === 'flip-flop'
        );
        
        if (flipFlopStudents.length > 0) {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const targetMonthName = monthNames[targetMonth];
          const periodText = isInEarlyApplicationPeriod ? `early for ${targetMonthName}` : 'for the new month';
          
          toast.info(`📅 Don't forget to update flip-flop schedules ${periodText}! (${flipFlopStudents.length} students)`, {
            duration: 5000,
            action: {
              label: 'Update Now',
              onClick: () => handleFlipFlopScheduleChange()
            }
          });
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [students]);

  // Function to restore dropped student
  const handleRestoreStudent = async (student: Student) => {
    try {
      const updateData: any = {
        restoredAt: serverTimestamp() // Use server timestamp for consistency
      };

      // Handle break students
      if (student.onBreak) {
        updateData.onBreak = false;
        // Optionally clear break-related fields
        updateData.breakStartDate = null;
        updateData.expectedReturnMonth = null;
        updateData.breakReason = null;
      }

      // Handle dropped students
      if (student.dropped) {
        updateData.dropped = false;
      }

      await updateDoc(doc(db, "students", student.id), updateData);
      
      // Real-time listener will automatically update the state
      const statusText = student.onBreak ? 'returned from break' : 'restored to active students';
      toast.success(`${student.fullName} has been ${statusText}`);
      console.log("Student restored:", student.id);
    } catch (err) {
      console.error("Error restoring student:", err);
      toast.error("Failed to restore student. Please try again.");
    }
  };

  // Function to activate waitlist student (move from waitlist to active)
  const handleActivateWaitlistStudent = async (student: Student) => {
    try {
      const updateData: any = {
        onWaitlist: false,
        restoredAt: serverTimestamp() // Use server timestamp for consistency
      };

      // Optionally clear waitlist-related fields
      updateData.waitlistDate = null;
      updateData.waitlistReason = null;

      await updateDoc(doc(db, "students", student.id), updateData);
      
      // Real-time listener will automatically update the state
      toast.success(`${student.fullName} has been activated and moved to active students`);
      console.log("Student activated from waitlist:", student.id);
    } catch (err) {
      console.error("Error activating waitlist student:", err);
      toast.error("Failed to activate student. Please try again.");
    }
  };

  // Modal functions for student details
  const handleViewDetails = (student: Student) => {
    // For dropped students, we'll use them as the list
    const studentList = droppedStudents;
    const index = studentList.findIndex(s => s.id === student.id);
    setSelectedStudent(student);
    setSelectedIndex(index);
    setCurrentStudentList(studentList);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setSelectedIndex(-1);
    setCurrentStudentList([]);
  };

  const handleNavigate = (student: Student, index: number) => {
    setSelectedStudent(student);
    setSelectedIndex(index);
  };

  return (
    <SectionMain>

      <SectionTitleLineWithButton
        icon={mdiTableBorder}
        title="Students"
        main
      >
        {!isFormActive && ( // Use isFormActive here
          <>
          {/* Mobile-first responsive layout */}
          <div className="w-full">
            {/* Primary actions row - always visible */}
            <div className="flex flex-wrap items-center justify-end gap-2 mb-2 sm:mb-0">
              <Button
                onClick={handleToggleTakeAttendance}
                icon={mdiClipboardCheck}
                label={isTakeAttendanceMode ? "Exit Take Attendance" : "Take Attendance"}
                color={isTakeAttendanceMode ? "danger" : "company-purple"}
                roundedFull
                small
              />
              <Button
                onClick={handleShowCreateForm}
                icon={mdiAccountPlus}
                label="Create Student"
                color="white"
                roundedFull
                small
              />
              <Button
                onClick={() => setIsButtonsExpanded(!isButtonsExpanded)}
                icon={isButtonsExpanded ? mdiChevronUp : mdiChevronDown}
                label={isButtonsExpanded ? "Less" : "More"}
                color={isButtonsExpanded ? "white" : "void"}
                roundedFull
                small
              />
            </div>
            
            {/* Secondary actions row - toggleable */}
            {isButtonsExpanded && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
                <Button
                  onClick={() => setShowAbsentFollowUp(!showAbsentFollowUp)}
                  icon={mdiAccountOff}
                  label={showAbsentFollowUp ? "Hide Follow-ups" : "Absent Follow-ups"}
                  color={showAbsentFollowUp ? "danger" : "info"}
                  roundedFull
                  small
                />
                <Button
                  onClick={handleToggleBatchEdit}
                  icon={mdiPencilBox}
                  label={isBatchEditMode ? "Exit Batch Edit" : "Batch Edit"}
                  color={isBatchEditMode ? "danger" : "warning"}
                  roundedFull
                  small
                />
                <Button
                  onClick={() => setIsExportModalOpen(true)}
                  icon={mdiDownload}
                  label="Export"
                  color="success"
                  roundedFull
                  small
                />
                <Button
                  onClick={handleToggleFlipFlopPreview}
                  icon={mdiMonitorCellphone}
                  label={isFlipFlopPreviewMode ? "Exit Flip Preview" : "Flip Preview"}
                  color={isFlipFlopPreviewMode ? "danger" : "info"}
                  roundedFull
                  small
                />
                <Button
                  onClick={handleFlipFlopScheduleChange}
                  icon={mdiClipboardCheck}
                  label="Apply Flip-Flop"
                  color="warning"
                  roundedFull
                  small
                />
              </div>
            )}
          </div>
          </>
        )}
      </SectionTitleLineWithButton>

      {error && (
        <NotificationBar color="danger" icon={mdiMonitorCellphone} className="mb-4">
          {error}
        </NotificationBar>
      )}

      {isFlipFlopPreviewMode && (
        <NotificationBar color="info" icon={mdiMonitorCellphone} className="mb-4">
          <div className="flex items-center justify-between">
            <span>
              <strong>Flip-Flop Preview Mode:</strong> Showing how students will be scheduled next month. 
              Flip-flop students have their shifts toggled (Morning ↔ Afternoon).
            </span>
            <button 
              onClick={handleToggleFlipFlopPreview}
              className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Exit Preview
            </button>
          </div>
        </NotificationBar>
      )}

      {/* Flip-flop status indicator */}
      {students.filter(s => s.scheduleType?.toLowerCase() === 'flip-flop').length > 0 && !isFormActive && (
        <div className="mb-4">
          <FlipFlopStatusIndicator 
            students={students}
            onApplyFlipFlop={handleFlipFlopScheduleChange}
          />
        </div>
      )}
      
      {isFormActive && ( 
        <CardBox className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {studentToEdit ? "Edit Student" : "Add New Student"}
            </h2>
            {studentToEdit ? (
              <EditStudentForm
                onStudentUpdated={handleStudentFormSubmit}
                onCancel={handleFormClose}
                studentData={studentToEdit}
              />
            ) : (
              <AddStudentForm
                onStudentAdded={handleStudentFormSubmit}
                onCancel={handleFormClose}
              />
            )}
          </div>
        </CardBox>
      )}

      {/* Absent Follow-Up Dashboard */}
      {showAbsentFollowUp && !isFormActive && !isDeleteModalActive && (
        <CardBox className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Absent Follow-Up Dashboard</h2>
            
            {/* Date and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class (Optional)
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Classes</option>
                  <option value="Class 10A">Class 10A</option>
                  <option value="Class 10B">Class 10B</option>
                  <option value="Class 11A">Class 11A</option>
                  <option value="Class 11B">Class 11B</option>
                  <option value="Class 12A">Class 12A</option>
                  <option value="Class 12B">Class 12B</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shift (Optional)
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
            </div>
            
            <AbsentFollowUpDashboard 
              selectedDate={selectedDate}
              selectedClass={selectedClass}
              selectedShift={selectedShift}
              onViewDetails={handleViewDetails}
            />
          </div>
        </CardBox>
      )}

      {/* Waitlist Students Section - Show above active students when not in specific modes */}
      {!isFormActive && 
       !isDeleteModalActive && 
       !isTakeAttendanceMode && 
       !isBatchEditMode && 
       !studentToEdit &&
       !showAbsentFollowUp && (
        <WaitlistStudentsSection
          waitlistStudents={waitlistStudents}
          showWaitlistStudents={showWaitlistStudents}
          onToggleShow={() => setShowWaitlistStudents(!showWaitlistStudents)}
          onActivateStudent={handleActivateWaitlistStudent}
          onViewDetails={handleViewDetails}
        />
      )}

      {!isFormActive && ( // Use isFormActive here
        <>
          {loading ? (
            <p className="text-center p-4">Loading students...</p>
          ) : students.length === 0 && !error ? (
            <NotificationBar color="warning" icon={mdiMonitorCellphone}>
              No students found. Add one to get started!
            </NotificationBar>
          ) : !showAbsentFollowUp ? (
            <CardBox className="mb-6" hasTable>
              <TableStudents
                students={displayStudents}
                onEdit={handleEditStudent} // Pass the updated handler
                onDelete={handleDeleteStudent}
                isBatchEditMode={isBatchEditMode}
                isTakeAttendanceMode={isTakeAttendanceMode}
                isFlipFlopPreviewMode={isFlipFlopPreviewMode}
                onBatchUpdate={() => {}} // No need to manually refresh - real-time listener handles updates
                onExitBatchEdit={() => setIsBatchEditMode(false)}
                onExitTakeAttendance={() => setIsTakeAttendanceMode(false)}
              />
            </CardBox>
          ) : null}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <CardBoxModal
        title="Please Confirm Drop"
        buttonColor="danger"
        buttonLabel="Drop Student"
        isActive={isDeleteModalActive}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setIsDeleteModalActive(false)}
      >
        <p>Are you sure you want to drop student: <b>{studentToDelete?.fullName}</b>?</p>
        <p>This student will be moved to the dropped students list and can be restored later.</p>
      </CardBoxModal>

      {/* Dropped Students Section - Hide when in specific modes */}
      {!isFormActive && 
       !isDeleteModalActive && 
       !isTakeAttendanceMode && 
       !isBatchEditMode && 
       !studentToEdit &&
       !showAbsentFollowUp && (
        <DroppedStudentsSection
          droppedStudents={droppedStudents}
          showDroppedStudents={showDroppedStudents}
          onToggleShow={() => setShowDroppedStudents(!showDroppedStudents)}
          onRestoreStudent={handleRestoreStudent}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEditStudent}
        onDelete={handleDeleteStudent}
        students={currentStudentList}
        currentIndex={selectedIndex}
        onNavigate={handleNavigate}
        onBreak={() => {}} // No need to manually refresh - real-time listener handles updates
      />

      {/* Export Students Modal */}
      <ExportStudentsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        title="Export Students to Excel"
      />
    </SectionMain>
  );
}