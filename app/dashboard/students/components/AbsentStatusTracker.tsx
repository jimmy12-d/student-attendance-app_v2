import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { db } from '../../../../firebase-config';
import { doc, updateDoc, addDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { AbsentStatus, AbsentFollowUp } from '../../../_interfaces';

// Export the types for use in other components
export type { AbsentStatus, AbsentFollowUp };

interface AbsentStatusTrackerProps {
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  currentStatus?: AbsentStatus;
  onStatusUpdate?: (newStatus: AbsentStatus) => void;
  isReadOnly?: boolean;
}

const statusOptions: AbsentStatus[] = ['Absent', 'Contacted', 'Waiting for Response', 'Resolved'];

const getStatusColor = (status: AbsentStatus): string => {
  switch (status) {
    case 'Absent':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'Contacted':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'Waiting for Response':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'Resolved':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const getStatusIcon = (status: AbsentStatus): string => {
  switch (status) {
    case 'Absent':
      return 'M6 18L18 6M6 6l12 12'; // X icon
    case 'Contacted':
      return 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'; // Phone icon
    case 'Waiting for Response':
      return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock icon
    case 'Resolved':
      return 'M5 13l4 4L19 7'; // Check icon
    default:
      return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Question icon
  }
};

export const AbsentStatusTracker: React.FC<AbsentStatusTrackerProps> = ({
  studentId,
  studentName,
  date,
  currentStatus = 'Absent',
  onStatusUpdate,
  isReadOnly = false
}) => {
  const [status, setStatus] = useState<AbsentStatus>(currentStatus);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load existing follow-up record if it exists
  useEffect(() => {
    const loadExistingRecord = async () => {
      try {
        const q = query(
          collection(db, 'absentFollowUps'),
          where('studentId', '==', studentId),
          where('date', '==', date),
          orderBy('updatedAt', 'desc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const record = querySnapshot.docs[0].data() as AbsentFollowUp;
          setStatus(record.status);
        }
      } catch (error) {
        console.error('Error loading absent follow-up record:', error);
      }
    };

    loadExistingRecord();
  }, [studentId, date]);



  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const updateStatus = async (newStatus: AbsentStatus) => {
    if (isReadOnly || isUpdating) return;

    setIsUpdating(true);
    try {
      const followUpData: Omit<AbsentFollowUp, 'id'> = {
        studentId,
        studentName,
        date,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: 'Admin' // You can replace this with actual admin identifier
      };

      // Check if record exists, update or create
      const q = query(
        collection(db, 'absentFollowUps'),
        where('studentId', '==', studentId),
        where('date', '==', date),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing record
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(existingDoc.ref, {
          status: newStatus,
          updatedAt: new Date(),
          updatedBy: 'Admin'
        });
      } else {
        // Create new record
        await addDoc(collection(db, 'absentFollowUps'), followUpData);
      }

      setStatus(newStatus);
      
      toast.success(`Updated ${studentName}'s absence status to "${newStatus}"`);
      
      if (onStatusUpdate) {
        onStatusUpdate(newStatus);
      }
      
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error updating absent status:', error);
      toast.error('Failed to update absence status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: AbsentStatus) => {
    updateStatus(newStatus);
  };

  if (isReadOnly) {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getStatusIcon(status)} />
        </svg>
        {status}
      </span>
    );
  }

  return (
    <div className="relative">
      {/* Status Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:opacity-80 ${getStatusColor(status)} ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        title="Click to update absence status"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getStatusIcon(status)} />
        </svg>
        {status}
        {!isUpdating && (
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {isUpdating && (
          <div className="w-3 h-3 ml-1 animate-spin rounded-full border border-current border-t-transparent"></div>
        )}
      </button>


      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          <div className="fixed inset-0 z-[1000]" onClick={() => setIsDropdownOpen(false)}></div>
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-2xl z-[99999]"
          >
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleStatusChange(option)}
                  disabled={isUpdating}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center ${
                    option === status ? 'bg-gray-50 dark:bg-slate-700' : ''
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getStatusIcon(option)} />
                  </svg>
                  <span className="text-gray-900 dark:text-gray-100">{option}</span>
                  {option === status && (
                    <svg className="w-4 h-4 ml-auto text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
