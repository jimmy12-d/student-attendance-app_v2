// app/dashboard/permissions/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { mdiFileDocumentCheckOutline, mdiMagnify } from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import PermissionCard from "./PermissionCard";
import { db } from "../../../firebase-config";
import { collection, getDocs, query, orderBy, doc, updateDoc, CollectionReference, DocumentData } from "firebase/firestore";
import { PermissionRecord, Student } from "../../_interfaces"; // Import Student
import NotificationBar from "../../_components/NotificationBar";
import Icon from "../../_components/Icon";
// ... (import AddPermissionForm if you have it)

// Create an "enriched" type for the data that will be passed to the cards
export interface EnrichedPermissionRecord extends PermissionRecord {
  class?: string;
  shift?: string;
}

export default function ManagePermissionsPage() {
  const [permissions, setPermissions] = useState<EnrichedPermissionRecord[]>([]); // Use the enriched type
  const [filteredPermissions, setFilteredPermissions] = useState<EnrichedPermissionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permissionsCol = collection(db, "permissions") as CollectionReference<DocumentData>;
      const studentsCol = collection(db, "students") as CollectionReference<DocumentData>;

      // Fetch both permissions and students concurrently
      const permissionsQuery = query(permissionsCol, orderBy("requestedAt", "desc"));
      const [permissionsSnapshot, studentsSnapshot] = await Promise.all([
        getDocs(permissionsQuery),
        getDocs(studentsCol)
      ]);

      // Create a map of students for easy lookup
      const studentsMap = new Map<string, Student>();
      studentsSnapshot.docs.forEach(docSnap => {
        studentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Student);
      });

      // Map permission records and "join" them with student data
      const enrichedPerms = permissionsSnapshot.docs.map(docSnap => {
        const perm = { id: docSnap.id, ...docSnap.data() } as PermissionRecord;
        const student = studentsMap.get(perm.studentId);
        
        return {
          ...perm,
          class: student?.class || perm.studentClass || 'N/A', // Use from student first, then fallback to permission record
          shift: student?.shift || perm.studentShift || 'N/A', // Use from student first, then fallback to permission record
        };
      });

      setPermissions(enrichedPerms);
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError("Permission Denied. Check Firestore security rules for 'permissions' and 'students' collections.");
      } else {
        setError("Failed to fetch permission requests.");
      }
    }
    setLoading(false);
  }, []);

  // Filter and sort permissions based on search query, status, and sort option
  useEffect(() => {
    let filtered = permissions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(permission => permission.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(permission => 
        permission.studentName.toLowerCase().includes(searchLower) ||
        (permission.class && permission.class.toLowerCase().includes(searchLower)) ||
        (permission.shift && permission.shift.toLowerCase().includes(searchLower)) ||
        permission.reason.toLowerCase().includes(searchLower) ||
        (permission.details && permission.details.toLowerCase().includes(searchLower))
      );
    }

    // Sort permissions
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.requestedAt.toMillis() - a.requestedAt.toMillis();
        case 'oldest':
          return a.requestedAt.toMillis() - b.requestedAt.toMillis();
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'status':
          // Sort by status priority: pending > approved > rejected
          const statusOrder = { pending: 0, approved: 1, rejected: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });

    setFilteredPermissions(sorted);
  }, [permissions, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

    const handleUpdateRequest = async (permissionId: string, newStatus: 'approved' | 'rejected') => {
      setFeedback(null);
      try {
        const permRef = doc(db, "permissions", permissionId);
        await updateDoc(permRef, {
          status: newStatus,
          reviewedAt: new Date(), // Use JS Date, Firestore will convert to timestamp if field is timestamp type
          // reviewedBy: auth.currentUser?.email // If you have auth state available
        });
        setFeedback(`Request has been ${newStatus}.`);
        fetchPermissions(); // Refresh the list
      } catch (err) {
        console.error(err);
        setError("Failed to update request status.");
      }
      setTimeout(() => setFeedback(null), 3000);
    };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiFileDocumentCheckOutline}
        title="Manage Permission Requests"
        main
      >
        {/* ... "Add Permission" button ... */}
      </SectionTitleLineWithButton>

      {error && <NotificationBar color="danger" className="mb-4">{error}</NotificationBar>}
      {feedback && <NotificationBar color="success" className="mb-4">{feedback}</NotificationBar>}
      
      {/* Search and Filter Controls */}
      <div className="mb-6 bg-white dark:bg-slate-900/70 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon path={mdiMagnify} size={20} className="text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search by student name, class, reason, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Student Name</option>
              <option value="status">Status Priority</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          Showing {filteredPermissions.length} of {permissions.length} requests
          {searchQuery && ` matching "${searchQuery}"`}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
          {sortBy !== 'newest' && ` (sorted by ${sortBy.replace('_', ' ')})`}
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-slate-400">Loading requests...</p>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-slate-400">
            {permissions.length === 0 
              ? "No permission requests found." 
              : "No requests match your current filters."}
          </p>
          {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter('all');
                setSortBy('newest');
              }}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredPermissions.map((permission) => (
            <PermissionCard
              key={permission.id}
              permission={permission}
              onUpdateRequest={handleUpdateRequest}
            />
          ))}
        </div>
      )}
    </SectionMain>
  );
}