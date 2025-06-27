"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

// Firebase and Data Handling
import { db } from '../../../firebase-config';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';

// Redux
import { useAppSelector, useAppDispatch } from '../../_stores/hooks';
import { setMockExamData, setMockExamSettings, setProgressData } from '../../_stores/mainSlice';

// UI Components
import useCountUp from '../../_hooks/useCountUp';
import MockExamResults from './MockExamResults';
import ProgressBar from '../_components/ProgressBar';
import CardBoxModal from '../../_components/CardBox/Modal';
import StudentQRCode from '../_components/StudentQRCode';
import { PermissionRequestForm } from '../_components/PermissionRequestForm';


// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };

const MockExamPage = () => {
  const dispatch = useAppDispatch();
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);
  const mockExamCache = useAppSelector((state) => state.main.mockExamCache);
  const mockExamSettingsCache = useAppSelector((state) => state.main.mockExamSettingsCache);
  const progressCache = useAppSelector((state) => state.main.progressCache);

  // State for modals and progress
  const [isQrModalActive, setIsQrModalActive] = useState(false);
  const [isPermissionModalActive, setIsPermissionModalActive] = useState(false);
  const [seatInfo, setSeatInfo] = useState<string | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [progressStatus, setProgressStatus] = useState("No Registered");
  
  // State for mock exam
  const [availableTabs, setAvailableTabs] = useState(['mock1', 'mock2']);
  const [selectedTab, setSelectedTab] = useState('mock1');
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [examScores, setExamScores] = useState<ExamScores>({});
  const [isExamLoading, setIsExamLoading] = useState(true);
  const [studentClassType, setStudentClassType] = useState<string | null>(null);

  // Fetch controls for available tabs (e.g., Mock 3)
  useEffect(() => {
    const fetchExamControls = async () => {
      const controlDocRef = doc(db, 'examControls', 'mock3');
      const docSnap = await getDoc(controlDocRef);
      if (docSnap.exists() && docSnap.data().isPublished) {
        setAvailableTabs(['mock1', 'mock2', 'mock3']);
      }
    };
    fetchExamControls();
  }, []);

  // Fetch progress status and seat info (not cached)
  useEffect(() => {
    const fetchProgress = async () => {
      if (!studentDocId) {
        setIsProgressLoading(false);
        return;
      }

      // Check cache first
      const cachedProgress = progressCache[studentDocId];
      const isProgressFresh = cachedProgress && (Date.now() - new Date(cachedProgress.lastFetched).getTime()) < 5 * 60 * 1000; // 5 minutes

      if (isProgressFresh) {
        setProgressStatus(cachedProgress.status);
        setSeatInfo(cachedProgress.seat);
        setPhoneInfo(cachedProgress.phone);
        setIsProgressLoading(false);
        return; // Data is fresh, no need to fetch
      }

      // If no fresh data, show loading and fetch
      setIsProgressLoading(true);

      const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
      if (!secretKey) {
        console.error("Secret Key is not defined in environment variables.");
        setIsProgressLoading(false);
        return;
      }

      const apiUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch progress");
        const data = await response.json();
        
        const progressData = {
          status: data.status || "No Registered",
          seat: data.seat ? String(data.seat) : null,
          phone: data.phone ? String(data.phone) : null,
          lastFetched: new Date().toISOString(),
        };

        // Update local state
        setProgressStatus(progressData.status);
        setSeatInfo(progressData.seat);
        setPhoneInfo(progressData.phone);
        
        // Update Redux cache
        dispatch(setProgressData({ studentId: studentDocId, data: progressData }));

      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setIsProgressLoading(false);
      }
    };
    fetchProgress();
  }, [studentDocId, dispatch, progressCache]);

  // Main data fetching logic with caching
  useEffect(() => {
    if (!studentDocId) return;

    const getSettingsKey = (classType: string, tab: string) => `${classType}-${tab}`;
    const getScoresKey = (studentId: string, tab: string) => `${studentId}-${tab}`;

    const loadData = async () => {
      // Step 1: Get student's class type. This is essential for finding the correct settings.
      // We don't cache this as it's a quick single doc read and foundational for other fetches.
      const studentRef = doc(db, 'students', studentDocId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        console.error("Student document not found");
        setIsExamLoading(false);
        return;
      }
      const studentData = studentSnap.data();
      const studentClass = studentData.class;
      const classQuery = query(collection(db, 'classes'), where('name', '==', studentClass), limit(1));
      const classQuerySnapshot = await getDocs(classQuery);
      if (classQuerySnapshot.empty) {
        console.error("Class document not found");
        setIsExamLoading(false);
        return;
      }
      const fetchedClassType = classQuerySnapshot.docs[0].data().type;
      setStudentClassType(fetchedClassType);

      // Step 2: Check cache for both settings and scores
      const settingsKey = getSettingsKey(fetchedClassType, selectedTab);
      const scoresKey = getScoresKey(studentDocId, selectedTab);
      
      const cachedSettings = mockExamSettingsCache[settingsKey];
      const cachedScores = mockExamCache[scoresKey];

      const isSettingsFresh = cachedSettings && (Date.now() - new Date(cachedSettings.lastFetched).getTime()) < 5 * 60 * 1000;
      const isScoresFresh = cachedScores && (Date.now() - new Date(cachedScores.lastFetched).getTime()) < 5 * 60 * 1000;

      // If both are fresh, load from cache and exit. No loading spinner needed.
      if (isSettingsFresh && isScoresFresh) {
        setExamSettings(cachedSettings.settings);
        setExamScores(cachedScores.scores);
        setIsExamLoading(false); // Ensure loading is off
        // Optionally, you could trigger a silent refresh here if needed
        return;
      }
      
      // Step 3: If cache is stale or missing, show loader and fetch from network
      setIsExamLoading(true);

      try {
        // Fetch settings if they are not fresh
        let settings = isSettingsFresh ? cachedSettings.settings : null;
        if (!settings) {
          const settingsQuery = query(collection(db, "examSettings"), where("type", "==", fetchedClassType), where("mock", "==", selectedTab));
          const settingsSnapshot = await getDocs(settingsQuery);
          const fetchedSettings: ExamSettings = {};
          settingsSnapshot.forEach(doc => {
            const data = doc.data();
            fetchedSettings[data.subject] = { maxScore: data.maxScore };
          });
          settings = fetchedSettings;
          setExamSettings(settings);
          dispatch(setMockExamSettings({
            settingsKey,
            data: { settings, lastFetched: new Date().toISOString() },
          }));
        }

        // Fetch scores if they are not fresh, requires settings to be determined first
        if (!isScoresFresh && settings && Object.keys(settings).length > 0) {
          const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
          const scoresUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}&exam_name=${selectedTab}`;
          const scoresResponse = await fetch(scoresUrl);
          const scoresData = await scoresResponse.json();
          
          const fetchedScores: ExamScores = {};
          if (scoresData.scores) {
            Object.keys(settings).forEach(subject => {
              fetchedScores[subject] = Number(scoresData.scores[subject]) || 0;
            });
          }
          setExamScores(fetchedScores);
          dispatch(setMockExamData({
            examName: scoresKey,
            data: { scores: fetchedScores, lastFetched: new Date().toISOString() },
          }));
        } else if (isScoresFresh) {
          // If scores were fresh but settings were not, we still need to set them
          setExamScores(cachedScores.scores);
        }

      } catch (error) {
        console.error("Failed to load exam data:", error);
        setExamSettings({});
        setExamScores({});
      } finally {
        setIsExamLoading(false);
      }
    };
    
    loadData();
    
  }, [studentDocId, selectedTab, dispatch]); // Dependencies are correct


  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  // Helper functions and memoized calculations remain the same...
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

  const examResults = useMemo(() => {
    const subjects = Object.keys(examSettings);
    let totalScore = 0;
    let totalMaxScore = 0;

    subjects.forEach(subject => {
      const score = examScores[subject] || 0;
      if (subject.toLowerCase() === 'english') {
        if (score > 25) {
          totalScore += (score - 25);
        }
      } else {
        totalScore += score;
        totalMaxScore += examSettings[subject]?.maxScore || 0;
      }
    });
    
    const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const totalGrade = calculateGrade(totalScore, totalMaxScore);

    return { subjects, totalScore, totalMaxScore, totalPercentage, totalGrade };
  }, [examSettings, examScores]);

  const animatedTotalScore = useCountUp(examResults.totalScore, 3000, [selectedTab]);

  const handlePermissionSuccess = () => {
    setIsPermissionModalActive(false);
  };
  
  const { room, seat } = useMemo(() => {
    if (typeof seatInfo !== 'string' || seatInfo.length < 3) {
      return { room: '?', seat: '?' };
    }
    const len = seatInfo.length;
    const seatValue = seatInfo.substring(len - 2);
    const roomValue = seatInfo.substring(0, len - 2);
    return { room: roomValue, seat: seatValue };
  }, [seatInfo]);

  const { phonePocketHolder, phonePocketSlot } = useMemo(() => {
    if (typeof phoneInfo !== 'string' || phoneInfo.length !== 3) {
      return { phonePocketHolder: '?', phonePocketSlot: '?' };
    }
    const holderValue = phoneInfo.substring(0, 1);
    const slotValue = phoneInfo.substring(1);
    return { phonePocketHolder: holderValue, phonePocketSlot: slotValue };
  }, [phoneInfo]);

  return (
    <div className="p-6">
        <CardBoxModal title="Your Personal QR Code" isActive={isQrModalActive} onConfirm={() => setIsQrModalActive(false)} onCancel={() => setIsQrModalActive(false)}>
            <StudentQRCode studentName={studentName || ''} studentUid={studentUid || ''} qrSize={256} />
        </CardBoxModal>
        <CardBoxModal title="Request Permission for Absence" isActive={isPermissionModalActive} onCancel={() => setIsPermissionModalActive(false)}>
          <PermissionRequestForm onSuccess={handlePermissionSuccess} />
        </CardBoxModal>
        
        <ProgressBar status={progressStatus} loading={isProgressLoading} />
            
        {!isProgressLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6 mt-6">
            <div className="relative h-32">
              <Image
                src="/door.png"
                alt="Room"
                width={80}
                height={80}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-4"
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
            <div className="relative h-32">
              <Image
                src="/school-desk.png"
                alt="Seat"
                width={80}
                height={80}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 saturate-125 contrast-125"
              />
              <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${
                progressStatus === 'Paid Star' || progressStatus === 'Borrow' 
                  ? 'justify-between items-end' 
                  : 'justify-center items-center'
              }`}>
              {progressStatus === 'Paid Star' || progressStatus === 'Borrow' ? (
                <>
                  <span className="font-semibold text-white">Seat</span>
                  <span className="text-5xl font-bold text-white">
                    {seat}
                  </span>
                </>
              ) : (
                <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-8">
                  Pay STAR to View your Exam Seat
                </span>
              )}
              </div>
            </div>
            <div className="relative h-32">
              <Image
                src="/pocket.png"
                alt="Phone Pocket"
                width={80}
                height={80}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-4 saturate-125 contrast-125"
              />
              <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${progressStatus === 'Paid Star' || progressStatus === 'Borrow' ? 'justify-between items-end' : 'justify-center items-center'}`}>
                {progressStatus !== "" ? (
                  <>
                    <span className="font-semibold text-white">Phone Pocket</span>
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-white">
                          {phonePocketHolder}
                        </span>
                        <span className="text-xl font-semibold text-gray-400 ml-2">
                          #{phonePocketSlot}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-8">
                      Register to View your Phone Pocket
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}

        <hr className="my-4 border-slate-800" />
        
        <MockExamResults
          availableTabs={availableTabs}
          selectedTab={selectedTab}
          handleTabChange={handleTabChange}
          isExamLoading={isExamLoading}
          examSettings={examSettings}
          examScores={examScores}
          examResults={examResults}
          animatedTotalScore={animatedTotalScore}
          studentClassType={studentClassType}
          progressStatus={progressStatus}
          calculateGrade={calculateGrade}
          SUBJECT_ORDER={SUBJECT_ORDER}
          SOCIAL_STUDIES_LABELS={SOCIAL_STUDIES_LABELS}
        />
    </div>
  );
};

export default MockExamPage;