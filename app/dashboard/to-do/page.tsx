// app/dashboard/to-do/page.tsx
"use client";

// Force dynamic rendering - this page uses real-time Firebase listeners
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect } from "react";
import { mdiClipboardCheckOutline } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import NotificationBar from "../../_components/NotificationBar";
import LoadingSpinner from "../../_components/LoadingSpinner";
import ConsecutiveAbsencesSection from "./components/ConsecutiveAbsencesSection";
import WarningStudentsSection from "./components/WarningStudentsSection";
import { StudentDetailsModal } from "../students/components/StudentDetailsModal";
import { Student, PermissionRecord } from "../../_interfaces";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { RawAttendanceRecord } from "../_lib/attendanceLogic";

import { db } from "../../../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";

export default function ToDoPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [rawAttendanceRecords, setRawAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for student detail modal
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);

  // Fetch students from Firebase
  useEffect(() => {
    const studentsQuery = query(collection(db, "students"), orderBy("fullName"));
    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const studentsData: Student[] = [];
        snapshot.forEach((doc) => {
          studentsData.push({ id: doc.id, ...doc.data() } as Student);
        });
        setStudents(studentsData);
      },
      (error) => {
        console.error("Error fetching students:", error);
        setError("Failed to load students");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch raw attendance records from Firebase (last 90 days for analysis)
  useEffect(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

    // Use orderBy only - filter by date in client side to avoid composite index requirement
    const attendanceQuery = query(
      collection(db, "attendance"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records: RawAttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Client-side filter for last 90 days
          if (data.date >= cutoffDate) {
            records.push({
              id: doc.id,
              studentId: data.studentId,
              date: data.date,
              status: data.status,
              timeIn: data.timeIn,
              timestamp: data.timestamp
            });
          }
        });
        setRawAttendanceRecords(records);
      },
      (error) => {
        console.error("Error fetching attendance records:", error);
        setError("Failed to load attendance records");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch permissions from Firebase
  useEffect(() => {
    const permissionsQuery = query(
      collection(db, "permissions"),
      where("status", "==", "approved")
    );

    const unsubscribe = onSnapshot(
      permissionsQuery,
      (snapshot) => {
        const permissionsData: PermissionRecord[] = [];
        snapshot.forEach((doc) => {
          permissionsData.push({ id: doc.id, ...doc.data() } as PermissionRecord);
        });
        setPermissions(permissionsData);
      },
      (error) => {
        console.error("Error fetching permissions:", error);
        setError("Failed to load permissions");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch class configurations
  useEffect(() => {
    const fetchClassConfigs = async () => {
      try {
        const snapshot = await getDocs(collection(db, "classConfigs"));
        const configs: AllClassConfigs = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          configs[doc.id] = {
            name: data.name || doc.id,
            shifts: data.shifts || {},
            studyDays: data.studyDays || []
          };
        });
        
        setAllClassConfigs(configs);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching class configs:", error);
        setError("Failed to load class configurations");
        setLoading(false);
      }
    };

    fetchClassConfigs();
  }, []);

  const handleOpenDetailsModal = (student: Student) => {
    setStudentForDetailModal(student);
    setIsDetailModalActive(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailModalActive(false);
    setStudentForDetailModal(null);
  };

  if (loading) {
    return (
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiClipboardCheckOutline} title="To-Do List" main />
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </SectionMain>
    );
  }

  return (
    <>
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiClipboardCheckOutline} title="To-Do List" main />

        {error && (
          <NotificationBar color="danger" className="mb-6">
            {error}
          </NotificationBar>
        )}

        <div className="space-y-6">
          {/* Consecutive Absences Section */}
          <ConsecutiveAbsencesSection
            students={students}
            attendanceRecords={rawAttendanceRecords}
            allClassConfigs={allClassConfigs}
            approvedPermissions={permissions}
            onViewDetails={handleOpenDetailsModal}
          />

          {/* Warning Students Section */}
          <WarningStudentsSection
            students={students}
            attendanceRecords={rawAttendanceRecords}
            allClassConfigs={allClassConfigs}
            approvedPermissions={permissions}
            onViewDetails={handleOpenDetailsModal}
          />
        </div>
      </SectionMain>

      {/* Student Details Modal */}
      {isDetailModalActive && studentForDetailModal && (
        <StudentDetailsModal
          isOpen={isDetailModalActive}
          onClose={handleCloseDetailsModal}
          student={studentForDetailModal}
          onEdit={(updatedStudent) => {
            // Refresh will happen automatically via Firebase listeners
            console.log("Student updated:", updatedStudent);
          }}
          onDelete={(deletedStudent) => {
            // Refresh will happen automatically via Firebase listeners
            console.log("Student deleted:", deletedStudent);
            handleCloseDetailsModal();
          }}
        />
      )}
    </>
  );
}
