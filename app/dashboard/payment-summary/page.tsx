"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase-config";
import { toast } from "sonner";
import PaymentSummaryHeader from "./components/PaymentSummaryHeader";
import AuthenticationCard from "./components/AuthenticationCard";
import ControlsPanel from "./components/ControlsPanel";
import MetricsCards from "./components/MetricsCards";
import ClassTypeAnalysis from "./components/ClassTypeAnalysis";
import PaymentTrends from "./components/PaymentTrends";

interface DateInterval {
  type: 'interval' | 'monthly';
  value: string;
}

interface SummaryData {
  totalRevenue: number;
  totalTransactions: number;
  averagePayment: number;
  dailyAverage: number;
  classTypeBreakdown: { classType: string; count: number; revenue: number; }[];
  comparisonData?: { classType: string; previousCount: number; previousRevenue: number; }[];
  dailyBreakdown: { date: string; revenue: number; count: number; }[];
}

const PaymentSummaryPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
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
  }, [isAuthenticated, startDate, endDate, dateInterval]);

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

      setSummaryData({
        totalRevenue,
        totalTransactions,
        averagePayment,
        dailyAverage,
        classTypeBreakdown,
        comparisonData,
        dailyBreakdown
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
            dailyAverage: 0
          }}
          isLoading={isLoading}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <ClassTypeAnalysis
            summaryData={summaryData || {
              classTypeBreakdown: [],
              comparisonData: []
            }}
            dateInterval={dateInterval}
            isLoading={isLoading}
          />

          <PaymentTrends
            summaryData={summaryData || {
              dailyBreakdown: []
            }}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryPage;
