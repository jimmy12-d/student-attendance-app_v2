"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  mdiAccountPlus,
  mdiMonitorCellphone,
  mdiTableBorder,
  mdiPencilBox,
  mdiClipboardCheck,
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
import { StudentDetailsModal } from "./components/StudentDetailsModal";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, deleteDoc, doc, Timestamp, query, where, updateDoc, serverTimestamp } from "firebase/firestore";

// Interface
import { Student } from "../../_interfaces"; // Ensure this path is correct

export default function StudentsPage() {
  const [isFormActive, setIsFormActive] = useState(false); // Renamed from isAddingStudent
  const [students, setStudents] = useState<Student[]>([]);
  const [droppedStudents, setDroppedStudents] = useState<Student[]>([]);
  const [showDroppedStudents, setShowDroppedStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("ay", "==", "2026"));
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
      })) as Student[];
      
      // Separate active, dropped, and break students
      const activeStudents = studentsData.filter(student => !student.dropped && !student.onBreak);
      const droppedStudentsData = studentsData.filter(student => student.dropped || student.onBreak);
      
      setStudents(activeStudents);
      setDroppedStudents(droppedStudentsData);
    } catch (err) {
      console.error("Error fetching students: ", err);
      setError("Failed to fetch students. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
    console.log(`Student ${studentToEdit ? 'updated' : 'added'}: ${studentId}. Refreshing list.`);
    fetchStudents(); // Refresh the list
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
        
        // Move student from active to dropped list
        setStudents(prevStudents => prevStudents.filter(s => s.id !== studentToDelete.id));
        setDroppedStudents(prevDropped => [...prevDropped, { ...studentToDelete, dropped: true }]);
        
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
      
      // Move student from active to dropped list
      setStudents(prevStudents => prevStudents.filter(s => s.id !== student.id));
      setDroppedStudents(prevDropped => [...prevDropped, { ...student, dropped: true }]);
      
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
      
      // Move student from dropped to active list
      setDroppedStudents(prevDropped => prevDropped.filter(s => s.id !== student.id));
      setStudents(prevStudents => [...prevStudents, { 
        ...student, 
        dropped: false, 
        onBreak: false,
        breakStartDate: undefined,
        expectedReturnMonth: undefined,
        breakReason: undefined
      }]);
      
      const statusText = student.onBreak ? 'returned from break' : 'restored to active students';
      toast.success(`${student.fullName} has been ${statusText}`);
      console.log("Student restored:", student.id);
    } catch (err) {
      console.error("Error restoring student:", err);
      toast.error("Failed to restore student. Please try again.");
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
            <Button
              onClick={handleToggleTakeAttendance}
              icon={mdiClipboardCheck}
              label={isTakeAttendanceMode ? "Exit Take Attendance" : "Take Attendance"}
              color={isTakeAttendanceMode ? "danger" : "info"}
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
              onClick={handleShowCreateForm} // Changed to show create form
              icon={mdiAccountPlus}
              label="Create Student"
              color="white"
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

      {!isFormActive && ( // Use isFormActive here
        <>
          {loading ? (
            <p className="text-center p-4">Loading students...</p>
          ) : students.length === 0 && !error ? (
            <NotificationBar color="warning" icon={mdiMonitorCellphone}>
              No students found. Add one to get started!
            </NotificationBar>
          ) : (
            <CardBox className="mb-6" hasTable>
              <TableStudents
                students={students}
                onEdit={handleEditStudent} // Pass the updated handler
                onDelete={handleDeleteStudent}
                isBatchEditMode={isBatchEditMode}
                isTakeAttendanceMode={isTakeAttendanceMode}
                onBatchUpdate={fetchStudents}
                onExitBatchEdit={() => setIsBatchEditMode(false)}
                onExitTakeAttendance={() => setIsTakeAttendanceMode(false)}
              />
            </CardBox>
          )}
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
       !studentToEdit && (
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
        onBreak={fetchStudents} // Refresh data after break operation
      />
    </SectionMain>
  );
}