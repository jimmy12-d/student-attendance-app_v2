// app/dashboard/students/TableStudents.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Student } from "../../_interfaces";
import { ColumnToggle, ColumnConfig } from "./components/ColumnToggle";
import { ClassTable } from "./components/ClassTable";
import { StudentDetailsModal } from "./components/StudentDetailsModal";
import { QRCodeModal } from "./components/QRCodeModal";
import CustomDropdown from "./components/CustomDropdown";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { doc, writeBatch, collection, getDocs, setDoc } from "firebase/firestore";

// Attendance logic imports
import { getStudentDailyStatus, markAttendance, calculateShiftRankings, calculateAverageArrivalTime } from '../_lib/attendanceLogic';
import { AllClassConfigs } from '../_lib/configForAttendanceLogic';
import { PermissionRecord } from '../../_interfaces';

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  isBatchEditMode?: boolean;
  isTakeAttendanceMode?: boolean;
  isFlipFlopPreviewMode?: boolean;
  onBatchUpdate?: () => void;
  onExitBatchEdit?: () => void;
  onExitTakeAttendance?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
};

const TableStudents = ({ students, onEdit, onDelete, isBatchEditMode = false, isTakeAttendanceMode = false, isFlipFlopPreviewMode = false, onBatchUpdate, onExitBatchEdit, onExitTakeAttendance, searchQuery = '', onSearchChange }: Props) => {
  // Default column configuration
  const defaultColumns: ColumnConfig[] = [
    { id: 'number', label: '#N', enabled: true },
    { id: 'name', label: 'Name', enabled: true },
    { id: 'phone', label: 'Phone', enabled: true },
    { id: 'portal', label: 'Portal', enabled: false },
    { id: 'notificationVersion', label: 'Notif Version', enabled: false },
    { id: 'paymentStatus', label: 'Payment', enabled: false },
    { id: 'scheduleType', label: 'Type', enabled: false },
    { id: 'warning', label: 'Warning', enabled: false },
    { id: 'todayAttendance', label: 'Attendance', enabled: false },
    { id: 'averageArrivalTime', label: 'Avg Arrival', enabled: false },
  ];

  // Column configuration state - will be loaded from localStorage
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);

  // Attendance data state
  const [attendance, setAttendance] = useState<any[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loadingAttendanceData, setLoadingAttendanceData] = useState(true);

  // Batch edit state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchClass, setBatchClass] = useState('');
  const [batchShift, setBatchShift] = useState('Morning');
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Take attendance state
  const [attendanceChanges, setAttendanceChanges] = useState<Map<string, boolean>>(new Map());
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Global collapse state
  const [allClassesCollapsed, setAllClassesCollapsed] = useState(false);
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());
  
  // Zoom state management
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Filter students based on search query
  const filteredStudents = React.useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;

    return students.filter(student => {
      // Determine search priority based on query pattern
      const isClassQuery = query.match(/^\d+[a-zA-Z]$/) || query.match(/^class\s+\d+[a-zA-Z]$/i);
      const isPhoneQuery = query.replace(/\D/g, '').length >= 3; // At least 3 digits suggest phone search
      const isNameQuery = !isClassQuery && !isPhoneQuery;

      // Search by class - highest priority for class-like queries
      const classMatch = student.class && (() => {
        const fullClass = student.class.toLowerCase();
        const classId = student.class.replace(/^Class\s+/i, '').toLowerCase();

        // Exact match for full class name
        if (fullClass === query || fullClass.includes(`class ${query}`)) {
          return true;
        }

        // Exact match for class ID
        if (classId === query) {
          return true;
        }

        // For class queries, be more restrictive
        if (isClassQuery) {
          return classId === query || fullClass.includes(`class ${query}`);
        }

        // For non-class queries, allow broader matching but still controlled
        if (query.match(/^\d+$/) && classId.startsWith(query)) {
          return true;
        }

        return false;
      })();

      // Search by phone - only for phone-like queries or when no other matches
      const phoneMatch = student.phone && (() => {
        if (isPhoneQuery) {
          // For phone queries, require the digits to match exactly
          const queryDigits = query.replace(/\D/g, '');
          const phoneDigits = student.phone.replace(/\D/g, '');
          return phoneDigits.includes(queryDigits);
        }
        // For non-phone queries, don't match phone unless it's a very specific case
        return false;
      })();

      // Search by name - fallback for general queries
      const nameMatch = (student.fullName || student.nameKhmer) && (() => {
        if (isNameQuery) {
          // For name queries, allow substring matching in both English and Khmer names
          const englishMatch = student.fullName && student.fullName.toLowerCase().includes(query);
          const khmerMatch = student.nameKhmer && student.nameKhmer.toLowerCase().includes(query);
          return englishMatch || khmerMatch;
        }
        // For non-name queries, be more restrictive
        const englishExact = student.fullName && student.fullName.toLowerCase() === query;
        const khmerExact = student.nameKhmer && student.nameKhmer.toLowerCase() === query;
        return englishExact || khmerExact;
      })();

      // Prioritize matches based on query type
      if (isClassQuery) {
        return classMatch;
      } else if (isPhoneQuery) {
        return phoneMatch;
      } else {
        return nameMatch || classMatch || phoneMatch;
      }
    });
  }, [students, searchQuery]);

  // Function to highlight matching text in student names
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 font-semibold">
          {part}
        </span>
      ) : part
    );
  };

  // Load column configuration from localStorage on component mount
  useEffect(() => {
    const loadColumnConfiguration = () => {
      try {
        const savedColumns = localStorage.getItem('studentTableColumns');
        if (savedColumns) {
          const parsedColumns = JSON.parse(savedColumns) as ColumnConfig[];
          
          // Validate that the saved columns match our expected structure
          const mergedColumns = defaultColumns.map(defaultCol => {
            const savedCol = parsedColumns.find(col => col.id === defaultCol.id);
            // Always ensure name column is enabled
            if (defaultCol.id === 'name') {
              return { ...defaultCol, enabled: true };
            }
            return savedCol ? { ...defaultCol, enabled: savedCol.enabled } : defaultCol;
          });
          
          setColumns(mergedColumns);
        } else {
          // No saved configuration, use defaults
          setColumns(defaultColumns);
        }
      } catch (error) {
        console.warn('Failed to load column configuration from localStorage:', error);
        // Keep default configuration if loading fails
        setColumns(defaultColumns);
      }
    };

    loadColumnConfiguration();
  }, []); // Only run once on mount

  // Save column configuration to localStorage whenever columns change
  useEffect(() => {
    const saveColumnConfiguration = () => {
      try {
        // Only save if the columns are different from defaults (indicating user has made changes)
        const hasChanges = columns.some((col, index) => 
          col.enabled !== defaultColumns[index]?.enabled
        );
        
        if (hasChanges) {
          localStorage.setItem('studentTableColumns', JSON.stringify(columns));
        }
      } catch (error) {
        console.warn('Failed to save column configuration to localStorage:', error);
      }
    };

    // Only save if we have columns and they're not the initial default state
    if (columns.length > 0 && columns !== defaultColumns) {
      saveColumnConfiguration();
    }
  }, [columns]);

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

        // Fetch current month's attendance for average calculations
        const currentMonth = today.toISOString().slice(0, 7); // "2025-09"
        const monthlyAttendanceData = attendanceSnapshot.docs
          .map(doc => {
            return { id: doc.id, ...doc.data() };
          })
          .filter((record: any) => 
            record.date && 
            record.date.startsWith(currentMonth) &&
            record.timeIn &&
            (record.status === 'present' || record.status === 'late')
          );
        
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
        setMonthlyAttendance(monthlyAttendanceData);
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

  // Get today's detailed attendance status including time
  const getTodayAttendanceStatus = (student: Student) => {
    try {
      // Return loading state if configs aren't loaded yet
      if (!allClassConfigs || loadingAttendanceData) {
        return { status: "Loading..." };
      }

      const todayStr = new Date().toISOString().split('T')[0];
      
      // Find today's attendance record for this student
      const attendanceRecord = attendance.find(record => 
        record.studentId === student.id && record.date === todayStr
      );

      // Find approved permissions for this student for today
      const studentPermissions = permissions.filter(
        permission => permission.studentId === student.id && 
        permission.permissionStartDate <= todayStr && 
        permission.permissionEndDate >= todayStr
      );

      const result = getStudentDailyStatus(
        student,
        todayStr,
        attendanceRecord,
        allClassConfigs,
        studentPermissions
      );
            
      return result;
    } catch (error) {
      console.error('Error calculating today attendance status for', student.fullName, ':', error);
      return { status: "Unknown" };
    }
  };

  // Calculate average arrival time for a student in the current month with ranking
  const getAverageArrivalTime = (student: Student): string => {
    if (!allClassConfigs || loadingAttendanceData || !monthlyAttendance.length) {
      return "Loading...";
    }

    try {
      // Get current month's attendance records for this student
      const currentMonth = new Date().toISOString().slice(0, 7); // "2025-09"
      const studentAttendance = monthlyAttendance.filter((record: any) => 
        record.studentId === student.id && 
        record.date && 
        record.date.startsWith(currentMonth)
      );

      // Use the shared calculateAverageArrivalTime function
      const result = calculateAverageArrivalTime(student, studentAttendance, currentMonth);
      return result.averageTime;
    } catch (error) {
      console.error('Error calculating average arrival time for', student.fullName, ':', error);
      return "Error";
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
  const [defaultModalTab, setDefaultModalTab] = useState<'basic' | 'actions' | 'requests'>('basic');

  // QR Code Modal state for admin use (in case student lost receipt)
  const [selectedQRStudent, setSelectedQRStudent] = useState<Student | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

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
      toast.success(`${student.fullName} has been dropped successfully`);
      handleCloseModal(); // Close modal after successful delete
    } catch (error) {
      toast.error('Failed to delete student. Please try again.');
      console.error('Delete error:', error);
    }
  };

  // Define the desired order of shifts
  const shiftOrder: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];

  // Filter out students who are missing a class property to prevent 'undefined' groups
  const validStudents = filteredStudents.filter(student => student.class);

  // 1. Group students by class, then by shift
  const groupedStudents = React.useMemo(() => {
    const grouped = validStudents.reduce((acc, student) => {
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
    for (const classGroup of Object.values(grouped)) {
      shiftOrder.forEach(shift => {
        if (classGroup[shift]) {
          classGroup[shift].sort((a, b) => a.fullName.localeCompare(b.fullName));
        }
      });
    }

    return grouped;
  }, [validStudents, shiftOrder]);

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

  // Toggle column visibility with automatic saving
  const toggleColumn = (columnId: string) => {
    // Prevent disabling #N column when in batch edit mode or take attendance mode
    if ((isBatchEditMode || isTakeAttendanceMode) && columnId === 'number') {
      return;
    }
    
    // Prevent disabling name column - it should always be visible
    if (columnId === 'name') {
      return;
    }
    
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      );
      
      // The useEffect will automatically save this change to localStorage
      return newColumns;
    });
  };

  // Reset columns to default configuration
  const resetColumnsToDefault = () => {
    setColumns(defaultColumns);
    
    // Clear localStorage
    try {
      localStorage.removeItem('studentTableColumns');
    } catch (error) {
      console.warn('Failed to clear column configuration from localStorage:', error);
    }
  };

  // Calculate rankings for top performers (earliest and latest) by shift with minimum 5 data points
  const shiftRankings = React.useMemo(() => {
    return calculateShiftRankings(students, monthlyAttendance, allClassConfigs);
  }, [students, monthlyAttendance, allClassConfigs]);

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

  // Handle zoom toggle for classes
  const handleZoomToggle = (className: string, isExpanded: boolean) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(className);
      } else {
        newSet.delete(className);
      }
      return newSet;
    });
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

  // Take attendance functions
  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendanceChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(studentId, isPresent);
      return newMap;
    });
  };

  const isStudentCurrentlyPresent = (student: Student): boolean => {
    // Check if we have a local change first
    if (attendanceChanges.has(student.id)) {
      return attendanceChanges.get(student.id) || false;
    }
    
    // Otherwise check existing attendance records
    const existingRecord = attendance.find(record => 
      record.studentId === student.id && record.date === selectedAttendanceDate
    );
    
    return existingRecord?.status === 'present' || existingRecord?.status === 'late';
  };

  const saveAttendance = async () => {
    if (attendanceChanges.size === 0) {
      toast.error("No attendance changes to save");
      return;
    }

    setSavingAttendance(true);
    try {
      const currentTime = new Date();
      const successfulMarks: string[] = [];
      const failedMarks: string[] = [];
      
      for (const [studentId, isPresent] of attendanceChanges.entries()) {
        const student = students.find(s => s.id === studentId);
        if (!student) {
          failedMarks.push(`Student not found for ID: ${studentId}`);
          continue;
        }

        try {
          if (isPresent) {
            // For present students, use the main markAttendance function to get proper late/present logic
            // and 12NKGS Saturday handling
            const status = await markAttendance(
              student,
              student.shift || 'Morning', // Default to Morning if shift is not set
              allClassConfigs || {},
              () => {}, // Empty sound function
              3, // maxRetries
              selectedAttendanceDate, // Pass the selected date
              'manual' // Specify manual method for dashboard attendance
            );
            successfulMarks.push(`${student.fullName}: ${status}`);
          } else {
            // For absent students, create manual record since markAttendance doesn't handle absent
            // Check if attendance record already exists for today
            const existingRecord = attendance.find(record => 
              record.studentId === studentId && record.date === selectedAttendanceDate
            );

            if (existingRecord) {
              // Update existing record to absent
              const attendanceRef = doc(db, "attendance", existingRecord.id);
              await setDoc(attendanceRef, {
                ...existingRecord,
                status: 'absent',
                timestamp: currentTime,
                method: 'manual'
              }, { merge: true });
            } else {
              // Create new absent record
              const attendanceRef = doc(collection(db, "attendance"));
              await setDoc(attendanceRef, {
                authUid: student.authUid || null,
                class: student.class,
                date: selectedAttendanceDate,
                method: 'manual',
                shift: student.shift,
                status: 'absent',
                studentId: studentId,
                studentName: student.fullName,
                timestamp: currentTime
              });
            }
            successfulMarks.push(`${student.fullName}: absent`);
          }
        } catch (error) {
          console.error(`Error marking attendance for ${student.fullName}:`, error);
          failedMarks.push(`${student.fullName}: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Show results
      if (successfulMarks.length > 0) {
        toast.success(`Saved attendance for ${successfulMarks.length} students`);
      }
      if (failedMarks.length > 0) {
        toast.error(`Failed to save attendance for ${failedMarks.length} students`);
        console.error('Failed marks:', failedMarks);
      }
      
      setAttendanceChanges(new Map());
      
      // Refresh attendance data
      fetchAttendanceData();
      
      // Exit take attendance mode after successful save
      if (onExitTakeAttendance) {
        onExitTakeAttendance();
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Function to refresh attendance data
  const fetchAttendanceData = async () => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const attendanceSnapshot = await getDocs(attendanceRef);
      
      const attendanceData = attendanceSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((record: any) => record.date === selectedAttendanceDate);
      
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error refreshing attendance data:', error);
    }
  };

  // Auto-enable #N column when entering take attendance mode
  React.useEffect(() => {
    if (isTakeAttendanceMode) {
      setColumns(prev => 
        prev.map(col => 
          col.id === 'number' ? { ...col, enabled: true } : col
        )
      );
    } else {
      // Clear attendance changes when exiting take attendance mode
      setAttendanceChanges(new Map());
    }
  }, [isTakeAttendanceMode]);

  // Fetch attendance data when selected date changes
  React.useEffect(() => {
    if (isTakeAttendanceMode) {
      fetchAttendanceData();
      // Clear any pending changes when date changes
      setAttendanceChanges(new Map());
    }
  }, [selectedAttendanceDate, isTakeAttendanceMode]);

  // Update calendar month/year when selected date changes
  React.useEffect(() => {
    if (selectedAttendanceDate) {
      const date = new Date(selectedAttendanceDate + 'T00:00:00');
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [selectedAttendanceDate]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const year = currentYear;
    const month = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    setSelectedAttendanceDate(dateString);
    setShowDatePicker(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days: React.ReactElement[] = [];
    const todayDate = new Date();
    const selectedDateObj = selectedAttendanceDate ? new Date(selectedAttendanceDate + 'T00:00:00') : null;

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === todayDate.toDateString();
      const isSelected = selectedDateObj && date.toDateString() === selectedDateObj.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`w-8 h-8 text-sm rounded-xl transition-all duration-300 backdrop-blur-sm ${
            isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 scale-105'
              : isToday
              ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/60 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-600 dark:text-blue-400 font-medium shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20'
              : 'hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:shadow-md hover:shadow-black/5'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Add event listeners for QR functionality (admin use only)
  React.useEffect(() => {
    const handleOpenQRModal = (event: CustomEvent) => {
      const student = event.detail as Student;
      setSelectedQRStudent(student);
      setIsQRModalOpen(true);
    };

    const handleGenerateQR = async (event: CustomEvent) => {
      const student = event.detail as Student;
      await generateQRCode(student);
    };

    window.addEventListener('openQRModal', handleOpenQRModal as EventListener);
    window.addEventListener('generateQR', handleGenerateQR as EventListener);

    return () => {
      window.removeEventListener('openQRModal', handleOpenQRModal as EventListener);
      window.removeEventListener('generateQR', handleGenerateQR as EventListener);
    };
  }, []);

  // Generate QR code for a student (admin function for lost receipts)
  const generateQRCode = async (student: Student) => {
    if (generatingQR) return; // Prevent multiple simultaneous requests

    setGeneratingQR(true);
    try {
      // Generate token on the client side
      const generateToken = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let token = '';
        for (let i = 0; i < 16; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      
      // Store token in tempRegistrationTokens collection
      await setDoc(doc(db, 'tempRegistrationTokens', token), {
        studentId: student.id,
        token: token,
        createdAt: new Date(),
        expiresAt: expiresAt
      });
      
      toast.success(`QR code generated for ${student.fullName}`);
      
      // Auto-open the QR modal
      setTimeout(() => {
        setSelectedQRStudent({
          ...student,
          registrationToken: token,
          tokenExpiresAt: expiresAt
        });
        setIsQRModalOpen(true);
      }, 1000);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(`Failed to generate QR code for ${student.fullName}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCloseQRModal = () => {
    setIsQRModalOpen(false);
    setSelectedQRStudent(null);
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
                  onChange={(value) => setBatchClass(String(value))}
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
                  onChange={(value) => setBatchShift(String(value))}
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
                              {highlightText(student.fullName, searchQuery)}
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

      {/* Take Attendance Mode Notification */}
      {isTakeAttendanceMode && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Take Attendance Mode Active</h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Use checkboxes in the #N column to mark students as present (checked) or absent (unchecked).
                </p>
              </div>
            </div>
          </div>

          {/* Take Attendance Controls */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl relative z-30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Attendance for {new Date(selectedAttendanceDate).toLocaleDateString()}
                </h3>
                <div className="flex items-center space-x-2">
                  <label htmlFor="attendance-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Date:
                  </label>
                  <div className="relative" ref={datePickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDisplayDate(selectedAttendanceDate)}
                      </span>
                    </button>
                    
                    {/* Date Picker Dropdown */}
                    {showDatePicker && (
                      <div className="absolute top-full right-0 mt-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/30 dark:border-slate-600/30 rounded-2xl shadow-2xl shadow-black/10 z-50 p-4 min-w-[280px]">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => navigateMonth('prev')}
                            className="flex items-center justify-center w-8 h-8 hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/30 dark:border-slate-600/30 bg-white/60 dark:bg-slate-800/60 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {months[currentMonth]} {currentYear}
                          </h3>
                          <button
                            onClick={() => navigateMonth('next')}
                            className="flex items-center justify-center w-8 h-8 hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/30 dark:border-slate-600/30 bg-white/60 dark:bg-slate-800/60 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Days of Week Header */}
                        <div className="grid grid-cols-7 mb-2">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {renderCalendar()}
                        </div>

                        {/* Footer */}
                        <div className="mt-3 pt-3 border-t border-white/30 dark:border-slate-600/30 flex justify-between">
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-sm rounded-lg transition-all duration-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setSelectedAttendanceDate(today);
                              setShowDatePicker(false);
                            }}
                            className="px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  attendanceChanges.size > 0 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {attendanceChanges.size} change{attendanceChanges.size !== 1 ? 's' : ''} pending
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <button
                onClick={saveAttendance}
                disabled={attendanceChanges.size === 0 || savingAttendance}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[200px]"
              >
                {savingAttendance ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Attendance ({attendanceChanges.size} changes)
                  </>
                )}
              </button>
            </div>

            {/* Changed Students List */}
            {attendanceChanges.size > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-slate-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6m-6 4h6m-6 4h4" />
                  </svg>
                  Pending Changes ({attendanceChanges.size})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {students
                      .filter(student => attendanceChanges.has(student.id))
                      .sort((a, b) => a.fullName.localeCompare(b.fullName))
                      .map(student => {
                        const isPresent = attendanceChanges.get(student.id);
                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
                              isPresent 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
                              {highlightText(student.fullName, searchQuery)}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                isPresent 
                                  ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100'
                                  : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100'
                              }`}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                              <button
                                onClick={() => setAttendanceChanges(prev => {
                                  const newMap = new Map(prev);
                                  newMap.delete(student.id);
                                  return newMap;
                                })}
                                className="flex-shrink-0 w-5 h-5 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                                title="Undo change"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                {attendanceChanges.size > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setAttendanceChanges(new Map())}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Container */}
      <div className="space-y-4 mb-6">
        {/* Column Selection Panel */}
        <ColumnToggle
          columns={columns.filter(col => col.id !== 'name')}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumnsToDefault}
          isBatchEditMode={isBatchEditMode}
          isTakeAttendanceMode={isTakeAttendanceMode}
          allClassesCollapsed={allClassesCollapsed}
          onToggleAllClasses={() => {
            const newState = !allClassesCollapsed;
            setAllClassesCollapsed(newState);

            if (newState) {
              // When switching to "Hide All Classes" state, collapse ALL classes
              const allClasses = sortedAllClasses;
              setCollapsedClasses(new Set(allClasses));
              // Clear expanded classes
              setExpandedClasses(new Set());
            } else {
              // When switching to "Show All Classes" state, expand ALL classes
              const allClasses = sortedAllClasses;
              setExpandedClasses(new Set(allClasses));
              // Clear individual collapsed classes so all are visible and expanded
              setCollapsedClasses(new Set());
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          filteredStudentsCount={filteredStudents.length}
          filteredStudents={filteredStudents}
          onStudentSelect={(studentId: string) => {
            // Scroll to the student row
            const studentRow = document.querySelector(`[data-student-id="${studentId}"]`);
            if (studentRow) {
              studentRow.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest' 
              });
              
              // Add flash highlight effect
              studentRow.classList.add('flash-highlight');
              
              // Remove the flash class after animation completes
              setTimeout(() => {
                studentRow.classList.remove('flash-highlight');
              }, 3000); // Match the animation duration
            }
          }}
          defaultModalTab={defaultModalTab}
          onDefaultModalTabChange={setDefaultModalTab}
        />

      </div>      {/* Morning & Afternoon Section */}
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
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg mb-4">
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
                  isTakeAttendanceMode={isTakeAttendanceMode}
                  isFlipFlopPreviewMode={isFlipFlopPreviewMode}
                  onBatchUpdate={onBatchUpdate}
                  selectedStudents={selectedStudents}
                  onStudentSelect={handleStudentSelect}
                  onSelectAll={handleSelectAll}
                  getAttendanceStatus={getStudentAttendanceStatus}
                  getTodayAttendanceStatus={getTodayAttendanceStatus}
                  isStudentCurrentlyPresent={isStudentCurrentlyPresent}
                  onAttendanceChange={handleAttendanceChange}
                  calculateAverageArrivalTime={getAverageArrivalTime}
                  shiftRankings={shiftRankings}
                  forceCollapsed={isClassCollapsed(className)}
                  onClassToggle={handleClassToggle}
                  expandedClasses={expandedClasses}
                  onZoomToggle={handleZoomToggle}
                  searchQuery={searchQuery}
                  highlightText={highlightText}
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
                  isTakeAttendanceMode={isTakeAttendanceMode}
                  isFlipFlopPreviewMode={isFlipFlopPreviewMode}
                  onBatchUpdate={onBatchUpdate}
                  selectedStudents={selectedStudents}
                  onStudentSelect={handleStudentSelect}
                  onSelectAll={handleSelectAll}
                  getAttendanceStatus={getStudentAttendanceStatus}
                  getTodayAttendanceStatus={getTodayAttendanceStatus}
                  isStudentCurrentlyPresent={isStudentCurrentlyPresent}
                  onAttendanceChange={handleAttendanceChange}
                  calculateAverageArrivalTime={getAverageArrivalTime}
                  shiftRankings={shiftRankings}
                  forceCollapsed={isClassCollapsed(className)}
                  onClassToggle={handleClassToggle}
                  expandedClasses={expandedClasses}
                  onZoomToggle={handleZoomToggle}
                  searchQuery={searchQuery}
                  highlightText={highlightText}
                />
              </div>
            ))}
          </div>
        ) : (!searchQuery || searchQuery.trim() === '') ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No students in Morning or Afternoon shifts.</p>
          </div>
        ) : null}
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
                isTakeAttendanceMode={isTakeAttendanceMode}
                isFlipFlopPreviewMode={isFlipFlopPreviewMode}
                onBatchUpdate={onBatchUpdate}
                selectedStudents={selectedStudents}
                onStudentSelect={handleStudentSelect}
                onSelectAll={handleSelectAll}
                getAttendanceStatus={getStudentAttendanceStatus}
                getTodayAttendanceStatus={getTodayAttendanceStatus}
                isStudentCurrentlyPresent={isStudentCurrentlyPresent}
                onAttendanceChange={handleAttendanceChange}
                calculateAverageArrivalTime={getAverageArrivalTime}
                shiftRankings={shiftRankings}
                forceCollapsed={isClassCollapsed(className)}
                onClassToggle={handleClassToggle}
                expandedClasses={expandedClasses}
                onZoomToggle={handleZoomToggle}
                searchQuery={searchQuery}
                highlightText={highlightText}
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
        defaultTab={defaultModalTab}
      />

      {/* QR Code Modal for admin (lost receipt cases) */}
      <QRCodeModal
        student={selectedQRStudent}
        isOpen={isQRModalOpen}
        onClose={handleCloseQRModal}
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