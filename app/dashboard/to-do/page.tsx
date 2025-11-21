// app/dashboard/to-do/page.tsx
"use client";

// Force dynamic rendering - this page uses real-time Firebase listeners
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect } from "react";
import { mdiClipboardCheckOutline, mdiPlus, mdiRefresh, mdiFilter, mdiClose } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import NotificationBar from "../../_components/NotificationBar";
import DashboardLoading from "../../_components/DashboardLoading";
import ContactTasksTable from "./components/ContactTasksTable";
import { TaskPreviewModal } from "./components/TaskPreviewModal";
import { StudentDetailsModal } from "../students/components/StudentDetailsModal";
import DatePicker from "../../_components/DatePicker";
import { Student, PermissionRecord, ContactTask } from "../../_interfaces";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { RawAttendanceRecord, calculateConsecutiveAbsences, getStudentDailyStatus } from "../_lib/attendanceLogic";

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
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // State for student detail modal
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);
  
  // State for task preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<Array<Omit<ContactTask, 'id'> & { previewId: string; isUpdate?: boolean; existingTaskId?: string }>>([]);

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
        const snapshot = await getDocs(collection(db, "classes"));
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

  // Calculate tasks to be generated (for preview)
  const calculateTasksToGenerate = () => {
    if (!students.length || !rawAttendanceRecords.length || !allClassConfigs) {
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const newTasks: Array<(Omit<ContactTask, 'id'> & { previewId: string; isUpdate?: boolean; existingTaskId?: string })> = [];
    
    // Create a map of ALL existing unresolved tasks by studentId (for checking if created today)
    const allExistingUnresolvedTaskMap = new Map(
      contactTasks
        .filter(t => t.status === 'unresolved')
        .map(t => [t.studentId, t])
    );
    
    // Create a helper function to check if task was created today
    const wasCreatedToday = (task: ContactTask): boolean => {
      if (!task.createdAt) return false;
      
      let date: Date | null = null;
      if (typeof (task.createdAt as any).toDate === 'function') {
        date = (task.createdAt as any).toDate();
      } else if (task.createdAt instanceof Date) {
        date = task.createdAt;
      } else if (typeof task.createdAt === 'string') {
        date = new Date(task.createdAt);
      }
      
      if (!date) return false;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const taskCreatedDate = `${year}-${month}-${day}`;
      
      return taskCreatedDate === today;
    };
    
    // Create a map of existing unresolved tasks that were NOT created today (for updates)
    const existingUnresolvedTaskMap = new Map(
      contactTasks
        .filter(t => t.status === 'unresolved' && !wasCreatedToday(t))
        .map(t => [t.studentId, t])
    );

    // Find students with consecutive absences (2+ days)
    students.forEach(student => {
      // Skip if task was already created TODAY
      const existingTaskCreatedToday = allExistingUnresolvedTaskMap.get(student.id);
      if (existingTaskCreatedToday && wasCreatedToday(existingTaskCreatedToday)) {
        return;
      }

      const studentAttendance = rawAttendanceRecords.filter(att => att.studentId === student.id);
      const studentPermissions = permissions.filter(p => p.studentId === student.id);
      const result = calculateConsecutiveAbsences(student, studentAttendance, allClassConfigs, studentPermissions, 20);
      
      if (result.count >= 2) {
        const existingTask = existingUnresolvedTaskMap.get(student.id);
        const isUpdate = !!existingTask;
        
        newTasks.push({
          previewId: `consecutive-${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          class: student.class,
          shift: student.shift,
          taskType: 'consecutive',
          reason: existingTask?.reason || '',
          assignedTo: existingTask?.assignedTo || '',
          status: 'unresolved',
          createdAt: existingTask?.createdAt || new Date(),
          updatedAt: new Date(),
          consecutiveDays: result.count,
          lastAbsentDate: result.details || today,
          notes: `${result.count} consecutive school day absences. Last absent: ${result.details || 'Unknown'}`,
          autoGenerated: true,
          isUpdate: isUpdate,
          existingTaskId: existingTask?.id
        });
      }
    });

    // Find warning students with absent status today
    students.forEach(student => {
      if (student.warning !== true) return;
      
      // Skip if task was already created TODAY
      const existingTaskCreatedToday = allExistingUnresolvedTaskMap.get(student.id);
      if (existingTaskCreatedToday && wasCreatedToday(existingTaskCreatedToday)) {
        return;
      }

      const studentAttendance = rawAttendanceRecords.filter(att => att.studentId === student.id);
      const studentPermissions = permissions.filter(p => p.studentId === student.id);
      
      // Get today's attendance record
      const todayAttendance = studentAttendance.find(att => att.date === today);
      
      // Use the same logic as WarningStudentsSection to determine status
      const todayStatus = getStudentDailyStatus(
        student, 
        today, 
        todayAttendance, 
        allClassConfigs, 
        studentPermissions
      );

      // Skip students with "Permission", "No School", or "Absent (Config Missing)" status
      if (todayStatus.status === "Permission" || 
          todayStatus.status === "No School" || 
          todayStatus.status === "Absent (Config Missing)") {
        return;
      }
      
      // Create task only if warning student is absent today
      if (todayStatus.status === "Absent") {
        const existingTask = existingUnresolvedTaskMap.get(student.id);
        const isUpdate = !!existingTask;
        
        newTasks.push({
          previewId: `warning-${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          class: student.class,
          shift: student.shift,
          taskType: 'warning',
          reason: existingTask?.reason || '',
          assignedTo: existingTask?.assignedTo || '',
          status: 'unresolved',
          createdAt: existingTask?.createdAt || new Date(),
          updatedAt: new Date(),
          notes: `Warning student absent today (${today}). ${student.note || ''}`,
          autoGenerated: true,
          isUpdate: isUpdate,
          existingTaskId: existingTask?.id
        });
      }
    });

    return newTasks;
  };

  // Show preview modal
  const handleGenerateClick = () => {
    const tasksToGenerate = calculateTasksToGenerate();
    setPreviewTasks(tasksToGenerate);
    setShowPreviewModal(true);
  };

  // Confirm and create/update selected tasks
  const handleConfirmTasks = async (selectedIds: string[]) => {
    setIsGeneratingTasks(true);
    setShowPreviewModal(false);

    try {
      const tasksToProcess = previewTasks.filter(task => selectedIds.includes(task.previewId));
      
      for (const task of tasksToProcess) {
        const { previewId, isUpdate, existingTaskId, ...taskData } = task;
        
        if (isUpdate && existingTaskId) {
          // Update existing task
          await updateDoc(doc(db, "contactTasks", existingTaskId), {
            ...taskData,
            updatedAt: Timestamp.now()
          });
        } else {
          // Create new task
          await addDoc(collection(db, "contactTasks"), taskData);
        }
      }
      setPreviewTasks([]);
    } catch (error) {
      console.error("Error generating tasks:", error);
      setError("Failed to generate tasks");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // Cancel task generation
  const handleCancelPreview = () => {
    setShowPreviewModal(false);
    setPreviewTasks([]);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ContactTask>) => {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // Add completedAt timestamp when status is changed to resolved
      if (updates.status === 'resolved' && !updates.completedAt) {
        updateData.completedAt = Timestamp.now();
      }
      
      await updateDoc(doc(db, "contactTasks", taskId), updateData);
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

  // Filter students by the same class and shift as the selected student
  const filteredStudentsForModal = React.useMemo(() => {
    if (!studentForDetailModal) return [];
    return students.filter(
      s => s.class === studentForDetailModal.class && s.shift === studentForDetailModal.shift
    );
  }, [students, studentForDetailModal]);

  const handleCloseDetailsModal = () => {
    setIsDetailModalActive(false);
    setStudentForDetailModal(null);
  };

  // Filter tasks based on selected date
  const filteredTasks = React.useMemo(() => {
    if (!filterDate) return contactTasks;

    return contactTasks.filter(task => {
      let taskDateStr = '';
      let date: Date | null = null;
      
      if (task.createdAt) {
        // Handle Firestore Timestamp
        if (typeof (task.createdAt as any).toDate === 'function') {
          date = (task.createdAt as any).toDate();
        } 
        // Handle JS Date
        else if (task.createdAt instanceof Date) {
          date = task.createdAt;
        }
        // Handle string (fallback)
        else if (typeof task.createdAt === 'string') {
           date = new Date(task.createdAt);
        }
      }

      if (date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          taskDateStr = `${year}-${month}-${day}`;
      }
      
      return taskDateStr === filterDate;
    });
  }, [contactTasks, filterDate]);

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
              onClick={handleGenerateClick}
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

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d={mdiFilter} />
            </svg>
            <span className="font-medium">Filter by Date:</span>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="w-full md:w-64">
              <DatePicker
                selectedDate={filterDate}
                onDateChange={setFilterDate}
                placeholder="All Dates"
              />
            </div>
            
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear filter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiClose} />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Contact Tasks Table */}
        <ContactTasksTable
          tasks={filteredTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onViewStudent={handleOpenDetailsModal}
        />
      </SectionMain>

      {/* Task Preview Modal */}
      {showPreviewModal && (
        <TaskPreviewModal
          tasks={previewTasks}
          onConfirm={handleConfirmTasks}
          onCancel={handleCancelPreview}
        />
      )}

      {/* Student Details Modal */}
      {isDetailModalActive && studentForDetailModal && (
        <StudentDetailsModal
          isOpen={isDetailModalActive}
          onClose={handleCloseDetailsModal}
          student={studentForDetailModal}
          students={filteredStudentsForModal}
          currentIndex={filteredStudentsForModal.findIndex(s => s.id === studentForDetailModal.id)}
          onEdit={(updatedStudent) => {
            // Refresh will happen automatically via Firebase listeners
          }}
          onDelete={(deletedStudent) => {
            // Refresh will happen automatically via Firebase listeners
            handleCloseDetailsModal();
          }}
          hideActions={true}
          defaultTab="basic"
        />
      )}
    </>
  );
}
