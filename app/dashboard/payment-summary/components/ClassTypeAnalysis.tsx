"use client";
import React from "react";
import { mdiChartPie, mdiTrendingUp, mdiAccountGroup } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";
import { getPaymentStatus, getInactiveStudentStatus } from "../../_lib/paymentLogic";

interface ClassTypeAnalysisProps {
  summaryData: {
    classTypeBreakdown: { classType: string; count: number; revenue: number; }[];
    comparisonData?: { classType: string; previousCount: number; previousRevenue: number; }[];
  };
  studentsData?: any[]; // Array of student data
  transactionsData?: any[]; // Array of transaction data
  classesData?: { [classId: string]: { type: string } }; // Mapping of class ID to class data
  dateInterval: { type: 'interval' | 'monthly'; value: string; };
  startDate?: string; // Selected date for filtering
  isLoading: boolean;
}

const ClassTypeAnalysis: React.FC<ClassTypeAnalysisProps> = ({ 
  summaryData, 
  studentsData = [],
  transactionsData = [],
  classesData = {},
  dateInterval,
  startDate,
  isLoading 
}) => {
  const classColors = [
    "from-blue-500 to-cyan-600",
    "from-green-500 to-emerald-600", 
    "from-purple-500 to-indigo-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-yellow-500 to-amber-600"
  ];

  const getComparisonData = (classType: string) => {
    if (dateInterval.type !== 'monthly' || !summaryData.comparisonData) return null;
    return summaryData.comparisonData.find(c => c.classType === classType);
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0;
    return {
      value: Math.abs(percentage).toFixed(1),
      isPositive,
      icon: isPositive ? "↗" : "↘",
      color: isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    };
  };

    const getClassTypePaymentStats = (classType: string) => {
    if (!studentsData || studentsData.length === 0) {
      return { paid: 0, unpaid: 0, onBreak: 0, dropped: 0, total: 0, existingStudents: 0, newStudents: 0 };
    }

    // Use the selected date from the date picker, or fallback to current date
    const targetDate = startDate ? new Date(startDate + 'T12:00:00') : new Date();

    let paid = 0;
    let unpaid = 0;
    let onBreak = 0;
    let dropped = 0;
    let existingStudents = 0; // Students with more than 1 transaction
    let newStudents = 0; // Students with only 1 transaction

    // Count transactions per student
    const transactionCounts = new Map<string, number>();
    if (transactionsData && transactionsData.length > 0) {
      transactionsData.forEach((transaction) => {
        const studentId = transaction.studentId;
        if (studentId) {
          transactionCounts.set(studentId, (transactionCounts.get(studentId) || 0) + 1);
        }
      });
    }

    // Fetch class types to get pricing (same logic as expected revenue)
    const classTypePrices = new Map<string, number>();
    // We need to fetch classTypes here, but since this is called for each classType,
    // we should fetch it once outside this function. For now, let's use a default approach.
    const getStudentPrice = (studentClass: string, studentDiscount?: number) => {
      // Extract class ID from student.class (e.g., "Class 12M" -> "12M")
      const classIdMatch = studentClass?.match(/Class\s*(.*)/);
      const classId = classIdMatch ? classIdMatch[1] : studentClass;
      
      // Get the actual class type from classesData
      const studentClassData = classId ? classesData[classId] : null;
      const studentClassType = studentClassData?.type || '';
      
      // For now, use default pricing based on class type
      // In a real implementation, you'd fetch from classTypes collection
      let basePrice = 25; // Default price
      if (studentClassType === 'MWF') basePrice = 25;
      if (studentClassType === 'TTS') basePrice = 20;
      
      // Apply discount if student has a discount field
      if (studentDiscount && typeof studentDiscount === 'number') {
        // Discount is stored as actual amount to subtract (e.g., 5 for $5 off)
        basePrice = basePrice - studentDiscount;
      }
      
      return basePrice;
    };

    studentsData.forEach((student) => {
      // Skip students on waitlist only
      if (student.onWaitlist) {
        return;
      }

      // Extract class ID from student.class (e.g., "Class 12M" -> "12M")
      const classIdMatch = student.class?.match(/Class\s*(.*)/);
      const classId = classIdMatch ? classIdMatch[1] : student.class;
      
      // Get the actual class type from classesData
      const studentClassData = classId ? classesData[classId] : null;
      const studentClassType = studentClassData?.type || '';
      
      const matchesClassType = studentClassType === classType ||
                              student.class === classType ||
                              student.class?.includes(classType);

      if (matchesClassType) {
        // Check for inactive students using the target date
        const inactiveStatus = getInactiveStudentStatus(student, targetDate);
        
        if (inactiveStatus === 'onBreak') {
          onBreak++;
        } else if (inactiveStatus === 'dropped') {
          dropped++;
        } else {
          const paymentStatus = getPaymentStatus(student.lastPaymentMonth, targetDate);
          if (paymentStatus === 'paid') {
            paid++;
            // Count existing vs new students for paid students
            const studentTransactionCount = transactionCounts.get(student.id) || 0;
            if (studentTransactionCount > 1) {
              existingStudents++;
            } else if (studentTransactionCount === 1) {
              newStudents++;
            }
          } else if (paymentStatus === 'unpaid' || paymentStatus === 'no-record') {
            unpaid++;
          }
        }
      }
    });

    return { paid, unpaid, onBreak, dropped, total: paid + unpaid + onBreak + dropped, existingStudents, newStudents };
  };

  if (isLoading) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 border-0 shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
              <Icon path={mdiChartPie} size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Class Type Analysis
                {dateInterval.type === 'monthly' && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    vs Previous Month
                  </span>
                )}
              </h3>
            </div>
          </div>
          
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
            ))}
          </div>
        </div>
      </CardBox>
    );
  }

  if (!summaryData?.classTypeBreakdown?.length) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 border-0 shadow-xl">
        <div className="p-8 text-center">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 inline-block mb-4">
            <Icon path={mdiChartPie} size={24} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Class Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            No payment records found for the selected period.
          </p>
        </div>
      </CardBox>
    );
  }

  return (
    <CardBox className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10 border-0 shadow-xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
            <Icon path={mdiChartPie} size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Class Type Analysis
              {dateInterval.type === 'monthly' && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  vs Previous Month
                </span>
              )}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Revenue and transaction breakdown by class type
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {[...summaryData.classTypeBreakdown]
            .sort((a, b) => b.count - a.count)
            .map((classData, index) => {
            const comparison = getComparisonData(classData.classType);
            const revenueChange = comparison ? calculatePercentageChange(classData.revenue, comparison.previousRevenue) : null;
            const countChange = comparison ? calculatePercentageChange(classData.count, comparison.previousCount) : null;
            const revenueFormat = revenueChange !== null ? formatPercentage(revenueChange) : null;
            const countFormat = countChange !== null ? formatPercentage(countChange) : null;
            
            return (
              <div 
                key={classData.classType}
                className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-purple-300/50 dark:hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${classColors[index % classColors.length]} shadow-sm`}></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {classData.classType}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {classData.count} transactions
                        </span>
                        {countFormat && dateInterval.type === 'monthly' && (
                          <span className={`text-xs font-semibold ${countFormat.color} bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm`}>
                            {countFormat.icon} {countFormat.value}%
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <Icon path={mdiTrendingUp} size={0.8} className="text-gray-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${classData.revenue.toLocaleString()}
                          </span>
                          {revenueFormat && dateInterval.type === 'monthly' && (
                            <span className={`text-xs font-semibold ${revenueFormat.color} bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm`}>
                              {revenueFormat.icon} {revenueFormat.value}%
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            (${(classData.revenue / classData.count).toFixed(2)} avg)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {comparison && dateInterval.type === 'monthly' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous Month</p>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {comparison.previousCount} transactions
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          ${comparison.previousRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Decorative gradient bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400/20 via-indigo-400/20 to-purple-400/20 rounded-b-2xl group-hover:from-purple-400/40 group-hover:via-indigo-400/40 group-hover:to-purple-400/40 transition-all duration-300"></div>

                {/* Payment Status Breakdown */}
                {(() => {
                  const paymentStats = getClassTypePaymentStats(classData.classType);
                  if (paymentStats.total > 0) {
                    const paidPercentage = (paymentStats.paid / paymentStats.total) * 100;
                    const unpaidPercentage = (paymentStats.unpaid / paymentStats.total) * 100;
                    const inactivePercentage = ((paymentStats.dropped + paymentStats.onBreak) / paymentStats.total) * 100;

                    return (
                      <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Payment Status ({paymentStats.total} students)
                          </span>
                          <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1 relative group">
                              <div className="w-3 h-3 bg-emerald-400 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg group-hover:shadow-emerald-400/50"></div>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                {paymentStats.paid} paid
                              </span>
                              
                              {/* Tooltip for existing vs new students */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  {paymentStats.existingStudents > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
                                      <span>Existing: {paymentStats.existingStudents}</span>
                                    </div>
                                  )}
                                  {paymentStats.newStudents > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                      <span>New: {paymentStats.newStudents}</span>
                                    </div>
                                  )}
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                              </div>
                            </span>
                            {paymentStats.unpaid > 0 && (
                              <span className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                                <span className="text-orange-300 dark:text-orange-300 font-medium">
                                  {paymentStats.unpaid} unpaid
                                </span>
                              </span>
                            )}
                            {paymentStats.dropped + paymentStats.onBreak > 0 && (
                              <span className="flex items-center gap-1 relative group">
                                <div className="w-3 h-3 bg-rose-400 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg group-hover:shadow-rose-400/50"></div>
                                <span className="text-rose-600 dark:text-rose-300 font-medium">
                                  {paymentStats.dropped + paymentStats.onBreak} inactive
                                </span>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {paymentStats.onBreak > 0 && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                        <span>On Break: {paymentStats.onBreak}</span>
                                      </div>
                                    )}
                                    {paymentStats.dropped > 0 && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                                        <span>Dropped: {paymentStats.dropped}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Arrow */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                                </div>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="flex h-full">
                            <div
                              className="bg-emerald-400 transition-all duration-500 ease-out"
                              style={{ width: `${paidPercentage}%` }}
                            ></div>
                            {paymentStats.unpaid > 0 && (
                              <div
                                className="bg-orange-300 transition-all duration-500 ease-out"
                                style={{ width: `${unpaidPercentage}%` }}
                              ></div>
                            )}
                            {paymentStats.dropped + paymentStats.onBreak > 0 && (
                              <div
                                className="bg-rose-400 transition-all duration-500 ease-out"
                                style={{ width: `${inactivePercentage}%` }}
                              ></div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </CardBox>
  );
};

export default ClassTypeAnalysis;
