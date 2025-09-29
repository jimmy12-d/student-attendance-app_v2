"use client";
import React from "react";
import { mdiDownload, mdiRefresh } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";

interface DateInterval {
  type: 'interval' | 'monthly';
  value: string;
}

interface ControlsPanelProps {
  startDate: string;
  endDate: string;
  dateInterval: DateInterval;
  isLoading: boolean;
  summaryData: any;
  formatDateRange: (start: string, end: string) => string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setDateInterval: (interval: DateInterval) => void;
  setQuickDateRange: (days: number) => void;
  fetchSummaryData: () => void;
  handleExportData: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  startDate,
  endDate,
  dateInterval,
  isLoading,
  summaryData,
  formatDateRange,
  setStartDate,
  setEndDate,
  setDateInterval,
  setQuickDateRange,
  fetchSummaryData,
  handleExportData
}) => {
  const handleMonthChange = (monthOffset: number) => {
    const now = new Date();
    // For "This Month" (monthOffset = 0), we want current month
    // For "Last Month" (monthOffset = 1), we want previous month
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth() - monthOffset;
    
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    
    // Format dates manually to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(lastDay));
  };

  return (
    <CardBox className="bg-gradient-to-r from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-900/10 border-0 shadow-xl">
      <div className="p-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {formatDateRange(startDate, endDate)} • Real-time insights
            </p>
          </div>
        {/* Date Controls */}
            {dateInterval.type === 'interval' ? (
                
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                         {/* Date Range Inputs */}

                <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      fetchSummaryData();
                    }}
                    className="px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 border-0 focus:ring-0 focus:outline-none"
                  />
                  <div className="w-3 h-px bg-gradient-to-r from-blue-400 to-purple-400"></div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      fetchSummaryData();
                    }}
                    className="px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 border-0 focus:ring-0 focus:outline-none"
                  />
                </div>

                {/* Quick Date Range Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { days: 0, label: "Today", color: "from-green-500 to-emerald-600" },
                    { days: 7, label: "7 Days Ago", color: "from-blue-500 to-cyan-600" }
                  ].map(({ days, label, color }) => (
                    <button
                      key={days}
                      onClick={() => setQuickDateRange(days)}
                      className={`px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r ${color} rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 hover:-translate-y-1`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Monthly Selector */
            <div className="flex gap-2 flex-wrap">
            {[
                { months: 0, label: "This Month", color: "from-green-500 to-emerald-600" },
                { months: 1, label: "Last Month", color: "from-blue-500 to-cyan-600" }
            ].map(({ months, label, color }) => (
                <button
                key={months}
                onClick={() => {
                    handleMonthChange(months);
                    setDateInterval({ type: 'monthly', value: months.toString() });
                    fetchSummaryData();
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                    dateInterval.value === months.toString()
                    ? `text-white bg-gradient-to-r ${color} shadow-lg`
                    : 'text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700'
                }`}
                >
                {label}
                </button>
            ))}
            </div>
            )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto">
            {/* Interval Type Selector */}
            <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
              <button
                onClick={() => setDateInterval({ type: 'interval', value: '' })}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  dateInterval.type === 'interval'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Date Range
              </button>
              <button
                onClick={() => {
                  // Always reset to current month when switching to monthly mode
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
                  setDateInterval({ type: 'monthly', value: '0' });
                  fetchSummaryData();
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  dateInterval.type === 'monthly'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Monthly
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={fetchSummaryData}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
              >
                <Icon path={mdiRefresh} size={24} className={isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={handleExportData}
                disabled={isLoading || !summaryData}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
              >
                <Icon path={mdiDownload} size={24} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default ControlsPanel;
