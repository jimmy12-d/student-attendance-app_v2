"use client";

import React from "react";
import { Timestamp } from "firebase/firestore";
import { mdiCheck, mdiClose, mdiCalendarRange, mdiAccount, mdiBookOpenPageVariant, mdiClockTimeEight, mdiClockTimeFour, mdiClockTimeTwelve, mdiCalendarClock } from "@mdi/js";
import Icon from "../../_components/Icon";
import Button from "../../_components/Button";
import { EnrichedPermissionRecord } from "./page";

type Props = {
  permission: EnrichedPermissionRecord;
  onUpdateRequest: (permissionId: string, newStatus: 'approved' | 'rejected') => void;
  allPermissions?: EnrichedPermissionRecord[]; // Add this to calculate monthly totals
};

const formatTimestamp = (timestamp?: Timestamp): string => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleString('default', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatDateString = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr;
  }

  const date = new Date(year, month, day);
  return date.toLocaleString('default', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return mdiCheck;
    case 'rejected':
      return mdiClose;
    case 'pending':
      return mdiClockTimeEight;
    default:
      return mdiClockTimeEight;
  }
};

// Function to calculate total permission days for the current month for this student
const calculateMonthlyPermissionDays = (
  currentPermission: EnrichedPermissionRecord, 
  allPermissions: EnrichedPermissionRecord[] = []
): number => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Filter permissions for the same student in the current month
  const studentPermissionsThisMonth = allPermissions.filter(permission => {
    // Only count approved permissions or the current permission if it's pending
    if (permission.status !== 'approved' && permission.id !== currentPermission.id) {
      return false;
    }
    
    // Check if permission belongs to the same student
    if (permission.studentId !== currentPermission.studentId) {
      return false;
    }

    // Check if permission overlaps with current month
    const startDate = new Date(permission.permissionStartDate);
    const endDate = new Date(permission.permissionEndDate);
    
    // Check if the permission period overlaps with the current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    return startDate <= monthEnd && endDate >= monthStart;
  });

  // Sum up the durations, but only count days that fall within the current month
  let totalDays = 0;
  studentPermissionsThisMonth.forEach(permission => {
    if (permission.duration) {
      totalDays += permission.duration;
    } else {
      // Calculate duration if not provided
      const startDate = new Date(permission.permissionStartDate);
      const endDate = new Date(permission.permissionEndDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
      totalDays += diffDays;
    }
  });

  return totalDays;
};

// Function to get duration visual properties
const getDurationVisualProps = (duration: number) => {
  if (duration <= 3) {
    return {
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-700',
      icon: mdiClockTimeFour,
      label: 'Short',
      progressWidth: `${Math.min((duration / 7) * 100, 100)}%` // Cap at 100%
    };
  } else if (duration <= 7) {
    return {
      color: 'yellow',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      icon: mdiClockTimeEight,
      label: 'Medium',
      progressWidth: `${Math.min((duration / 14) * 100, 100)}%` // Cap at 100%
    };
  } else {
    return {
      color: 'red',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-700',
      icon: mdiClockTimeTwelve,
      label: 'Extended',
      progressWidth: '100%'
    };
  }
};

const PermissionCard: React.FC<Props> = ({ permission, onUpdateRequest, allPermissions = [] }) => {
  const isPending = permission.status === 'pending';
  const monthlyPermissionDays = calculateMonthlyPermissionDays(permission, allPermissions);
  const isHighPermissionUsage = monthlyPermissionDays >= 5;
  
  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-md border transition-all duration-200 hover:shadow-lg ${
      isPending 
        ? 'border-yellow-200 dark:border-yellow-700' 
        : isHighPermissionUsage
        ? 'border-red-200 dark:border-red-700'
        : 'border-gray-200 dark:border-slate-600'
    }`}>
      {/* Warning banner for high permission usage */}
      {isHighPermissionUsage && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
          <div className="flex items-center gap-2">
            <Icon path={mdiCalendarRange} size={16} className="text-red-600 dark:text-red-400" />
            <div className="text-sm font-medium text-red-800 dark:text-red-300">
              High Usage: {monthlyPermissionDays} days this month
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {permission.studentName}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-xs">
                {permission.studentClass || permission.class || 'N/A'}
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-xs">
                {permission.studentShift || permission.shift || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-lg text-sm font-medium border flex items-center gap-1 self-start ${
          permission.status === 'approved' 
            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' 
            : permission.status === 'rejected'
            ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'
            : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700'
        }`}>
          <Icon path={getStatusIcon(permission.status)} size={14} />
          <span className="capitalize">{permission.status}</span>
        </div>
      </div>

      {/* Permission Dates */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Icon path={mdiCalendarRange} size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Permission Period</span>
        </div>
        <div className="ml-6">
          <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
            {formatDateString(permission.permissionStartDate)} 
            {permission.permissionStartDate !== permission.permissionEndDate && 
              <span className="text-gray-500 dark:text-slate-400"> → {formatDateString(permission.permissionEndDate)}</span>
            }
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            {permission.duration && (
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-md ${getDurationVisualProps(permission.duration).bgColor}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon 
                      path={getDurationVisualProps(permission.duration).icon} 
                      size={14} 
                      className={getDurationVisualProps(permission.duration).textColor} 
                    />
                    <div className="text-xs font-medium">
                      <span className={getDurationVisualProps(permission.duration).textColor}>
                        {permission.duration} day{permission.duration > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`text-xs font-medium px-2 py-1 rounded-md ${
              isHighPermissionUsage 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
            }`}>
              {monthlyPermissionDays} day{monthlyPermissionDays !== 1 ? 's' : ''} this month
            </div>
          </div>
        </div>
      </div>

      {/* Combined Reason & Details */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon path={mdiBookOpenPageVariant} size={16} className="text-gray-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Reason & Details</span>
        </div>
        <div className="ml-6 space-y-2">
          <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
            {permission.reason}
          </div>
          {(isPending || permission.details) && permission.details && (
            <div className="text-xs text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
              {isPending ? (
                permission.details
              ) : (
                permission.details.length > 60 
                  ? `${permission.details.substring(0, 60)}...` 
                  : permission.details
              )}
            </div>
          )}
        </div>
      </div>

      {/* Request Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="text-xs text-gray-500 dark:text-slate-500 space-y-1">
          <div className="flex items-center gap-1">
            <Icon path={mdiClockTimeEight} size={12} />
            <span>Requested: {formatTimestamp(permission.requestedAt)}</span>
          </div>
          {permission.reviewedAt && (
            <div className="flex items-center gap-1">
              <Icon path={mdiCheck} size={12} />
              <span>Reviewed: {formatTimestamp(permission.reviewedAt)}</span>
            </div>
          )}
        </div>

        {/* Action buttons for pending requests */}
        {isPending && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              color="success"
              icon={mdiCheck}
              label="Approve"
              onClick={() => onUpdateRequest(permission.id, 'approved')}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium px-4 py-3 sm:px-4 sm:py-2 rounded-lg shadow-sm hover:shadow-md active:shadow-lg transition-all duration-200 text-sm min-h-[44px] sm:min-h-[36px] flex items-center justify-center"
            />
            <Button
              color="danger"
              icon={mdiClose}
              label="Reject"
              onClick={() => onUpdateRequest(permission.id, 'rejected')}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium px-4 py-3 sm:px-4 sm:py-2 rounded-lg shadow-sm hover:shadow-md active:shadow-lg transition-all duration-200 text-sm min-h-[44px] sm:min-h-[36px] flex items-center justify-center"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;
