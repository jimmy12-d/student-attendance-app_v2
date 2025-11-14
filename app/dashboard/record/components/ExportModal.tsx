// app/dashboard/record/components/ExportModal.tsx
"use client";

import React, { useState } from "react";
import Icon from "../../../_components/Icon";
import { 
  mdiClose, 
  mdiFileExcel, 
  mdiCalendarRange,
  mdiCalendarToday,
  mdiCalendarWeek,
  mdiCalendarMonth,
  mdiClockOutline
} from "@mdi/js";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (days: number, customStartDate?: string, customEndDate?: string) => void;
  isExporting: boolean;
}

type RangeOption = {
  label: string;
  days: number;
  icon: string;
  color: string;
};

const predefinedRanges: RangeOption[] = [
  { label: "Today", days: 0, icon: mdiCalendarToday, color: "blue" },
  { label: "Last 3 Days", days: 3, icon: mdiCalendarWeek, color: "green" },
  { label: "Last 7 Days", days: 7, icon: mdiCalendarWeek, color: "purple" },
  { label: "Last 14 Days", days: 14, icon: mdiCalendarRange, color: "orange" },
  { label: "Last 30 Days", days: 30, icon: mdiCalendarMonth, color: "red" },
  { label: "This Month", days: -1, icon: mdiCalendarMonth, color: "indigo" }, // Special value for current month
  { label: "Last Month", days: -2, icon: mdiCalendarMonth, color: "pink" }, // Special value for previous month
];

export default function ExportModal({ isOpen, onClose, onExport, isExporting }: ExportModalProps) {
  const [customDays, setCustomDays] = useState<string>("");
  const [exportMode, setExportMode] = useState<"predefined" | "custom" | "dateRange">("predefined");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  if (!isOpen) return null;

  const handlePredefinedExport = (days: number) => {
    onExport(days);
  };

  const handleCustomExport = () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days < 1) {
      alert("Please enter a valid number of days (minimum 1)");
      return;
    }
    if (days > 365) {
      alert("Maximum range is 365 days");
      return;
    }
    onExport(days);
  };

  const handleDateRangeExport = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }
    onExport(0, startDate, endDate);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500 hover:bg-blue-600",
      green: "bg-green-500 hover:bg-green-600",
      purple: "bg-purple-500 hover:bg-purple-600",
      orange: "bg-orange-500 hover:bg-orange-600",
      red: "bg-red-500 hover:bg-red-600",
      indigo: "bg-indigo-500 hover:bg-indigo-600",
      pink: "bg-pink-500 hover:bg-pink-600",
    };
    return colors[color] || "bg-gray-500 hover:bg-gray-600";
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[200] p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Icon path={mdiFileExcel} size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Export to Excel</h2>
              <p className="text-white/80 text-sm">Select date range for attendance records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            disabled={isExporting}
          >
            <Icon path={mdiClose} size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Export Mode Tabs */}
          <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setExportMode("predefined")}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                exportMode === "predefined"
                  ? "bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Quick Select
            </button>
            <button
              onClick={() => setExportMode("custom")}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                exportMode === "custom"
                  ? "bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Custom Days
            </button>
            <button
              onClick={() => setExportMode("dateRange")}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                exportMode === "dateRange"
                  ? "bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Date Range
            </button>
          </div>

          {/* Predefined Ranges */}
          {exportMode === "predefined" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Select a predefined range:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {predefinedRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handlePredefinedExport(range.days)}
                    disabled={isExporting}
                    className={`${getColorClasses(range.color)} text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Icon path={range.icon} size={20} />
                      <span className="font-semibold text-sm">{range.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Days Input */}
          {exportMode === "custom" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Enter number of days:
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Days (1-365)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="e.g., 10, 20, 45..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-gray-100 text-lg"
                      disabled={isExporting}
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Export attendance records from the last {customDays || "X"} days
                    </p>
                  </div>
                  <button
                    onClick={handleCustomExport}
                    disabled={isExporting || !customDays}
                    className="mt-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Icon path={mdiFileExcel} size={16} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Picker */}
          {exportMode === "dateRange" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Select specific date range:
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </div>
                </div>
                <button
                  onClick={handleDateRangeExport}
                  disabled={isExporting || !startDate || !endDate}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Icon path={mdiFileExcel} size={16} />
                  <span>Export Range</span>
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Icon path={mdiClockOutline} size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  Export Information
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Export includes all shifts (Morning, Afternoon, Evening)</li>
                  <li>• File format: Excel (.xlsx)</li>
                  <li>• Includes student details, status, time, and method</li>
                  <li>• Large exports may take a few seconds to process</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {/* Loading Overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Exporting...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Please wait</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
