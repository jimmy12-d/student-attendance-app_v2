"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  mdiAccountPlus,
  mdiMonitorCellphone,
  mdiTableBorder,
  mdiPencilBox,
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
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, deleteDoc, doc, Timestamp, query, where } from "firebase/firestore";

// Interface
import { Student } from "../../_interfaces"; // Ensure this path is correct

export default function StudentsPage() {
  const [isFormActive, setIsFormActive] = useState(false); // Renamed from isAddingStudent
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteModalActive, setIsDeleteModalActive] = useState(false);

  // State for student to be edited
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Batch edit state
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);

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
      setStudents(studentsData);
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
        await deleteDoc(doc(db, "students", studentToDelete.id));
        setStudents(prevStudents => prevStudents.filter(s => s.id !== studentToDelete.id));
        toast.success(`${studentToDelete.fullName} has been deleted successfully`);
        console.log("Student deleted:", studentToDelete.id);
      } catch (err) {
        console.error("Error deleting student:", err);
        toast.error("Failed to delete student. Please try again.");
        setError("Failed to delete student.");
      }
    }
    setIsDeleteModalActive(false);
    setStudentToDelete(null);
  };

  // Delete function for modal (used by the new modal delete button)
  const handleDeleteStudent = async (student: Student) => {
    try {
      await deleteDoc(doc(db, "students", student.id));
      setStudents(prevStudents => prevStudents.filter(s => s.id !== student.id));
      console.log("Student deleted:", student.id);
    } catch (err) {
      console.error("Error deleting student:", err);
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
                onBatchUpdate={fetchStudents}
                onExitBatchEdit={() => setIsBatchEditMode(false)}
              />
            </CardBox>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <CardBoxModal
        title="Please Confirm Delete"
        buttonColor="danger"
        buttonLabel="Confirm Delete"
        isActive={isDeleteModalActive}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setIsDeleteModalActive(false)}
      >
        <p>Are you sure you want to delete student: <b>{studentToDelete?.fullName}</b>?</p>
        <p>This action cannot be undone.</p>
      </CardBoxModal>
    </SectionMain>
  );
}