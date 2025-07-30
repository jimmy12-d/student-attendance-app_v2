"use client";

import React, { useState } from "react";
import { Timestamp } from "firebase/firestore";
import Button from "../../_components/Button"; // Adjust path as needed
import Buttons from "../../_components/Buttons"; // Adjust path as needed
import { mdiTrashCan, mdiCheck, mdiClose } from "@mdi/js";

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
  onDeleteRecord: (record: AttendanceRecord, reason?: 'rejected' | 'deleted') => void;
  onApproveRecord: (record: AttendanceRecord) => void;
  perPage?: number;
};


const TableAttendance = ({ records, onDeleteRecord, onApproveRecord, perPage = 10 }: Props) => {
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
              <th className="dark:text-white">Student Name</th>
              <th className="dark:text-white">Class</th>
              <th className="dark:text-white">Shift</th>
              <th className="dark:text-white">Status</th>
              <th className="dark:text-white">Date</th>
              <th className="dark:text-white">
                Time
                <span title="Ordered by time" className="ml-1 align-middle text-xs text-gray-400 dark:text-gray-500">▼</span>
              </th>
              <th className="dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsPaginated.map((record: AttendanceRecord) => (
              <tr key={record.id}>
                <td data-label="Student Name" className="dark:text-white">{record.studentName}</td>
                <td data-label="Class" className="dark:text-white">{record.class || 'N/A'}</td>
                <td data-label="Shift" className="dark:text-white">{record.shift || 'N/A'}</td>
                <td data-label="Status">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.status.toLowerCase() === 'present' ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                    record.status.toLowerCase() === 'late' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600' :
                    record.status.toLowerCase() === 'absent' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' :
                    record.status.toLowerCase() === 'permission' ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200' :
                    record.status.toLowerCase() === 'pending' ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 animate-pulse' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' // Default for other statuses
                  }`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </td>
                <td data-label="Date" className="whitespace-nowrap dark:text-white">
                {/* Use the formatting function on record.date */}
                {formatDateToDDMMYYYY(record.date)}
                </td>
                <td data-label="Time" className="whitespace-nowrap dark:text-white">
                    {/* Your existing time formatting logic using record.timestamp */}
                    {record.timestamp instanceof Timestamp
                    ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : record.timestamp instanceof Date
                    ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'N/A'}
                </td>
                <td className="text-center align-middle before:hidden lg:w-1 whitespace-nowrap">
                  {record.status === 'pending' ? (
                    <Buttons type="justify-center" noWrap>
                      <Button
                        color="success"
                        icon={mdiCheck}
                        onClick={() => onApproveRecord(record)}
                        small
                        isGrouped
                      />
                      <Button
                        color="danger"
                        icon={mdiClose}
                        onClick={() => onDeleteRecord(record, 'rejected')}
                        small
                        isGrouped
                      />
                    </Buttons>
                  ) : (
                    <Buttons type="justify-center" noWrap>
                        <Button
                        color="danger"
                        icon={mdiTrashCan}
                        onClick={() => onDeleteRecord(record, 'deleted')}
                        small
                        isGrouped
                        />
                    </Buttons>
                  )}
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
          <small className="mt-6 md:mt-0 dark:text-white">
            Page {currentPage + 1} of {numPages} (Total: {records.length} records)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableAttendance;