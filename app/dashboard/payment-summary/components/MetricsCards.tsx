"use client";
import React, { useState } from "react";
import { mdiCurrencyUsd, mdiAccount, mdiTrendingUp, mdiTrendingDown, mdiClose, mdiAlertCircle } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";
import NumberDynamic from "../../../_components/NumberDynamic";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { getPaymentStatus, getInactiveStudentStatus } from "../../_lib/paymentLogic";

interface MetricsCardsProps {
  summaryData: {
    totalRevenue: number;
    totalTransactions: number;
    averagePayment: number;
    dailyAverage: number;
    unpaidStudentsCount: number;
    expectedRevenue?: {
      trialPeriodAmount: number;
      existingUnpaidAmount: number;
      totalExpected: number;
      trialPeriodCount: number;
      existingUnpaidCount: number;
    };
  };
  isLoading: boolean;
  startDate?: string;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ summaryData, isLoading, startDate }) => {
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [unpaidStudents, setUnpaidStudents] = useState<Array<{ id: string; fullName: string; nameKhmer: string; class: string; startDate?: Date; isTrialPeriod?: boolean; isExistingStudent?: boolean }>>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [selectedMonthDisplay, setSelectedMonthDisplay] = useState("");
  const [inactiveStudents, setInactiveStudents] = useState<{
    total: number;
    dropped: number;
    onBreak: number;
    droppedTotal: number;
    onBreakTotal: number;
    new: number;
    newTotal: number;
  }>({
    total: 0,
    dropped: 0,
    onBreak: 0,
    droppedTotal: 0,
    onBreakTotal: 0,
    new: 0,
    newTotal: 0
  });
  const [loadingInactive, setLoadingInactive] = useState(false);

  // Fetch inactive students data on component mount and when startDate changes
  React.useEffect(() => {
    fetchInactiveStudents(startDate);
  }, [startDate]);

  const fetchUnpaidStudents = async () => {
    setLoadingUnpaid(true);
    try {
      // Use the selected date from the date picker, or fallback to current date
      const targetDate = startDate ? new Date(startDate + 'T12:00:00') : new Date();
      
      // Format display month
      const displayMonth = targetDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      setSelectedMonthDisplay(displayMonth);
      
      // Check if the selected month is the current month
      const now = new Date();
      const isCurrentMonth = targetDate.getMonth() === now.getMonth() && 
                            targetDate.getFullYear() === now.getFullYear();
      
      // Fetch all active students from current academic year
      const studentsRef = collection(db, "students");
      const studentsQuery = query(studentsRef, where("ay", "==", "2026"));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      const unpaidList: Array<{ id: string; fullName: string; nameKhmer: string; class: string; startDate?: Date; isTrialPeriod?: boolean; isExistingStudent?: boolean }> = [];

      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data() as any;

        // Skip inactive students (dropped or on break)
        const inactiveStatus = getInactiveStudentStatus(studentData);
        if (inactiveStatus === 'dropped' || inactiveStatus === 'onBreak') {
          return;
        }

        // Skip students who are on break, waitlist, dropped, or not active (match page.tsx logic)
        if (studentData.onBreak || studentData.onWaitlist || studentData.dropped || studentData.isActive === false) {
          return;
        }

        // Use getPaymentStatus with the selected date to determine if student is unpaid
        const paymentStatus = getPaymentStatus(studentData.lastPaymentMonth, targetDate);
        
        // For current month: include both 'unpaid' and 'no-record' students
        // For past months: only include 'unpaid' students (exclude 'no-record')
        const shouldInclude = paymentStatus === 'unpaid' || 
                             (paymentStatus === 'no-record' && isCurrentMonth);
        
        if (shouldInclude) {
          // Check student enrollment status
          let isTrialPeriod = false;
          let isExistingStudent = false;
          let startDate: Date | undefined;
          
          if (studentData.createdAt) {
            // Handle Firestore Timestamp
            startDate = studentData.createdAt.toDate ? studentData.createdAt.toDate() : new Date(studentData.createdAt);
            if (startDate) {
              const daysSinceStart = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              isTrialPeriod = daysSinceStart <= 3 && daysSinceStart >= 0;
              isExistingStudent = daysSinceStart > 3;
            }
          } else if (studentData.startDate) {
            // Handle other date formats
            startDate = studentData.startDate.toDate ? studentData.startDate.toDate() : new Date(studentData.startDate);
            if (startDate) {
              const daysSinceStart = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              isTrialPeriod = daysSinceStart <= 3 && daysSinceStart >= 0;
              isExistingStudent = daysSinceStart > 3;
            }
          }

          unpaidList.push({
            id: doc.id,
            fullName: studentData.fullName || 'Unknown',
            nameKhmer: studentData.nameKhmer || '',
            class: studentData.class || 'N/A',
            startDate,
            isTrialPeriod,
            isExistingStudent
          });
        }
      });

      // Sort by class (7 to 12) - extract numeric part from class names like "Class 12B", "7F", etc.
      unpaidList.sort((a, b) => {
        const getClassNumber = (classStr: string) => {
          const match = classStr.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        const classA = getClassNumber(a.class);
        const classB = getClassNumber(b.class);
        return classA - classB;
      });
      setUnpaidStudents(unpaidList);
    } catch (error) {
      console.error("Error fetching unpaid students:", error);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const handleUnpaidClick = () => {
    setShowUnpaidModal(true);
    fetchUnpaidStudents();
  };

  const fetchInactiveStudents = async (startDate?: string) => {
    setLoadingInactive(true);
    try {
      // Use the selected date from the date picker, or fallback to current date
      const targetDate = startDate ? new Date(startDate + 'T12:00:00') : new Date();
      const searchMonth = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Fetch all students from current academic year
      const studentsRef = collection(db, "students");
      const studentsQuery = query(studentsRef, where("ay", "==", "2026"));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      // Fetch classes to get type mapping
      const classesRef = collection(db, "classes");
      const classesSnapshot = await getDocs(classesRef);
      const classToTypeMap = new Map<string, string>();
      classesSnapshot.forEach((doc) => {
        const data = doc.data();
        classToTypeMap.set(doc.id, data.type || ''); // Map class ID to type (e.g., "MWF")
      });
      
      // Fetch class types to get pricing
      const classTypesRef = collection(db, "classTypes");
      const classTypesSnapshot = await getDocs(classTypesRef);
      const classTypePrices = new Map<string, number>();
      classTypesSnapshot.forEach((doc) => {
        const data = doc.data();
        classTypePrices.set(doc.id, data.price || 25); // Default to $25 if not set
      });
      
      let droppedCount = 0;
      let onBreakCount = 0;
      let droppedTotal = 0;
      let onBreakTotal = 0;
      let newCount = 0;
      let newTotal = 0;

      const studentDocs = studentsSnapshot.docs;
      await Promise.all(studentDocs.map(async (doc) => {
        const studentData = doc.data() as any;

        // Use central inactive student logic
        const inactiveStatus = getInactiveStudentStatus(studentData, targetDate);
        
        if (inactiveStatus === 'dropped') {
          droppedCount++;
          // Calculate price using same logic as expected revenue
          const studentClass = studentData.class; // e.g., "Class A"
          const classId = studentClass?.replace('Class ', '').trim() || '';
          const classType = classToTypeMap.get(classId) || '';
          let studentPrice = classTypePrices.get(classType) || 25;
          
          // Apply discount if student has a discount field
          if (studentData.discount && typeof studentData.discount === 'number') {
            // Discount is stored as actual amount to subtract (e.g., 5 for $5 off)
            studentPrice = studentPrice - studentData.discount;
          }
          
          droppedTotal += studentPrice;
        }
        if (inactiveStatus === 'onBreak') {
          onBreakCount++;
          // Calculate price using same logic as expected revenue
          const studentClass = studentData.class; // e.g., "Class A"
          const classId = studentClass?.replace('Class ', '').trim() || '';
          const classType = classToTypeMap.get(classId) || '';
          let studentPrice = classTypePrices.get(classType) || 25;
          
          // Apply discount if student has a discount field
          if (studentData.discount && typeof studentData.discount === 'number') {
            // Discount is stored as actual amount to subtract (e.g., 5 for $5 off)
            studentPrice = studentPrice - studentData.discount;
          }
          
          onBreakTotal += studentPrice;
        }

        // Check for new students if not inactive
        if (inactiveStatus !== 'dropped' && inactiveStatus !== 'onBreak') {
          try {
            // Check if student was created in the search month
            if (studentData.createdAt) {
              const createdAt = studentData.createdAt.toDate ? studentData.createdAt.toDate() : new Date(studentData.createdAt);
              const createdMonth = createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              
              if (createdMonth === searchMonth) {
                newCount++;
                // Calculate price using same logic as expected revenue
                const studentClass = studentData.class; // e.g., "Class A"
                const classId = studentClass?.replace('Class ', '').trim() || '';
                const classType = classToTypeMap.get(classId) || '';
                let studentPrice = classTypePrices.get(classType) || 25;
                
                // Apply discount if student has a discount field
                if (studentData.discount && typeof studentData.discount === 'number') {
                  // Discount is stored as actual amount to subtract (e.g., 5 for $5 off)
                  studentPrice = studentPrice - studentData.discount;
                }
                
                newTotal += studentPrice;
              }
            }
          } catch (error) {
            console.error(`Error checking creation date for student ${doc.id}:`, error);
          }
        }
      }));

      const totalInactive = droppedCount + onBreakCount + newCount;
      const totalInactiveValue = droppedTotal + onBreakTotal + newTotal;

      setInactiveStudents({
        total: totalInactive,
        dropped: droppedCount,
        onBreak: onBreakCount,
        droppedTotal,
        onBreakTotal,
        new: newCount,
        newTotal
      });
    } catch (error) {
      console.error("Error fetching inactive students:", error);
    } finally {
      setLoadingInactive(false);
    }
  };

  type MetricCard = {
    title: string;
    value: number;
    icon: string;
    color: string;
    bgColor: string;
    darkBgColor: string;
    isCurrency: boolean;
    trend?: string;
  };

  const metricsCards: MetricCard[] = [
    {
      title: "Total Transactions",
      value: summaryData?.totalTransactions || 0,
      icon: mdiAccount,
      color: "from-blue-500 to-cyan-600",
      bgColor: "from-blue-50 to-cyan-50",
      darkBgColor: "from-blue-900/20 to-cyan-900/20",
      isCurrency: false,
      // trend: "+8.3%"
    },
    {
      title: "Total Revenue",
      value: summaryData?.totalRevenue || 0,
      icon: mdiCurrencyUsd,
      color: "from-emerald-500 to-green-600",
      bgColor: "from-emerald-50 to-green-50",
      darkBgColor: "from-emerald-900/20 to-green-900/20",
      isCurrency: true,
      // trend: "+12.1%"
    },
    {
      title: "Unpaid Revenue",
      value: summaryData?.expectedRevenue?.totalExpected || 0,
      icon: mdiAlertCircle,
      color: "from-orange-500 to-red-600",
      bgColor: "from-orange-50 to-red-50",
      darkBgColor: "from-orange-900/20 to-red-900/20",
      isCurrency: true,
      // trend: "+15.2%"
    },
    {
      title: "Student Balance",
      value: inactiveStudents.newTotal - inactiveStudents.droppedTotal - inactiveStudents.onBreakTotal,
      icon: mdiTrendingUp,
      color: "from-indigo-500 to-purple-600",
      bgColor: "from-indigo-50 to-purple-50",
      darkBgColor: "from-indigo-900/20 to-purple-900/20",
      isCurrency: true,
      // trend: "+5.7%"
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {metricsCards.map((metric, index) => (
        <CardBox
          key={metric.title}
          className={`bg-gradient-to-br ${metric.bgColor} dark:${metric.darkBgColor} border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-default`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-2xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                <Icon path={metric.icon} size={24} className="text-white mt-1" />
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  {metric.trend}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {metric.title}
              </p>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {(isLoading && metric.title !== "Student Balance") || (metric.title === "Student Balance" && loadingInactive) ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>
                      {metric.isCurrency && "$"}
                      {metric.isCurrency ? 
                        metric.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") :
                        <NumberDynamic value={metric.value} />
                      }
                    </span>
                    {metric.title === "Student Balance" && metric.value !== 0 && (
                      <Icon 
                        path={metric.value > 0 ? mdiTrendingUp : mdiTrendingDown} 
                        size={20} 
                        className={`mt-1 ${metric.value > 0 ? 'text-green-500' : 'text-red-500'}`} 
                      />
                    )}
                    {metric.title === "Total Transactions" && summaryData?.unpaidStudentsCount > 0 && (
                      <button
                        onClick={handleUnpaidClick}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {summaryData.unpaidStudentsCount} unpaid
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Total Revenue Breakdown */}
              {metric.title === "Total Revenue" && summaryData?.expectedRevenue && !isLoading && (
                <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Paid Revenue
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ${summaryData.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Unpaid Revenue
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      ${summaryData.expectedRevenue.totalExpected.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Unpaid Revenue Breakdown */}
              {metric.title === "Unpaid Revenue" && summaryData?.expectedRevenue && !isLoading && (
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Trial Period ({summaryData.expectedRevenue.trialPeriodCount})
                    </span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      ${summaryData.expectedRevenue.trialPeriodAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Existing Unpaid ({summaryData.expectedRevenue.existingUnpaidCount})
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      ${summaryData.expectedRevenue.existingUnpaidAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Student Balance Breakdown */}
              {metric.title === "Student Balance" && !loadingInactive && (
                <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      New Students ({inactiveStudents.new})
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +${inactiveStudents.newTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Dropped ({inactiveStudents.dropped})
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      -${inactiveStudents.droppedTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      On Break ({inactiveStudents.onBreak})
                    </span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      -${inactiveStudents.onBreakTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-indigo-300 dark:border-indigo-700/50">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-700 dark:text-gray-300">Net Balance</span>
                      <span className={`font-bold ${(inactiveStudents.newTotal - inactiveStudents.droppedTotal - inactiveStudents.onBreakTotal) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${(inactiveStudents.newTotal - inactiveStudents.droppedTotal - inactiveStudents.onBreakTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBox>
      ))}
      </div>

      {/* Unpaid Students Modal */}
      {showUnpaidModal && (
        <div className="fixed inset-0 flex items-center justify-center z-150 p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowUnpaidModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-white">Unpaid Students</h2>
                  {selectedMonthDisplay && (
                    <p className="text-white/80 text-xs">{selectedMonthDisplay}</p>
                  )}
                </div>
                <span className="bg-white/20 text-white px-2 py-1 rounded-full text-sm font-semibold">
                  {unpaidStudents.length}
                </span>
              </div>
              <button
                onClick={() => setShowUnpaidModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <Icon path={mdiClose} size={1} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingUnpaid ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                </div>
              ) : unpaidStudents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">No unpaid students found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white">{student.fullName}</p>
                            {student.isTrialPeriod && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium">
                                Trial Period
                              </span>
                            )}
                            {student.isExistingStudent && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium">
                                Existing
                              </span>
                            )}
                          </div>
                          {student.nameKhmer && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.nameKhmer}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                          {student.class}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer with Close Button */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowUnpaidModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Icon path={mdiClose} size={0.8} />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MetricsCards;
