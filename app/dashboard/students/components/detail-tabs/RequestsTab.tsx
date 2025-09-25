import React, { useRef, useState, useEffect } from 'react';
import { Student, PermissionRecord } from '../../../../_interfaces';
import Icon from '../../../../_components/Icon';
import PermissionCard from './PermissionCard';
import { mdiClockAlertOutline, mdiCheck, mdiClose, mdiCalendarCheck, mdiCalendarMonth, mdiAlertCircle, mdiChevronLeft, mdiChevronRight } from '@mdi/js';

interface RequestsTabProps {
  student: Student;
  leaveEarlyRequests: any[];
  isLoadingLeaveEarly: boolean;
  handleApproveLeaveEarly: (requestId: string) => void;
  handleRejectLeaveEarly: (requestId: string) => void;
  approvedPermissions: PermissionRecord[];
  pendingPermissions?: PermissionRecord[];
  handleApprovePermission?: (permissionId: string) => void;
  handleRejectPermission?: (permissionId: string) => void;
  isLoadingPermissions?: boolean;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
  student,
  leaveEarlyRequests,
  isLoadingLeaveEarly,
  handleApproveLeaveEarly,
  handleRejectLeaveEarly,
  approvedPermissions,
  pendingPermissions = [],
  handleApprovePermission,
  handleRejectPermission,
  isLoadingPermissions = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const getCurrentMonthPermissionDays = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return approvedPermissions.reduce((total, permission) => {
      const startDate = permission.permissionStartDate ? new Date(permission.permissionStartDate) : null;
      const endDate = permission.permissionEndDate ? new Date(permission.permissionEndDate) : null;

      if (!startDate || !endDate) return total;

      // Check if permission overlaps with current month
      const permissionStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const permissionEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      // Calculate overlapping days with current month
      const overlapStart = permissionStart > monthStart ? permissionStart : monthStart;
      const overlapEnd = permissionEnd < monthEnd ? permissionEnd : monthEnd;

      if (overlapStart <= overlapEnd) {
        const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }

      return total;
    }, 0);
  };

  const currentMonthPermissionDays = getCurrentMonthPermissionDays();
  const isOverLimit = currentMonthPermissionDays > 5;
  const totalPermissions = [...approvedPermissions, ...pendingPermissions].length;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Check scroll position and update arrow states
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && totalPermissions > 1) {
      checkScrollPosition();
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [totalPermissions]);
  return (
    <div className="space-y-6">
      {/* Unified Permission Requests Section */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Icon path={mdiCalendarCheck} size={16} className="mr-2 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">All Permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 hover:shadow-md ${
                isOverLimit
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400 hover:from-red-600 hover:to-red-700'
                  : currentMonthPermissionDays === 0
                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300 dark:border-gray-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border border-green-400 hover:from-green-600 hover:to-emerald-700'
              }`}>
                <Icon
                  path={isOverLimit ? mdiAlertCircle : mdiCalendarMonth}
                  size={14}
                  className={`flex-shrink-0 ${isOverLimit ? 'animate-pulse' : ''}`}
                />
                <span className="opacity-90">
                  request
                </span>
                <span className="font-bold">
                  {currentMonthPermissionDays}
                </span>
                <span className="opacity-90">
                  day{currentMonthPermissionDays !== 1 ? 's' : ''}
                </span>
                <span className="opacity-75 text-xs">
                  for permission
                </span>
              </div>
              {isOverLimit && (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium animate-pulse flex items-center gap-1">
                  <Icon path={mdiAlertCircle} size={12} />
                  <span>Over 5-day limit</span>
                </div>
              )}
            </div>
          </div>

          {[...approvedPermissions, ...pendingPermissions].length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiCalendarCheck} size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No permissions found</p>
            </div>
          ) : (
            <div className="pb-2 overflow-hidden">
              <div 
                ref={scrollContainerRef}
                className={`flex gap-4 flex-nowrap ${totalPermissions > 2 ? 'overflow-x-scroll scrollbar-visible' : 'overflow-x-auto'} pb-3`} 
                style={{ 
                  scrollbarWidth: 'auto',
                  scrollbarColor: '#6b7280 #e5e7eb',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {[...approvedPermissions, ...pendingPermissions]
                  .sort((a, b) => {
                    // Sort by most recent first
                    const dateA = a.requestedAt?.toDate?.() || new Date(0);
                    const dateB = b.requestedAt?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((permission: PermissionRecord) => (
                    <div key={permission.id} className="flex-shrink-0 w-80">
                      <PermissionCard
                        permission={permission}
                        onApprove={permission.status === 'pending' ? handleApprovePermission : undefined}
                        onReject={permission.status === 'pending' ? handleRejectPermission : undefined}
                        isLoading={isLoadingPermissions}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

                  {/* Floating Navigation Arrows */}
      {totalPermissions > 1 && (
        <>
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={`absolute left-4 top-[55%] transform -translate-y-1/2 z-20 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 scale-100 hover:scale-105 ${
              canScrollLeft
                ? 'bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-500'
                : 'bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
            }`}
            title={canScrollLeft ? "Scroll left" : "Already at the beginning"}
          >
            <Icon path={mdiChevronLeft} size={24} />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={`absolute right-4 top-[55%] transform -translate-y-1/2 z-20 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 scale-100 hover:scale-105 ${
              canScrollRight
                ? 'bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-500'
                : 'bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
            }`}
            title={canScrollRight ? "Scroll right" : "Already at the end"}
          >
            <Icon path={mdiChevronRight} size={24} />
          </button>
        </>
      )}

      {/* Leave Early Requests Section */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <Icon path={mdiClockAlertOutline} size={16} className="mr-2 text-blue-600 dark:text-blue-400" />
            Leave Early Requests
          </h4>

          {isLoadingLeaveEarly ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading requests...</span>
            </div>
          ) : leaveEarlyRequests.length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiClockAlertOutline} size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No leave early requests</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {leaveEarlyRequests.map((request: any) => (
                <div key={request.id} className="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 border border-gray-200 dark:border-slate-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : request.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {request.status === 'approved' && <Icon path={mdiCheck} size={12} className="mr-1" />}
                          {request.status === 'rejected' && <Icon path={mdiClose} size={12} className="mr-1" />}
                          {request.status === 'pending' && <Icon path={mdiClockAlertOutline} size={12} className="mr-1" />}
                          {request.status || 'pending'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {request.requestedAt?.toDate?.()
                            ? new Date(request.requestedAt.toDate()).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Unknown time'
                          }
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Requested Time:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {request.leaveTime || 'Not specified'}
                          </span>
                        </div>

                        {request.reason && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason:</span>
                            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{request.reason}</p>
                          </div>
                        )}

                        {request.adminNote && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Admin Note:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">{request.adminNote}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for pending requests */}
                    {request.status === 'pending' && (
                      <div className="flex flex-col space-y-2 ml-3">
                        <button
                          onClick={() => handleApproveLeaveEarly(request.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                          title="Approve request"
                        >
                          <Icon path={mdiCheck} size={14} className="mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectLeaveEarly(request.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                          title="Reject request"
                        >
                          <Icon path={mdiClose} size={14} className="mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsTab;