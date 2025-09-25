"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc} from "firebase/firestore";
import { db } from "../../../firebase-config";
import { toast } from "sonner";
import { getPaymentStatus } from "../_lib/paymentLogic";
import PaymentSummaryHeader from "./components/PaymentSummaryHeader";
import AuthenticationCard from "./components/AuthenticationCard";
import ControlsPanel from "./components/ControlsPanel";
import MetricsCards from "./components/MetricsCards";
import ClassTypeAnalysis from "./components/ClassTypeAnalysis";
import PaymentTrends from "./components/PaymentTrends";
import UnpaidStudentsTab from "./components/UnpaidStudentsTab";

interface DateInterval {
  type: 'interval' | 'monthly';
  value: string;
}

interface SummaryData {
  totalRevenue: number;
  totalTransactions: number;
  averagePayment: number;
  dailyAverage: number;
  unpaidStudentsCount: number;
  classTypeBreakdown: { classType: string; count: number; revenue: number; }[];
  comparisonData?: { classType: string; previousCount: number; previousRevenue: number; }[];
  dailyBreakdown: { date: string; revenue: number; count: number; }[];
  trendData: {
    currentMonth: { date: string; revenue: number; count: number; }[];
    previousMonth: { date: string; revenue: number; count: number; }[];
  };
}

const PaymentSummaryPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'unpaid'>('summary');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<{ [classId: string]: { type: string } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dateInterval, setDateInterval] = useState<DateInterval>({ type: 'monthly', value: '0' });
  
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Format date manually to avoid timezone issues
    const year = firstDayOfMonth.getFullYear();
    const month = String(firstDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(firstDayOfMonth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Format date manually to avoid timezone issues
    const year = lastDayOfMonth.getFullYear();
    const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Initialize with current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Format dates manually to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(lastDay));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaryData();
    }
  }, [isAuthenticated]);

  const handleAuthentication = async () => {
    if (!password.trim()) {
      toast.error("Please enter the password");
      return;
    }

    setIsAuthenticating(true);
    try {
      const financeDocRef = doc(db, "financePW", "access");
      const docSnap = await getDoc(financeDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password === password) {
          setIsAuthenticated(true);
          toast.success("Access granted! Loading payment summary...");
        } else {
          toast.error("Incorrect password. Access denied.");
        }
      } else {
        toast.error("Access configuration not found.");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      const transactionsRef = collection(db, "transactions");
      
      // Get all transactions first, then filter appropriately
      const querySnapshot = await getDocs(transactionsRef);
      
      // Fetch all students to calculate unpaid count
      const studentsRef = collection(db, "students");
      const studentsSnapshot = await getDocs(studentsRef);
      const transactions: any[] = [];

      if (dateInterval.type === 'monthly') {
        // For monthly view, filter by paymentMonth
        const targetMonth = new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });

      console.log("Fetching transactions for month:", targetMonth);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Filter by paymentMonth field
          if (data.paymentMonth === targetMonth) {
            transactions.push({
              id: doc.id,
              ...data,
              transactionDate: new Date(data.date), // Add parsed date for daily breakdown
            });
          }
        });
      } else {
        // For interval view, filter by actual transaction date
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const transactionDate = new Date(data.date);
          
          // Filter by date range
          if (transactionDate >= start && transactionDate <= end) {
            transactions.push({
              id: doc.id,
              ...data,
              transactionDate, // Add parsed date for easier handling
            });
          }
        });
      }

      // Calculate summary metrics
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalTransactions = transactions.length;
      const averagePayment = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      
      // Calculate unpaid students count (excluding onBreak, waitlist, and dropped students)
      let unpaidStudentsCount = 0;
      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data();

        // Skip students who are on break, waitlist, or dropped
        if (studentData.onBreak || studentData.onWaitlist || studentData.dropped) {
          return; // Skip this student
        }

        const paymentStatus = getPaymentStatus(studentData.lastPaymentMonth);
        if (paymentStatus === 'unpaid' || paymentStatus === 'no-record') {
          unpaidStudentsCount++;
        }
      });
      
      // Calculate daily average based on the date range
      let dailyAverage = 0;
      if (dateInterval.type === 'monthly') {
        // For monthly, calculate based on days in the month
        const monthStart = new Date(startDate);
        const monthEnd = new Date(endDate);
        const diffTime = Math.abs(monthEnd.getTime() - monthStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        dailyAverage = diffDays > 0 ? totalRevenue / diffDays : 0;
      } else {
        // For interval, calculate based on selected date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        dailyAverage = diffDays > 0 ? totalRevenue / diffDays : 0;
      }

      // Class type breakdown
      const classTypeMap = new Map<string, { count: number; revenue: number }>();
      transactions.forEach(t => {
        const existing = classTypeMap.get(t.classType) || { count: 0, revenue: 0 };
        classTypeMap.set(t.classType, {
          count: existing.count + 1,
          revenue: existing.revenue + t.amount
        });
      });
      
      const classTypeBreakdown = Array.from(classTypeMap.entries()).map(([classType, data]) => ({
        classType,
        count: data.count,
        revenue: data.revenue
      }));

      // Daily breakdown
      const dailyMap = new Map<string, { revenue: number; count: number }>();
      transactions.forEach(t => {
        const date = t.transactionDate.toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { revenue: 0, count: 0 };
        dailyMap.set(date, {
          revenue: existing.revenue + t.amount,
          count: existing.count + 1
        });
      });

      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        count: data.count
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Generate trend data for current vs previous month comparison
      let trendData = {
        currentMonth: [] as { date: string; revenue: number; count: number; }[],
        previousMonth: [] as { date: string; revenue: number; count: number; }[]
      };

      try {
        if (dateInterval.type === 'monthly') {
          // For monthly view, use fixed date ranges: 27th to 10th comparison
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Current period: 27th of previous month to 10th of current month
          const currentPeriodStart = new Date(currentYear, currentMonth - 1, 27); // 27th of previous month
          const currentPeriodEnd = new Date(currentYear, currentMonth, 10, 23, 59, 59, 999); // 10th of current month (end of day)

          // Previous period: 27th of two months ago to 10th of previous month  
          const previousPeriodStart = new Date(currentYear, currentMonth - 2, 27); // 27th of two months ago
          const previousPeriodEnd = new Date(currentYear, currentMonth - 1, 10, 23, 59, 59, 999); // 10th of previous month (end of day)

          console.log('Date Ranges:', {
            currentPeriod: `${currentPeriodStart.toDateString()} to ${currentPeriodEnd.toDateString()}`,
            previousPeriod: `${previousPeriodStart.toDateString()} to ${previousPeriodEnd.toDateString()}`,
            currentMonth: currentMonth,
            currentYear: currentYear
          });

          // Fetch all transactions 
          const allTransactionsQuery = await getDocs(transactionsRef);
          
          const currentPeriodTransactions: any[] = [];
          const previousPeriodTransactions: any[] = [];
          
          allTransactionsQuery.forEach((doc) => {
            const data = doc.data();
            const transactionDate = new Date(data.date);
            
            // Filter for current period (27th prev month to 10th current month)
            if (transactionDate >= currentPeriodStart && transactionDate <= currentPeriodEnd) {
              // Double check the day is within our range (27th to 10th)
              const day = transactionDate.getDate();
              const month = transactionDate.getMonth();
              const isInCurrentPeriod = (
                (month === currentMonth - 1 && day >= 27) || // 27th+ of previous month
                (month === currentMonth && day <= 10) // 1st-10th of current month
              );
              
              if (isInCurrentPeriod) {
                currentPeriodTransactions.push({
                  id: doc.id,
                  ...data,
                  transactionDate,
                });
              }
            }
            
            // Filter for previous period (27th two months ago to 10th prev month)
            if (transactionDate >= previousPeriodStart && transactionDate <= previousPeriodEnd) {
              // Double check the day is within our range (27th to 10th)
              const day = transactionDate.getDate();
              const month = transactionDate.getMonth();
              const isInPreviousPeriod = (
                (month === currentMonth - 2 && day >= 27) || // 27th+ of two months ago
                (month === currentMonth - 1 && day <= 10) // 1st-10th of previous month
              );
              
              if (isInPreviousPeriod) {
                previousPeriodTransactions.push({
                  id: doc.id,
                  ...data,
                  transactionDate,
                });
              }
            }
          });

          // Generate daily breakdown for current period
          const currentDailyMap = new Map<string, { revenue: number; count: number }>();
          currentPeriodTransactions.forEach(t => {
            const date = t.transactionDate.toISOString().split('T')[0];
            const existing = currentDailyMap.get(date) || { revenue: 0, count: 0 };
            currentDailyMap.set(date, {
              revenue: existing.revenue + t.amount,
              count: existing.count + 1
            });
          });

          // Fill in missing dates with zero values to show complete period
          const currentPeriodDates: { date: string; revenue: number; count: number }[] = [];
          for (let d = new Date(currentPeriodStart); d <= currentPeriodEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const existing = currentDailyMap.get(dateStr);
            currentPeriodDates.push({
              date: dateStr,
              revenue: existing?.revenue || 0,
              count: existing?.count || 0
            });
          }

          trendData.currentMonth = currentPeriodDates;

          // Generate daily breakdown for previous period
          const previousDailyMap = new Map<string, { revenue: number; count: number }>();
          previousPeriodTransactions.forEach(t => {
            const date = t.transactionDate.toISOString().split('T')[0];
            const existing = previousDailyMap.get(date) || { revenue: 0, count: 0 };
            previousDailyMap.set(date, {
              revenue: existing.revenue + t.amount,
              count: existing.count + 1
            });
          });

          // Fill in missing dates with zero values to show complete period
          const previousPeriodDates: { date: string; revenue: number; count: number }[] = [];
          for (let d = new Date(previousPeriodStart); d <= previousPeriodEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const existing = previousDailyMap.get(dateStr);
            previousPeriodDates.push({
              date: dateStr,
              revenue: existing?.revenue || 0,
              count: existing?.count || 0
            });
          }

          trendData.previousMonth = previousPeriodDates;

          console.log('Trend Data Generated:', {
            currentPeriod: `${trendData.currentMonth.length} days (${currentPeriodTransactions.length} transactions)`,
            previousPeriod: `${trendData.previousMonth.length} days (${previousPeriodTransactions.length} transactions)`,
            currentPeriodDates: trendData.currentMonth.map(d => d.date),
            previousPeriodDates: trendData.previousMonth.map(d => d.date)
          });
        } else {
          // For interval view, use the current period as "current month" and leave previous empty
          // Or split the interval into two halves for comparison
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffTime = end.getTime() - start.getTime();
          const halfTime = diffTime / 2;
          const midDate = new Date(start.getTime() + halfTime);

          // Split transactions into first half and second half of the interval
          const firstHalfTransactions = transactions.filter(t => t.transactionDate < midDate);
          const secondHalfTransactions = transactions.filter(t => t.transactionDate >= midDate);

          // Generate daily breakdown for second half (current period)
          const currentDailyMap = new Map<string, { revenue: number; count: number }>();
          secondHalfTransactions.forEach(t => {
            const date = t.transactionDate.toISOString().split('T')[0];
            const existing = currentDailyMap.get(date) || { revenue: 0, count: 0 };
            currentDailyMap.set(date, {
              revenue: existing.revenue + t.amount,
              count: existing.count + 1
            });
          });

          trendData.currentMonth = Array.from(currentDailyMap.entries()).map(([date, data]) => ({
            date,
            revenue: data.revenue,
            count: data.count
          })).sort((a, b) => a.date.localeCompare(b.date));

          // Generate daily breakdown for first half (previous period)
          const previousDailyMap = new Map<string, { revenue: number; count: number }>();
          firstHalfTransactions.forEach(t => {
            const date = t.transactionDate.toISOString().split('T')[0];
            const existing = previousDailyMap.get(date) || { revenue: 0, count: 0 };
            previousDailyMap.set(date, {
              revenue: existing.revenue + t.amount,
              count: existing.count + 1
            });
          });

          trendData.previousMonth = Array.from(previousDailyMap.entries()).map(([date, data]) => ({
            date,
            revenue: data.revenue,
            count: data.count
          })).sort((a, b) => a.date.localeCompare(b.date));

          console.log('Interval Trend Data Generated:', {
            firstHalf: `${firstHalfTransactions.length} transactions`,
            secondHalf: `${secondHalfTransactions.length} transactions`
          });
        }

      } catch (error) {
        console.error("Error generating trend data:", error);
        // Keep empty arrays if there's an error
      }

      // Get comparison data for monthly view
      let comparisonData: { classType: string; previousCount: number; previousRevenue: number; }[] | undefined;
      
      if (dateInterval.type === 'monthly') {
        try {
          // Calculate previous month
          const currentMonth = new Date(startDate + 'T12:00:00');
          const previousMonth = new Date(currentMonth);
          previousMonth.setMonth(previousMonth.getMonth() - 1);
          
          const previousMonthString = previousMonth.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });

          // Get all transactions for previous month by paymentMonth
          const prevQuerySnapshot = await getDocs(transactionsRef);
          const prevTransactions: any[] = [];

          prevQuerySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Filter by previous month's paymentMonth
            if (data.paymentMonth === previousMonthString) {
              prevTransactions.push({
                id: doc.id,
                ...data,
              });
            }
          });

          const prevClassTypeMap = new Map<string, { count: number; revenue: number }>();
          prevTransactions.forEach(t => {
            const existing = prevClassTypeMap.get(t.classType) || { count: 0, revenue: 0 };
            prevClassTypeMap.set(t.classType, {
              count: existing.count + 1,
              revenue: existing.revenue + t.amount
            });
          });

          comparisonData = Array.from(prevClassTypeMap.entries()).map(([classType, data]) => ({
            classType,
            previousCount: data.count,
            previousRevenue: data.revenue
          }));
        } catch (error) {
          console.error("Error fetching comparison data:", error);
        }
      }

      // Store student data for class type analysis
      const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentsData(students);

      // Fetch classes data for proper class type mapping
      try {
        const classesSnapshot = await getDocs(collection(db, "classes"));
        const classesMap: { [classId: string]: { type: string } } = {};
        classesSnapshot.forEach((doc) => {
          const classData = doc.data();
          classesMap[doc.id] = { type: classData.type || '' };
        });
        setClassesData(classesMap);
      } catch (error) {
        console.error("Error fetching classes data:", error);
        // Don't show error toast for classes data as it's not critical
      }

      setSummaryData({
        totalRevenue,
        totalTransactions,
        averagePayment,
        dailyAverage,
        unpaidStudentsCount,
        classTypeBreakdown,
        comparisonData,
        dailyBreakdown,
        trendData
      });

    } catch (error) {
      console.error("Error fetching summary data:", error);
      toast.error("Failed to fetch payment summary data");
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    
    // Format date manually to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    if (days === 0) {
      // For "Today", set both start and end to today
      setStartDate(formatDate(end));
      setEndDate(formatDate(end));
    } else {
      // For "7 Days Ago", set start to 7 days ago and end to today
      start.setDate(end.getDate() - days);
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
    }
    
    setDateInterval({ type: 'interval', value: '' });
  };

  const formatDateRange = (start: string, end: string) => {
    // Create dates using local timezone to avoid UTC conversion issues
    const startDate = new Date(start + 'T12:00:00'); // Add time to ensure local timezone
    const endDate = new Date(end + 'T12:00:00');
    
    if (dateInterval.type === 'monthly') {
      return startDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const handleExportData = () => {
    if (!summaryData) return;

    const csvData = [
      ['Payment Summary Report'],
      [`Period: ${formatDateRange(startDate, endDate)}`],
      [''],
      ['Metrics'],
      ['Total Revenue', `$${summaryData.totalRevenue.toLocaleString()}`],
      ['Total Transactions', summaryData.totalTransactions.toString()],
      ['Average Payment', `$${summaryData.averagePayment.toFixed(2)}`],
      ['Daily Average', `$${summaryData.dailyAverage.toFixed(2)}`],
      [''],
      ['Class Type Breakdown'],
      ['Class Type', 'Transactions', 'Revenue'],
      ...summaryData.classTypeBreakdown.map(item => [
        item.classType,
        item.count.toString(),
        `$${item.revenue.toLocaleString()}`
      ]),
      [''],
      ['Daily Breakdown'],
      ['Date', 'Revenue', 'Transactions'],
      ...summaryData.dailyBreakdown.map(item => [
        item.date,
        `$${item.revenue.toLocaleString()}`,
        item.count.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-summary-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Payment summary exported successfully!");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <PaymentSummaryHeader 
            isAuthenticated={false}
            startDate={startDate}
            endDate={endDate}
            formatDateRange={formatDateRange}
          />
          <AuthenticationCard
            password={password}
            showPassword={showPassword}
            isAuthenticating={isAuthenticating}
            setPassword={setPassword}
            setShowPassword={setShowPassword}
            handleAuthentication={handleAuthentication}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8 space-y-8">
        <PaymentSummaryHeader 
          isAuthenticated={true}
          startDate={startDate}
          endDate={endDate}
          formatDateRange={formatDateRange}
        />
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'summary'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Payment Summary
          </button>
          <button
            onClick={() => setActiveTab('unpaid')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'unpaid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Unpaid Students
          </button>
        </div>

        {activeTab === 'summary' ? (
          <>
            <ControlsPanel
              startDate={startDate}
              endDate={endDate}
              dateInterval={dateInterval}
              isLoading={isLoading}
              summaryData={summaryData}
              formatDateRange={formatDateRange}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              setDateInterval={setDateInterval}
              setQuickDateRange={setQuickDateRange}
              fetchSummaryData={fetchSummaryData}
              handleExportData={handleExportData}
            />

            <MetricsCards 
              summaryData={summaryData || {
                totalRevenue: 0,
                totalTransactions: 0,
                averagePayment: 0,
                dailyAverage: 0,
                unpaidStudentsCount: 0
              }}
              isLoading={isLoading}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <ClassTypeAnalysis
                summaryData={summaryData || {
                  classTypeBreakdown: [],
                  comparisonData: []
                }}
                studentsData={studentsData}
                classesData={classesData}
                dateInterval={dateInterval}
                isLoading={isLoading}
              />

              <PaymentTrends
                summaryData={summaryData?.trendData || {
                  currentMonth: [],
                  previousMonth: []
                }}
                isLoading={isLoading}
                dateInterval={dateInterval}
              />
            </div>
          </>
        ) : (
          /* Unpaid Students Tab */
          <UnpaidStudentsTab 
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentSummaryPage;
