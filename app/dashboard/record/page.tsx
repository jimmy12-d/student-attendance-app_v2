// app/dashboard/record/page.tsx (NEW REAL-TIME VERSION)
"use client";

import React, { useState, useEffect } from "react";
import { mdiClipboardListOutline, mdiTrashCan } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import CardBoxModal from "../../_components/CardBox/Modal";
import NotificationBar from "../../_components/NotificationBar";
import TableAttendance, { AttendanceRecord } from "./TableAttendance";
import { Student } from "../../_interfaces";

import { db } from "../../../firebase-config";
// VVVV  IMPORT onSnapshot, query, and orderBy  VVVV
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  getDocs,
  Timestamp
} from "firebase/firestore";

export default function AttendanceRecordPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete confirmation modal
  const [isDeleteModalActive, setIsDeleteModalActive] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    setLoading(true);

    const fetchAndListen = async () => {
        // First, get a static map of all students. 
        // This is efficient if your student list doesn't change often.
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const studentsMap = new Map<string, Student>();
        studentsSnapshot.forEach(docSnap => {
            studentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Student);
        });

        const recordsCollection = collection(db, "attendance");
        // Create a query to order records by timestamp, with the newest ones first
        const q = query(recordsCollection, orderBy("timestamp", "desc"));

        // Set up the real-time listener on the attendance collection
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedRecords: AttendanceRecord[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const student = studentsMap.get(data.studentId); // Look up student from our map

                return {
                    id: docSnap.id,
                    studentName: student ? student.fullName : (data.studentName || 'Unknown'),
                    studentId: data.studentId,
                    class: student ? student.class : (data.class || 'N/A'),
                    shift: student ? student.shift : (data.shift || 'N/A'),
                    status: data.status || 'Unknown',
                    date: data.date,
                    timestamp: data.timestamp, // Ensure this field name is correct
                } as AttendanceRecord;
            });
            setAttendanceRecords(fetchedRecords);
            setLoading(false);
        }, (error) => {
            console.error("Error with real-time listener: ", error);
            setError("Failed to listen for attendance updates.");
            setLoading(false);
        });

        // Return a cleanup function to unsubscribe from the listener when the component unmounts
        return unsubscribe;
    };

    const unsubscribePromise = fetchAndListen();

    return () => {
        unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []); // Empty array ensures the listener is set up only once

  const handleOpenDeleteModal = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalActive(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDoc(doc(db, "attendance", recordToDelete.id));
      // No need to manually update state, onSnapshot will handle the update automatically!
    } catch (err) {
      console.error("Error deleting record: ", err);
      showFeedback('error', 'Failed to delete record.');
    }
    setIsDeleteModalActive(false);
    setRecordToDelete(null);
  };

  // Dummy showFeedback function if you don't have one
  const showFeedback = (type: string, message: string) => {
      alert(message);
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiClipboardListOutline}
        title="Attendance Records"
        main
      />

      {error && (
        <NotificationBar color="danger" icon={mdiClipboardListOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading records...</p>
        ) : (
          <TableAttendance
            records={attendanceRecords}
            onDeleteRecord={handleOpenDeleteModal}
          />
        )}
      </CardBox>

      {recordToDelete && (
        <CardBoxModal
          title="Confirm Delete"
          buttonColor="danger"
          buttonLabel="Delete"
          isActive={isDeleteModalActive}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteModalActive(false)}
        >
          <p>Are you sure you want to delete this record?</p>
        </CardBoxModal>
      )}
    </SectionMain>
  );
}