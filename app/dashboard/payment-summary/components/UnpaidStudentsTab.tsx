"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { toast } from "sonner";
import { getPaymentStatus } from "../../_lib/paymentLogic";
import Icon from "../../../_components/Icon";
import { mdiClockOutline, mdiCheckCircle, mdiCloseCircle, mdiBellRing, mdiSend } from "@mdi/js";
import * as XLSX from 'xlsx';
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../firebase-config";

// Phone formatting utility (matching StudentRow)
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

// Helper function to format notification time
const formatNotificationTime = (timestamp: any): string => {
  if (!timestamp) return "Unknown";
  let date: Date;
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return "Unknown";
  }
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface NotificationLog {
  chatId: string;
  parentName?: string;
  sentAt: any;
  success: boolean;
  errorMessage?: string;
  errorCode?: number;
  deactivated?: boolean;
}

interface UnpaidStudent {
  id: string;
  fullName: string;
  nameKhmer: string;
  class: string;
  classType: string;
  shift: string;
  lastPaymentMonth: string;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  daysOverdue: number;
  phone: string;
  photoUrl: string;
  telegramUsername?: string;
  hasTelegramUsername: boolean;
  lateFeePermission: boolean;
  isNewStudent: boolean;
  hasParentConnected: boolean;
  parentCount: number;
  paymentReminderLogs?: NotificationLog[];
  lastReminderSent?: any;
}

interface UnpaidStudentsTabProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Component to display notification delivery status
const NotificationStatus: React.FC<{ logs?: NotificationLog[] }> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Icon path={mdiClockOutline} size={14} />
        <span>No reminder sent yet</span>
      </div>
    );
  }

  const successCount = logs.filter(log => log.success).length;
  const failedCount = logs.length - successCount;
  const allSuccess = successCount === logs.length;
  const allFailed = failedCount === logs.length;

  return (
    <div className="space-y-1">
      {/* Summary */}
      <div className={`flex items-center gap-1 text-xs font-medium ${
        allSuccess 
          ? 'text-green-600 dark:text-green-400' 
          : allFailed 
          ? 'text-red-600 dark:text-red-400'
          : 'text-orange-600 dark:text-orange-400'
      }`}>
        <Icon 
          path={allSuccess ? mdiCheckCircle : allFailed ? mdiCloseCircle : mdiBellRing} 
          size={14} 
        />
        <span>
          {allSuccess 
            ? `✓ Sent to ${successCount} parent${successCount > 1 ? 's' : ''}` 
            : allFailed
            ? `✗ Failed for ${failedCount} parent${failedCount > 1 ? 's' : ''}`
            : `${successCount} sent, ${failedCount} failed`
          }
        </span>
      </div>

      {/* Detailed logs - expandable */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          View details
        </summary>
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2 ${
                log.success 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              <Icon 
                path={log.success ? mdiCheckCircle : mdiCloseCircle} 
                size={14} 
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {log.success ? '✓ Delivered' : '✗ Failed'}
                  {log.parentName && log.parentName !== 'Unknown' && (
                    <span className="font-normal"> to {log.parentName}</span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {formatNotificationTime(log.sentAt)}
                </div>
                {log.errorMessage && (
                  <div className="text-red-500 dark:text-red-400 text-xs">
                    Error: {log.errorMessage}
                  </div>
                )}
                {log.deactivated && (
                  <div className="text-orange-500 dark:text-orange-400 text-xs">
                    ⚠ Notification deactivated (bot blocked)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

const UnpaidStudentsTab: React.FC<UnpaidStudentsTabProps> = ({ isLoading, setIsLoading }) => {
  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<UnpaidStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [classTypeFilter, setClassTypeFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("all");
  const [lateFeeFilter, setLateFeeFilter] = useState("all");
  const [trialPeriodFilter, setTrialPeriodFilter] = useState("all");
  const [sendingReminders, setSendingReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnpaidStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [unpaidStudents, searchTerm, classTypeFilter, shiftFilter, overdueFilter, lateFeeFilter, trialPeriodFilter]);

  const fetchUnpaidStudents = async () => {
    setIsLoading(true);
    try {
      // Get current date and calculate current month
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-based (September = 8)
      const currentYear = now.getFullYear();
      
      // Current month string format (e.g., "2025-09" for September 2025)
      const currentMonthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

      console.log("Checking for unpaid students for month:", currentMonthString);

      // Fetch all students
      const studentsRef = collection(db, "students");
      const studentsSnapshot = await getDocs(studentsRef);
      
      // Fetch all transactions to get payment history
      const transactionsRef = collection(db, "transactions");
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      // Create a map of student payments
      const studentPayments = new Map<string, any[]>();
      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const studentId = data.studentId;
        if (!studentPayments.has(studentId)) {
          studentPayments.set(studentId, []);
        }
        studentPayments.get(studentId)!.push({
          ...data,
          date: new Date(data.date)
        });
      });

      // Fetch parent notification data to check if parents are connected
      const parentNotificationsRef = collection(db, "parentNotifications");
      const parentNotificationsSnapshot = await getDocs(parentNotificationsRef);
      
      // Create a map of student -> parent notifications
      const studentParentMap = new Map<string, any[]>();
      parentNotificationsSnapshot.forEach((doc) => {
        const data = doc.data();
        const studentId = data.studentId;
        if (!studentParentMap.has(studentId)) {
          studentParentMap.set(studentId, []);
        }
        studentParentMap.get(studentId)!.push(data);
      });

      const unpaidList: UnpaidStudent[] = [];

      studentsSnapshot.forEach((studentDoc) => {
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;
        
        // Filter for active students only
        const isActive = !studentData.onWaitlist && 
                        !studentData.dropped && 
                        !studentData.onBreak &&
                        studentData.fullName && 
                        studentData.fullName.trim() !== "";

        if (!isActive) {
          return; // Skip inactive students
        }

        const payments = studentPayments.get(studentId) || [];
        
        // Sort payments by date (most recent first)
        payments.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        let isUnpaid = false;
        let lastPaymentDate = 'Never';
        let lastPaymentAmount = 0;
        let daysOverdue = 999;

        if (payments.length > 0) {
          const lastPayment = payments[0];
          lastPaymentDate = lastPayment.date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
          lastPaymentAmount = lastPayment.amount || 0;
          
          // Use new payment logic to determine if student is unpaid
          const paymentStatus = getPaymentStatus(studentData.lastPaymentMonth);
          if (paymentStatus !== 'paid') {
            isUnpaid = true;
            daysOverdue = Math.floor((now.getTime() - lastPayment.date.getTime()) / (1000 * 60 * 60 * 24));
          }
        } else {
          // No payments at all - definitely unpaid
          isUnpaid = true;
          daysOverdue = 999; // Very overdue
        }

        if (isUnpaid) {
          // Debug logging for the specific student
          if (studentData.fullName === 'សុខ លីហួរ') {
            console.log('Debug for សុខ លីហួរ:', {
              paymentsLength: payments.length,
              lastPaymentMonth: studentData.lastPaymentMonth,
              createdAt: studentData.createdAt,
              registeredAt: studentData.registeredAt,
              hasCreatedAt: !!studentData.createdAt,
              createdAtType: typeof studentData.createdAt,
              createdAtRaw: JSON.stringify(studentData.createdAt)
            });
          }

          // Determine display date based on payment history
          let displayDate = lastPaymentDate;
          let isTrialPeriod = false;

          if (studentData.createdAt) {
            // Handle Firebase timestamp format properly
            let createdDate;
            try {
              if (typeof studentData.createdAt === 'object' && studentData.createdAt.toDate) {
                // Firebase Timestamp object
                createdDate = studentData.createdAt.toDate();
                if (studentData.fullName === 'សុខ លីហួរ') {
                  console.log('Using Firebase Timestamp object:', createdDate);
                }
              } else if (typeof studentData.createdAt === 'string') {
                // Handle Firebase string format: "September 15, 2025 at 5:19:43 PM UTC+7"
                let dateStr = studentData.createdAt;
                
                // Remove the UTC+7 part and clean up
                dateStr = dateStr.replace(' UTC+7', '').replace(' ', ' ');
                
                // Try parsing the full string first
                createdDate = new Date(dateStr);
                
                if (isNaN(createdDate.getTime())) {
                  // If that fails, try parsing just the date part
                  const dateOnly = dateStr.split(' at ')[0];
                  createdDate = new Date(dateOnly);
                  
                  if (isNaN(createdDate.getTime())) {
                    // Try manual parsing for "Month DD, YYYY at HH:MM:SS AM/PM" format
                    const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)\s+at\s+(\d+):(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                      const [, month, day, year, hour, minute, second, ampm] = match;
                      const hour24 = ampm.toUpperCase() === 'PM' ? (parseInt(hour) % 12) + 12 : parseInt(hour) % 12;
                      createdDate = new Date(parseInt(year), new Date(`${month} 1`).getMonth(), parseInt(day), hour24, parseInt(minute), parseInt(second));
                    }
                  }
                }
                
                if (studentData.fullName === 'សុខ លីហួរ') {
                  console.log('Parsed string date:', dateStr, 'Result:', createdDate, 'Is valid:', !isNaN(createdDate.getTime()));
                }
              } else {
                // Fallback to direct Date constructor
                createdDate = new Date(studentData.createdAt);
                if (studentData.fullName === 'សុខ លីហួរ') {
                  console.log('Using fallback Date constructor:', createdDate);
                }
              }
              
              // Validate the date
              if (isNaN(createdDate.getTime())) {
                throw new Error('Invalid date after all parsing attempts');
              }
              
              if (studentData.fullName === 'សុខ លីហួរ') {
                console.log('Final parsed date:', createdDate.toLocaleDateString('en-GB')); // dd/mm/yyyy format
              }
              
              const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

              // Condition 3: Check if in trial period (created within last 3 days including today)
              isTrialPeriod = daysSinceCreation <= 3;

              // Condition 1 & 2: Show appropriate date
              if (payments.length > 0) {
                // Has previous payments - show last payment date (already set above)
                displayDate = lastPaymentDate;
              } else {
                // No previous payments - show enrollment date (createdAt) in dd/mm/yyyy format
                // This covers cases where lastPaymentMonth is "" or null or "Never"
                displayDate = createdDate.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                if (studentData.fullName === 'សុខ លីហួរ') {
                  console.log('Setting enrollment date for សុខ លីហួរ:', displayDate, 'because payments.length =', payments.length);
                }
              }
            } catch (error) {
              console.error('Error parsing createdAt for student:', studentData.fullName, studentData.createdAt, error);
              // Keep the default "Never" if date parsing fails
              displayDate = lastPaymentDate;
            }
          } else {
            // No createdAt field - keep the default "Never"
            displayDate = lastPaymentDate;
            if (studentData.fullName === 'សុខ លីហួរ') {
              console.log('No createdAt for សុខ លីហួរ, keeping Never');
            }
          }

          // Get parent notification data for this student
          const parentNotifications = studentParentMap.get(studentId) || [];
          const activeParents = parentNotifications.filter(p => p.isActive === true);
          const hasParentConnected = activeParents.length > 0;

          unpaidList.push({
            id: studentId,
            fullName: studentData.fullName || 'Unknown Student',
            nameKhmer: studentData.nameKhmer || '',
            class: studentData.class || 'Unknown Class',
            classType: studentData.classType || 'Unknown Type',
            shift: studentData.shift || 'Unknown',
            lastPaymentMonth: studentData.lastPaymentMonth || 'Never',
            lastPaymentDate: displayDate,
            lastPaymentAmount,
            daysOverdue,
            phone: studentData.phone || '',
            photoUrl: studentData.photoUrl || '',
            telegramUsername: studentData.telegramUsername || '',
            hasTelegramUsername: studentData.hasTelegramUsername || false,
            lateFeePermission: studentData.lateFeePermission || false,
            isNewStudent: isTrialPeriod,
            hasParentConnected: hasParentConnected,
            parentCount: activeParents.length,
            paymentReminderLogs: studentData.paymentReminderLogs || [],
            lastReminderSent: studentData.lastReminderSent || null
          });
        }
      });

      // Sort by days overdue (most overdue first)
      unpaidList.sort((a, b) => b.daysOverdue - a.daysOverdue);
      
      setUnpaidStudents(unpaidList);
      console.log(`Found ${unpaidList.length} unpaid active students`);
    } catch (error) {
      console.error("Error fetching unpaid students:", error);
      toast.error("Failed to fetch unpaid students data");
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = unpaidStudents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nameKhmer.includes(searchTerm) ||
        student.phone.includes(searchTerm) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class Type filter
    if (classTypeFilter !== "all") {
      filtered = filtered.filter(student => student.classType === classTypeFilter);
    }

    // Shift filter
    if (shiftFilter !== "all") {
      filtered = filtered.filter(student => student.shift === shiftFilter);
    }

    // Overdue filter
    if (overdueFilter !== "all") {
      if (overdueFilter === "critical") {
        filtered = filtered.filter(student => student.daysOverdue > 30);
      } else if (overdueFilter === "warning") {
        filtered = filtered.filter(student => student.daysOverdue > 14 && student.daysOverdue <= 30);
      } else if (overdueFilter === "recent") {
        filtered = filtered.filter(student => student.daysOverdue <= 14);
      } else if (overdueFilter === "never") {
        filtered = filtered.filter(student => student.daysOverdue === 999);
      }
    }

    // Late fee filter
    if (lateFeeFilter !== "all") {
      if (lateFeeFilter === "with-late-fee") {
        filtered = filtered.filter(student => student.lateFeePermission);
      } else if (lateFeeFilter === "without-late-fee") {
        filtered = filtered.filter(student => !student.lateFeePermission);
      }
    }

    // Trial period filter
    if (trialPeriodFilter !== "all") {
      if (trialPeriodFilter === "trial-period") {
        filtered = filtered.filter(student => student.isNewStudent);
      } else if (trialPeriodFilter === "not-trial-period") {
        filtered = filtered.filter(student => !student.isNewStudent);
      }
    }

    setFilteredStudents(filtered);
  };

  const getUniqueClasses = () => {
    const classes = [...new Set(unpaidStudents.map(student => student.class))];
    return classes.sort();
  };

  const getUniqueClassTypes = () => {
    const classTypes = [...new Set(unpaidStudents.map(student => student.classType))];

    // Custom sort function for grades
    const gradeSort = (a: string, b: string) => {
      // Extract grade number from strings like "Grade 7", "Grade 8", etc.
      const getGradeNumber = (str: string) => {
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };

      const gradeA = getGradeNumber(a);
      const gradeB = getGradeNumber(b);

      // If both have grade numbers, sort by grade number
      if (gradeA && gradeB) {
        return gradeA - gradeB;
      }

      // If only one has grade number, put the one with grade number first
      if (gradeA && !gradeB) return -1;
      if (!gradeA && gradeB) return 1;

      // If neither has grade number, sort alphabetically
      return a.localeCompare(b);
    };

    return classTypes.sort(gradeSort);
  };

  const getUniqueShifts = () => {
    const shifts = [...new Set(unpaidStudents.map(student => student.shift))];
    return shifts.sort();
  };

  const handleExportUnpaidStudents = () => {
    const wb = XLSX.utils.book_new();
    
    // Create the data array
    const data = [
      ['Unpaid Students Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [`Total Unpaid Students: ${filteredStudents.length}`],
      [],
      ['Student Name', 'Khmer Name', 'Class', 'Shift', 'Phone', 'Last Payment Date', 'Last Payment Amount', 'Days Overdue', 'Late Fee Permission', 'Telegram Username'],
      ...filteredStudents.map(student => [
        student.fullName,
        student.nameKhmer,
        student.class,
        student.shift,
        student.phone,
        student.lastPaymentDate,
        student.lastPaymentAmount,
        student.daysOverdue === 999 ? 'Never Paid' : student.daysOverdue,
        student.lateFeePermission ? 'Yes' : 'No',
        student.telegramUsername || 'N/A'
      ])
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Unpaid Students');
    
    // Write file
    XLSX.writeFile(wb, `unpaid-students-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Unpaid students list exported successfully!");
  };

  const handleSendPaymentReminder = async (studentId: string, studentName: string) => {
    if (sendingReminders.has(studentId)) {
      toast.info("Reminder already sending for this student...");
      return;
    }

    try {
      setSendingReminders(prev => new Set(prev).add(studentId));
      toast.loading(`Sending reminder to ${studentName}...`, { id: `reminder-${studentId}` });

      const sendPaymentReminderFn = httpsCallable(functions, 'sendPaymentReminder');
      const result = await sendPaymentReminderFn({ studentId });
      const data = result.data as { success: boolean; notificationsSent: number; message: string; notificationLogs: NotificationLog[] };

      if (data.success && data.notificationsSent > 0) {
        toast.success(`Reminder sent to ${data.notificationsSent} parent${data.notificationsSent > 1 ? 's' : ''}`, { id: `reminder-${studentId}` });
        
        // Update the student in local state with the new notification logs
        setUnpaidStudents(prev => prev.map(s => 
          s.id === studentId 
            ? { ...s, paymentReminderLogs: data.notificationLogs, lastReminderSent: new Date() }
            : s
        ));
      } else {
        toast.warning(data.message || "Unable to send reminder", { id: `reminder-${studentId}` });
      }
    } catch (error: any) {
      console.error("Error sending payment reminder:", error);
      toast.error(`Failed to send reminder: ${error.message}`, { id: `reminder-${studentId}` });
    } finally {
      setSendingReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Unpaid Students</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Active students who haven't paid for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{filteredStudents.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {searchTerm || classTypeFilter !== "all" || shiftFilter !== "all" || overdueFilter !== "all" || lateFeeFilter !== "all" || trialPeriodFilter !== "all" ? "Filtered" : "Total"} Unpaid
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {filteredStudents.filter(s => s.lateFeePermission).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With Late Fee</div>
            </div>
            <button
              onClick={handleExportUnpaidStudents}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, phone, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Type</label>
            <select
              value={classTypeFilter}
              onChange={(e) => setClassTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Class Types</option>
              {getUniqueClassTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shift</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Shifts</option>
              {getUniqueShifts().map(shift => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Late Fee</label>
            <select
              value={lateFeeFilter}
              onChange={(e) => setLateFeeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Students</option>
              <option value="with-late-fee">With Late Fee Permission</option>
              <option value="without-late-fee">Without Late Fee Permission</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Period</label>
            <select
              value={trialPeriodFilter}
              onChange={(e) => setTrialPeriodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Students</option>
              <option value="trial-period">In Trial Period</option>
              <option value="not-trial-period">Not In Trial Period</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setClassTypeFilter("all");
                setShiftFilter("all");
                setOverdueFilter("all");
                setLateFeeFilter("all");
                setTrialPeriodFilter("all");
              }}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading unpaid students...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {unpaidStudents.length === 0 ? "✅" : "🔍"}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {unpaidStudents.length === 0 ? "All Students Paid!" : "No Students Found"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {unpaidStudents.length === 0 
                ? "No active students are currently unpaid for this month." 
                : "Try adjusting your filters to find students."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  student.lateFeePermission 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 shadow-green-100 dark:shadow-green-900/20' 
                    : student.lastPaymentAmount > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {student.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="hover:underline font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors duration-200"
                      onClick={() => {
                        navigator.clipboard.writeText(student.fullName);
                        toast.success(`Copied "${student.fullName}" to clipboard`);
                      }}
                      title="Click to copy student name"
                    >
                      {student.fullName}
                    </h3>
                    {student.nameKhmer && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{student.nameKhmer}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors duration-200">
                        {student.class}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        student.shift?.toLowerCase() === 'morning' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50'
                          : student.shift?.toLowerCase() === 'afternoon'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
                          : student.shift?.toLowerCase() === 'evening'
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                      }`}>
                        {student.shift}
                      </span>
                      {student.lateFeePermission && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors duration-200">
                          Late Fee Allow
                        </span>
                      )}
                      {student.isNewStudent && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors duration-200">
                          <Icon path={mdiClockOutline} size={12} className="mr-1" />
                          Trial Period
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Payment Info - Moved to top right */}
                  <div className="text-right min-w-0 flex-shrink-0">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {student.lastPaymentDate === 'Never' || student.lastPaymentAmount === 0 ? 'Enrollment Date' : 'Last Payment'}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {student.lastPaymentDate}
                    </div>
                    <div className={`text-sm ${student.lastPaymentDate === 'Never' || student.lastPaymentAmount === 0 ? 'text-gray-600 dark:text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                      {student.lastPaymentDate === 'Never' || student.lastPaymentAmount === 0 ? 'No record' : `$${student.lastPaymentAmount.toFixed(2)}`}
                    </div>
                  </div>
                </div>
                
                {/* Parent Connection Status and Send Button */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Parent Connection Indicator */}
                    <div className="flex-1 min-w-0">
                      {student.hasParentConnected ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {student.parentCount} parent{student.parentCount > 1 ? 's' : ''} connected
                            </span>
                          </div>
                          <button
                            onClick={() => handleSendPaymentReminder(student.id, student.fullName)}
                            disabled={sendingReminders.has(student.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              sendingReminders.has(student.id)
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 cursor-pointer'
                            }`}
                            title="Send payment reminder"
                          >
                            {sendingReminders.has(student.id) ? (
                              <>
                                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Icon path={mdiSend} size={14} />
                                <span>Send Reminder</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>No parent connected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notification Logs */}
                  {student.paymentReminderLogs && student.paymentReminderLogs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <NotificationStatus logs={student.paymentReminderLogs} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnpaidStudentsTab;
