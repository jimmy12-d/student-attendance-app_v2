"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Student, PermissionRecord } from '../../_interfaces';
import { AttendanceRecord } from '../../dashboard/record/TableAttendance';
import { isSchoolDay } from '../../dashboard/_lib/attendanceLogic';
import { mdiChevronRight, mdiAccountCheckOutline, mdiClockAlertOutline, mdiAccountOffOutline } from '@mdi/js';
import Icon from '../../_components/Icon';
import { PermissionRequestForm } from '../_components/PermissionRequestForm';
import AttendanceSummaryCard from '../_components/AttendanceSummaryCard';
import AttendanceSummaryCardSkeleton from '../_components/AttendanceSummaryCardSkeleton';
import SlideInPanel from '../../_components/SlideInPanel';
import { usePrevious } from '../../_hooks/usePrevious';
import QRCodeDisplay from '../_components/QRCodeDisplay';
import { toast } from 'sonner';

const AttendancePage = () => {
  const studentUid = useAppSelector((state) => state.main.userUid);
  const studentName = useAppSelector((state) => state.main.userName);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const prevRecentRecords = usePrevious(recentRecords);
  const [loading, setLoading] = useState(true);
  const [isQrDisplayOpen, setIsQrDisplayOpen] = useState(false);
  const [isPermissionPanelOpen, setIsPermissionPanelOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [isConfirmationPanelOpen, setIsConfirmationPanelOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const handleGenerateQrClick = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaysRecord = recentRecords.find(r => r.date === today);

    if (todaysRecord && (todaysRecord.status === 'present' || todaysRecord.status === 'late')) {
      setConfirmationMessage(`Attendance already marked: ${todaysRecord.status}`);
      setIsConfirmationPanelOpen(true);
    } else {
      setIsQrDisplayOpen(true);
    }
  };

  useEffect(() => {
    if (isQrDisplayOpen && prevRecentRecords && recentRecords.length > prevRecentRecords.length) {
      const today = new Date().toISOString().split('T')[0];
      const todaysRecord = recentRecords.find(r => r.date === today && (r.status === 'present' || r.status === 'late'));
      const prevTodaysRecord = prevRecentRecords.find(r => r.date === today && (r.status === 'present' || r.status === 'late'));

      if (todaysRecord && !prevTodaysRecord) {
        setIsQrDisplayOpen(false);
        const message = `Attendance marked: ${todaysRecord.status}`;
        if (todaysRecord.status === 'late') {
          toast.warning(message);
        } else {
          toast.success(message);
        }
      }
    }
  }, [recentRecords, prevRecentRecords, isQrDisplayOpen]);

  // Fetch recent attendance records
  useEffect(() => {
    if (!studentUid) return;
    let unsubscribe: () => void;
    const fetchSchoolDayAttendance = async () => {
      setLoading(true);
      try {
        const studentQuery = query(collection(db, "students"), where("authUid", "==", studentUid), limit(1));
        const studentSnap = await getDocs(studentQuery);
        if (studentSnap.empty) { setLoading(false); return; }
        const studentData = studentSnap.docs[0].data() as Student;
        const classesSnap = await getDocs(collection(db, "classes"));
        const classConfigs: { [key: string]: any } = {};
        classesSnap.forEach(doc => { classConfigs[doc.id] = doc.data(); });
        const studentClassConfig = studentData.class ? classConfigs[studentData.class] : null;
        const studyDays = studentClassConfig?.studyDays;

        const schoolDays: string[] = [];
        let currentDate = new Date();
        while (schoolDays.length < 10) {
          if (isSchoolDay(currentDate, studyDays)) {
            schoolDays.push(currentDate.toISOString().split('T')[0]);
          }
          currentDate.setDate(currentDate.getDate() - 1);
        }
        
        const permsQuery = query(collection(db, "permissions"), where("authUid", "==", studentUid), where("status", "==", "approved"));
        const permsSnap = await getDocs(permsQuery);
        const approvedPermissions = permsSnap.docs.map(doc => doc.data() as PermissionRecord);
        const isDateInPermissionRange = (dateStr: string, perms: PermissionRecord[]) => perms.some(p => dateStr >= p.permissionStartDate && dateStr <= p.permissionEndDate);

        if (schoolDays.length > 0) {
            const recordsQuery = query(collection(db, "attendance"), where("authUid", "==", studentUid), where("date", "in", schoolDays));
            unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
              const fetchedRecords: { [date: string]: AttendanceRecord } = {};
              snapshot.docs.forEach(doc => { fetchedRecords[doc.data().date] = { ...doc.data(), id: doc.id } as AttendanceRecord; });
              const displayRecords = schoolDays.map(dateStr => {
                if (fetchedRecords[dateStr]) return fetchedRecords[dateStr];
                if (isDateInPermissionRange(dateStr, approvedPermissions)) return { id: dateStr, date: dateStr, status: 'permission' };
                return { id: dateStr, date: dateStr, status: 'absent' };
              }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentRecords(displayRecords);
              setLoading(false);
            });
        } else { setLoading(false); }
      } catch (error) { console.error("Error fetching attendance:", error); setLoading(false); }
    };
    fetchSchoolDayAttendance();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [studentUid]);

  const presentCount = recentRecords.filter(r => r.status === 'present' || r.status === 'permission').length;
  const lateCount = recentRecords.filter(r => r.status === 'late').length;
  const absentCount = recentRecords.filter(r => r.status === 'absent').length;
  const totalDays = recentRecords.length > 0 ? recentRecords.length : 10;

  const handlePermissionSuccess = () => {
    setIsPermissionPanelOpen(false);
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
        return { badge: 'bg-green-200 text-green-800' };
      case 'late':
        return { badge: 'bg-yellow-200 text-yellow-800 border border-yellow-300' };
      case 'permission':
        return { badge: 'bg-purple-200 text-purple-800' };
      case 'absent':
        return { badge: 'bg-red-200 text-red-800' };
      default:
        return { badge: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="p-6">
       <QRCodeDisplay 
        isOpen={isQrDisplayOpen}
        onClose={() => setIsQrDisplayOpen(false)}
        studentName={studentName || ''}
        studentUid={studentUid || ''}
      />

      <SlideInPanel title="Attendance QR Generation" isOpen={isConfirmationPanelOpen} onClose={() => setIsConfirmationPanelOpen(false)}>
        <div className="flex justify-center items-center h-24">
          <p className="text-gray-400">{confirmationMessage}</p>
        </div>
      </SlideInPanel>

      <SlideInPanel title="Request Permission for Absence" isOpen={isPermissionPanelOpen} onClose={() => setIsPermissionPanelOpen(false)}>
        <PermissionRequestForm onSuccess={handlePermissionSuccess} />
      </SlideInPanel>

      <SlideInPanel title="Last 10 Days Activity" isOpen={isDetailsPanelOpen} onClose={() => setIsDetailsPanelOpen(false)}>
        <div className="bg-slate-900 rounded-2xl p-2">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {recentRecords.length > 0 ? recentRecords.map(record => {
                const styles = getStatusStyles(record.status);
                const statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1);
                const dateOnRight = record.status === 'absent' || record.status === 'permission'
                  ? formatDate(new Date(record.date.replace(/-/g, '\/')))
                  : formatDate(record.timestamp);

                const timeText = (record.status === 'present' || record.status === 'late')
                  ? formatTime(record.timestamp)
                  : null;

                return (
                  <div key={record.id} className="flex items-start justify-between p-3 hover:bg-slate-700 rounded-lg transition-colors">
                    <div>
                      <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles.badge}`}>
                        {statusText}
                      </span>
                    </div>

                    <div className="text-right">
                     <p className="font-semibold">
                       {timeText && (
                           <span className="text-sm text-gray-400 mr-2 font-normal">
                             {timeText}
                           </span>
                         )}
                         {dateOnRight}
                     </p>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-gray-500 p-6">No recent activity.</p>
              )}
            </div>
          </div>
      </SlideInPanel>

      <div className="mb-6">
        <h2 className="font-bold mb-4">
          <span className="text-2xl">Summary</span> <span className="text-xl">— Last 10 Days</span>
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-2">
          {loading ? (
            <>
              <AttendanceSummaryCardSkeleton />
              <AttendanceSummaryCardSkeleton />
              <AttendanceSummaryCardSkeleton />
            </>
          ) : (
            <>
              <AttendanceSummaryCard title="Present" count={presentCount} total={totalDays} icon={mdiAccountCheckOutline} barColorClass="bg-green-700" bgColorClass="bg-green-200" />
              <AttendanceSummaryCard title="Late" count={lateCount} total={totalDays} icon={mdiClockAlertOutline} barColorClass="bg-yellow-700" bgColorClass="bg-yellow-200" />
              <AttendanceSummaryCard title="Absent" count={absentCount} total={totalDays} icon={mdiAccountOffOutline} barColorClass="bg-red-700" bgColorClass="bg-red-200" />
            </>
          )}
        </div>
        {!loading && (
          <div className="flex justify-end">
            <button 
              onClick={() => setIsDetailsPanelOpen(true)} 
              className="flex items-center text-xs font-semibold text-slate-300 hover:text-slate-50"
            >
              View Details
              <Icon path={mdiChevronRight} size={20} className="ml-1" />
            </button>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-4">Action</h2>
      <div className="grid grid-cols-2 gap-6">
        <button onClick={() => setIsPermissionPanelOpen(true)} className="relative bg-slate-900 p-4 rounded-2xl text-left hover:bg-slate-700 transition-colors h-40 flex flex-col justify-between">
          <span className="font-semibold text-lg">Permission Form</span>
          <div className="flex justify-center items-center h-24 w-24 self-center rounded-2xl">
            <Image src="/add-document.png" alt="Request Absence" width={80} height={80} />
          </div>
        </button>
        <button onClick={handleGenerateQrClick} className="relative bg-slate-900 p-4 rounded-2xl text-left hover:bg-slate-700 transition-colors h-40 flex flex-col justify-between">
          <span className="font-semibold text-lg">Generate QR</span>
          <div className="flex justify-center items-center h-24 w-24 self-center rounded-2xl">
            <Image src="/qr-code.png" alt="Scan QR" width={80} height={80} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default AttendancePage; 