// app/dashboard/students/TableStudents.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Student } from "../../_interfaces";
import { ColumnToggle, ColumnConfig } from "./components/ColumnToggle";
import { ShiftSection } from "./components/ShiftSection";
import { ClassTable } from "./components/ClassTable";
import { StudentDetailsModal } from "./components/StudentDetailsModal";
import CustomDropdown from "./components/CustomDropdown";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";

// Attendance logic imports
import { getStudentDailyStatus, isSchoolDay } from '../_lib/attendanceLogic';
import { AllClassConfigs } from '../_lib/configForAttendanceLogic';
import { PermissionRecord } from '../../_interfaces';

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  isBatchEditMode?: boolean;
  onBatchUpdate?: () => void;
  onExitBatchEdit?: () => void;
};

const TableStudents = ({ students, onEdit, onDelete, isBatchEditMode = false, onBatchUpdate, onExitBatchEdit }: Props) => {
  // Column configuration state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'number', label: '#N', enabled: true },
    { id: 'name', label: 'Name', enabled: true },
    { id: 'phone', label: 'Phone', enabled: true },
    { id: 'paymentStatus', label: 'Payment', enabled: false },
    { id: 'scheduleType', label: 'Type', enabled: false },
    { id: 'warning', label: 'Warning', enabled: false },
    // { id: 'todaysStatus', label: "Today's Status (Not)", enabled: false }, // Enable by default for debugging
  ]);

  // Attendance data state
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loadingAttendanceData, setLoadingAttendanceData] = useState(true);

  // Batch edit state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchClass, setBatchClass] = useState('');
  const [batchShift, setBatchShift] = useState('Morning');
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Global collapse state
  const [allClassesCollapsed, setAllClassesCollapsed] = useState(false);
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

  // Fetch attendance data for today's status
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;  
        // Test classes collection structure
        try {
          const classesSnapshot = await getDocs(collection(db, 'classes'));
          if (classesSnapshot.size > 0) {
            classesSnapshot.docs.forEach(doc => {});
          }
        } catch (error) {
          console.error('Error testing classes collection:', error);
        }
        
        // Fetch today's attendance
        const attendanceRef = collection(db, 'attendance');
        
        const attendanceSnapshot = await getDocs(attendanceRef);
 
        const attendanceData = attendanceSnapshot.docs
          .map(doc => {
            return { id: doc.id, ...doc.data() };
          })
          .filter((record: any) => record.date === todayStr);
        
        // Fetch all class configs from 'classes' collection
        const classConfigSnapshot = await getDocs(collection(db, 'classes'));
        
        const allConfigs: AllClassConfigs = {};
        classConfigSnapshot.docs.forEach(doc => {
          const data = doc.data();

          if (data.shifts) { // Only add if shifts property exists
            allConfigs[doc.id] = data as any;
          }
        });

        const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
        
        const permissionsData = permissionsSnapshot.docs
          .map(doc => {
            return { id: doc.id, ...doc.data() };
          })
          .filter((record: any) => 
            record.status === 'approved' &&
            record.permissionStartDate <= todayStr && 
            record.permissionEndDate >= todayStr
          ) as PermissionRecord[];
        
        setAttendance(attendanceData);
        setAllClassConfigs(allConfigs);
        setPermissions(permissionsData);
        setLoadingAttendanceData(false);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        console.error('Error details:', {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          stack: error?.stack
        });
        setLoadingAttendanceData(false);
      }
    };

    fetchAttendanceData();
  }, []);

  // Calculate today's attendance status for a student
  const getStudentAttendanceStatus = (student: Student): string => {

    if (!allClassConfigs || loadingAttendanceData) {
      return "unknown";
    }

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Find attendance record for this student today
      const attendanceRecord = attendance.find((record: any) => 
        record.studentId === student.id && record.date === todayStr
      );
      
      // Find permissions for this student today
      const studentPermissions = permissions.filter(permission => 
        permission.studentId === student.id && 
        permission.status === 'approved' &&
        todayStr >= permission.permissionStartDate && 
        todayStr <= permission.permissionEndDate
      );

      // Extract class ID by removing "Class " prefix
      const classId = student.class?.replace(/^Class\s+/i, '') || '';
 
      const classConfig = allClassConfigs ? allClassConfigs[classId] : undefined;

      const result = getStudentDailyStatus(
        student,
        todayStr,
        attendanceRecord,
        allClassConfigs,
        studentPermissions
      );
            
      const finalStatus = result.status?.toLowerCase() || "unknown";
      
      return finalStatus;
    } catch (error) {
      console.error('Error calculating attendance status for', student.fullName, ':', error);
      return "unknown";
    }
  };

  // Auto-enable #N column when entering batch edit mode
  React.useEffect(() => {
    if (isBatchEditMode) {
      setColumns(prev => 
        prev.map(col => 
          col.id === 'number' ? { ...col, enabled: true } : col
        )
      );
    } else {
      // Clear selections when exiting batch edit mode
      setSelectedStudents(new Set());
      setBatchClass('');
      setBatchShift('Morning');
    }
  }, [isBatchEditMode]);

  // Get unique class options from existing students
  const getClassOptions = () => {
    const uniqueClasses = [...new Set(students.map(student => student.class).filter(Boolean))];
    return uniqueClasses.sort().map(className => ({
      value: className,
      label: className
    }));
  };

  // Shift options
  const shiftOptions = [
    { value: 'Morning', label: 'Morning' },
    { value: 'Afternoon', label: 'Afternoon' },
    { value: 'Evening', label: 'Evening' }
  ];

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentStudentList, setCurrentStudentList] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (student: Student, studentList: Student[]) => {
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

  const handleDeleteWithToast = async (student: Student) => {
    try {
      await onDelete(student);
      toast.success(`${student.fullName} has been deleted successfully`);
      handleCloseModal(); // Close modal after successful delete
    } catch (error) {
      toast.error('Failed to delete student. Please try again.');
      console.error('Delete error:', error);
    }
  };

  // Define the desired order of shifts
  const shiftOrder: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];

  // Filter out students who are missing a class property to prevent 'undefined' groups
  const validStudents = students.filter(student => student.class);

  // 1. Group students by class, then by shift
  const groupedStudents = validStudents.reduce((acc, student) => {
    const { class: studentClass, shift } = student;
    if (!acc[studentClass]) {
      acc[studentClass] = { Morning: [], Afternoon: [], Evening: [] };
    }
    if (shift && shiftOrder.includes(shift as any)) {
      acc[studentClass][shift as 'Morning' | 'Afternoon' | 'Evening'].push(student);
    }
    return acc;
  }, {} as Record<string, { Morning: Student[]; Afternoon: Student[]; Evening: Student[] }>);

  // Sort students by fullName within each class and shift
  for (const classGroup of Object.values(groupedStudents)) {
    shiftOrder.forEach(shift => {
      if (classGroup[shift]) {
        classGroup[shift].sort((a, b) => a.fullName.localeCompare(b.fullName));
      }
    });
  }

  // 2. Partition classes into day (morning/afternoon) and evening lists
  const dayShiftClasses: string[] = [];
  const eveningShiftClasses: string[] = [];

  const sortedAllClasses = Object.keys(groupedStudents).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  sortedAllClasses.forEach(className => {
    const group = groupedStudents[className];
    if (group.Morning.length > 0 || group.Afternoon.length > 0) {
      dayShiftClasses.push(className);
    }
    if (group.Evening.length > 0) {
      eveningShiftClasses.push(className);
    }
  });

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    // Prevent disabling #N column when in batch edit mode
    if (isBatchEditMode && columnId === 'number') {
      return;
    }
    
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Get enabled columns
  const enabledColumns = columns.filter(col => col.enabled);

  // Handle class toggle - sync across all shifts of the same class
  const handleClassToggle = (className: string, collapsed: boolean) => {
    setCollapsedClasses(prev => {
      const newSet = new Set(prev);
      if (collapsed) {
        newSet.add(className);
      } else {
        newSet.delete(className);
      }
      return newSet;
    });
  };

  // Check if a class is collapsed
  const isClassCollapsed = (className: string) => {
    return allClassesCollapsed || collapsedClasses.has(className);
  };

  // Batch edit functions
  const handleStudentSelect = (studentId: string, isSelected: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (studentIds: string[], isSelected: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      studentIds.forEach(id => {
        if (isSelected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  };

  const handleBatchApply = () => {
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }
    if (!batchClass.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    setShowBatchConfirm(true);
  };

  const confirmBatchUpdate = async () => {
    try {
      const batch = writeBatch(db);
      
      selectedStudents.forEach(studentId => {
        const studentRef = doc(db, "students", studentId);
        batch.update(studentRef, {
          class: batchClass.trim(),
          shift: batchShift
        });
      });

      await batch.commit();
      
      toast.success(`Updated ${selectedStudents.size} students`);
      setSelectedStudents(new Set());
      setBatchClass('');
      setBatchShift('Morning');
      setShowBatchConfirm(false);
      
      if (onBatchUpdate) {
        onBatchUpdate();
      }

      // Exit batch edit mode after successful update
      if (onExitBatchEdit) {
        onExitBatchEdit();
      }
    } catch (error) {
      console.error("Error updating students:", error);
      toast.error("Failed to update students");
    }
  };

  return (
    <div className="space-y-8 p-6 pb-24 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Batch Edit Mode Notification */}
      {isBatchEditMode && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Batch Edit Mode Active</h3>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Select students using checkboxes, then choose class and shift to apply to all selected students.
                </p>
              </div>
            </div>
          </div>

          {/* Batch Edit Controls */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl relative z-30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Batch Operations
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  selectedStudents.size > 0 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="relative">
                <CustomDropdown
                  label="New Class"
                  value={batchClass}
                  onChange={setBatchClass}
                  options={getClassOptions()}
                  placeholder="Select class"
                  searchable={true}
                  id="batch-class"
                />
              </div>
              
              <div className="relative">
                <CustomDropdown
                  label="New Shift"
                  value={batchShift}
                  onChange={setBatchShift}
                  options={shiftOptions}
                  placeholder="Select shift"
                  id="batch-shift"
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="mt-6">
                  <button
                    onClick={handleBatchApply}
                    disabled={selectedStudents.size === 0 || !batchClass.trim()}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply to {selectedStudents.size} Selected Student{selectedStudents.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Students List */}
            {selectedStudents.size > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-slate-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6m-6 4h6m-6 4h4" />
                  </svg>
                  Selected Students ({selectedStudents.size})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {students
                      .filter(student => selectedStudents.has(student.id))
                      .sort((a, b) => a.fullName.localeCompare(b.fullName))
                      .map(student => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 truncate">
                              {student.fullName}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {student.class} - {student.shift}
                            </p>
                          </div>
                          <button
                            onClick={() => handleStudentSelect(student.id, false)}
                            className="ml-2 flex-shrink-0 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                            title="Remove from selection"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                
                {selectedStudents.size > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setSelectedStudents(new Set())}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All Selections
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Selection Panel */}
      <ColumnToggle 
        columns={columns} 
        onToggleColumn={toggleColumn} 
        isBatchEditMode={isBatchEditMode}
        allClassesCollapsed={allClassesCollapsed}
        onToggleAllClasses={() => {
          setAllClassesCollapsed(!allClassesCollapsed);
          if (!allClassesCollapsed) {
            // When globally collapsing, clear individual collapsed classes
            setCollapsedClasses(new Set());
          }
        }}
      />

      {/* Morning & Afternoon Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Day Shifts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Morning & Afternoon Classes</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="font-semibold">Morning Shift</span>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-lg mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="font-semibold">Afternoon Shift</span>
            </div>
          </div>
        </div>

        {dayShiftClasses.length > 0 ? (
          <div className="space-y-6">
            {dayShiftClasses.map(className => (
              <div key={`${className}-day`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ClassTable 
                  studentList={groupedStudents[className]['Morning']} 
                  enabledColumns={enabledColumns}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetails={handleViewDetails}
                  className={className}
                  studentCount={groupedStudents[className]['Morning'].length}
                  shift="Morning"
                  isBatchEditMode={isBatchEditMode}
                  onBatchUpdate={onBatchUpdate}
                  selectedStudents={selectedStudents}
                  onStudentSelect={handleStudentSelect}
                  onSelectAll={handleSelectAll}
                  getAttendanceStatus={getStudentAttendanceStatus}
                  forceCollapsed={isClassCollapsed(className)}
                  onClassToggle={handleClassToggle}
                />
                <ClassTable 
                  studentList={groupedStudents[className]['Afternoon']} 
                  enabledColumns={enabledColumns}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetails={handleViewDetails}
                  className={className}
                  studentCount={groupedStudents[className]['Afternoon'].length}
                  shift="Afternoon"
                  isBatchEditMode={isBatchEditMode}
                  onBatchUpdate={onBatchUpdate}
                  selectedStudents={selectedStudents}
                  onStudentSelect={handleStudentSelect}
                  onSelectAll={handleSelectAll}
                  getAttendanceStatus={getStudentAttendanceStatus}
                  forceCollapsed={isClassCollapsed(className)}
                  onClassToggle={handleClassToggle}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No students in Morning or Afternoon shifts.</p>
          </div>
        )}
      </div>

      {/* Evening Section */}
      {eveningShiftClasses.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-slate-700">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Evening Shift
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Night Classes</p>
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="font-semibold">Evening Classes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {eveningShiftClasses.map(className => (
              <ClassTable 
                key={`${className}-evening`}
                studentList={groupedStudents[className].Evening} 
                enabledColumns={enabledColumns}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewDetails={handleViewDetails}
                className={className}
                studentCount={groupedStudents[className].Evening.length}
                shift="Evening"
                isBatchEditMode={isBatchEditMode}
                onBatchUpdate={onBatchUpdate}
                selectedStudents={selectedStudents}
                onStudentSelect={handleStudentSelect}
                onSelectAll={handleSelectAll}
                getAttendanceStatus={getStudentAttendanceStatus}
                forceCollapsed={isClassCollapsed(className)}
                onClassToggle={handleClassToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Student Details Modal - rendered outside all table containers */}
      <StudentDetailsModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={onEdit}
        onDelete={handleDeleteWithToast}
        students={currentStudentList}
        currentIndex={selectedIndex}
        onNavigate={handleNavigate}
      />

      {/* Batch Edit Confirmation Modal */}
      {showBatchConfirm && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.93L13.732 4.242a2 2 0 00-3.464 0L1.732 16.07c-.77 1.263.192 2.93 1.732 2.93z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Confirm Batch Update
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                You are about to update <strong>{selectedStudents.size}</strong> student{selectedStudents.size !== 1 ? 's' : ''}:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 mb-3">
                <p className="text-sm"><strong>New Class:</strong> {batchClass || 'Not selected'}</p>
                <p className="text-sm"><strong>New Shift:</strong> {batchShift}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone. Are you sure you want to continue?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBatchConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableStudents;