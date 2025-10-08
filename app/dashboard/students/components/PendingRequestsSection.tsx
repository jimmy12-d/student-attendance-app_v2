"use client";

import React, { useState, useEffect } from "react";
import { mdiAccountAlert, mdiEye } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import CardBox from "../../../_components/CardBox";
import { Student } from "../../../_interfaces";
import { PermissionRecord, LeaveEarlyRequest } from "../../../_interfaces";
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
  details: {
    reason?: string;
    leaveTime?: string;
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
      details: {
        reason: req.reason,
        leaveTime: req.leaveTime,
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
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                {/* Requests Grid - 2 Column Minimal Layout */}
                <div className="grid grid-cols-2 gap-3">
                  {combinedRequests.map((request) => {
                    const student = studentsMap.get(request.studentId);

                    return (
                      <div
                        key={`${request.type}-${request.id}`}
                        className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200 flex items-start justify-between"
                      >
                        {/* Student Name and Request Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                              {student?.fullName || request.studentName}
                            </h3>
                            <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded">
                              {student?.class || request.studentClass}
                            </span>
                          </div>
                          {student?.nameKhmer && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {student.nameKhmer}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              request.type === 'permission'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {request.type === 'permission' ? 'Permission' : 'Leave Early'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {request.type === 'leaveEarly'
                                ? `Leave at: ${request.details.leaveTime || 'Unknown'}`
                                : `Duration: ${request.details.duration ? `${request.details.duration} day${request.details.duration > 1 ? 's' : ''}` : 'Unknown'}`
                              }
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatRequestDate(request.requestedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Eye Icon */}
                        {student && onViewDetails && (
                          <button
                            onClick={() => onViewDetails(student, 'requests')}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 ml-2 flex-shrink-0"
                            title="View student details and requests"
                          >
                            <Icon path={mdiEye} size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CardBox>
  );
};

export default PendingRequestsSection;