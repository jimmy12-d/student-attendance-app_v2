"use client";
import React, { useState } from "react";
import { mdiDownload, mdiRefresh, mdiChevronDown } from "@mdi/js";
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
  handleExportData: (exportType: 'summary' | 'detail') => void;
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Generate list of months from September 2025 to current month
  const generateMonthOptions = () => {
    const months: Array<{ value: string; label: string; year: number; month: number }> = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Start from September 2025
    const startYear = 2025;
    const startMonth = 8; // September (0-indexed)
    
    let year = startYear;
    let month = startMonth;
    
    // Generate months from September 2025 to current month
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const date = new Date(year, month, 1);
      months.push({
        value: `${year}-${month}`,
        label: date.toLocaleDateString('en-US', { month: 'long' }),
        year: year,
        month: month
      });
      
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    
    return months.reverse(); // Most recent first
  };

  const monthOptions = generateMonthOptions();
  
  // Get the 2 latest months for default display
  const latestTwoMonths = monthOptions.slice(0, 2);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.month-dropdown-container') && !target.closest('.export-dropdown-container')) {
        setShowMonthDropdown(false);
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthChange = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Format dates manually to avoid timezone issues
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(lastDay));
    setDateInterval({ type: 'monthly', value: `${year}-${month}` });
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
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 border-0 focus:ring-0 focus:outline-none"
                  />
                  <div className="w-3 h-px bg-gradient-to-r from-blue-400 to-purple-400"></div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
            <div className="flex gap-2 flex-wrap items-center">
              {/* Show 2 latest months */}
              {latestTwoMonths.map((monthOption, index) => {
                const colors = [
                  "from-green-500 to-emerald-600",
                  "from-blue-500 to-cyan-600"
                ];
                return (
                  <button
                    key={monthOption.value}
                    onClick={() => handleMonthChange(monthOption.year, monthOption.month)}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                      dateInterval.value === monthOption.value
                        ? `text-white bg-gradient-to-r ${colors[index]} shadow-lg`
                        : 'text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  >
                    {monthOption.label}
                  </button>
                );
              })}
              
              {/* Dropdown for older months */}
              {monthOptions.length > 2 && (
                <div className="relative month-dropdown-container">
                  <button
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 flex items-center gap-1"
                  >
                    <span>More Months</span>
                    <Icon path={mdiChevronDown} size={16} className={`transition-transform duration-300 ${showMonthDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showMonthDropdown && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                      {monthOptions.slice(2).map((monthOption) => (
                        <button
                          key={monthOption.value}
                          onClick={() => {
                            handleMonthChange(monthOption.year, monthOption.month);
                            setShowMonthDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${
                            dateInterval.value === monthOption.value
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {monthOption.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                  handleMonthChange(now.getFullYear(), now.getMonth());
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
              
              {/* Export Dropdown */}
              <div className="relative export-dropdown-container">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isLoading || !summaryData}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                >
                  <Icon path={mdiDownload} size={24} />
                  <span className="hidden sm:inline">Export</span>
                  <Icon path={mdiChevronDown} size={20} />
                </button>
                
                {/* Dropdown Menu */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        handleExportData('summary');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-start gap-3"
                    >
                      <Icon path={mdiDownload} size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Export Summary</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Metrics, class breakdown, daily totals
                        </div>
                      </div>
                    </button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                    <button
                      onClick={() => {
                        handleExportData('detail');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-start gap-3"
                    >
                      <Icon path={mdiDownload} size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Export Details</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          All transactions with student info
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default ControlsPanel;
