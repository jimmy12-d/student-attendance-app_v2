import React from 'react';
import Icon from '../../../../_components/Icon';
import {
  mdiClockAlertOutline,
  mdiCheck,
  mdiClose,
  mdiTimerSand,
  mdiTextBoxOutline,
  mdiInformationOutline
} from '@mdi/js';

interface LeaveEarlyCardProps {
  request: any;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  isLoading?: boolean;
}

export const LeaveEarlyCard: React.FC<LeaveEarlyCardProps> = ({
  request,
  onApprove,
  onReject,
  isLoading = false,
}) => {
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
            <Icon path={getStatusIcon(request.status)} size={16} className="text-gray-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Leave Early Request
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(request.status)}`}>
            <Icon path={getStatusIcon(request.status)} size={12} />
            <span className="capitalize">{request.status}</span>
          </div>
        </div>
      </div>

      {/* Content - Takes up remaining space */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Leave Time */}
          <div className="flex items-start gap-3">
            <Icon path={mdiTimerSand} size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Leave Time</div>
              <div className="text-sm text-gray-900 dark:text-white">
                {request.leaveTime || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="flex items-start gap-3">
              <Icon path={mdiTextBoxOutline} size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Reason</div>
                <div className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {request.reason}
                </div>
              </div>
            </div>
          )}

          {/* Admin Note */}
          {request.adminNote && (
            <div className="flex items-start gap-3">
              <Icon path={mdiInformationOutline} size={16} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Admin Note</div>
                <div className="text-sm text-gray-900 dark:text-white leading-relaxed italic">
                  {request.adminNote}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons for Pending Requests */}
        {request.status === 'pending' && (onApprove || onReject) && (
          <div className="pt-3 border-t border-gray-200 dark:border-slate-600 mt-4">
            <div className="flex gap-2">
              {onApprove && (
                <button
                  onClick={() => onApprove(request.id)}
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
                  onClick={() => onReject(request.id)}
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

        {/* Request Time - Always at bottom */}
        <div className="pt-3 border-t border-gray-200 dark:border-slate-600 mt-auto">
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Requested: {request.requestedAt?.toDate?.()
              ? new Date(request.requestedAt.toDate()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown time'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveEarlyCard;