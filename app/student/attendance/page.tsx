"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, Timestamp, addDoc, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { Student, PermissionRecord } from '../../_interfaces';
import { AttendanceRecord } from '../../dashboard/record/TableAttendance';
import { isSchoolDay } from '../../dashboard/_lib/attendanceLogic';
import { mdiChevronRight, mdiAccountCheckOutline, mdiClockAlertOutline, mdiAccountOffOutline, mdiClockTimeThreeOutline, mdiFaceRecognition, mdiFileDocumentEditOutline } from '@mdi/js';
import Icon from '../../_components/Icon';
import { PermissionRequestForm } from '../_components/PermissionRequestForm';
import SlideInPanel from '../../_components/SlideInPanel';
import { usePrevious } from '../../_hooks/usePrevious';
import { toast } from 'sonner';
import OngoingPermissions from '../_components/OngoingPermissions';
import AttendanceSummaryCardSkeleton from '../_components/AttendanceSummaryCardSkeleton';
import Button from '../../_components/Button';

const AttendancePage = () => {
  const { studentUid, studentName, studentDocId } = useAppSelector((state) => ({
    studentUid: state.main.userUid,
    studentName: state.main.userName,
    studentDocId: state.main.studentDocId,
  }));
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const prevRecentRecords = usePrevious(recentRecords);
  const [loading, setLoading] = useState(true);
  const [isPermissionPanelOpen, setIsPermissionPanelOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [ongoingPermissions, setOngoingPermissions] = useState<PermissionRecord[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [isRequestConfirmOpen, setIsRequestConfirmOpen] = useState(false);


  // Ripple effect hook
  const useRipple = () => {
    const createRipple = (event: React.MouseEvent<HTMLDivElement>, color: string = 'rgba(255, 255, 255, 0.6)') => {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 600ms linear;
        background-color: ${color};
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
      `;
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    };
    return createRipple;
  };

  const createRipple = useRipple();

  const handleRequestAttendance = async () => {
    if (!studentData || !studentUid || !studentDocId) {
      toast.error("Student information not loaded yet. Please try again in a moment.");
      return;
    }

    if (todayRecord) {
      if (['present', 'late', 'permission'].includes(todayRecord.status)) {
        toast.info(`Attendance already marked as ${todayRecord.status}.`);
        return;
      }
      if (todayRecord.status === 'pending') {
        toast.info("Your attendance request is already pending approval.");
        return;
      }
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newRecordData = {
        authUid: studentUid,
        studentName: studentData.fullName,
        studentId: studentDocId,
        class: studentData.class,
        shift: studentData.shift || null,
        date: today,
        status: 'pending',
        timestamp: serverTimestamp(),
        requestedAt: serverTimestamp(),
      };

      const attendanceQuery = query(collection(db, "attendance"), where("authUid", "==", studentUid), where("date", "==", today), limit(1));
      const attendanceSnap = await getDocs(attendanceQuery);

      if (!attendanceSnap.empty) {
        const docRef = attendanceSnap.docs[0].ref;
        await updateDoc(docRef, { status: 'pending', requestedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "attendance"), newRecordData);
      }

      toast.success("Attendance request sent! You will be notified upon approval.");
      setIsRequestConfirmOpen(false); // Close confirmation panel on success
    } catch (error) {
      console.error("Error sending attendance request: ", error);
      toast.error("Failed to send request. Please try again.");
    }
  };

  useEffect(() => {
    if (!studentUid) return;
    let unsubscribe: () => void;
    const fetchSchoolDayAttendance = async () => {
      setLoading(true);
      try {
        const studentQuery = query(collection(db, "students"), where("authUid", "==", studentUid), limit(1));
        const studentSnap = await getDocs(studentQuery);
        if (studentSnap.empty) { setLoading(false); return; }
        
        const studentDataFromDb = studentSnap.docs[0].data() as Student;
        setStudentData(studentDataFromDb);

        const classesSnap = await getDocs(collection(db, "classes"));
        const classConfigs: { [key: string]: any } = {};
        classesSnap.forEach(doc => { classConfigs[doc.id] = doc.data(); });
        const studentClassConfig = studentDataFromDb.class ? classConfigs[studentDataFromDb.class] : null;
        const studyDays = studentClassConfig?.studyDays;

         const schoolDays: string[] = [];
         let currentDate = new Date();
         while (schoolDays.length < 10) {
           if (isSchoolDay(currentDate, studyDays)) {
             schoolDays.push(currentDate.toISOString().split('T')[0]);
           }
           currentDate.setDate(currentDate.getDate() - 1);
         }
         
         const permsQuery = query(collection(db, "attendance"), where("authUid", "==", studentUid), where("date", "in", schoolDays));
         unsubscribe = onSnapshot(permsQuery, (snapshot) => {
           const fetchedRecords: { [date: string]: AttendanceRecord } = {};
           snapshot.docs.forEach(doc => { fetchedRecords[doc.data().date] = { ...doc.data(), id: doc.id } as AttendanceRecord; });
           const displayRecords = schoolDays.map(dateStr => {
             if (fetchedRecords[dateStr]) return fetchedRecords[dateStr];
             return { id: dateStr, date: dateStr, status: 'absent' };
           }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           setRecentRecords(displayRecords);
           
           // Set today's record
           const today = new Date().toISOString().split('T')[0];
           const todaysRecord = fetchedRecords[today] || { id: today, date: today, status: 'absent' };
           setTodayRecord(todaysRecord);
           
           setLoading(false);
         });
       } catch (error) { console.error("Error fetching attendance:", error); setLoading(false); }
     };
     fetchSchoolDayAttendance();
     return () => { if (unsubscribe) unsubscribe(); };
   }, [studentUid]);
  
   // Fetch permission history for the current student (last 30 days)
   useEffect(() => {
    if (!studentUid) {
      setLoadingPermissions(false);
      return;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const permsQuery = query(
      collection(db, "permissions"),
      where("authUid", "==", studentUid),
      where("requestDate", ">=", thirtyDaysAgo),
      orderBy("requestDate", "desc")
    );

    const unsubscribe = onSnapshot(permsQuery, (snapshot) => {
      const allStudentPermissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionRecord));
      setOngoingPermissions(allStudentPermissions);
      setLoadingPermissions(false);
    }, (error) => {
      console.error("Error fetching permissions:", error);
      setLoadingPermissions(false);
    });

    return () => unsubscribe();
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
         return { 
           badge: 'bg-green-200 text-green-800',
           cardBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
           icon: mdiAccountCheckOutline,
           textColor: 'text-white'
         };
       case 'late':
         return { 
           badge: 'bg-yellow-200 text-yellow-800 border border-yellow-300',
           cardBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
           icon: mdiClockAlertOutline,
           textColor: 'text-white'
         };
       case 'permission':
         return { 
           badge: 'bg-purple-200 text-purple-800',
           cardBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
           icon: mdiAccountCheckOutline,
           textColor: 'text-white'
         };
       case 'pending':
         return {
           badge: 'bg-blue-200 text-blue-800',
           cardBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
           icon: mdiClockTimeThreeOutline,
           textColor: 'text-white'
         };
       case 'absent':
         return { 
           badge: 'bg-red-200 text-red-800',
           cardBg: 'bg-gradient-to-br from-red-500 to-rose-600',
           icon: mdiAccountOffOutline,
           textColor: 'text-white'
         };
       default:
         return { 
           badge: 'bg-gray-100 text-gray-800',
           cardBg: 'bg-gradient-to-br from-gray-500 to-slate-600',
           icon: mdiAccountOffOutline,
           textColor: 'text-white'
         };
     }
   };

   const getTodayGreeting = () => {
     const hour = new Date().getHours();
     if (hour < 12) return "Good Morning";
     if (hour < 17) return "Good Afternoon";
     return "Good Evening";
   };

     return (
     <>
       <style jsx>{`
         @keyframes ripple {
           to {
             transform: scale(4);
             opacity: 0;
           }
         }
       `}</style>

      <SlideInPanel title="Confirm Attendance Request" isOpen={isRequestConfirmOpen} onClose={() => setIsRequestConfirmOpen(false)}>
        <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-8">
                You are about to request manual attendance marking. This should only be used if face recognition has failed. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end space-x-3">
                <Button onClick={() => setIsRequestConfirmOpen(false)} color="whiteDark">Cancel</Button>
                <Button onClick={handleRequestAttendance} color="success">Confirm Request</Button>
            </div>
        </div>
      </SlideInPanel>

       <SlideInPanel title="Request Permission for Absence" isOpen={isPermissionPanelOpen} onClose={() => setIsPermissionPanelOpen(false)}>
         <PermissionRequestForm onSuccess={handlePermissionSuccess} />
       </SlideInPanel>

       <SlideInPanel title="Last 10 Days Activity" isOpen={isDetailsPanelOpen} onClose={() => setIsDetailsPanelOpen(false)}>
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl">
             <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
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
                 <div key={record.id} className="flex items-center justify-between p-4 mb-3 bg-gray-50 dark:bg-slate-800 rounded-xl hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-slate-700">
                   <div className="flex items-center space-x-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.cardBg}`}>
                       <Icon path={styles.icon} size={20} className="text-white" />
                     </div>
                     <div>
                       <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles.badge}`}>
                         {statusText}
                       </span>
                     </div>
                   </div>

                   <div className="text-right">
                     <p className="font-semibold text-gray-900 dark:text-white">
                       {timeText && (
                         <span className="text-sm text-gray-500 dark:text-gray-400 mr-2 font-normal">
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

       <div className="space-y-6">
          {/* Header with Date */}
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

           {/* Today's Status Card */}
           {loading ? (
             <div className="animate-pulse bg-gray-200 dark:bg-slate-700 h-32 rounded-2xl"></div>
           ) : (
             <div className="relative overflow-hidden">
               {todayRecord && (
                 <div className={`${getStatusStyles(todayRecord.status).cardBg} rounded-2xl p-6 shadow-xl`}>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                         <Icon path={getStatusStyles(todayRecord.status).icon} size={24} className="text-white" />
                       </div>
                       <div>
                         <h3 className="text-white text-lg font-semibold">Today's Status</h3>
                         <p className="text-white/80 text-sm">
                           {todayRecord.status.charAt(0).toUpperCase() + todayRecord.status.slice(1)}
                           {todayRecord.timestamp && (
                             <span className="ml-2">at {formatTime(todayRecord.timestamp)}</span>
                           )}
                         </p>
                       </div>
                     </div>
                     <div className="text-white/80">
                       <Icon path={mdiChevronRight} size={24} />
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* Quick Actions */}
           <div className="space-y-5 px-1">
             <div className="flex items-center space-x-3 px-2">
               <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                 <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
               </div>
               <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                 Quick Actions
               </h2>
             </div>
             
             {/* Mobile-optimized Action Cards */}
             <div className="space-y-4">
               {/* Request Attendance Card - Mobile First */}
               <div className="group relative overflow-hidden touch-manipulation">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-all duration-200"></div>
                 <button 
                   onClick={() => setIsRequestConfirmOpen(true)}
                   disabled={['present', 'late', 'permission', 'pending'].includes(todayRecord?.status)}
                   className="relative w-full bg-white dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-100/80 dark:border-slate-700/80 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 min-h-[120px] flex items-center"
                   style={{ WebkitTapHighlightColor: 'transparent' }}
                 >
                   <div className="flex items-center w-full space-x-4">
                     {/* Icon Section */}
                     <div className="relative flex-shrink-0">
                       <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                         <Icon path={mdiFaceRecognition} size={40} className="text-white relative z-10" />
                       </div>
                       {/* Status Dot */}
                       <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                         <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                       </div>
                     </div>
                     
                     {/* Content Section */}
                     <div className="text-left flex-1 min-w-0">
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
                         Request Attendance
                       </h3>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                         Use when face scanning is unavailable
                       </p>
                       <div className="flex items-center space-x-2">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                         <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                           Instant processing
                         </span>
                       </div>
                     </div>
                     
                     {/* Arrow */}
                     <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                       <Icon path={mdiChevronRight} size={28} />
                     </div>
                   </div>
                 </button>
               </div>

               {/* Request Permission Card - Mobile First */}
               <div className="group relative overflow-hidden touch-manipulation">
                 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-all duration-200"></div>
                 <button 
                   onClick={() => setIsPermissionPanelOpen(true)}
                   className="relative w-full bg-white dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-100/80 dark:border-slate-700/80 active:scale-[0.98] transition-all duration-200 min-h-[120px] flex items-center"
                   style={{ WebkitTapHighlightColor: 'transparent' }}
                 >
                   <div className="flex items-center w-full space-x-4">
                     {/* Icon Section */}
                     <div className="relative flex-shrink-0">
                       <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                         <Icon path={mdiFileDocumentEditOutline} size={38} className="text-white relative z-10" />
                       </div>
                       {/* Status Dot */}
                       <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                         <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                       </div>
                     </div>
                     
                     {/* Content Section */}
                     <div className="text-left flex-1 min-w-0">
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
                         Request Permission
                       </h3>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                         For planned absences or emergencies
                       </p>
                       <div className="flex items-center space-x-2">
                         <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                         <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                           Requires approval
                         </span>
                       </div>
                     </div>
                     
                     {/* Arrow */}
                     <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                       <Icon path={mdiChevronRight} size={28} />
                     </div>
                   </div>
                 </button>
               </div>
             </div>

             {/* Mobile-optimized Status Indicator */}
             {todayRecord && ['present', 'late', 'permission', 'pending'].includes(todayRecord.status) && (
               <div className="mx-2 mt-4">
                 <div className="flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 px-4 py-3.5 rounded-2xl border border-green-200/50 dark:border-green-700/30">
                   <div className="flex items-center space-x-3">
                     <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium text-green-700 dark:text-green-300">
                       ✓ Attendance recorded for today
                     </span>
                   </div>
                 </div>
               </div>
             )}
           </div>

           {/* Summary Stats */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Last 10 Days Summary</h2>
               <button 
                 onClick={() => setIsDetailsPanelOpen(true)} 
                 className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
               >
                 View Details
                 <Icon path={mdiChevronRight} size={16} className="ml-1" />
               </button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {loading ? (
                 <>
                   <AttendanceSummaryCardSkeleton />
                   <AttendanceSummaryCardSkeleton />
                   <AttendanceSummaryCardSkeleton />
                 </>
               ) : (
                 <>
                   <div 
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-95"
                     onClick={(e) => createRipple(e, 'rgba(34, 197, 94, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-3">
                       <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiAccountCheckOutline} size={20} className="text-green-600 dark:text-green-400" />
                       </div>
                       <span className="text-2xl font-bold text-gray-900 dark:text-white">{presentCount}</span>
                     </div>
                     <h3 className="font-medium text-gray-900 dark:text-white">Present</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                       <div 
                         className="bg-green-500 h-2 rounded-full transition-all duration-500"
                         style={{ width: `${(presentCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>

                   <div 
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-95"
                     onClick={(e) => createRipple(e, 'rgba(234, 179, 8, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-3">
                       <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiClockAlertOutline} size={20} className="text-yellow-600 dark:text-yellow-400" />
                       </div>
                       <span className="text-2xl font-bold text-gray-900 dark:text-white">{lateCount}</span>
                     </div>
                     <h3 className="font-medium text-gray-900 dark:text-white">Late</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                       <div 
                         className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                         style={{ width: `${(lateCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>

                   <div 
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-95"
                     onClick={(e) => createRipple(e, 'rgba(239, 68, 68, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-3">
                       <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiAccountOffOutline} size={20} className="text-red-600 dark:text-red-400" />
                       </div>
                       <span className="text-2xl font-bold text-gray-900 dark:text-white">{absentCount}</span>
                     </div>
                     <h3 className="font-medium text-gray-900 dark:text-white">Absent</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                       <div 
                         className="bg-red-500 h-2 rounded-full transition-all duration-500"
                         style={{ width: `${(absentCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>
                 </>
               )}
             </div>
           </div>

           {/* Permissions History */}
           <div className="space-y-4">
             <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Permissions</h2>
             <div className="overflow-hidden">
               <OngoingPermissions permissions={ongoingPermissions} isLoading={loadingPermissions} />
             </div>
           </div>
       </div>
     </>
   );
};

export default AttendancePage; 