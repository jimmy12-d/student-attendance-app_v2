import React, { useState } from 'react';
import { Student, PermissionRecord } from '../../../../_interfaces';
import Icon from '../../../../_components/Icon';
import PermissionCard from './PermissionCard';
import LeaveEarlyCard from './LeaveEarlyCard';
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
  const [currentPermissionPage, setCurrentPermissionPage] = useState(0);
  const [currentLeaveEarlyPage, setCurrentLeaveEarlyPage] = useState(0);
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
  const totalLeaveEarlyRequests = leaveEarlyRequests.length;
  
  // Pagination constants
  const PERMISSIONS_PER_PAGE = 3;
  const LEAVE_EARLY_PER_PAGE = 3;
  const totalPermissionPages = Math.ceil(totalPermissions / PERMISSIONS_PER_PAGE);
  const totalLeaveEarlyPages = Math.ceil(totalLeaveEarlyRequests / LEAVE_EARLY_PER_PAGE);

  // Pagination functions
  const nextPermissionPage = () => {
    setCurrentPermissionPage((prev) => Math.min(prev + 1, totalPermissionPages - 1));
  };

  const prevPermissionPage = () => {
    setCurrentPermissionPage((prev) => Math.max(prev - 1, 0));
  };

  const goToPermissionPage = (page: number) => {
    setCurrentPermissionPage(Math.max(0, Math.min(page, totalPermissionPages - 1)));
  };

  const nextLeaveEarlyPage = () => {
    setCurrentLeaveEarlyPage((prev) => Math.min(prev + 1, totalLeaveEarlyPages - 1));
  };

  const prevLeaveEarlyPage = () => {
    setCurrentLeaveEarlyPage((prev) => Math.max(prev - 1, 0));
  };

  const goToLeaveEarlyPage = (page: number) => {
    setCurrentLeaveEarlyPage(Math.max(0, Math.min(page, totalLeaveEarlyPages - 1)));
  };

  // Get current page permissions
  const getCurrentPagePermissions = () => {
    const allPermissions = [...approvedPermissions, ...pendingPermissions]
      .sort((a, b) => {
        // Sort by most recent first
        const dateA = a.requestedAt?.toDate?.() || new Date(0);
        const dateB = b.requestedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
    const startIndex = currentPermissionPage * PERMISSIONS_PER_PAGE;
    return allPermissions.slice(startIndex, startIndex + PERMISSIONS_PER_PAGE);
  };

  // Get current page leave early requests
  const getCurrentPageLeaveEarly = () => {
    const sortedRequests = leaveEarlyRequests
      .sort((a, b) => {
        // Sort by most recent first
        const dateA = a.requestedAt?.toDate?.() || new Date(0);
        const dateB = b.requestedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
    const startIndex = currentLeaveEarlyPage * LEAVE_EARLY_PER_PAGE;
    return sortedRequests.slice(startIndex, startIndex + LEAVE_EARLY_PER_PAGE);
  };

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
            <div className="space-y-4">
              {/* Permission Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCurrentPagePermissions().map((permission: PermissionRecord) => (
                  <div key={permission.id} className="flex-shrink-0">
                    <PermissionCard
                      permission={permission}
                      onApprove={permission.status === 'pending' ? handleApprovePermission : undefined}
                      onReject={permission.status === 'pending' ? handleRejectPermission : undefined}
                      isLoading={isLoadingPermissions}
                    />
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPermissionPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
                  <button
                    onClick={prevPermissionPage}
                    disabled={currentPermissionPage === 0}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPermissionPage === 0
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-slate-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                    }`}
                  >
                    <Icon path={mdiChevronLeft} size={16} className="mr-1" />
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalPermissionPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToPermissionPage(i)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          i === currentPermissionPage
                            ? 'bg-green-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={nextPermissionPage}
                    disabled={currentPermissionPage === totalPermissionPages - 1}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPermissionPage === totalPermissionPages - 1
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-slate-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                    }`}
                  >
                    Next
                    <Icon path={mdiChevronRight} size={16} className="ml-1" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Early Requests Section */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Icon path={mdiClockAlertOutline} size={16} className="mr-2 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Leave Early Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                leaveEarlyRequests.length === 0
                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300 dark:border-gray-500'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400 hover:from-blue-600 hover:to-blue-700'
              }`}>
                <Icon
                  path={mdiClockAlertOutline}
                  size={14}
                  className="flex-shrink-0"
                />
                <span className="opacity-90">
                  request
                </span>
                <span className="font-bold">
                  {leaveEarlyRequests.length}
                </span>
                <span className="opacity-90">
                  total
                </span>
              </div>
            </div>
          </div>

          {isLoadingLeaveEarly ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading requests...</span>
            </div>
          ) : leaveEarlyRequests.length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiClockAlertOutline} size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No leave early requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leave Early Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCurrentPageLeaveEarly().map((request: any) => (
                  <div key={request.id} className="flex-shrink-0">
                    <LeaveEarlyCard
                      request={request}
                      onApprove={request.status === 'pending' ? handleApproveLeaveEarly : undefined}
                      onReject={request.status === 'pending' ? handleRejectLeaveEarly : undefined}
                      isLoading={isLoadingLeaveEarly}
                    />
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalLeaveEarlyPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
                  <button
                    onClick={prevLeaveEarlyPage}
                    disabled={currentLeaveEarlyPage === 0}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentLeaveEarlyPage === 0
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-slate-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                    }`}
                  >
                    <Icon path={mdiChevronLeft} size={16} className="mr-1" />
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalLeaveEarlyPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToLeaveEarlyPage(i)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          i === currentLeaveEarlyPage
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={nextLeaveEarlyPage}
                    disabled={currentLeaveEarlyPage === totalLeaveEarlyPages - 1}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentLeaveEarlyPage === totalLeaveEarlyPages - 1
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-slate-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
                    }`}
                  >
                    Next
                    <Icon path={mdiChevronRight} size={16} className="ml-1" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsTab;