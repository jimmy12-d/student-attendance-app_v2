"use client";

import React, { useState } from "react";
import { Timestamp } from "firebase/firestore";
import Button from "../../_components/Button"; // Adjust path as needed
import Buttons from "../../_components/Buttons"; // Adjust path as needed
import { mdiTrashCan } from "@mdi/js";

const formatDateToDDMMYYYY = (dateInput: string | Date | Timestamp | undefined): string => {
    if (!dateInput) return 'N/A';
    let dateObj: Date;

    if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');
        if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
        dateObj = new Date(dateInput); // Fallback
        }
    } else if (dateInput instanceof Timestamp) {
        dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
        dateObj = dateInput;
    } else {
        return 'Invalid Date Type';
    }

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = dateObj.getFullYear();

    return `${day}-${month}-${year}`; // This should produce a plain string like "29-05-2025"
  };
// Define an interface for your attendance records
export interface AttendanceRecord {
  id: string; // Firestore document ID
  studentName: string;
  studentId: string;
  class?: string;
  shift?: string;
  status: string; // e.g., "present"
  date: string;   // Your primary date field (likely "YYYY-MM-DD" string)
  timestamp?: Timestamp | Date; // The exact time of marking
}

type Props = {
  records: AttendanceRecord[];
  onDeleteRecord: (record: AttendanceRecord) => void;
  perPage?: number;
};


const TableAttendance = ({ records, onDeleteRecord, perPage = 10 }: Props) => {
  const [currentPage, setCurrentPage] = useState(0);
  const recordsPaginated = records.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(records.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Class</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Date</th>
              <th>Time
                <span title="Ordered by time" className="ml-1 align-middle text-xs text-gray-400">▼</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsPaginated.map((record: AttendanceRecord) => (
              <tr key={record.id}>
                <td data-label="Student Name">{record.studentName}</td>
                <td data-label="Class">{record.class || 'N/A'}</td>
                <td data-label="Shift">{record.shift || 'N/A'}</td>
                <td data-label="Status">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.status.toLowerCase() === 'present' ? 'bg-green-200 text-green-800' :
                    record.status.toLowerCase() === 'late' ? 'bg-yellow-200 text-yellow-800 border border-yellow-300' :
                    record.status.toLowerCase() === 'absent' ? 'bg-red-200 text-red-800' : // Kept your existing absent style
                    'bg-gray-100 text-gray-800' // Default for other statuses
                  }`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </td>
                <td data-label="Date" className="whitespace-nowrap">
                {/* Use the formatting function on record.date */}
                {formatDateToDDMMYYYY(record.date)}
                </td>
                <td data-label="Time" className="whitespace-nowrap">
                    {/* Your existing time formatting logic using record.timestamp */}
                    {record.timestamp instanceof Timestamp
                    ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : record.timestamp instanceof Date
                    ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'N/A'}
                </td>
                <td className="text-center align-middle before:hidden lg:w-1 whitespace-nowrap">
                <Buttons type="justify-center" noWrap>
                    <Button
                    color="danger"
                    icon={mdiTrashCan}
                    onClick={() => onDeleteRecord(record)}
                    small
                    isGrouped
                    />
                </Buttons>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 md:py-0">
          <Buttons>
            {pagesList.map((page) => (
              <Button
                key={page}
                active={page === currentPage}
                label={(page + 1).toString()}
                color={page === currentPage ? "lightDark" : "whiteDark"}
                small
                onClick={() => setCurrentPage(page)}
                isGrouped
              />
            ))}
          </Buttons>
          <small className="mt-6 md:mt-0">
            Page {currentPage + 1} of {numPages} (Total: {records.length} records)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableAttendance;