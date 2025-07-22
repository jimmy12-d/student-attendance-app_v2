// app/dashboard/record/page.tsx (NEW REAL-TIME VERSION)
"use client";

import React, { useState, useEffect } from "react";
import { mdiClipboardListOutline, mdiAlertCircleOutline } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import CardBoxModal from "../../_components/CardBox/Modal";
import NotificationBar from "../../_components/NotificationBar";
import TableAttendance, { AttendanceRecord } from "./TableAttendance";
import { Student, ColorButtonKey } from "../../_interfaces";
import { toast } from 'sonner'


import { db } from "../../../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";

export default function AttendanceRecordPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modal
  const [isModalActive, setIsModalActive] = useState(false);
  const [recordInModal, setRecordInModal] = useState<AttendanceRecord | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'delete' | null>(null);


  useEffect(() => {
    setLoading(true);

    const fetchAndListen = async () => {
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const studentsMap = new Map<string, Student>();
        studentsSnapshot.forEach(docSnap => {
            studentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Student);
        });

        const recordsCollection = collection(db, "attendance");
        const q = query(recordsCollection, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedRecords: AttendanceRecord[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const student = studentsMap.get(data.studentId);

                return {
                    id: docSnap.id,
                    studentName: student ? student.fullName : (data.studentName || 'Unknown'),
                    studentId: data.studentId,
                    class: student ? student.class : (data.class || 'N/A'),
                    shift: student ? student.shift : (data.shift || 'N/A'),
                    status: data.status || 'Unknown',
                    date: data.date,
                    timestamp: data.timestamp,
                } as AttendanceRecord;
            }).filter(record => record.status);
            
            // Separate pending records and put them at the top
            const pendingRecords = fetchedRecords.filter(r => r.status === 'pending');
            const otherRecords = fetchedRecords.filter(r => r.status !== 'pending');
            
            setAttendanceRecords([...pendingRecords, ...otherRecords]);
            setLoading(false);
        }, (error) => {
            console.error("Error with real-time listener: ", error);
            setError("Failed to listen for attendance updates.");
            setLoading(false);
        });

        return unsubscribe;
    };

    const unsubscribePromise = fetchAndListen();

    return () => {
        unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  const handleApproveRecord = (record: AttendanceRecord) => {
    setRecordInModal(record);
    setModalAction('approve');
    setIsModalActive(true);
  };
  
  const handleDeleteOrRejectRecord = (record: AttendanceRecord, reason: 'rejected' | 'deleted') => {
    setRecordInModal(record);
    setModalAction(reason === 'rejected' ? 'reject' : 'delete');
    setIsModalActive(true);
  };

  const handleConfirmAction = async () => {
    if (!recordInModal || !modalAction) return;
    
    const recordId = recordInModal.id;

    try {
        if (modalAction === 'approve') {
            const recordRef = doc(db, "attendance", recordId);
            await updateDoc(recordRef, {
                status: 'present', // Or logic to determine 'late'
                approvedAt: serverTimestamp(),
                approvedBy: 'Admin' // Replace with actual admin user
            });
            toast.success(`Approved attendance for ${recordInModal.studentName}.`);
        } else if (modalAction === 'reject') {
            const recordRef = doc(db, "attendance", recordId);
            await updateDoc(recordRef, {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectedBy: 'Admin'
            });
             toast.warning(`Rejected attendance for ${recordInModal.studentName}.`);
        } else if (modalAction === 'delete') {
            await deleteDoc(doc(db, "attendance", recordId));
            toast.success("Record deleted successfully.");
        }
    } catch (err) {
      console.error(`Error processing action: ${modalAction}`, err);
      toast.error(`Failed to ${modalAction} record.`);
    }
    
    setIsModalActive(false);
    setRecordInModal(null);
    setModalAction(null);
  };
  
  const getModalContent = () => {
    if (!modalAction || !recordInModal) return { title: '', buttonColor: 'info' as ColorButtonKey, buttonLabel: '', content: '' };
    switch(modalAction) {
      case 'approve':
        return {
          title: "Confirm Approval",
          buttonColor: 'success' as ColorButtonKey,
          buttonLabel: "Approve",
          content: `Are you sure you want to mark ${recordInModal.studentName} as present?`
        };
      case 'reject':
         return {
          title: "Confirm Rejection",
          buttonColor: 'danger' as ColorButtonKey,
          buttonLabel: "Reject",
          content: `Are you sure you want to reject the attendance request for ${recordInModal.studentName}?`
        };
      case 'delete':
        return {
          title: "Confirm Deletion",
          buttonColor: 'danger' as ColorButtonKey,
          buttonLabel: "Delete",
          content: `Are you sure you want to permanently delete this record for ${recordInModal.studentName}? This cannot be undone.`
        };
      default:
        return { title: 'Confirm Action', buttonColor: 'info' as ColorButtonKey, buttonLabel: 'Confirm', content: 'Are you sure?' };
    }
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiClipboardListOutline}
        title="Attendance Records"
        main
      />

      {error && (
        <NotificationBar color="danger" icon={mdiAlertCircleOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}

      <CardBox className="mb-6 rounded-lg shadow" hasTable>
        {loading ? (
          <p className="p-6 text-center">Loading records...</p>
        ) : (
          <TableAttendance
            records={attendanceRecords}
            onApproveRecord={handleApproveRecord}
            onDeleteRecord={handleDeleteOrRejectRecord}
          />
        )}
      </CardBox>

      {isModalActive && recordInModal && (
        <CardBoxModal
          title={getModalContent().title}
          buttonColor={getModalContent().buttonColor}
          buttonLabel={getModalContent().buttonLabel}
          isActive={isModalActive}
          onConfirm={handleConfirmAction}
          onCancel={() => setIsModalActive(false)}
        >
          <p>{getModalContent().content}</p>
        </CardBoxModal>
      )}
    </SectionMain>
  );
}