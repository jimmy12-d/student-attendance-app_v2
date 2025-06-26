// app/dashboard/students/TableStudents.tsx
"use client";

import { mdiPencil, mdiTrashCan } from "@mdi/js";
import React from "react";
import { Student } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
};

// Phone formatting utility
const formatPhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return 'N/A';
  const cleaned = ('' + phone).replace(/\D/g, '');

  let digits = cleaned;
  // Standardize to 10 digits if it's a 9-digit number missing the leading 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }
  
  // Format 10-digit numbers (0XX-XXX-XXXX)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Format 9-digit numbers (0XX-XXX-XXX)
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  
  return phone; // Return original if it doesn't match formats
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  // Filter out students who are missing a class property to prevent 'undefined' groups
  const validStudents = students.filter(student => student.class);

  // 1. Group students by class, then by shift
  const groupedStudents = validStudents.reduce((acc, student) => {
    const { class: studentClass, shift } = student;
    if (!acc[studentClass]) {
      acc[studentClass] = { Morning: [], Afternoon: [] };
    }
    // Ensure shift is either 'Morning' or 'Afternoon' to avoid adding to wrong keys
    if (shift === 'Morning' || shift === 'Afternoon') {
      acc[studentClass][shift].push(student);
    }
    return acc;
  }, {} as Record<string, { Morning: Student[]; Afternoon: Student[] }>);

  // Sort students by fullName within each class and shift
  for (const classGroup of Object.values(groupedStudents)) {
    classGroup.Morning.sort((a, b) => a.fullName.localeCompare(b.fullName));
    classGroup.Afternoon.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // 2. Get a sorted list of unique class names
  const sortedClasses = Object.keys(groupedStudents).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Helper component for rendering a table for a specific class/shift
  const ClassTable = ({ studentList }: { studentList: Student[] }) => (
    studentList.length > 0 ? (
      <div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-700">
              <th className="p-2 text-left w-12">Nº</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {studentList.map((student, index) => (
              <tr key={student.id} className="border-b border-gray-100 dark:border-slate-800">
                <td className="p-2 text-center">{index + 1}</td>
                <td data-label="Name" className="p-2">{student.fullName}</td>
                <td data-label="Phone" className="p-2">{formatPhoneNumber(student.phone)}</td>
                <td className="p-2 before:hidden whitespace-nowrap text-right">
                  <Buttons type="justify-end" noWrap>
                    <Button color="success" icon={mdiPencil} onClick={() => onEdit(student)} small isGrouped />
                    <Button color="danger" icon={mdiTrashCan} onClick={() => onDelete(student)} small isGrouped />
                  </Buttons>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4 h-full flex items-center justify-center">No students</div>
    )
  );

  return (
    <div className="space-y-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      {/* Titles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
        <h2 className="text-2xl font-bold text-center">Morning Shift</h2>
        <h2 className="text-2xl font-bold text-center">Afternoon Shift</h2>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Class Rows */}
      {sortedClasses.map((className) => (
        <div key={className} className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 items-stretch">
          
          {/* Morning Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex flex-col">
            <h3 className="font-bold text-lg mb-3 text-center">{className}</h3>
            <div className="flex-grow">
              <ClassTable studentList={groupedStudents[className].Morning} />
            </div>
          </div>

          {/* Afternoon Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex flex-col">
            <h3 className="font-bold text-lg mb-3 text-center">{className}</h3>
            <div className="flex-grow">
              <ClassTable studentList={groupedStudents[className].Afternoon} />
            </div>
          </div>

        </div>
      ))}
    </div>
  );
};

export default TableStudents;