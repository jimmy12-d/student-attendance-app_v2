"use client";

import React, { useState, useEffect } from "react";
import { mdiAccountAlert, mdiEye, mdiCheckCircle, mdiCloseCircle, mdiMinusCircle, mdiBellRing, mdiBellCheck, mdiBellCancel } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import CardBox from "../../../_components/CardBox";
import { Student } from "../../../_interfaces";
import { PermissionRecord, LeaveEarlyRequest, NotificationLog } from "../../../_interfaces";
import { Timestamp } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

interface PendingRequestsSectionProps {
  students: Student[];
  showPendingRequests: boolean;
  onToggleShow: () => void;
  onViewDetails?: (student: Student, defaultTab?: 'basic' | 'actions' | 'requests') => void;
}

// Combined request type for easier handling
interface CombinedRequest {
  id: string;
  type: 'permission' | 'leaveEarly';
  studentId: string;
  studentName: string;
  studentClass: string;
  studentShift: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  notificationLogs?: NotificationLog[]; // Notification delivery logs
  details: {
    reason?: string;
    leaveTime?: string;
    date?: string; // For leave early requests
    permissionStartDate?: string;
    permissionEndDate?: string;
    duration?: number;
  };
}

// Helper function to calculate time ago
const getTimeAgo = (date: Date | string | Timestamp | undefined): string => {
  if (!date) return "Unknown";

  const now = new Date();
  let requestDate: Date;

  if (date instanceof Timestamp) {
    requestDate = date.toDate();
  } else if (typeof date === 'string') {
    requestDate = new Date(date);
  } else if (date instanceof Date) {
    requestDate = date;
  } else {
    return "Unknown";
  }

  const diffInMs = now.getTime() - requestDate.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return "Just now";
};

// Helper function to calculate duration between two dates
const calculateDuration = (startDate: string | undefined, endDate: string | undefined): string => {
  if (!startDate || !endDate) return "Unknown";

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Unknown";

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
};

// Helper function to format request date
const formatRequestDate = (date: Timestamp | undefined): string => {
  if (!date) return "Unknown";
  const requestDate = date.toDate();
  return requestDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format notification time
const formatNotificationTime = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return "Unknown";
  const date = timestamp.toDate();
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Component to display notification delivery status
const NotificationStatus: React.FC<{ logs?: NotificationLog[] }> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Icon path={mdiMinusCircle} size={16} />
        <span>No parent registered for notifications</span>
      </div>
    );
  }

  const successCount = logs.filter(log => log.success).length;
  const failedCount = logs.length - successCount;
  const allSuccess = successCount === logs.length;
  const allFailed = failedCount === logs.length;

  return (
    <div className="space-y-1">
      {/* Summary */}
      <div className={`flex items-center gap-1 text-xs font-medium ${
        allSuccess 
          ? 'text-green-600 dark:text-green-400' 
          : allFailed 
          ? 'text-red-600 dark:text-red-400'
          : 'text-orange-600 dark:text-orange-400'
      }`}>
        <Icon 
          path={allSuccess ? mdiCheckCircle : allFailed ? mdiCloseCircle : mdiBellRing} 
          size={16} 
        />
        <span>
          {allSuccess 
            ? `✓ Sent to ${successCount} parent${successCount > 1 ? 's' : ''}` 
            : allFailed
            ? `✗ Failed to send to ${failedCount} parent${failedCount > 1 ? 's' : ''}`
            : `${successCount} sent, ${failedCount} failed`
          }
        </span>
      </div>

      {/* Detailed logs - expandable */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          View details
        </summary>
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2 ${
                log.success 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              <Icon 
                path={log.success ? mdiCheckCircle : mdiCloseCircle} 
                size={16} 
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {log.success ? '✓ Delivered' : '✗ Failed'}
                  {log.parentName && log.parentName !== 'Unknown' && (
                    <span className="font-normal"> to {log.parentName}</span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {formatNotificationTime(log.sentAt)}
                </div>
                {log.errorMessage && (
                  <div className="text-red-500 dark:text-red-400 text-xs">
                    Error: {log.errorMessage}
                  </div>
                )}
                {log.deactivated && (
                  <div className="text-orange-500 dark:text-orange-400 text-xs">
                    ⚠ Parent notification deactivated (bot blocked)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

const PendingRequestsSection: React.FC<PendingRequestsSectionProps> = ({
  students,
  showPendingRequests,
  onToggleShow,
  onViewDetails,
}) => {
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRecord[]>([]);
  const [pendingLeaveEarlyRequests, setPendingLeaveEarlyRequests] = useState<LeaveEarlyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Create students map for quick lookup
  const studentsMap = new Map<string, Student>();
  students.forEach(student => {
    studentsMap.set(student.id, student);
  });

  // Fetch pending permissions
  useEffect(() => {
    const permissionsQuery = query(
      collection(db, "permissions"),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc")
    );

    const unsubscribePermissions = onSnapshot(permissionsQuery,
      (snapshot) => {
        const permissions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PermissionRecord[];
        setPendingPermissions(permissions);
      },
      (error) => {
        console.error("Error fetching pending permissions:", error);
        setPendingPermissions([]);
      }
    );

    return () => unsubscribePermissions();
  }, []);

  // Fetch pending leave early requests
  useEffect(() => {
    const leaveEarlyQuery = query(
      collection(db, "leaveEarlyRequests"),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc")
    );

    const unsubscribeLeaveEarly = onSnapshot(leaveEarlyQuery,
      (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LeaveEarlyRequest[];
        setPendingLeaveEarlyRequests(requests);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching pending leave early requests:", error);
        setPendingLeaveEarlyRequests([]);
        setLoading(false);
      }
    );

    return () => unsubscribeLeaveEarly();
  }, []);

  // Combine and filter requests for active students only
  const combinedRequests: CombinedRequest[] = [
    ...pendingPermissions.map(perm => ({
      id: perm.id,
      type: 'permission' as const,
      studentId: perm.studentId,
      studentName: perm.studentName || 'Unknown Student',
      studentClass: perm.studentClass || 'Unknown Class',
      studentShift: perm.studentShift || 'Unknown Shift',
      status: perm.status,
      requestedAt: perm.requestedAt,
      notificationLogs: perm.notificationLogs,
      details: {
        reason: perm.reason,
        permissionStartDate: perm.permissionStartDate,
        permissionEndDate: perm.permissionEndDate,
        duration: perm.duration,
      }
    })),
    ...pendingLeaveEarlyRequests.map(req => ({
      id: req.id,
      type: 'leaveEarly' as const,
      studentId: req.studentId,
      studentName: req.studentName || 'Unknown Student',
      studentClass: req.studentClass || 'Unknown Class',
      studentShift: req.studentShift || 'Unknown Shift',
      status: req.status,
      requestedAt: req.requestedAt,
      notificationLogs: req.notificationLogs,
      details: {
        reason: req.reason,
        leaveTime: req.leaveTime,
        date: req.date,
      }
    }))
  ].filter(request => studentsMap.has(request.studentId)); // Only show requests from active students

  if (combinedRequests.length === 0 && !loading) {
    return null;
  }

  return (
    <CardBox className="mb-6 border-l-4 border-l-orange-400">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Icon
                path={mdiAccountAlert}
                size={20}
                className="text-orange-600 dark:text-orange-400"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-orange-700 dark:text-orange-400">
                Pending Requests
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {loading ? 'Loading pending requests...' : 'Requests awaiting review'}
                </span>
                {!loading && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${
                    combinedRequests.length === 0
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                      : combinedRequests.length < 3
                      ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'
                      : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 animate-pulse'
                  }`}>
                    <span className="mr-1">⚠️</span>
                    {combinedRequests.length}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={onToggleShow}
            label={showPendingRequests ? "Hide" : "Show"}
            color="warning"
            small
            outline
          />
        </div>

        {/* Collapsible Content */}
        {showPendingRequests && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading pending requests...</span>
              </div>
            ) : (
              <>
                {/* SAMS Log Summary for Pending Requests */}
                {!loading && combinedRequests.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50/80 via-blue-100/60 to-indigo-100/40 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/30 rounded-lg p-4 backdrop-blur-md shadow-lg shadow-blue-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 backdrop-blur-sm rounded-lg border shadow-md flex items-center justify-center bg-gradient-to-br from-blue-100/90 to-blue-200/70 dark:from-blue-800/50 dark:to-blue-700/30 border-blue-300/50 dark:border-blue-600/30 shadow-blue-500/10">
                          <Icon path={(() => {
                            const totalLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.length || 0), 0);
                            const successLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.filter(log => log.success).length || 0), 0);
                            return successLogs === totalLogs && totalLogs > 0 ? mdiBellCheck : mdiBellCancel;
                          })()} size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-blue-800 dark:text-blue-200">SAMS Pending Requests Notifications</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          (() => {
                            const totalLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.length || 0), 0);
                            const successLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.filter(log => log.success).length || 0), 0);
                            return successLogs === totalLogs && totalLogs > 0 ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200';
                          })()
                        }`}>
                          {(() => {
                            const totalLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.length || 0), 0);
                            const successLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.filter(log => log.success).length || 0), 0);
                            return `${successLogs} / ${totalLogs}`;
                          })()}
                        </div>
                        <div className={`text-xs ${
                          (() => {
                            const totalLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.length || 0), 0);
                            const successLogs = combinedRequests.reduce((sum, req) => sum + (req.notificationLogs?.filter(log => log.success).length || 0), 0);
                            return successLogs === totalLogs && totalLogs > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400';
                          })()
                        }`}>sent / total</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Requests Grid - 2 Column Layout with Notification Logs */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="grid grid-cols-2 gap-3">
                  {combinedRequests.map((request) => {
                    const student = studentsMap.get(request.studentId);

                    return (
                      <div
                        key={`${request.type}-${request.id}`}
                        className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200 flex flex-col relative"
                      >
                        {/* Request Type Badge - Top Right */}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            request.type === 'permission'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                            {request.type === 'permission' ? 'Permission' : 'Leave Early'}
                          </span>
                        </div>

                        {/* Header Row */}
                        <div className="flex items-start justify-between">
                          {/* Student Name and Request Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                                {student?.fullName || request.studentName}
                              </h3>
                              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded flex-shrink-0">
                                {student?.class || request.studentClass}
                              </span>
                            </div>
                            {student?.nameKhmer && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {student.nameKhmer}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {request.type === 'leaveEarly'
                                  ? (() => {
                                      const leaveDate = request.details.date ? new Date(request.details.date) : null;
                                      const timeStr = request.details.leaveTime || 'Unknown';
                                      if (leaveDate) {
                                        return `${leaveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
                                      }
                                      return timeStr;
                                    })()
                                  : (() => {
                                      // Check if permission dates are the same day
                                      if (request.details.permissionStartDate && request.details.permissionEndDate) {
                                        const start = new Date(request.details.permissionStartDate);
                                        const end = new Date(request.details.permissionEndDate);
                                        const isSameDay = start.toDateString() === end.toDateString();
                                        
                                        if (isSameDay) {
                                          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (1 day)`;
                                        } else {
                                          // Multi-day permission: show date range with duration
                                          const duration = request.details.duration || 1;
                                          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${duration} day${duration > 1 ? 's' : ''})`;
                                        }
                                      }
                                      return request.details.duration ? `${request.details.duration} day${request.details.duration > 1 ? 's' : ''}` : 'N/A';
                                    })()
                                }
                              </span>
                            </div>
                          </div>

                          {/* Eye Icon */}
                          {student && onViewDetails && (
                            <button
                              onClick={() => onViewDetails(student, 'requests')}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 ml-2 flex-shrink-0 mt-8"
                              title="View student details and requests"
                            >
                              <Icon path={mdiEye} size={16} />
                            </button>
                          )}
                        </div>

                        {/* Notification Status Row */}
                        <div className="pt-2 mt-auto border-t border-gray-200 dark:border-gray-600">
                          <NotificationStatus logs={request.notificationLogs} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </CardBox>
  );
};

export default PendingRequestsSection;