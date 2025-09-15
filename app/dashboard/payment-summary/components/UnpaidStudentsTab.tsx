"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { toast } from "sonner";
import { getPaymentStatus } from "../../_lib/paymentLogic";
import Icon from "../../../_components/Icon";
import { mdiClockOutline } from "@mdi/js";

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

interface UnpaidStudent {
  id: string;
  fullName: string;
  nameKhmer: string;
  class: string;
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
}

interface UnpaidStudentsTabProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const UnpaidStudentsTab: React.FC<UnpaidStudentsTabProps> = ({ isLoading, setIsLoading }) => {
  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<UnpaidStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("all");
  const [lateFeeFilter, setLateFeeFilter] = useState("all");

  useEffect(() => {
    fetchUnpaidStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [unpaidStudents, searchTerm, classFilter, shiftFilter, overdueFilter, lateFeeFilter]);

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

              // Condition 3: Check if in trial period (created < 3 days ago)
              isTrialPeriod = daysSinceCreation < 3;

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

          unpaidList.push({
            id: studentId,
            fullName: studentData.fullName || 'Unknown Student',
            nameKhmer: studentData.nameKhmer || '',
            class: studentData.class || 'Unknown Class',
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
            isNewStudent: isTrialPeriod
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

    // Class filter
    if (classFilter !== "all") {
      filtered = filtered.filter(student => student.class === classFilter);
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

    setFilteredStudents(filtered);
  };

  const getUniqueClasses = () => {
    const classes = [...new Set(unpaidStudents.map(student => student.class))];
    return classes.sort();
  };

  const getUniqueShifts = () => {
    const shifts = [...new Set(unpaidStudents.map(student => student.shift))];
    return shifts.sort();
  };

  const handleExportUnpaidStudents = () => {
    const csvData = [
      ['Unpaid Students Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [''],
      ['Student Name', 'Khmer Name', 'Class', 'Shift', 'Schedule', 'Phone', 'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone', 'Payment Date', 'Payment Amount', 'Days Overdue', 'Late Fee Permission', 'Telegram Username'],
      ...filteredStudents.map(student => [
        student.fullName,
        student.nameKhmer,
        student.class,
        student.shift,
        student.phone,
        student.lastPaymentDate,
        `$${student.lastPaymentAmount.toFixed(2)}`,
        student.daysOverdue === 999 ? 'Never Paid' : `${student.daysOverdue} days`,
        student.lateFeePermission ? 'Yes' : 'No',
        student.telegramUsername || 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `unpaid-students-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Unpaid students list exported successfully!");
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
                {searchTerm || classFilter !== "all" || shiftFilter !== "all" || overdueFilter !== "all" || lateFeeFilter !== "all" ? "Filtered" : "Total"} Unpaid
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Classes</option>
              {getUniqueClasses().map(cls => (
                <option key={cls} value={cls}>{cls}</option>
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

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setClassFilter("all");
                setShiftFilter("all");
                setOverdueFilter("all");
                setLateFeeFilter("all");
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
                
                <div className="flex items-center justify-between">
                  {/* Contact Info */}
                  <div className="min-w-0">
                    {student.phone ? (
                      student.hasTelegramUsername && student.telegramUsername ? (
                        <a 
                          href={`https://t.me/${student.telegramUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 group-hover:bg-blue-200 dark:group-hover:bg-blue-600 hover:text-blue-900 dark:hover:text-blue-100 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                          title={`Contact ${student.fullName} on Telegram (@${student.telegramUsername})`}
                        >
                          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                          <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                        </a>
                      ) : student.hasTelegramUsername && !student.telegramUsername ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors duration-200 whitespace-nowrap"
                              title={`${student.fullName} needs Telegram username setup`}>
                          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200 whitespace-nowrap">
                          <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 transition-colors duration-200 whitespace-nowrap">
                        N/A
                      </span>
                    )}
                  </div>
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
