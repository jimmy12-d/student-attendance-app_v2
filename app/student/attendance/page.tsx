"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp, addDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Student, PermissionRecord } from '../../_interfaces';
import { AttendanceRecord } from '../../dashboard/record/TableAttendance';
import { isSchoolDay, getStudentDailyStatus, RawAttendanceRecord, markAttendance, calculateAverageArrivalTime } from '../../dashboard/_lib/attendanceLogic';
import { AllClassConfigs } from '../../dashboard/_lib/configForAttendanceLogic';
import { getStatusStyles } from '../../dashboard/_lib/statusStyles';
import { mdiChevronRight, mdiAccountCheckOutline, mdiClockAlertOutline, mdiAccountOffOutline, mdiClockTimeThreeOutline, mdiFaceRecognition, mdiFileDocumentEditOutline, mdiWeatherSunny, mdiWeatherSunset, mdiWeatherNight, mdiLightningBolt, mdiCheckCircle, mdiCalendar } from '@mdi/js';
import Icon from '../../_components/Icon';
import { PermissionRequestForm } from '../_components/PermissionRequestForm';
import SlideInPanel from '../../_components/SlideInPanel';
import { usePrevious } from '../../_hooks/usePrevious';
import { useTouchGesture } from '../../_hooks/useTouchGesture';
import { toast } from 'sonner';
import OngoingPermissions from '../_components/OngoingPermissions';
import HealthArrivalChart from '../_components/HealthArrivalChart';
import AttendanceSummaryCardSkeleton from '../_components/AttendanceSummaryCardSkeleton';
import Button from '../../_components/Button';

const AttendancePage = () => {
  const t = useTranslations('student.attendance');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  
  // Centralized khmer font utility
  const khmerFont = (additionalClasses: string = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

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
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [averageArrivalTime, setAverageArrivalTime] = useState<{ averageTime: string; details: string } | null>(null);
  const [chartScrollPosition, setChartScrollPosition] = useState(0);

  // Touch gesture for chart scrolling
  const chartGestureRef = useTouchGesture({
    onScroll: (scrollLeft) => {
      setChartScrollPosition(scrollLeft);
    },
    threshold: 30
  });


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

  // Function to get shift icon and styling
  const getShiftInfo = (shift: string) => {
    switch (shift?.toLowerCase()) {
      case 'morning':
        return { startTime: '07:00', name: tCommon('morningShift'), icon: mdiWeatherSunny };
      case 'afternoon':
        return { startTime: '13:00', name: tCommon('afternoonShift'), icon: mdiWeatherSunset };
      case 'evening':
        return { startTime: '17:30', name: tCommon('eveningShift'), icon: mdiWeatherNight };
      default:
        return { startTime: '00:00', name: t('unknownShift'), icon: mdiClockAlertOutline };
    }
  };

  const calculateMinutesFromStartTime = (arrivalTime: string, startTime: string): number => {
    if (!arrivalTime || !startTime) return 0;
    try {
      const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      
      const arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute;
      const startTotalMinutes = startHour * 60 + startMinute;
      
      // Corrected logic: arrival - start
      // Positive result means late, negative means early
      return arrivalTotalMinutes - startTotalMinutes;
    } catch (error) {
      console.error("Error calculating minutes from start time:", error);
      return 0;
    }
  };

  const handleRequestAttendance = async () => {
    if (!studentData || !studentUid || !studentDocId) {
      toast.error(t('studentInfoError'));
      return;
    }

    if (todayRecord) {
      if (["present", "late", "permission"].includes(todayRecord.status)) {
        toast.info(t('alreadyMarked', { status: todayRecord.status }));
        return;
      }
      if (todayRecord.status === "requested") {
        toast.info(t('alreadyRequested'));
        return;
      }
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("authUid", "==", studentUid),
        where("date", "==", today),
        limit(1)
      );

      const attendanceSnap = await getDocs(attendanceQuery);

      if (!attendanceSnap.empty) {
        const docRef = attendanceSnap.docs[0].ref;
        await updateDoc(docRef, { 
          status: "requested", 
          requestedAt: serverTimestamp(),
          method: "request"
        });
      } else {
        const newRecordData = {
          authUid: studentUid,
          studentName: studentData.fullName,
          studentId: studentDocId,
          class: studentData.class,
          shift: studentData.shift || null,
          date: today,
          status: "requested",
          timestamp: serverTimestamp(),
          requestedAt: serverTimestamp(),
          method: "request",
        };
        await addDoc(collection(db, "attendance"), newRecordData);
      }

      toast.success(t('requestSuccess'));
      setIsRequestConfirmOpen(false);
    } catch (error) {
      console.error("Error sending attendance request: ", error);
      toast.error(t('requestError'));
    }
  };

  useEffect(() => {
    if (!studentUid) return;
    
    let attendanceUnsubscribe: () => void;
    let studentUnsubscribe: () => void;
    let classesUnsubscribe: () => void;
    let permsUnsubscribe: () => void;
    
    const fetchSchoolDayAttendance = async () => {
      setLoading(true);
      try {
        // Real-time listener for student data
        const studentQuery = query(collection(db, "students"), where("authUid", "==", studentUid), limit(1));
        studentUnsubscribe = onSnapshot(studentQuery, (studentSnap) => {
          if (studentSnap.empty) { 
            setLoading(false); 
            return; 
          }
          
          const studentDataFromDb = studentSnap.docs[0].data() as Student;
          setStudentData(studentDataFromDb);

          // Real-time listener for classes configuration
          classesUnsubscribe = onSnapshot(collection(db, "classes"), (classesSnap) => {
            const classConfigs: { [key: string]: any } = {};
            classesSnap.forEach(doc => { classConfigs[doc.id] = doc.data(); });
            setAllClassConfigs(classConfigs); // Store class configs in state
            const studentClassConfig = studentDataFromDb.class ? classConfigs[studentDataFromDb.class] : null;
            const studyDays = studentClassConfig?.studyDays;

            const schoolDays: string[] = [];
            const currentDate = new Date();
            while (schoolDays.length < 10) {
              if (isSchoolDay(currentDate, studyDays)) {
                schoolDays.push(currentDate.toISOString().split('T')[0]);
              }
              currentDate.setDate(currentDate.getDate() - 1);
            }
            
            // Real-time listener for approved permissions
            const permsQuery = query(
              collection(db, "permissions"),
              where("authUid", "==", studentUid),
              where("status", "==", "approved")
            );
            permsUnsubscribe = onSnapshot(permsQuery, (permsSnap) => {
              const approvedPermissions = permsSnap.docs.map(doc => doc.data() as PermissionRecord);
              
              // Real-time listener for attendance records
              const attendanceQuery = query(collection(db, "attendance"), where("authUid", "==", studentUid), where("date", "in", schoolDays));
              attendanceUnsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
                const fetchedRecords: { [date: string]: AttendanceRecord } = {};
                snapshot.docs.forEach(doc => { fetchedRecords[doc.data().date] = { ...doc.data(), id: doc.id } as AttendanceRecord; });
                
                const displayRecords = schoolDays.map(dateStr => {
                  // Convert the AttendanceRecord to RawAttendanceRecord format for getStudentDailyStatus
                  const rawAttendanceRecord: RawAttendanceRecord | undefined = fetchedRecords[dateStr] ? {
                    studentId: studentDataFromDb.studentId,
                    date: dateStr,
                    status: fetchedRecords[dateStr].status as 'present' | 'late' | 'requested',
                    timestamp: fetchedRecords[dateStr].timestamp instanceof Date ? 
                              Timestamp.fromDate(fetchedRecords[dateStr].timestamp as Date) : 
                              fetchedRecords[dateStr].timestamp as Timestamp,
                    class: studentDataFromDb.class,
                    shift: studentDataFromDb.shift,
                    id: fetchedRecords[dateStr].id
                  } : undefined;

                  // Use the centralized status calculation function
                  const calculatedStatus = getStudentDailyStatus(
                    studentDataFromDb,
                    dateStr,
                    rawAttendanceRecord,
                    classConfigs,
                    approvedPermissions
                  );

                  // Convert back to AttendanceRecord format for display
                  if (fetchedRecords[dateStr]) {
                    return fetchedRecords[dateStr];
                  }
                  
                  // Create a display record based on the calculated status
                  const displayStatus = calculatedStatus.status === "Permission" ? 'permission' :
                                      calculatedStatus.status === "Not Yet Enrolled" ? 'not-enrolled' :
                                      calculatedStatus.status === "No School" ? 'no-school' :
                                      calculatedStatus.status === "Present" ? 'present' :
                                      calculatedStatus.status === "Late" ? 'late' :
                                      calculatedStatus.status === "Pending" ? 'requested' : 'absent';
                  
                  return { 
                    id: dateStr, 
                    date: dateStr, 
                    status: displayStatus,
                    calculatedTime: calculatedStatus.time 
                  };
                }).filter(record => !['not-enrolled', 'no-school'].includes(record.status))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                setRecentRecords(displayRecords);
                
                // Set today's record using the same logic
                const today = new Date().toISOString().split('T')[0];
                const todaysAttendanceRecord = fetchedRecords[today];
                const rawTodayRecord: RawAttendanceRecord | undefined = todaysAttendanceRecord ? {
                  studentId: studentDataFromDb.studentId,
                  date: today,
                  status: todaysAttendanceRecord.status as 'present' | 'late' | 'requested',
                  timestamp: todaysAttendanceRecord.timestamp instanceof Date ? 
                            Timestamp.fromDate(todaysAttendanceRecord.timestamp as Date) : 
                            todaysAttendanceRecord.timestamp as Timestamp,
                  class: studentDataFromDb.class,
                  shift: studentDataFromDb.shift,
                  id: todaysAttendanceRecord.id
                } : undefined;

                const todayCalculatedStatus = getStudentDailyStatus(
                  studentDataFromDb,
                  today,
                  rawTodayRecord,
                  classConfigs,
                  approvedPermissions
                );

                const todayDisplayStatus = todayCalculatedStatus.status === "Permission" ? 'permission' :
                                         todayCalculatedStatus.status === "Not Yet Enrolled" ? 'not-enrolled' :
                                         todayCalculatedStatus.status === "No School" ? 'no-school' :
                                         todayCalculatedStatus.status === "Present" ? 'present' :
                                         todayCalculatedStatus.status === "Late" ? 'late' :
                                         todayCalculatedStatus.status === "Pending" ? 'requested' : 'absent';

                const todaysRecord = todaysAttendanceRecord || { 
                  id: today, 
                  date: today, 
                  status: todayDisplayStatus,
                  calculatedTime: todayCalculatedStatus.time 
                };
                setTodayRecord(todaysRecord);
                
                setLoading(false);
              });
            });
          });
        });
      } catch (error) { 
        console.error("Error setting up real-time listeners:", error); 
        setLoading(false); 
      }
    };
    
    fetchSchoolDayAttendance();
    
    return () => { 
      if (attendanceUnsubscribe) attendanceUnsubscribe();
      if (studentUnsubscribe) studentUnsubscribe();
      if (classesUnsubscribe) classesUnsubscribe();
      if (permsUnsubscribe) permsUnsubscribe();
    };
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
      where("requestedAt", ">=", thirtyDaysAgo),
      orderBy("requestedAt", "desc")
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

  // Calculate average arrival time when student data or class configs change
  useEffect(() => {
    const calculateAverage = async () => {
      if (!studentData || !allClassConfigs) return;

      try {
        // Get current month attendance records for the student
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("authUid", "==", studentUid),
          where("date", ">=", `${currentMonth}-01`),
          where("date", "<=", `${currentMonth}-31`)
        );

        const attendanceSnap = await getDocs(attendanceQuery);
        const monthlyAttendance: RawAttendanceRecord[] = attendanceSnap.docs.map(doc => {
          const data = doc.data();
          return {
            studentId: data.studentId || studentData.id,
            date: data.date,
            status: data.status,
            timeIn: data.timeIn,
            startTime: data.startTime,
            timestamp: data.timestamp,
            class: data.class,
            shift: data.shift,
            id: doc.id
          } as RawAttendanceRecord;
        });

        const avgResult = calculateAverageArrivalTime(
          studentData,
          monthlyAttendance,
          currentMonth,
          allClassConfigs
        );

        setAverageArrivalTime(avgResult);
      } catch (error) {
        console.error("Error calculating average arrival time:", error);
        setAverageArrivalTime({ averageTime: 'N/A', details: 'Error calculating average' });
      }
    };

    calculateAverage();
  }, [studentData, allClassConfigs, studentUid]);

  const presentCount = recentRecords.filter(r => r.status === 'present' || r.status === 'permission').length;
  const lateCount = recentRecords.filter(r => r.status === 'late').length;
  const absentCount = recentRecords.filter(r => r.status === 'absent').length;
  const totalDays = recentRecords.length > 0 ? recentRecords.length : 10;

  const handlePermissionSuccess = () => {
    setIsPermissionPanelOpen(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return t('present');
      case 'absent':
        return t('absent');
      case 'late':
        return t('late');
      case 'permission':
        return t('permission');
      case 'requested':
        return t('requested');
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
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

      <SlideInPanel title={t('confirmRequest')} isOpen={isRequestConfirmOpen} onClose={() => setIsRequestConfirmOpen(false)}>
        <div className="">
            <p className={khmerFont('text-gray-700 dark:text-gray-300 mb-6')}>
                {t('requestDescription')}
            </p>
            <div className="flex justify-end space-x-3">
                <Button onClick={() => setIsRequestConfirmOpen(false)} color="whiteDark" className={khmerFont()}>{tCommon('cancel')}</Button>
                <Button onClick={handleRequestAttendance} color="company-purple" className={khmerFont()}>{t('confirmRequestBtn')}</Button>
            </div>
        </div>
      </SlideInPanel>

       <SlideInPanel title={`${t('permissionForm')} - ${t('plannedAbsences')}`} isOpen={isPermissionPanelOpen} onClose={() => setIsPermissionPanelOpen(false)}>
         <PermissionRequestForm onSuccess={handlePermissionSuccess} />
       </SlideInPanel>

       <SlideInPanel title={t('lastDaysActivity')} isOpen={isDetailsPanelOpen} onClose={() => setIsDetailsPanelOpen(false)}>
           <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl p-3 shadow-xl border border-gray-100/50 dark:border-slate-600/50">
             <div className="max-h-[50vh] overflow-y-auto">
               {recentRecords.length > 0 ? recentRecords.map(record => {
               const styles = getStatusStyles(record.status);
               const statusText = getStatusText(record.status);
               const dateOnRight = record.status === 'absent' || record.status === 'permission'
                 ? formatDate(new Date(record.date.replace(/-/g, '\/')))
                 : formatDate(record.timestamp);

               const timeText = (record.status === 'present' || record.status === 'late')
                 ? formatTime(record.timestamp)
                 : null;

               return (
                 <div key={record.id} className="flex items-center justify-between p-4 mb-3 bg-gray-50/80 dark:bg-slate-700/80 rounded-xl hover:shadow-md border border-gray-100 dark:border-slate-600">
                   <div className="flex items-center space-x-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.cardBg}`}>
                       <Icon path={styles.icon} size={20} className="text-white" />
                     </div>
                     <div>
                       <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles.badge} ${khmerFont()}`}>
                         {statusText}
                       </span>
                     </div>
                   </div>

                   <div className="text-right">
                     <p className={khmerFont('font-semibold text-gray-900 dark:text-white')}>
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
               <p className={khmerFont('text-center text-gray-500 p-6')}>{t('noRecentActivity')}</p>
             )}
             </div>
           </div>
       </SlideInPanel>

       <div className="space-y-3 px-2 pb-6 mt-4">
          {/* Today's Status Card - Mobile Enhanced */}
          {loading ? (
            <div className="animate-pulse bg-gray-200 dark:bg-slate-700 h-36 rounded-2xl mx-1"></div>
          ) : (
            <div className="relative overflow-hidden mx-1">
              {todayRecord && (
                <div className={`${getStatusStyles(todayRecord.status).cardBg} rounded-2xl px-6 py-4 shadow-xl relative`}>
                  {/* Date at bottom right */}
                  <div className="absolute bottom-3 right-4">
                    <p className={khmerFont('text-white-900 text-sm font-medium')}>
                      {new Date(todayRecord.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon path={getStatusStyles(todayRecord.status).icon} size={28} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={khmerFont('text-white text-xl font-semibold leading-tight')}>{t('status')}</h3>
                        <p className={khmerFont('text-white/80 text-base leading-tight')}>
                          { t(todayRecord.status)}
                          {todayRecord.timestamp && (
                            <span className="ml-2 block sm:inline text-sm">at {formatTime(todayRecord.timestamp)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Mobile touch feedback */}
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 active:opacity-100 transition-opacity duration-150 pointer-events-none"></div>
                </div>
              )}
            </div>
          )}

          {/* Health App Style Arrival Chart */}
          {!loading && studentData?.shift && (
            <HealthArrivalChart
              recentRecords={recentRecords}
              studentData={studentData}
              selectedDate={new Date().toISOString().split('T')[0]}
              classConfigs={allClassConfigs}
              calculateMinutesFromStartTime={calculateMinutesFromStartTime}
              getShiftInfo={getShiftInfo}
            />
          )}

        {/* Quick Actions - Mobile Enhanced */}
        <div className="space-y-6 px-2">
          <h2 className={khmerFont('font-bold mb-4 text-2xl text-gray-900 dark:text-white')}>{t('quickActions')}</h2>
             {/* Mobile-optimized Action Cards */}
             <div className="space-y-5">
               {/* Request Attendance Card - Mobile Enhanced */}
               <div className="group relative overflow-hidden touch-manipulation">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                 <button
                   onClick={() => setIsRequestConfirmOpen(true)}
                   disabled={['present', 'late', 'permission', 'requested'].includes(todayRecord?.status)}
                   className="relative w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-5 py-4 rounded-3xl shadow-xl border border-gray-100/80 dark:border-slate-600/80 disabled:opacity-40 disabled:cursor-not-allowed min-h-[140px] flex items-center active:scale-[0.98] transition-transform duration-150"
                   style={{ WebkitTapHighlightColor: 'transparent' }}
                 >
                   <div className="flex items-center w-full space-x-5">
                     {/* Icon Section */}
                     <div className="relative flex-shrink-0">
                       <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                         <Icon path={mdiFaceRecognition} size={44} className="text-white relative z-10" />
                       </div>
                       {/* Status Dot */}
                       <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                         <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                       </div>
                     </div>

                     {/* Content Section */}
                     <div className="text-left flex-1 min-w-0">
                       <p className={khmerFont('text-xl font-bold text-gray-900 dark:text-white mb-2')}>
                         {t('requestAttendance')}
                       </p>
                       <div className="flex items-center space-x-2">
                         <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                         <span className={khmerFont('text-sm text-blue-600 dark:text-blue-400 font-medium')}>
                           {t('faceUnavailable')}
                         </span>
                       </div>
                     </div>

                     {/* Arrow */}
                     <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                       <Icon path={mdiChevronRight} size={32} />
                     </div>
                   </div>
                 </button>
               </div>

               {/* Request Permission Card - Mobile Enhanced */}
               <div className="group relative overflow-hidden touch-manipulation">
                 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                 <button
                   onClick={() => setIsPermissionPanelOpen(true)}
                   className="relative w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-5 py-4 rounded-3xl shadow-xl border border-gray-100/80 dark:border-slate-600/80 min-h-[140px] flex items-center active:scale-[0.98] transition-transform duration-150"
                   style={{ WebkitTapHighlightColor: 'transparent' }}
                 >
                   <div className="flex items-center w-full space-x-5">
                     {/* Icon Section */}
                     <div className="relative flex-shrink-0">
                       <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                         <Icon path={mdiFileDocumentEditOutline} size={42} className="text-white relative z-10" />
                       </div>
                       {/* Status Dot */}
                       <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                         <div className="w-3 h-3 bg-white rounded-full"></div>
                       </div>
                     </div>

                     {/* Content Section */}
                     <div className="text-left flex-1 min-w-0">
                       <h3 className={khmerFont('text-xl font-bold text-gray-900 dark:text-white mb-2')}>
                        {t('permissionForm')}
                       </h3>
                       <div className="flex items-center space-x-2">
                         <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                         <span className={khmerFont('text-sm text-purple-600 dark:text-purple-400 font-medium')}>
                           {t('plannedAbsences')}
                         </span>
                       </div>
                     </div>

                     {/* Arrow */}
                     <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                       <Icon path={mdiChevronRight} size={32} />
                     </div>
                   </div>
                 </button>
               </div>
             </div>
           </div>

           {/* Summary Stats - Mobile Enhanced
           <div className="space-y-5 px-2">
             <div className="flex items-center justify-between">
                <h2 className={khmerFont('font-bold text-2xl text-gray-900 dark:text-white')}>{t('lastDaysSummary')}</h2>
               <button
                 onClick={() => setIsDetailsPanelOpen(true)}
                 className={khmerFont('flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 active:scale-95 transition-transform duration-150 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20')}
               >
                 {t('viewDetails')}
                 <Icon path={mdiChevronRight} size={20} className="ml-1" />
               </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
               {loading ? (
                 <>
                   <AttendanceSummaryCardSkeleton />
                   <AttendanceSummaryCardSkeleton />
                   <AttendanceSummaryCardSkeleton />
                 </>
               ) : (
                 <>
                   <div
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 cursor-pointer active:scale-[0.98] transition-all duration-150"
                     onClick={(e) => createRipple(e, 'rgba(34, 197, 94, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-4">
                       <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiAccountCheckOutline} size={24} className="text-green-600 dark:text-green-400" />
                       </div>
                       <span className="text-3xl font-bold text-gray-900 dark:text-white">{presentCount}</span>
                     </div>
                     <h3 className={khmerFont('font-semibold text-gray-900 dark:text-white text-lg')}>{t('present')}</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mt-3">
                       <div
                         className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
                         style={{ width: `${(presentCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>

                   <div
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 cursor-pointer active:scale-[0.98] transition-all duration-150"
                     onClick={(e) => createRipple(e, 'rgba(234, 179, 8, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-4">
                       <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiClockAlertOutline} size={24} className="text-yellow-600 dark:text-yellow-400" />
                       </div>
                       <span className="text-3xl font-bold text-gray-900 dark:text-white">{lateCount}</span>
                     </div>
                     <h3 className={khmerFont('font-semibold text-gray-900 dark:text-white text-lg')}>{t('late')}</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mt-3">
                       <div
                         className="bg-yellow-500 h-3 rounded-full transition-all duration-1000 ease-out"
                         style={{ width: `${(lateCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>

                   <div
                     className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 cursor-pointer active:scale-[0.98] transition-all duration-150"
                     onClick={(e) => createRipple(e, 'rgba(239, 68, 68, 0.3)')}
                   >
                     <div className="flex items-center justify-between mb-4">
                       <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                         <Icon path={mdiAccountOffOutline} size={24} className="text-red-600 dark:text-red-400" />
                       </div>
                       <span className="text-3xl font-bold text-gray-900 dark:text-white">{absentCount}</span>
                     </div>
                     <h3 className={khmerFont('font-semibold text-gray-900 dark:text-white text-lg')}>{t('absent')}</h3>
                     <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mt-3">
                       <div
                         className="bg-red-500 h-3 rounded-full transition-all duration-1000 ease-out"
                         style={{ width: `${(absentCount / totalDays) * 100}%` }}
                       ></div>
                     </div>
                   </div>
                 </>
               )}
             </div>
           </div> */}

           {/* Permissions History - Mobile Enhanced */}
           <div className="space-y-5 px-2">
             <h2 className={khmerFont('font-bold mb-4 text-2xl text-gray-900 dark:text-white')}>{t('recentPermissions')}</h2>
             <div className="overflow-hidden">
               <OngoingPermissions permissions={ongoingPermissions} isLoading={loadingPermissions} />
             </div>
           </div>
       </div>
     </>
   );
};

export default AttendancePage;