// app/dashboard/students/TableStudents.tsx
"use client";

import React, { useState } from "react";
import { Student } from "../../_interfaces";
import { ColumnToggle, ColumnConfig } from "./components/ColumnToggle";
import { ShiftSection } from "./components/ShiftSection";
import { ClassTable } from "./components/ClassTable";
import { StudentDetailsModal } from "./components/StudentDetailsModal";
import { toast } from 'sonner';

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  // Column configuration state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'number', label: '#N', enabled: true },
    { id: 'name', label: 'Name', enabled: true },
    { id: 'phone', label: 'Phone', enabled: true },
    { id: 'paymentStatus', label: 'Payment', enabled: false },
    { id: 'scheduleType', label: 'Type', enabled: false },
  ]);

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
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
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Get enabled columns
  const enabledColumns = columns.filter(col => col.enabled);

  return (
    <div className="space-y-8 p-6 pb-24 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Column Selection Panel */}
      <ColumnToggle columns={columns} onToggleColumn={toggleColumn} />

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
      />
    </div>
  );
};

export default TableStudents;