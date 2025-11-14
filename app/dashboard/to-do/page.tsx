// app/dashboard/to-do/page.tsx
"use client";

// Force dynamic rendering - this page uses real-time Firebase listeners
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect } from "react";
import { mdiClipboardCheckOutline, mdiPlus, mdiRefresh } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import NotificationBar from "../../_components/NotificationBar";
import DashboardLoading from "../../_components/DashboardLoading";
import ContactTasksTable from "./components/ContactTasksTable";
import { StudentDetailsModal } from "../students/components/StudentDetailsModal";
import { Student, PermissionRecord, ContactTask } from "../../_interfaces";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { RawAttendanceRecord, calculateConsecutiveAbsences } from "../_lib/attendanceLogic";

import { db } from "../../../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from "firebase/firestore";

export default function ToDoPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [rawAttendanceRecords, setRawAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [contactTasks, setContactTasks] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  
  // State for student detail modal
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);

  // Fetch students from Firebase (only active students)
  useEffect(() => {
    const studentsQuery = query(
      collection(db, "students"),
      orderBy("fullName")
    );
    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const studentsData: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out dropped, on-break, and waitlisted students
          if (!data.dropped && !data.onBreak && !data.onWaitlist) {
            studentsData.push({ id: doc.id, ...data } as Student);
          }
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

  // Fetch contact tasks from Firebase
  useEffect(() => {
    const tasksQuery = query(
      collection(db, "contactTasks"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData: ContactTask[] = [];
        snapshot.forEach((doc) => {
          tasksData.push({ id: doc.id, ...doc.data() } as ContactTask);
        });
        setContactTasks(tasksData);
      },
      (error) => {
        console.error("Error fetching contact tasks:", error);
        setError("Failed to load contact tasks");
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-generate tasks for students with issues
  const generateTasksForStudents = async () => {
    if (!students.length || !rawAttendanceRecords.length || !allClassConfigs) {
      return;
    }

    setIsGeneratingTasks(true);
    const today = new Date().toISOString().split('T')[0];
    const newTasks: Omit<ContactTask, 'id'>[] = [];
    const existingTaskStudentIds = new Set(contactTasks.map(t => t.studentId));

    // Find students with consecutive absences (2+ days)
    students.forEach(student => {
      // Skip if task already exists for this student
      if (existingTaskStudentIds.has(student.id)) return;

      const studentAttendance = rawAttendanceRecords.filter(att => att.studentId === student.id);
      const studentPermissions = permissions.filter(p => p.studentId === student.id);
      const result = calculateConsecutiveAbsences(student, studentAttendance, allClassConfigs, studentPermissions, 20);
      
      if (result.count >= 2) {
        newTasks.push({
          studentId: student.id,
          studentName: student.fullName,
          class: student.class,
          shift: student.shift,
          taskType: 'consecutive',
          reason: `${result.count} consecutive school day absences. Last absent: ${result.details || 'Unknown'}`,
          assignedTo: '',
          status: 'waiting',
          createdAt: new Date(),
          updatedAt: new Date(),
          consecutiveDays: result.count,
          lastAbsentDate: result.details || today,
          autoGenerated: true
        });
      }
    });

    // Find warning students with absent status today
    students.forEach(student => {
      if (student.warning !== true) return;
      // Skip if task already exists for this student
      if (existingTaskStudentIds.has(student.id)) return;

      const studentAttendance = rawAttendanceRecords.filter(att => att.studentId === student.id);
      const todayAttendance = studentAttendance.find(att => att.date === today);
      
      // Only create task if absent today
      if (todayAttendance && todayAttendance.status === 'absent') {
        newTasks.push({
          studentId: student.id,
          studentName: student.fullName,
          class: student.class,
          shift: student.shift,
          taskType: 'warning',
          reason: `Warning student marked absent on ${today}. ${student.note || 'Check attendance pattern.'}`,
          assignedTo: '',
          status: 'waiting',
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: student.note,
          autoGenerated: true
        });
      }
    });

    // Add tasks to Firebase
    try {
      for (const task of newTasks) {
        await addDoc(collection(db, "contactTasks"), task);
      }
      console.log(`Generated ${newTasks.length} new contact tasks`);
    } catch (error) {
      console.error("Error generating tasks:", error);
      setError("Failed to generate tasks");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ContactTask>) => {
    try {
      await updateDoc(doc(db, "contactTasks", taskId), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "contactTasks", taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  const handleOpenDetailsModal = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setStudentForDetailModal(student);
      setIsDetailModalActive(true);
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailModalActive(false);
    setStudentForDetailModal(null);
  };

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <>
      <SectionMain>
        <div className="flex items-center justify-between mb-6">
          <SectionTitleLineWithButton icon={mdiClipboardCheckOutline} title="Student Contact Tasks" main />
          
          <div className="flex gap-2">
            <button
              onClick={generateTasksForStudents}
              disabled={isGeneratingTasks || !students.length || !allClassConfigs}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d={isGeneratingTasks ? mdiRefresh : mdiPlus} />
              </svg>
              {isGeneratingTasks ? 'Generating...' : 'Generate New Tasks'}
            </button>
          </div>
        </div>

        {error && (
          <NotificationBar color="danger" className="mb-6">
            {error}
          </NotificationBar>
        )}

        <div className="mb-4">
          <NotificationBar color="info">
            <div className="text-sm">
              <strong>Task Management:</strong> This page tracks students requiring follow-up contact.
              Tasks are generated for students with 2+ consecutive absences or warning flags with absent status.
              Use filters to manage tasks and update status as you contact parents.
            </div>
          </NotificationBar>
        </div>

        {/* Contact Tasks Table */}
        <ContactTasksTable
          tasks={contactTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onViewStudent={handleOpenDetailsModal}
        />
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
