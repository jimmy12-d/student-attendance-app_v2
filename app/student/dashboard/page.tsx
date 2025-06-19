// app/student/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Firebase and Data Handling
import { db } from '../../../firebase-config';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { AttendanceRecord } from '../../dashboard/record/TableAttendance';
import { isSchoolDay } from '../../dashboard/_lib/attendanceLogic';
import { Student, PermissionRecord } from '../../_interfaces';

// Redux
import { useAppSelector } from '../../_stores/hooks';

// UI Components & Icons
import { mdiChevronRight } from '@mdi/js';
import Icon from '../../_components/Icon';
import CardBoxModal from '../../_components/CardBox/Modal';
import { PermissionRequestForm } from './_components/PermissionRequestForm';
import StudentQRCode from '../_components/StudentQRCode';

// Dynamically import StudentLayout
const StudentLayout = dynamic(
  () => import('../_components/StudentLayout'),
  { 
    ssr: false,
    loading: () => <p className="text-lg text-center p-12">Loading Portal...</p>
  }
);

const StudentDashboard = () => {
  const [isQrModalActive, setIsQrModalActive] = useState(false);
  const [isPermissionModalActive, setIsPermissionModalActive] = useState(false);

  // Get student info from Redux store
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);

  // State for student's recent activity
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent attendance records for the last 10 school days
  useEffect(() => {
    if (!studentUid) return;

    let unsubscribe: () => void;

    const fetchSchoolDayAttendance = async () => {
      setLoading(true);
      
      try {
        // 1. Fetch student to get their class
        const studentQuery = query(collection(db, "students"), where("authUid", "==", studentUid), limit(1));
        const studentSnap = await getDocs(studentQuery);
        if (studentSnap.empty) {
          setLoading(false);
          return;
        }
        const studentData = studentSnap.docs[0].data() as Student;

        // 2. Fetch all class configs to find study days
        const classesSnap = await getDocs(collection(db, "classes"));
        const classConfigs: { [key: string]: any } = {};
        classesSnap.forEach(doc => { classConfigs[doc.id] = doc.data(); });
        const studentClassConfig = studentData.class ? classConfigs[studentData.class] : null;
        const studyDays = studentClassConfig?.studyDays;

        // 3. Calculate the last 10 school days
        const schoolDays: string[] = [];
        let currentDate = new Date();
        while (schoolDays.length < 10 && schoolDays.length < 365) { // safety break
          if (isSchoolDay(currentDate, studyDays)) {
            schoolDays.push(currentDate.toISOString().split('T')[0]);
          }
          currentDate.setDate(currentDate.getDate() - 1);
        }
        
        // 4. Fetch approved permissions for the student
        const permsQuery = query(
          collection(db, "permissions"),
          where("authUid", "==", studentUid),
          where("status", "==", "approved")
        );
        const permsSnap = await getDocs(permsQuery);
        const approvedPermissions = permsSnap.docs.map(doc => doc.data() as PermissionRecord);

        const isDateInPermissionRange = (dateStr: string, perms: PermissionRecord[]) => {
          return perms.some(p => dateStr >= p.permissionStartDate && dateStr <= p.permissionEndDate);
        };

        // 5. Set up a real-time listener for attendance on those days
        if (schoolDays.length > 0) {
            const recordsQuery = query(
              collection(db, "attendance"),
              where("authUid", "==", studentUid),
              where("date", "in", schoolDays)
            );

            unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
              const fetchedRecords: { [date: string]: AttendanceRecord } = {};
              snapshot.docs.forEach(doc => {
                fetchedRecords[doc.data().date] = { ...doc.data(), id: doc.id } as AttendanceRecord;
              });

              const displayRecords = schoolDays.map(dateStr => {
                if (fetchedRecords[dateStr]) {
                  return fetchedRecords[dateStr];
                }
                if (isDateInPermissionRange(dateStr, approvedPermissions)) {
                  return { id: dateStr, date: dateStr, status: 'permission' };
                }
                return { id: dateStr, date: dateStr, status: 'absent' };
              });
              
              setRecentRecords(displayRecords);
              setLoading(false);
            });
        } else {
            setLoading(false);
        }

      } catch (error) {
        console.error("Error fetching attendance:", error);
        setLoading(false);
      }
    };

    fetchSchoolDayAttendance();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [studentUid]);

  const handlePermissionSuccess = () => {
    setIsPermissionModalActive(false);
  };
  
  const formatDate = (timestamp: Timestamp | Date | undefined | null) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp: Timestamp | Date | undefined | null) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'present':
        return { badge: 'bg-green-200 text-green-800', icon: 'bg-green-500' };
      case 'late':
        return { badge: 'bg-yellow-200 text-yellow-800 border border-yellow-300', icon: 'bg-yellow-500' };
      case 'permission':
        return { badge: 'bg-purple-200 text-purple-800', icon: 'bg-purple-500' };
      case 'absent':
        return { badge: 'bg-red-200 text-red-800', icon: 'bg-red-500' };
      default:
        return { badge: 'bg-gray-100 text-gray-800', icon: 'bg-gray-500' };
    }
  };

  return (
    <StudentLayout>
      {(userName) => (
        <>
          {/* --- Modals remain the same --- */}
          <CardBoxModal title="Your Personal QR Code" isActive={isQrModalActive} onConfirm={() => setIsQrModalActive(false)} onCancel={() => setIsQrModalActive(false)}>
              <StudentQRCode studentName={studentName || ''} studentUid={studentUid || ''} qrSize={256} />
          </CardBoxModal>
          <CardBoxModal title="Request Permission for Absence" isActive={isPermissionModalActive} onCancel={() => setIsPermissionModalActive(false)}>
            <PermissionRequestForm onSuccess={handlePermissionSuccess} />
          </CardBoxModal>
        
          {/* --- NEW UI Inspired by Cash App --- */}
          <div className="p-4 max-w-2xl mx-auto">
            
            {/* 2. Activity Feed */}
            <div className='mb-6'>
              <h2 className="text-xl font-bold mb-4">Activity</h2>
              {loading ? <p className="text-center text-gray-500">Loading activity...</p> : (
                <div className="bg-slate-900 rounded-2xl p-2">
                  <div className="max-h-[240px] overflow-y-auto pr-1">
                    {recentRecords.length > 0 ? recentRecords.map(record => {
                      const styles = getStatusStyles(record.status);
                      const statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1);
                      const dateOnRight = record.status === 'absent' || record.status === 'permission'
                        ? formatDate(new Date(record.date.replace(/-/g, '\/')))
                        : formatDate(record.timestamp);

                      let timeText: React.ReactNode = null;
                      if (record.status === 'present' || record.status === 'late') {
                        timeText = <p className="text-sm text-gray-400 mt-1">{formatTime(record.timestamp)}</p>;
                      }

                      return (
                        <div key={record.id} className="flex items-start justify-between p-3 hover:bg-slate-700 rounded-lg transition-colors">
                          <div>
                            <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles.badge}`}>
                              {statusText}
                            </span>
                            {timeText}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{dateOnRight}</p>
                          </div>
                        </div>
                      )
                    }) : <p className="text-center text-gray-500 p-6">No recent activity.</p>}
                  </div>
                </div>
              )}
            </div>
            {/* 3. Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              <button onClick={() => setIsPermissionModalActive(true)} className="relative bg-slate-900 p-4 rounded-2xl text-left hover:bg-slate-700 transition-colors h-40 flex flex-col justify-between">
                <div>
                  <Icon path={mdiChevronRight} size={24} className="absolute top-4 right-4 text-gray-500" />
                  <span className="font-semibold text-lg">Permission Form</span>
                </div>
                <div className="flex justify-center mt-1">
                  <Image src="/add-document.png" alt="Request Absence" width={100} height={100} />
                </div>
              </button>
              <button onClick={() => setIsQrModalActive(true)} className="relative bg-slate-900 p-4 rounded-2xl text-left hover:bg-slate-700 transition-colors h-40 flex flex-col justify-between">
                <div>
                  <Icon path={mdiChevronRight} size={24} className="absolute top-4 right-4 text-gray-500" />
                  <span className="font-semibold text-lg">Generate QR</span>
                </div>
                <div className="flex justify-center mt-1">
                  <Image src="/qr-code.png" alt="Scan QR" width={100} height={100} />
                </div>
              </button>
            </div>

          </div>
        </>
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;