import React, { useState } from 'react';
import { PermissionRecord } from '../../../../_interfaces';
import Icon from '../../../../_components/Icon';
import {
  mdiClockAlertOutline,
  mdiCheck,
  mdiClose,
  mdiCalendarCheck,
  mdiInformationOutline,
  mdiTimerSand,
  mdiTextBoxOutline,
  mdiEye,
  mdiEyeOff
} from '@mdi/js';

interface PermissionCardProps {
  permission: PermissionRecord;
  onApprove?: (permissionId: string) => void;
  onReject?: (permissionId: string) => void;
  isLoading?: boolean;
}

export const PermissionCard: React.FC<PermissionCardProps> = ({
  permission,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [showFullReason, setShowFullReason] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const startDate = permission.permissionStartDate ? new Date(permission.permissionStartDate) : null;
  const endDate = permission.permissionEndDate ? new Date(permission.permissionEndDate) : null;
  const duration = permission.duration ||
    (startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null);

  // Function to truncate text to first 10 words
  const truncateText = (text: string, wordLimit: number = 10) => {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return mdiCheck;
      case 'rejected':
        return mdiClose;
      case 'pending':
        return mdiClockAlertOutline;
      default:
        return mdiInformationOutline;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      {/* Header with Status */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon path={getStatusIcon(permission.status)} size={16} className="text-gray-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Permission Request
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(permission.status)}`}>
            <Icon path={getStatusIcon(permission.status)} size={12} />
            <span className="capitalize">{permission.status}</span>
          </div>
        </div>
      </div>

      {/* Content - Takes up remaining space */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Duration */}
          <div className="flex items-start gap-3">
            <Icon path={mdiTimerSand} size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Duration</div>
              <div className="text-sm text-gray-900 dark:text-white">
                {startDate ? startDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A'}
                {startDate && endDate && startDate.getTime() !== endDate.getTime() && (
                  <span className="text-gray-500 dark:text-slate-400">
                    {' → '}
                    {endDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>
              {duration && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {duration} day{duration > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="flex items-start gap-3">
            <Icon path={mdiTextBoxOutline} size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Reason</div>
                {permission.reason.split(' ').length > 10 && (
                  <button
                    onClick={() => setShowFullReason(!showFullReason)}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors flex items-center gap-1"
                  >
                    <Icon path={showFullReason ? mdiEyeOff : mdiEye} size={14} />
                    <span>{showFullReason ? 'Show less' : 'Show more'}</span>
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-900 dark:text-white leading-relaxed">
                {showFullReason ? permission.reason : truncateText(permission.reason, 10)}
              </div>
            </div>
          </div>

          {/* Details */}
          {permission.details && (
            <div className="flex items-start gap-3">
              <Icon path={mdiInformationOutline} size={16} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Details</div>
                  {permission.details.split(' ').length > 10 && (
                    <button
                      onClick={() => setShowFullDetails(!showFullDetails)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <Icon path={showFullDetails ? mdiEyeOff : mdiEye} size={14} />
                      <span>{showFullDetails ? 'Show less' : 'Show more'}</span>
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {showFullDetails ? permission.details : truncateText(permission.details, 10)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons for Pending Permissions */}
        {permission.status === 'pending' && (onApprove || onReject) && (
          <div className="pt-3 border-t border-gray-200 dark:border-slate-600 mt-4">
            <div className="flex gap-2">
              {onApprove && (
                <button
                  onClick={() => onApprove(permission.id)}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 dark:border-green-300 mr-2"></div>
                  ) : (
                    <Icon path={mdiCheck} size={16} className="mr-2" />
                  )}
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(permission.id)}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 dark:border-red-300 mr-2"></div>
                  ) : (
                    <Icon path={mdiClose} size={16} className="mr-2" />
                  )}
                  Reject
                </button>
              )}
            </div>
          </div>
        )}

        {/* Student Info - Always at bottom */}
        <div className="pt-3 border-t border-gray-200 dark:border-slate-600 mt-auto">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>{permission.studentName}</span>
            <span>
              {permission.requestedAt?.toDate?.()
                ? permission.requestedAt.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown time'
              }
            </span>
          </div>
          {(permission.studentClass || permission.studentShift) && (
            <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {permission.studentClass && <span>Class: {permission.studentClass}</span>}
              {permission.studentClass && permission.studentShift && <span> • </span>}
              {permission.studentShift && <span>Shift: {permission.studentShift}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionCard;
