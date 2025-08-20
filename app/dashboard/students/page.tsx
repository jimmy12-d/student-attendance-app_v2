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

  // --- Delete Logic ---
  const openDeleteModal = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalActive(true);
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
          <div className="flex items-center space-x-4"> {/* New flex container for the buttons */}
            {/* Batch Edit and Export buttons - only show when expanded */}
            {isButtonsExpanded && (
              <>
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
              </>
            )}
            
            {/* Main action buttons - always visible */}
            <Button
              onClick={() => setShowAbsentFollowUp(!showAbsentFollowUp)}
              icon={mdiAccountOff}
              label={showAbsentFollowUp ? "Hide Follow-ups" : "Absent Follow-ups"}
              color={showAbsentFollowUp ? "danger" : "info"}
              roundedFull
              small
            />
            <Button
              onClick={handleToggleTakeAttendance}
              icon={mdiClipboardCheck}
              label={isTakeAttendanceMode ? "Exit Take Attendance" : "Take Attendance"}
              color={isTakeAttendanceMode ? "danger" : "company-purple"}
              roundedFull
              small
            />
            <Button
              onClick={handleShowCreateForm} // Changed to show create form
              icon={mdiAccountPlus}
              label="Create Student"
              color="white"
              roundedFull
              small
            />
            
            {/* Expand/Collapse button */}
            <Button
              onClick={() => setIsButtonsExpanded(!isButtonsExpanded)}
              icon={isButtonsExpanded ? mdiChevronUp : mdiChevronDown}
              label={isButtonsExpanded ? "Less" : "More"}
              color={isButtonsExpanded ? "white" : "void"}
              roundedFull
              small
            />
             </div>
          </>
        )}
      </SectionTitleLineWithButton>

      {error && (
        <NotificationBar color="danger" icon={mdiMonitorCellphone} className="mb-4">
          {error}
        </NotificationBar>
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
                students={students}
                onEdit={handleEditStudent} // Pass the updated handler
                onDelete={handleDeleteStudent}
                isBatchEditMode={isBatchEditMode}
                isTakeAttendanceMode={isTakeAttendanceMode}
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