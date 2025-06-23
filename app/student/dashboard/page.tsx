// app/student/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import ProgressBar from '../_components/ProgressBar';
import ExamTabs from '../_components/ExamTabs';
import CircularProgress from '../_components/CircularProgress';
import ScoreCard from '../_components/ScoreCard';

// Firebase and Data Handling
import { db } from '../../../firebase-config';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';
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
import useCountUp from '../../_hooks/useCountUp';

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };

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
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Get student info from Redux store
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);
  const studentDocId = useAppSelector((state) => state.main.studentDocId);

  // State for progress bar & new seat info
  const [progressStatus, setProgressStatus] = useState("No Registered");
  const [seatInfo, setSeatInfo] = useState<string | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(true);

  // State for student's recent activity
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the mock exam results
  const [availableTabs, setAvailableTabs] = useState(['mock1', 'mock2']);
  const [selectedTab, setSelectedTab] = useState('mock1');
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [examScores, setExamScores] = useState<ExamScores>({});
  const [isExamLoading, setIsExamLoading] = useState(true);
  const [studentClassType, setStudentClassType] = useState<string | null>(null);

  useEffect(() => {
    // Check if Mock 3 results are published
    const fetchExamControls = async () => {
      const controlDocRef = doc(db, 'examControls', 'mock3');
      const docSnap = await getDoc(controlDocRef);
      if (docSnap.exists() && docSnap.data().isPublished) {
        setAvailableTabs(['mock1', 'mock2', 'mock3']);
      } else {
        setAvailableTabs(['mock1', 'mock2']);
      }
    };
    fetchExamControls();
  }, []);

  const handleTabChange = (tab: string) => {
    // Only allow tab change if not currently loading
    if (!isExamLoading) {
      setSelectedTab(tab);
    }
  };

  // Fetch progress status and seat info
  useEffect(() => {
    const fetchProgress = async () => {
      setIsProgressLoading(true);
      if (!studentDocId) {
        setIsProgressLoading(false);
        return;
      }

      const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;

      if (!secretKey) {
        console.error("Secret Key is not defined in environment variables.");
        setIsProgressLoading(false);
        return;
      }

      // Use our new API route instead of calling Google Apps Script directly
      const apiUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}`;
      
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch progress");
        const data = await response.json();
        if (data.status) setProgressStatus(data.status);
        if (data.seat) setSeatInfo(String(data.seat)); // Store seat info as a string
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setIsProgressLoading(false);
      }
    };

    fetchProgress();
  }, [studentDocId]);

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

  // Fetch Mock 1/2 results and settings
  useEffect(() => {
    if (!studentDocId) return;

    const fetchExamData = async () => {
      // Capture scroll position before loading
      const scrollY = window.scrollY;
      setIsExamLoading(true);

      try {
        // 1. Get student's class to determine their type (e.g., "Grade 12 Science")
        const studentRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) throw new Error("Student document not found");
        const studentData = studentSnap.data();
        const studentClass = studentData.class;

        // Find the class document by its name, not by ID
        const classQuery = query(collection(db, 'classes'), where('name', '==', studentClass), limit(1));
        const classQuerySnapshot = await getDocs(classQuery);

        if (classQuerySnapshot.empty) {
          console.error(`Class document not found for name: "${studentClass}"`);
          throw new Error("Class document not found");
        }
        
        const classSnap = classQuerySnapshot.docs[0];
        const fetchedClassType = classSnap.data().type;
        setStudentClassType(fetchedClassType);
        
        // 2. Fetch the grading rules (max scores) for that class type and mock
        const settingsQuery = query(
          collection(db, "examSettings"),
          where("type", "==", fetchedClassType),
          where("mock", "==", selectedTab)
        );
        const settingsSnapshot = await getDocs(settingsQuery);
        const fetchedSettings: ExamSettings = {};
        settingsSnapshot.forEach(doc => {
          const data = doc.data();
          fetchedSettings[data.subject] = { maxScore: data.maxScore };
        });
        setExamSettings(fetchedSettings);

        // 3. Fetch the student's scores using our new API route
        const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
        const scoresUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}&exam_name=${selectedTab}`;
        const scoresResponse = await fetch(scoresUrl);
        const scoresData = await scoresResponse.json();
        
        // Treat empty/null scores as 0
        const processedScores: ExamScores = {};
        if (scoresData.scores) {
          Object.keys(fetchedSettings).forEach(subject => {
            processedScores[subject] = Number(scoresData.scores[subject]) || 0;
          });
        }
        setExamScores(processedScores);

      } catch (error) {
        console.error(`Error fetching data for ${selectedTab}:`, error);
        setExamSettings({});
        setExamScores({});
      } finally {
        setIsExamLoading(false);
        // Use a timeout to ensure the scroll position is restored AFTER the render cycle.
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      }
    };

    fetchExamData();
  }, [studentDocId, selectedTab]);

  // This effect ensures the user's scroll position is maintained after tab changes.
  useEffect(() => {
    if (!isExamLoading && resultsRef.current) {
      // Get the top position of the results section
      const topPos = resultsRef.current.getBoundingClientRect().top + window.scrollY;
      
      // If user has scrolled past the top of the results section, keep them there.
      if (window.scrollY > topPos) {
        resultsRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }
  }, [isExamLoading, selectedTab]);

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

  // Helper function to calculate grade
  const calculateGrade = (score: number, maxScore: number): string => {
    if (maxScore === 0) return 'N/A';
    const percentage = score / maxScore;
    if (percentage >= 0.9) return 'A';
    if (percentage >= 0.8) return 'B';
    if (percentage >= 0.7) return 'C';
    if (percentage >= 0.6) return 'D';
    if (percentage >= 0.5) return 'E';
    return 'F';
  };

  // Define the canonical subject order and relabeling maps
  const SUBJECT_ORDER = useMemo(() => ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'english'], []);
  const SOCIAL_STUDIES_LABELS: { [key: string]: string } = useMemo(() => ({
    math: 'Khmer',
    khmer: 'Math',
    chemistry: 'History',
    physics: 'Moral',
    biology: 'Geometry',
    history: 'Earth',
    english: 'English',
  }), []);

  // Calculate totals and grades using useMemo for performance
  const examResults = useMemo(() => {
    // Base the calculation on all subjects available for the student's class type.
    const subjects = Object.keys(examSettings);
    let totalScore = 0;
    let totalMaxScore = 0;

    subjects.forEach(subject => {
      const score = examScores[subject] || 0;
      
      // English is an optional bonus subject
      if (subject.toLowerCase() === 'english') {
        // Only add points if the score is above 25
        if (score > 25) {
          totalScore += (score - 25);
        }
        // Do NOT add to totalMaxScore
      } else {
        // For all other subjects, add to both totals
        totalScore += score;
        totalMaxScore += examSettings[subject]?.maxScore || 0;
      }
    });
    
    const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const totalGrade = calculateGrade(totalScore, totalMaxScore);

    return { subjects, totalScore, totalMaxScore, totalPercentage, totalGrade };
  }, [examSettings, examScores]);

  const animatedTotalScore = useCountUp(examResults.totalScore, 3000, [selectedTab]);

  // Parse room and seat from seatInfo
  const { room, seat } = useMemo(() => {
    if (typeof seatInfo !== 'string' || seatInfo.length < 3) {
      // Need at least 3 digits (e.g., 901) to be valid
      return { room: '?', seat: '?' };
    }
    
    const len = seatInfo.length;
    // The seat is always the last two digits.
    const seat = seatInfo.substring(len - 2);
    // The room is everything before the last two digits.
    const room = seatInfo.substring(0, len - 2);

    return { room, seat };
  }, [seatInfo]);

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

            {/* Progress Bar Section */}
            <ProgressBar status={progressStatus} loading={isProgressLoading} />
            
            {/* New Room and Seat Widgets - Only show after loading is complete */}
            {!isProgressLoading && (
              <div className="grid grid-cols-2 gap-2 mb-6 mt-6">
                {/* Room Widget */}
                <div className="relative h-32">
                  <Image
                    src="/door.png"
                    alt="Room"
                    width={80}
                    height={80}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-5"
                  />
                  <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${progressStatus === 'No Registered' ? 'justify-center items-center' : 'justify-between items-end'}`}>
                    {progressStatus === 'No Registered' ? (
                      <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-6">
                        Register to View your Exam Room
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-white">Room</span>
                        <span className="text-5xl font-bold text-white">
                          {room}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* Seat Widget */}
                <div className="relative h-32">
                  <Image
                    src="/school-desk.png"
                    alt="Seat"
                    width={80}
                    height={80}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 saturate-125 contrast-125"
                  />
                  <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${progressStatus !== 'Paid Star' ? 'justify-center items-center' : 'justify-between items-end'}`}>
                    {progressStatus !== 'Paid Star' ? (
                      <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-8">
                        Pay STAR to View your Exam Seat
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-white">Seat</span>
                        <span className="text-5xl font-bold text-white">
                          {seat}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <hr className="my-4 border-slate-800" />

            {/* Mock 1 & 2 Results Section */}
            <h2 className="text-xl font-bold">Mock Exam Results</h2>
            <ExamTabs tabs={availableTabs} selectedTab={selectedTab} setSelectedTab={handleTabChange} disabled={isExamLoading} />
            {isExamLoading ? (
              <div className="text-center text-gray-400 p-8">Loading scores...</div>
            ) : (
              <div className="space-y-6">
                {Object.keys(examSettings).length > 0 ? (
                  <>
                    <div className="flex flex-col items-center p-6 bg-slate-900 rounded-2xl">
                      <div className="relative">
                        <CircularProgress percentage={examResults.totalPercentage} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-white">{animatedTotalScore}</span>
                          <span className="text-lg text-gray-400">Total Score</span>
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-2xl font-bold text-purple-400">Grade: {examResults.totalGrade}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SUBJECT_ORDER.map(subjectKey => {
                        // Only render if a score exists for this subject in the ordered list
                        if (examScores.hasOwnProperty(subjectKey)) {
                          const displayLabel = studentClassType === 'Grade 12 Social'
                            ? SOCIAL_STUDIES_LABELS[subjectKey] || subjectKey
                            : subjectKey;

                          return (
                            <ScoreCard
                              key={subjectKey}
                              subject={displayLabel}
                              score={examScores[subjectKey]}
                              maxScore={examSettings[subjectKey]?.maxScore || 0}
                              grade={calculateGrade(examScores[subjectKey], examSettings[subjectKey]?.maxScore || 0)}
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 p-8">No results found for this exam.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;