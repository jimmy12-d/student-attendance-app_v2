// app/_utils/exportToExcel.ts
import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../dashboard/record/TableAttendance';

/**
 * Filter records by date range
 * @param records - All attendance records
 * @param days - Number of days to go back (0 = today, -1 = this month, -2 = last month)
 * @param startDate - Optional custom start date (YYYY-MM-DD)
 * @param endDate - Optional custom end date (YYYY-MM-DD)
 */
export const filterRecordsByDateRange = (
  records: AttendanceRecord[],
  days: number,
  startDate?: string,
  endDate?: string
): AttendanceRecord[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle custom date range
  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    return records.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date.split('T')[0] + 'T00:00:00');
      return recordDate >= start && recordDate <= end;
    });
  }

  // Handle special cases
  if (days === -1) {
    // This month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return records.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date.split('T')[0] + 'T00:00:00');
      return recordDate >= firstDayOfMonth && recordDate <= lastDayOfMonth;
    });
  }

  if (days === -2) {
    // Last month
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    return records.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date.split('T')[0] + 'T00:00:00');
      return recordDate >= firstDayOfLastMonth && recordDate <= lastDayOfLastMonth;
    });
  }

  // Handle regular day ranges
  const startDateCalc = new Date(today);
  startDateCalc.setDate(today.getDate() - days);

  return records.filter(record => {
    if (!record.date) return false;
    const recordDate = new Date(record.date.split('T')[0] + 'T00:00:00');
    return recordDate >= startDateCalc && recordDate <= today;
  });
};

/**
 * Export attendance records to Excel file
 * @param records - Array of attendance records to export
 * @param filename - Name of the exported file (without extension)
 * @param selectedDate - The date being viewed/filtered
 * @param shift - The shift being viewed/filtered
 */
export const exportAttendanceToExcel = (
  records: AttendanceRecord[],
  filename: string = 'attendance-records',
  selectedDate?: string,
  shift?: string
) => {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Transform records into Excel-friendly format
  const excelData = records.map((record, index) => ({
    'No.': index + 1,
    'Student Name': record.studentName || 'N/A',
    'Student ID': record.studentId || 'N/A',
    'Class': record.class || 'N/A',
    'Shift': record.shift || 'N/A',
    'Status': record.status || 'Unknown',
    'Date': record.date || 'N/A',
    'Time In': record.timeIn || 'N/A',
    'Method': record.method || 'N/A',
    'Parent Notification': record.parentNotificationStatus 
      ? record.parentNotificationStatus.charAt(0).toUpperCase() + record.parentNotificationStatus.slice(1).replace('_', ' ')
      : 'N/A',
  }));

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 5 },  // No.
    { wch: 25 }, // Student Name
    { wch: 15 }, // Student ID
    { wch: 10 }, // Class
    { wch: 12 }, // Shift
    { wch: 12 }, // Status
    { wch: 15 }, // Date
    { wch: 10 }, // Time In
    { wch: 18 }, // Method
    { wch: 20 }, // Parent Notification
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

  // Generate filename with date and shift info
  let finalFilename = filename;
  if (selectedDate) {
    finalFilename += `_${selectedDate}`;
  }
  if (shift) {
    finalFilename += `_${shift}`;
  }
  finalFilename += '.xlsx';

  // Write and download the file
  XLSX.writeFile(workbook, finalFilename);
};

/**
 * Export attendance summary statistics to Excel
 * @param stats - Attendance statistics object
 * @param filename - Name of the exported file (without extension)
 */
export const exportAttendanceStatsToExcel = (
  stats: {
    totalStudents: number;
    expectedStudents: number;
    checkedIn: number;
    present: number;
    late: number;
    absent: number;
    pending: number;
    requested: number;
    permission: number;
    sendHome: number;
  },
  filename: string = 'attendance-stats',
  selectedDate?: string,
  shift?: string
) => {
  const statsData = [
    { 'Metric': 'Total Students', 'Count': stats.totalStudents },
    { 'Metric': 'Expected Students (Current Shift)', 'Count': stats.expectedStudents },
    { 'Metric': 'Checked In', 'Count': stats.checkedIn },
    { 'Metric': 'Present', 'Count': stats.present },
    { 'Metric': 'Late', 'Count': stats.late },
    { 'Metric': 'Absent', 'Count': stats.absent },
    { 'Metric': 'Pending', 'Count': stats.pending },
    { 'Metric': 'Requested', 'Count': stats.requested },
    { 'Metric': 'Permission', 'Count': stats.permission },
    { 'Metric': 'Send Home', 'Count': stats.sendHome },
  ];

  const worksheet = XLSX.utils.json_to_sheet(statsData);
  worksheet['!cols'] = [{ wch: 35 }, { wch: 15 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistics');

  let finalFilename = filename;
  if (selectedDate) {
    finalFilename += `_${selectedDate}`;
  }
  if (shift) {
    finalFilename += `_${shift}`;
  }
  finalFilename += '.xlsx';

  XLSX.writeFile(workbook, finalFilename);
};
