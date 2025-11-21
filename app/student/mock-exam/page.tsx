"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Firebase and Data Handling
import { db } from '../../../firebase-config';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, limit } from 'firebase/firestore';

// Redux
import { useAppSelector, useAppDispatch } from '../../_stores/hooks';
import { setMockExamData, setMockExamSettings, setProgressData, setRadarChartData, setStudentClassType } from '../../_stores/mainSlice';

// UI Components
import useCountUp from '../../_hooks/useCountUp';
import MockExamResults from './_components/MockExamResults';
import ProgressBar from './_components/ProgressBar';
import SeatArrangement from './_components/SeatArrangement';
import PerformanceRadarChartSkeleton from './_components/PerformanceRadarChartSkeleton';

// Appointment Components
import MyAppointments from './_components/appointments/MyAppointments';

// Internationalization
import { useTranslations } from 'next-intl';

const PerformanceRadarChart = dynamic(() => import('./_components/PerformanceRadarChart'), {
  ssr: false,
  loading: () => <PerformanceRadarChartSkeleton />
});

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number | 'absent' };
type AllMockScores = { [mockName: string]: ExamScores };

const isCacheFresh = (lastFetched: string | undefined) => {
    if (!lastFetched) return false;
    return (Date.now() - new Date(lastFetched).getTime()) < 5 * 60 * 1000; // 5 minutes
};

const MockExamPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);
  const studentClassType = useAppSelector((state) => state.main.studentClassType);

  // Translations
  const t = useTranslations('student.mockExam');

  // Caches from Redux
  const mockExamCache = useAppSelector((state) => state.main.mockExamCache);
  const mockExamSettingsCache = useAppSelector((state) => state.main.mockExamSettingsCache);
  const progressCache = useAppSelector((state) => state.main.progressCache);
  const radarChartCache = useAppSelector((state) => state.main.radarChartCache);

  // Component State
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('mock1');
  const [isPermissionModalActive, setIsPermissionModalActive] = useState(false);
  const [mockReadiness, setMockReadiness] = useState<{ [mockId: string]: boolean }>({});
  const [progressStatus, setProgressStatus] = useState<string>("No Registered");
  
  // Data state
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [allExamSettings, setAllExamSettings] = useState<{ [mockName: string]: ExamSettings }>({});
  const [examScores, setExamScores] = useState<ExamScores>({});
  const [allMockScores, setAllMockScores] = useState<AllMockScores>({});
  const [seatInfo, setSeatInfo] = useState<string | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
  const [lastPaymentMonth, setLastPaymentMonth] = useState<string | null>(null);

  // Loading states
  const [isExamLoading, setIsExamLoading] = useState(true);
  const [isAllMocksLoading, setIsAllMocksLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Appointment state
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);
  const [bookingDisabled, setBookingDisabled] = useState(false);

  // Remove: Fetch admin availability on mount - no longer needed since using appointments page
  // Remove: handleCloseBookingForm and handleBookingSuccess - moved to appointments page


  // Fetch student registration status for the selected tab (for Mock 3 check)
  // Using real-time listener for automatic updates
  useEffect(() => {
    if (!selectedTab || !studentDocId) {
      setProgressStatus("No Registered");
      return;
    }

    let unsubscribeFormResponses: (() => void) | null = null;

    const setupRealtimeListener = async () => {
      try {
        // Get the eventId from examControls
        const controlDocRef = doc(db, 'examControls', selectedTab);
        const controlDocSnap = await getDoc(controlDocRef);

        if (!controlDocSnap.exists() || !controlDocSnap.data().eventId) {
          setProgressStatus("No Registered");
          return;
        }

        const eventId = controlDocSnap.data().eventId;

        // Get the formId from events collection
        const eventDocRef = doc(db, 'events', eventId);
        const eventDocSnap = await getDoc(eventDocRef);

        if (!eventDocSnap.exists() || !eventDocSnap.data().formId) {
          setProgressStatus("No Registered");
          return;
        }

        const formId = eventDocSnap.data().formId;

        // Set up real-time listener for form_responses
        // Try to find response by authUid first (preferred for newer records)
        let formResponsesQuery = query(
          collection(db, 'form_responses'),
          where('formId', '==', formId),
          where('authUid', '==', studentUid)
        );

        let responsesSnapshot = await getDocs(formResponsesQuery);
        
        // If not found by authUid, try studentUid (for older records or admin-created records)
        if (responsesSnapshot.empty) {
          formResponsesQuery = query(
            collection(db, 'form_responses'),
            where('formId', '==', formId),
            where('studentUid', '==', studentUid)
          );
          responsesSnapshot = await getDocs(formResponsesQuery);
        }

        unsubscribeFormResponses = onSnapshot(
          formResponsesQuery,
          (snapshot) => {
            if (snapshot.empty) {
              setProgressStatus("No Registered");
              return;
            }

            // Get the first (and should be only) registration
            const registrationData = snapshot.docs[0].data();
            
            // Determine status based on registrationStatus and paymentStatus
            const registrationStatus = registrationData.registrationStatus || 'pending';
            const paymentStatus = registrationData.paymentStatus;

            if (registrationStatus === 'rejected') {
              setProgressStatus("No Registered");
            } else if (registrationStatus === 'pending') {
              setProgressStatus("Registered");
            } else if (registrationStatus === 'approved') {
              if (paymentStatus === 'paid') {
                setProgressStatus("Paid Star");
              } else if (paymentStatus === 'borrowed') {
                setProgressStatus("Borrow");
              } else {
                setProgressStatus("Registered");
              }
            } else {
              setProgressStatus("Registered");
            }
          },
          (error) => {
            console.error('Error listening to registration status:', error);
            setProgressStatus("No Registered");
          }
        );

      } catch (error) {
        console.error('Error setting up registration status listener:', error);
        setProgressStatus("No Registered");
      }
    };

    setupRealtimeListener();

    // Cleanup function
    return () => {
      if (unsubscribeFormResponses) {
        unsubscribeFormResponses();
      }
    };
  }, [selectedTab, studentDocId]);

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

  // Fetch Student's Last Payment Month
  useEffect(() => {
    if (studentDocId) {
      const fetchLastPaymentMonth = async () => {
        const studentRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          setLastPaymentMonth(studentData.lastPaymentMonth || null);
        }
      };
      fetchLastPaymentMonth();
    }
  }, [studentDocId]);

  // Combined data fetching logic
  const loadAllData = useCallback(async () => {
    if (!studentDocId || !studentClassType) return;

    setIsInitialLoad(false);

    // --- EXAM DATA (ALL MOCKS AND SELECTED) ---
    const cachedRadar = radarChartCache[studentDocId];
    const isCachedRadarValid = isCacheFresh(cachedRadar?.lastFetched) && 
                               cachedRadar?.data && 
                               Object.keys(cachedRadar.data).length > 0;
    
    if (isCachedRadarValid) {
        setAllMockScores(cachedRadar.data);
        
        // Also populate allExamSettings from cache when using cached radar data
        const settingsForAllMocks: { [mockName: string]: ExamSettings } = {};
        availableTabs.forEach(mockName => {
            const sKey = `${studentClassType}-${mockName}`;
            const cachedSettings = mockExamSettingsCache[sKey];
            if (cachedSettings?.settings) {
                settingsForAllMocks[mockName] = cachedSettings.settings;
            }
        });
        setAllExamSettings(settingsForAllMocks);
        
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
                // Query mockExam1 by studentId field (which stores the Firestore doc ID)
                const mockExam1Query = query(
                    collection(db, 'mockExam1'),
                    where('studentId', '==', studentDocId)
                );
                const mockExam1Snapshot = await getDocs(mockExam1Query);
                
                const fetchedScores: ExamScores = {};
                
                if (!mockExam1Snapshot.empty) {
                    const mockData = mockExam1Snapshot.docs[0].data();
                    
                    // Determine which mock result to read (mock1Result, mock2Result, etc.)
                    const mockResultKey = `${selectedTab}Result`; // e.g., "mock1Result"
                    const mockResult = mockData[mockResultKey] || {};
                    
                    // Process scores: handle "absent" and convert to numbers
                    Object.keys(settings).forEach(subject => {
                        const score = mockResult[subject.toLowerCase()];
                        if (score === 'absent' || score === -1 || score === null || score === undefined) {
                            fetchedScores[subject] = 0;
                        } else if (typeof score === 'number') {
                            fetchedScores[subject] = score;
                        } else {
                            fetchedScores[subject] = 0;
                        }
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
                // Fetch scores from mockExam1 collection using studentDocId
                try {
                    
                    // Query mockExam1 by studentId field (which stores the Firestore doc ID)
                    const mockExam1Query = query(
                        collection(db, 'mockExam1'),
                        where('studentId', '==', studentDocId)
                    );
                    const mockExam1Snapshot = await getDocs(mockExam1Query);
                    
                    const fetchedScores: ExamScores = {};
                    
                    if (!mockExam1Snapshot.empty) {
                        const mockData = mockExam1Snapshot.docs[0].data();
                        
                        // Determine which mock result to read (mock1Result, mock2Result, etc.)
                        const mockResultKey = `${mockName}Result`; // e.g., "mock1Result"
                        const mockResult = mockData[mockResultKey] || {};
                        
                        // Process scores: handle "absent" and convert to numbers
                        Object.keys(settings).forEach(subject => {
                            const score = mockResult[subject.toLowerCase()];
                            if (score === 'absent' || score === -1 || score === null || score === undefined) {
                                fetchedScores[subject] = 'absent';
                            } else if (typeof score === 'number') {
                                fetchedScores[subject] = score;
                            } else {
                                fetchedScores[subject] = 0;
                            }
                        });
                        
                    }
                    
                    scores = fetchedScores;
                    dispatch(setMockExamData({ examName: scKey, data: { scores, lastFetched: new Date().toISOString() }}));
                } catch (error) {
                    console.error(`Failed to load ${mockName} scores:`, error);
                }
            }
            
            if (scores) {
                allData[mockName] = scores;
            } else {
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
    if (studentDocId && studentClassType && isInitialLoad && availableTabs.length > 0) {
      loadAllData();
    }
  }, [studentDocId, studentClassType, isInitialLoad, availableTabs, loadAllData]);
  
  useEffect(() => {
    if (!isInitialLoad) {
        loadAllData();
    }
  }, [selectedTab, isInitialLoad, loadAllData]);

  useEffect(() => {
    const fetchAvailableMocks = async () => {
      const mockControls = ['mock1', 'mock2', 'mock3', 'mock4'];
      const readyMocks: string[] = [];

      for (const mockId of mockControls) {
        try {
          const controlDocRef = doc(db, 'examControls', mockId);
          const controlDocSnap = await getDoc(controlDocRef);

          if (controlDocSnap.exists()) {
            const controlData = controlDocSnap.data();
            if (controlData.isReadyForStudent === true) {
              readyMocks.push(mockId);
            }
          }
        } catch (error) {
          console.warn(`Failed to check ${mockId} readiness:`, error);
        }
      }

      setAvailableTabs(readyMocks);

      // Set default selected tab to the first available mock
      if (readyMocks.length > 0 && !readyMocks.includes(selectedTab)) {
        setSelectedTab(readyMocks[0]);
      }
    };

    fetchAvailableMocks();
  }, []);

  // Real-time listeners for mock readiness
  useEffect(() => {
    if (availableTabs.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    availableTabs.forEach(mockId => {
      const controlDocRef = doc(db, 'examControls', mockId);
      const unsubscribe = onSnapshot(controlDocRef, (controlDocSnap) => {
        if (controlDocSnap.exists()) {
          const controlData = controlDocSnap.data();
          const isReady = controlData.isReadyToPublishedResult === true;
          setMockReadiness(prev => ({
            ...prev,
            [mockId]: isReady
          }));
        }
      }, (error) => {
        console.warn(`Failed to listen to ${mockId} readiness:`, error);
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [availableTabs]);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };
  
  const calculateGrade = (score: number | 'absent', maxScore: number): string => {
    if (score === 'absent' || maxScore === 0) return 'N/A';
    const percentage = score / maxScore;
    if (percentage >= 0.9) return 'A';
    if (percentage >= 0.8) return 'B';
    if (percentage >= 0.7) return 'C';
    if (percentage >= 0.6) return 'D';
    if (percentage >= 0.5) return 'E';
    return 'F';
  };

  // Dynamically generate SUBJECT_ORDER based on examSettings to match actual subjects
  const SUBJECT_ORDER = useMemo(() => {
    if (!examSettings || Object.keys(examSettings).length === 0) {
      return [];
    }
    
    // Define the preferred order for all possible subjects
    const preferredOrder = ['khmer', 'math', 'history', 'moral', 'geography', 'earth', 'geometry', 'chemistry', 'physics', 'biology', 'english'];
    
    // Get subjects from examSettings and sort them according to preferredOrder
    const availableSubjects = Object.keys(examSettings);
    
    return availableSubjects.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      
      // If both are in preferred order, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only a is in preferred order, it comes first
      if (indexA !== -1) return -1;
      // If only b is in preferred order, it comes first
      if (indexB !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });
  }, [examSettings]);
  
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
      const score = examScores[subject];
      const numericScore = score === 'absent' ? 0 : score || 0;
      if (subject.toLowerCase() === 'english') {
        if (numericScore > 25) {
          totalScore += (numericScore - 25);
        }
      } else {
        totalScore += numericScore;
      }
      totalMaxScore += examSettings[subject]?.maxScore || 0;
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
        <ProgressBar loading={false} availableTabs={availableTabs} currentMockId={selectedTab} />
        
        <SeatArrangement 
          studentDocId={studentDocId || ''} 
          selectedTab={selectedTab} 
          progressStatus={progressStatus}
        />
        
        {/* Appointment Booking Section */}
        <hr className="my-4 border-slate-800 dark:border-gray-600" />
        
        <MyAppointments authUid={studentUid || ''} refreshTrigger={appointmentRefreshTrigger} onBookingDisabled={setBookingDisabled} />
        
        <button
          onClick={() => router.push('/student/appointments')}
          disabled={bookingDisabled}
          className={`w-full mt-4 px-4 py-3 rounded-lg transition-colors ${
            bookingDisabled
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-company-purple text-white hover:bg-company-purple-dark dark:bg-blue-600 dark:hover:bg-blue-700'
          }`}
        >
          {t('appointments.bookWithAdmin')}
        </button>
            
        <hr className="my-4 border-slate-800" />
        <h2 className="text-xl font-bold -mb-2">{t('resultsTitle')}</h2>

        <MockExamResults
          availableTabs={availableTabs}
          selectedTab={selectedTab}
          handleTabChange={handleTabChange}
          isExamLoading={isExamLoading}
          examSettings={examSettings}
          examScores={examScores}
          examResults={examResults}
          animatedTotalScore={animatedTotalScore}
          studentId={studentDocId}
          progressStatus={progressStatus}
          calculateGrade={calculateGrade}
          SUBJECT_ORDER={SUBJECT_ORDER}
          SOCIAL_STUDIES_LABELS={SOCIAL_STUDIES_LABELS}
          seatInfo={seatInfo}
          phoneInfo={phoneInfo}
          studentName={studentName}
          isReadyToPublishResult={mockReadiness[selectedTab] || false}
          lastPaymentMonth={lastPaymentMonth}
        />

        <hr className="my-4 border-slate-800" />
        <h2 className="text-xl font-bold mb-2">{t('journeyTitle')}</h2>

        {/* Performance Chart Section */}
        {isAllMocksLoading ? (
            <PerformanceRadarChartSkeleton />
        ) : (
            <PerformanceRadarChart allMockData={allMockScores} studentClassType={studentClassType} allExamSettings={allExamSettings} mockReadiness={mockReadiness} studentName={studentName} lastPaymentMonth={lastPaymentMonth} />
        )}

        {/* Exam Results Section */}

    </>
  );
};

export default MockExamPage;