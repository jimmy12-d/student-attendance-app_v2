"use client";

import React from "react";
import { Timestamp } from "firebase/firestore";
import { mdiCheck, mdiClose, mdiCalendarRange, mdiAccount, mdiBookOpenPageVariant, mdiClockTimeEight } from "@mdi/js";
import Icon from "../../_components/Icon";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import { EnrichedPermissionRecord } from "./page";

type Props = {
  permission: EnrichedPermissionRecord;
  onUpdateRequest: (permissionId: string, newStatus: 'approved' | 'rejected') => void;
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

const PermissionCard: React.FC<Props> = ({ permission, onUpdateRequest }) => {
  const isPending = permission.status === 'pending';
  
  return (
    <div className={`bg-white dark:bg-slate-900/70 rounded-2xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md ${
      isPending 
        ? 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700' 
        : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon path={mdiAccount} size={20} className="text-gray-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {permission.studentName}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
            <span>{permission.studentClass || permission.class || 'N/A'}</span>
            <span>•</span>
            <span>{permission.studentShift || permission.shift || 'N/A'}</span>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusStyle(permission.status)}`}>
          <Icon path={getStatusIcon(permission.status)} size={16} />
          {permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}
        </div>
      </div>

      {/* Permission Dates */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-slate-800 rounded-lg">
        <Icon path={mdiCalendarRange} size={20} className="text-blue-600" />
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-slate-400">Permission Period</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDateString(permission.permissionStartDate)} 
            {permission.permissionStartDate !== permission.permissionEndDate && 
              ` - ${formatDateString(permission.permissionEndDate)}`
            }
          </div>
          {permission.duration && (
            <div className="text-xs text-gray-500 dark:text-slate-500">
              Duration: {permission.duration} day{permission.duration > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon path={mdiBookOpenPageVariant} size={18} className="text-gray-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Reason</span>
        </div>
        <div className="pl-6 text-gray-700 dark:text-slate-300">
          {permission.reason}
        </div>
      </div>

      {/* Details - Show full for pending, summary for others */}
      {(isPending || permission.details) && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Details</div>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
            {isPending ? (
              <div className="text-gray-700 dark:text-slate-300 leading-relaxed">
                {permission.details || <span className="text-gray-400 dark:text-slate-500 italic">No details provided</span>}
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-slate-400">
                {permission.details ? (
                  permission.details.length > 60 
                    ? `${permission.details.substring(0, 60)}...` 
                    : permission.details
                ) : (
                  <span className="italic">No details provided</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Info */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
        <div className="text-xs text-gray-500 dark:text-slate-500">
          <div className="pr-2">Request On: {formatTimestamp(permission.requestedAt)}</div>
          {permission.reviewedAt && (
            <div>Reviewed: {formatTimestamp(permission.reviewedAt)}</div>
          )}
        </div>

        {/* Action buttons for pending requests */}
        {isPending && (
          <div className="flex items-center gap-2">
            <div className="flex gap-2 justify-end noWrap">
              <Button
                color="success"
                icon={mdiCheck}
                label="Approve"
                onClick={() => onUpdateRequest(permission.id, 'approved')}
                small
              />
              <Button
                color="danger"
                icon={mdiClose}
                label="Reject"
                onClick={() => onUpdateRequest(permission.id, 'rejected')}
                small
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;
