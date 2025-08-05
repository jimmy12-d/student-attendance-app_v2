"use client";
import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import {
  mdiChartLine,
  mdiCash,
  mdiAccountGroup,
  mdiCalendarMonth,
  mdiTrendingUp,
  mdiTrendingDown,
  mdiEye,
  mdiEyeOff,
  mdiLock,
  mdiClose,
  mdiRefresh,
  mdiDownload,
  mdiFileChart,
  mdiCreditCard,
  mdiSchool,
} from "@mdi/js";

import Button from "../../../_components/Button";
import Icon from "../../../_components/Icon";
import LoadingSpinner from "../../../_components/LoadingSpinner";
import FormField from "../../../_components/FormField";
import CardBox from "../../../_components/CardBox";

// Firebase
import { db } from "../../../../firebase-config";
import { collection, getDocs, query, where, doc, getDoc, orderBy } from "firebase/firestore";

import { Transaction } from "../types";

interface PaymentSummaryData {
  totalRevenue: number;
  totalTransactions: number;
  uniqueStudents: number;
  averagePayment: number;
  paymentMethods: {
    cash: number;
    QRPayment: number;
  };
  monthlyComparison: {
    previousMonth: number;
    growth: number;
  };
  classTypeBreakdown: {
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
  dailyRevenue: {
    [key: string]: number;
  };
}

interface MonthlyPaymentSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonthlyPaymentSummary: React.FC<MonthlyPaymentSummaryProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [summaryData, setSummaryData] = useState<PaymentSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDayOfMonth.toISOString().split('T')[0];
  });

  // Reset authentication when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAuthenticated(false);
      setPassword("");
      setSummaryData(null);
    }
  }, [isOpen]);

  // Fetch summary data when authenticated and date range changes
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      fetchSummaryData();
    }
  }, [isAuthenticated, startDate, endDate, isOpen]);

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
          toast.success("Access granted");
        } else {
          toast.error("Invalid password");
        }
      } else {
        toast.error("Finance configuration not found");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Authentication failed");
    }
    setIsAuthenticating(false);
  };

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      const startOfPeriod = new Date(startDate + 'T00:00:00');
      const endOfPeriod = new Date(endDate + 'T23:59:59');

      // Fetch transactions for the selected date range
      const transactionsRef = collection(db, "transactions");
      const q = query(
        transactionsRef,
        where("date", ">=", startOfPeriod.toISOString()),
        where("date", "<=", endOfPeriod.toISOString()),
        orderBy("date", "desc")
      );

      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        transactionId: doc.id
      } as Transaction));

      // Calculate previous period data for comparison (same duration before start date)
      const periodDays = Math.ceil((endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24));
      const prevStartDate = new Date(startOfPeriod);
      prevStartDate.setDate(prevStartDate.getDate() - periodDays);
      const prevEndDate = new Date(startOfPeriod);
      prevEndDate.setDate(prevEndDate.getDate() - 1);

      const prevPeriodQuery = query(
        transactionsRef,
        where("date", ">=", prevStartDate.toISOString()),
        where("date", "<=", prevEndDate.toISOString())
      );

      const prevPeriodSnapshot = await getDocs(prevPeriodQuery);
      const prevPeriodRevenue = prevPeriodSnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0);
      }, 0);

      // Calculate summary data
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalTransactions = transactions.length;
      const uniqueStudents = new Set(transactions.map(t => t.studentId)).size;
      const averagePayment = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Payment methods breakdown
      const paymentMethods = transactions.reduce(
        (acc, t) => {
          if (t.paymentMethod === 'Cash') {
            acc.cash += t.amount;
          } else {
            acc.QRPayment += t.amount;
          }
          return acc;
        },
        { cash: 0, QRPayment: 0 }
      );

      // Class type breakdown
      const classTypeBreakdown = transactions.reduce((acc, t) => {
        if (!acc[t.classType]) {
          acc[t.classType] = { count: 0, revenue: 0 };
        }
        acc[t.classType].count++;
        acc[t.classType].revenue += t.amount;
        return acc;
      }, {} as { [key: string]: { count: number; revenue: number } });

      // Daily revenue
      const dailyRevenue = transactions.reduce((acc, t) => {
        const date = new Date(t.date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });

      // Calculate growth
      const growth = prevPeriodRevenue > 0 
        ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 
        : 100;

      const summaryData: PaymentSummaryData = {
        totalRevenue,
        totalTransactions,
        uniqueStudents,
        averagePayment,
        paymentMethods,
        monthlyComparison: {
          previousMonth: prevPeriodRevenue,
          growth
        },
        classTypeBreakdown,
        dailyRevenue
      };

      setSummaryData(summaryData);
    } catch (error) {
      console.error("Error fetching summary data:", error);
      toast.error("Failed to fetch summary data");
    }
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return start.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  };

  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExportData = () => {
    if (!summaryData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(summaryData.totalRevenue)],
      ['Total Transactions', summaryData.totalTransactions.toString()],
      ['Unique Students', summaryData.uniqueStudents.toString()],
      ['Average Payment', formatCurrency(summaryData.averagePayment)],
      ['Cash Payments', formatCurrency(summaryData.paymentMethods.cash)],
      ['QR Payment Payments', formatCurrency(summaryData.paymentMethods.QRPayment)],
      ['Previous Month Revenue', formatCurrency(summaryData.monthlyComparison.previousMonth)],
      ['Growth %', `${summaryData.monthlyComparison.growth.toFixed(1)}%`],
      ['', ''],
      ['Class Type Breakdown', ''],
      ...Object.entries(summaryData.classTypeBreakdown).map(([type, data]) => [
        type, `${data.count} students, ${formatCurrency(data.revenue)}`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-summary-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Summary exported successfully");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Icon path={mdiChartLine} className="text-white" size={1.2} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Payment Summary Dashboard</h2>
                <p className="text-blue-100 text-sm">Comprehensive financial analytics and insights</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
            >
              <Icon path={mdiClose} className="text-white" size={1} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
        {!isAuthenticated ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Icon path={mdiLock} className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Access Protected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please enter the finance password to view the payment summary
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <FormField>
                {() => (
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter finance password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAuthentication()}
                      className="w-full pr-12 pl-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Icon path={showPassword ? mdiEyeOff : mdiEye} />
                    </button>
                  </div>
                )}
              </FormField>
              
              <Button
                label={isAuthenticating ? "Verifying..." : "Access Dashboard"}
                color="info"
                onClick={handleAuthentication}
                disabled={isAuthenticating || !password.trim()}
                icon={mdiLock}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Payment Summary - {formatDateRange(startDate, endDate)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Comprehensive payment analytics and insights
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Quick Date Range Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuickDateRange(7)}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => setQuickDateRange(30)}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Last 30 days
                  </button>
                  <button
                    onClick={() => setQuickDateRange(90)}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Last 90 days
                  </button>
                </div>
                
                {/* Date Range Inputs */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    label="Refresh"
                    color="white"
                    onClick={fetchSummaryData}
                    disabled={isLoading}
                    icon={mdiRefresh}
                  />
                  
                  <Button
                    label="Export"
                    color="success"
                    onClick={handleExportData}
                    disabled={isLoading || !summaryData}
                    icon={mdiDownload}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading summary data...</span>
              </div>
            ) : summaryData ? (
              <div className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardBox className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(summaryData.totalRevenue)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Icon path={mdiCash} className="text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    {summaryData.monthlyComparison.growth !== 0 && (
                      <div className="flex items-center mt-2">
                        <Icon 
                          path={summaryData.monthlyComparison.growth > 0 ? mdiTrendingUp : mdiTrendingDown} 
                          className={summaryData.monthlyComparison.growth > 0 ? "text-green-500" : "text-red-500"}
                          size={0.8}
                        />
                        <span className={`text-sm ml-1 ${summaryData.monthlyComparison.growth > 0 ? "text-green-500" : "text-red-500"}`}>
                          {Math.abs(summaryData.monthlyComparison.growth).toFixed(1)}% from last month
                        </span>
                      </div>
                    )}
                  </CardBox>

                  <CardBox className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {summaryData.totalTransactions}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Icon path={mdiChartLine} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardBox>

                  <CardBox className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Unique Students</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {summaryData.uniqueStudents}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <Icon path={mdiAccountGroup} className="text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardBox>

                  <CardBox className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Payment</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(summaryData.averagePayment)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Icon path={mdiCalendarMonth} className="text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardBox>
                </div>

                {/* Payment Methods and Class Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Methods */}
                  <CardBox>
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <Icon path={mdiFileChart} className="text-gray-600 dark:text-gray-400 mr-2" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Methods</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon path={mdiCreditCard} className="text-blue-500 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300">QR Payment</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(summaryData.paymentMethods.QRPayment)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {summaryData.totalRevenue > 0 
                                ? `${((summaryData.paymentMethods.QRPayment / summaryData.totalRevenue) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon path={mdiCash} className="text-green-500 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300">Cash</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(summaryData.paymentMethods.cash)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {summaryData.totalRevenue > 0 
                                ? `${((summaryData.paymentMethods.cash / summaryData.totalRevenue) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBox>

                  {/* Class Types */}
                  <CardBox>
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <Icon path={mdiSchool} className="text-gray-600 dark:text-gray-400 mr-2" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Class Types</h4>
                      </div>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {Object.entries(summaryData.classTypeBreakdown)
                          .sort(([,a], [,b]) => b.revenue - a.revenue)
                          .map(([classType, data]) => (
                            <div key={classType} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{classType}</p>
                                <p className="text-sm text-gray-500">{data.count} students</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatCurrency(data.revenue)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {summaryData.totalRevenue > 0 
                                    ? `${((data.revenue / summaryData.totalRevenue) * 100).toFixed(1)}%`
                                    : '0%'
                                  }
                                </p>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </CardBox>
                </div>

                {/* Monthly Comparison */}
                {summaryData.monthlyComparison.previousMonth > 0 && (
                  <CardBox>
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Monthly Comparison
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Previous Month</p>
                          <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            {formatCurrency(summaryData.monthlyComparison.previousMonth)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current Month</p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(summaryData.totalRevenue)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Growth</p>
                          <div className="flex items-center justify-center">
                            <Icon 
                              path={summaryData.monthlyComparison.growth > 0 ? mdiTrendingUp : mdiTrendingDown} 
                              className={summaryData.monthlyComparison.growth > 0 ? "text-green-500" : "text-red-500"}
                              size={1}
                            />
                            <p className={`text-xl font-bold ml-1 ${summaryData.monthlyComparison.growth > 0 ? "text-green-500" : "text-red-500"}`}>
                              {summaryData.monthlyComparison.growth > 0 ? '+' : ''}{summaryData.monthlyComparison.growth.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBox>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No data available for the selected month</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyPaymentSummary;
