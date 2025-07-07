"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Firebase and Data Handling
import { db } from '../../../firebase-config';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';

// Redux
import { useAppSelector, useAppDispatch } from '../../_stores/hooks';
import { setMockExamData, setMockExamSettings, setProgressData, setRadarChartData, setStudentClassType } from '../../_stores/mainSlice';

// UI Components
import useCountUp from '../../_hooks/useCountUp';
import MockExamResults from './MockExamResults';
import ProgressBar from '../_components/ProgressBar';
import CardBoxModal from '../../_components/CardBox/Modal';
import StudentQRCode from '../_components/StudentQRCode';
import { PermissionRequestForm } from '../_components/PermissionRequestForm';
import ExamInfoBoxes from './ExamInfoBoxes';
import PerformanceRadarChartSkeleton from './PerformanceRadarChartSkeleton';
import CardBox from '@/app/_components/CardBox';

const PerformanceRadarChart = dynamic(() => import('./PerformanceRadarChart'), {
  ssr: false,
  loading: () => <PerformanceRadarChartSkeleton />
});

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };
type AllMockScores = { [mockName: string]: ExamScores };

const isCacheFresh = (lastFetched: string | undefined) => {
    if (!lastFetched) return false;
    return (Date.now() - new Date(lastFetched).getTime()) < 5 * 60 * 1000; // 5 minutes
};

const MockExamPage = () => {
  const dispatch = useAppDispatch();
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);
  const studentClassType = useAppSelector((state) => state.main.studentClassType);

  // Caches from Redux
  const mockExamCache = useAppSelector((state) => state.main.mockExamCache);
  const mockExamSettingsCache = useAppSelector((state) => state.main.mockExamSettingsCache);
  const progressCache = useAppSelector((state) => state.main.progressCache);
  const radarChartCache = useAppSelector((state) => state.main.radarChartCache);

  // Component State
  const [availableTabs, setAvailableTabs] = useState(['mock1', 'mock2']);
  const [selectedTab, setSelectedTab] = useState('mock1');
  const [isPermissionModalActive, setIsPermissionModalActive] = useState(false);
  
  // Data state
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [allExamSettings, setAllExamSettings] = useState<{ [mockName: string]: ExamSettings }>({});
  const [examScores, setExamScores] = useState<ExamScores>({});
  const [allMockScores, setAllMockScores] = useState<AllMockScores>({});
  const [progressStatus, setProgressStatus] = useState("No Registered");
  const [seatInfo, setSeatInfo] = useState<string | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<string | null>(null);

  // Loading states
  const [isExamLoading, setIsExamLoading] = useState(true);
  const [isAllMocksLoading, setIsAllMocksLoading] = useState(true);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch Student Class Type
  useEffect(() => {
    if (studentDocId && !studentClassType) {
      const fetchClassType = async () => {
        const studentRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const classQuery = query(collection(db, 'classes'), where('name', '==', studentData.class), limit(1));
          const classQuerySnapshot = await getDocs(classQuery);
          if (!classQuerySnapshot.empty) {
            const fetchedClassType = classQuerySnapshot.docs[0].data().type;
            dispatch(setStudentClassType(fetchedClassType));
          }
        }
      };
      fetchClassType();
    }
  }, [studentDocId, studentClassType, dispatch]);

  // Combined data fetching logic
  const loadAllData = useCallback(async () => {
    if (!studentDocId || !studentClassType) return;

    setIsInitialLoad(false);

    // --- PROGRESS DATA ---
    const cachedProgress = progressCache[studentDocId];
    if (isCacheFresh(cachedProgress?.lastFetched)) {
      setProgressStatus(cachedProgress.status);
      setSeatInfo(cachedProgress.seat);
      setPhoneInfo(cachedProgress.phone);
    } else {
      setIsProgressLoading(true);
      const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
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
        setProgressStatus(progressData.status);
        setSeatInfo(progressData.seat);
        setPhoneInfo(progressData.phone);
        dispatch(setProgressData({ studentId: studentDocId, data: progressData }));
      } catch (error) { console.error("Error fetching progress:", error); }
      finally { setIsProgressLoading(false); }
    }

    // --- EXAM DATA (ALL MOCKS AND SELECTED) ---
    const cachedRadar = radarChartCache[studentDocId];
    if (isCacheFresh(cachedRadar?.lastFetched)) {
        setAllMockScores(cachedRadar.data);
        setIsAllMocksLoading(false);
    }

    // Always fetch the selected tab's data if it's not fresh
    const settingsKey = `${studentClassType}-${selectedTab}`;
    const scoresKey = `${studentDocId}-${selectedTab}`;
    const cachedSettings = mockExamSettingsCache[settingsKey];
    const cachedScores = mockExamCache[scoresKey];

    if (isCacheFresh(cachedSettings?.lastFetched) && isCacheFresh(cachedScores?.lastFetched)) {
        setExamSettings(cachedSettings.settings);
        setExamScores(cachedScores.scores);
        setIsExamLoading(false);
    } else {
        setIsExamLoading(true);
        try {
            let settings = cachedSettings?.settings;
            if (!isCacheFresh(cachedSettings?.lastFetched)) {
                const settingsQuery = query(collection(db, "examSettings"), where("type", "==", studentClassType), where("mock", "==", selectedTab));
                const settingsSnapshot = await getDocs(settingsQuery);
                const fetchedSettings: ExamSettings = {};
                settingsSnapshot.forEach(doc => {
                    const data = doc.data();
                    fetchedSettings[data.subject] = { maxScore: data.maxScore };
                });
                settings = fetchedSettings;
                setExamSettings(settings);
                dispatch(setMockExamSettings({ settingsKey, data: { settings, lastFetched: new Date().toISOString() }}));
            }
            
            if (settings && !isCacheFresh(cachedScores?.lastFetched)) {
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
                dispatch(setMockExamData({ examName: scoresKey, data: { scores: fetchedScores, lastFetched: new Date().toISOString() }}));
            }
        } catch (error) { console.error("Failed to load exam data:", error); }
        finally { setIsExamLoading(false); }
    }

    // If radar data is stale, fetch all mocks in the background
    if (!isCacheFresh(cachedRadar?.lastFetched)) {
        if (isInitialLoad) {
          setIsAllMocksLoading(true);
        }

        const allData: AllMockScores = {};
        const allSettings: { [mockName: string]: ExamSettings } = {};
        const promises = availableTabs.map(async (mockName) => {
            const sKey = `${studentClassType}-${mockName}`;
            const scKey = `${studentDocId}-${mockName}`;
            const cSettings = mockExamSettingsCache[sKey];
            const cScores = mockExamCache[scKey];

            let settings = isCacheFresh(cSettings?.lastFetched) ? cSettings.settings : null;
            if (!settings) {
                const settingsQuery = query(collection(db, "examSettings"), where("type", "==", studentClassType), where("mock", "==", mockName));
                const settingsSnapshot = await getDocs(settingsQuery);
                const fetchedSettings: ExamSettings = {};
                settingsSnapshot.forEach(doc => { fetchedSettings[doc.data().subject] = { maxScore: doc.data().maxScore }; });
                settings = fetchedSettings;
                dispatch(setMockExamSettings({ settingsKey: sKey, data: { settings, lastFetched: new Date().toISOString() }}));
            }
            if (settings) {
                allSettings[mockName] = settings;
            }
            
            let scores = isCacheFresh(cScores?.lastFetched) ? cScores.scores : null;
            if (settings && !scores) {
                const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
                const scoresUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}&exam_name=${mockName}`;
                const scoresResponse = await fetch(scoresUrl);
                const scoresData = await scoresResponse.json();
                const fetchedScores: ExamScores = {};
                if (scoresData.scores) {
                    Object.keys(settings).forEach(subject => { fetchedScores[subject] = Number(scoresData.scores[subject]) || 0; });
                }
                scores = fetchedScores;
                dispatch(setMockExamData({ examName: scKey, data: { scores, lastFetched: new Date().toISOString() }}));
            }
            if (scores) {
                allData[mockName] = scores;
            }
        });
        
        await Promise.all(promises);
        setAllExamSettings(allSettings);
        setAllMockScores(allData);
        dispatch(setRadarChartData({ studentId: studentDocId, data: { data: allData, lastFetched: new Date().toISOString() }}));
        if (isInitialLoad) {
          setIsAllMocksLoading(false);
        }
    }

  }, [studentDocId, studentClassType, selectedTab, dispatch, availableTabs, mockExamCache, mockExamSettingsCache, progressCache, radarChartCache, isInitialLoad]);


  useEffect(() => {
    if (studentDocId && studentClassType && isInitialLoad) {
      loadAllData();
    }
  }, [studentDocId, studentClassType, isInitialLoad, loadAllData]);
  
  useEffect(() => {
    if (!isInitialLoad) {
        loadAllData();
    }
  }, [selectedTab, isInitialLoad, loadAllData]);

  useEffect(() => {
    const fetchExamControls = async () => {
      const controlDocRef = doc(db, 'examControls', 'mock3');
      const docSnap = await getDoc(controlDocRef);
      if (docSnap.exists() && docSnap.data().isPublished) {
        setAvailableTabs(prev => prev.includes('mock3') ? prev : [...prev, 'mock3']);
      }
    };
    fetchExamControls();
  }, []);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };
  
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
  
  return (
    <>
        <ProgressBar status={progressStatus} loading={isProgressLoading} />
            
        <hr className="my-2 border-slate-800" />
        <h2 className="text-xl font-bold -mb-2">Mock Exam Results</h2>

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
          seatInfo={seatInfo}
          phoneInfo={phoneInfo}
        />

        <hr className="my-2 border-slate-800" />
        <h2 className="text-xl font-bold mb-2">Your Exam Journey</h2>

        <CardBoxModal
          isActive={isPermissionModalActive}
          onConfirm={handlePermissionSuccess}
          title="Permission Request"
        >
           <PermissionRequestForm />
        </CardBoxModal>

        {/* Performance Chart Section */}
        {isAllMocksLoading ? (
            <PerformanceRadarChartSkeleton />
        ) : (
            <PerformanceRadarChart allMockData={allMockScores} progressStatus={progressStatus} studentClassType={studentClassType} allExamSettings={allExamSettings} />
        )}

        {/* Exam Results Section */}

    </>
  );
};

export default MockExamPage;