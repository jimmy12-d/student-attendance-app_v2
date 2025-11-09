"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { db } from "@/firebase-config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast, Toaster } from "sonner";
import { mdiMagnify } from "@mdi/js";
import dynamic from 'next/dynamic';

// Reusable Components
import CardBox from "@/app/_components/CardBox";
import Button from "@/app/_components/Button";
import MockExamResultsPublic from "@/app/mock-results/_components/MockExamResultsPublic";
import PerformanceRadarChartSkeleton from "@/app/student/mock-exam/_components/PerformanceRadarChartSkeleton";

// Hooks
import useCountUp from "@/app/_hooks/useCountUp";

// Dynamic imports
const PerformanceRadarChartPublic = dynamic(() => import('@/app/mock-results/_components/PerformanceRadarChartPublic'), {
  ssr: false,
  loading: () => <PerformanceRadarChartSkeleton />
});

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };
type AllMockScores = { [mockName: string]: ExamScores };
type MockResultsData = {
  fullName: string;
  studentId: string | number | null;
  phone: string | number;
  class: string;
  shift: string;
  room: number;
  roomLabel: string;
  seat: string;
  mockResults: {
    mock_1: ExamScores;
    mock_2: ExamScores;
    mock_3: ExamScores;
    mock_4?: ExamScores;
  };
};

// Grade calculation utility
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

const getGradeDependentStyles = (grade: string) => {
    switch (grade) {
        case 'A': return { glow1: 'bg-green-500/30', glow2: 'bg-emerald-500/20', gradeBadge: 'bg-green-500/30 text-green-200 border-green-500/50', shadow: 'shadow-green-800/40 hover:shadow-green-700/50', progressColor: '#4ade80' };
        case 'B': return { glow1: 'bg-emerald-500/30', glow2: 'bg-teal-500/20', gradeBadge: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50', shadow: 'shadow-emerald-800/40 hover:shadow-emerald-700/50', progressColor: '#34d399' };
        case 'C': return { glow1: 'bg-sky-500/30', glow2: 'bg-cyan-500/20', gradeBadge: 'bg-sky-500/30 text-sky-200 border-sky-500/50', shadow: 'shadow-sky-800/40 hover:shadow-sky-700/50', progressColor: '#38bdf8' };
        case 'D': return { glow1: 'bg-yellow-500/30', glow2: 'bg-amber-500/20', gradeBadge: 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50', shadow: 'shadow-yellow-800/40 hover:shadow-yellow-700/50', progressColor: '#facc15' };
        case 'E': return { glow1: 'bg-orange-500/30', glow2: 'bg-red-500/20', gradeBadge: 'bg-orange-500/30 text-orange-200 border-orange-500/50', shadow: 'shadow-orange-800/40 hover:shadow-orange-700/50', progressColor: '#fb923c' };
        case 'F': return { glow1: 'bg-red-600/30', glow2: 'bg-rose-600/20', gradeBadge: 'bg-red-500/30 text-red-200 border-red-500/50', shadow: 'shadow-red-800/40 hover:shadow-red-700/50', progressColor: '#ef4444' };
        default: return { glow1: 'bg-slate-600/30', glow2: 'bg-slate-700/20', gradeBadge: 'bg-slate-600/30 text-slate-200 border-slate-500/50', shadow: 'shadow-slate-800/40 hover:shadow-slate-700/50', progressColor: '#94a3b8' };
    }
};

const SUBJECT_ORDER = ['math', 'khmer', 'geometry', 'chemistry', 'physics', 'biology', 'history', 'english'];
const SOCIAL_STUDIES_LABELS: { [key: string]: string } = {
  math: 'Khmer',
  khmer: 'Math', 
  geometry: 'Geometry',
  chemistry: 'History',
  physics: 'Moral',
  biology: 'Biology',
  history: 'Earth',
  english: 'English',
};

const LoadingAnimation = () => (
    <div className="w-full max-w-lg mx-auto mt-6">
        <div className="flex flex-col items-center justify-center p-8">
            {/* Spinning circle animation */}
            <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-slate-300 dark:border-slate-600 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-company-purple rounded-full animate-spin"></div>
            </div>
            
            {/* Pulsing dots */}
            <div className="flex space-x-2 mb-4">
                <div className="w-3 h-3 bg-company-purple rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-company-purple rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-company-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            
            {/* Loading text */}
            <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Searching for results...</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Please wait while we fetch your exam data</p>
        </div>
    </div>
);

export default function Mock3ResultPage() {
  const [id, setId] = useState("");
  const [examScores, setExamScores] = useState<ExamScores | null>(null);
  const [examSettings, setExamSettings] = useState<ExamSettings | null>(null);
  const [allMockScores, setAllMockScores] = useState<AllMockScores>({});
  const [allExamSettings, setAllExamSettings] = useState<{ [mockName: string]: ExamSettings }>({});
  const [studentData, setStudentData] = useState<MockResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAllMocksLoading, setIsAllMocksLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('mock3');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [mock4Ready, setMock4Ready] = useState(false);
  const [availableMocks, setAvailableMocks] = useState<string[]>([]);
  const [mockReadiness, setMockReadiness] = useState<{ [mockId: string]: boolean }>({});
  const [lastPaymentMonth, setLastPaymentMonth] = useState<string | null>(null);

  const handleFetchResult = async () => {
    if (!id || !/^\d{4,5}$/.test(id.trim())) {
      toast.error("Please enter your student ID.");
      return;
    }
    
    setLoading(true);
    setIsAllMocksLoading(true);
    setExamScores(null);
    setExamSettings(null);
    setStudentData(null);
    setAllMockScores({});
    setAllExamSettings({});

    try {
      // Direct document access from mockExam1 collection
      const docRef = doc(db, "mockExam1", id.trim());
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        toast.error("The student ID you entered was not found.");
        return;
      }

      const rawData = docSnap.data();
      
      // Fetch student's actual class and shift from students collection
      let actualClass = rawData.classType || 'N/A';
      let actualShift = rawData.shift || 'N/A';
      let studentLastPaymentMonth: string | null = null;
      
      try {
        // Use studentId from mockExam1 document to fetch from students collection
        const actualStudentId = rawData.studentId || id.trim();
        const studentRef = doc(db, "students", actualStudentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentInfo = studentSnap.data();
          actualClass = studentInfo.class || actualClass;
          actualShift = studentInfo.shift || actualShift;
          studentLastPaymentMonth = studentInfo.lastPaymentMonth || null;
        }
      } catch (error) {
        console.warn('Could not fetch student details:', error);
      }
      
      setLastPaymentMonth(studentLastPaymentMonth);
      
      // Transform mockExam1 data structure to match MockResultsData type
      const mockData: MockResultsData = {
        fullName: rawData.fullName || 'Unknown',
        studentId: rawData.studentId || id.trim(),
        phone: rawData.phone || 'N/A',
        class: actualClass,
        shift: actualShift,
        room: rawData.room || 0,
        roomLabel: rawData.roomLabel || 'N/A',
        seat: rawData.seat || 'N/A',
        mockResults: {
          mock_1: rawData.mock1Result || {},
          mock_2: rawData.mock2Result || {},
          mock_3: rawData.mock3Result || {},
          mock_4: rawData.mock4Result || {}
        }
      };
      
      setStudentData(mockData);

      // Check which mocks are ready for students
      const mockControls = ['mock1', 'mock2', 'mock3', 'mock4'];
      const readyMocks: string[] = [];
      
      for (const mockId of mockControls) {
        try {
          const controlDocRef = doc(db, "examControls", mockId);
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
      
      setAvailableMocks(readyMocks);
      setAvailableTabs(readyMocks);

      // Fetch mock readiness for published results
      const readinessData: { [mockId: string]: boolean } = {};
      for (const mockId of mockControls) {
        try {
          const controlDocRef = doc(db, "examControls", mockId);
          const controlDocSnap = await getDoc(controlDocRef);
          
          if (controlDocSnap.exists()) {
            const controlData = controlDocSnap.data();
            readinessData[mockId] = controlData.isReadyToPublishedResult === true;
          }
        } catch (error) {
          console.warn(`Failed to check ${mockId} published readiness:`, error);
        }
      }
      setMockReadiness(readinessData);
      
      // Set default selected tab to the highest available mock
      if (readyMocks.length > 0) {
        const highestMock = readyMocks[readyMocks.length - 1];
        setSelectedTab(highestMock);
      }

      // Set current mock scores and all mock scores
      // Convert score values: handle "absent" strings by converting to 0 for display
      const processScores = (scores: any) => {
        const processed: ExamScores = {};
        Object.keys(scores).forEach(subject => {
          const score = scores[subject];
          // Handle absent, -1, or invalid scores
          if (score === 'absent' || score === -1 || score === null || score === undefined) {
            processed[subject] = 0;
          } else if (typeof score === 'number') {
            processed[subject] = score;
          } else {
            processed[subject] = 0;
          }
        });
        return processed;
      };
      
      const currentMockScores = processScores(mockData.mockResults.mock_3 || {});
      setExamScores(currentMockScores);
      
      const allScores: AllMockScores = {
        mock1: processScores(mockData.mockResults.mock_1 || {}),
        mock2: processScores(mockData.mockResults.mock_2 || {}),
        mock3: processScores(mockData.mockResults.mock_3 || {})
      };
      
      // Add mock4 if it exists in the data
      if (mockData.mockResults && mockData.mockResults.mock_4) {
        (allScores as any).mock4 = processScores(mockData.mockResults.mock_4 || {});
      }
      
      setAllMockScores(allScores);

      // Determine student class type for exam settings
      // In mockExam1, classType already contains the grade type we need
      let studentClassType = rawData.classType || 'Grade 12 Science';
      
      // If classType is not set or seems like a class name, derive it from actualClass
      if (!rawData.classType || rawData.classType.startsWith('Class ')) {
        const className = actualClass;
        
        if (className.startsWith('Class 7')) {
          studentClassType = "Grade 7";
        } else if (className.startsWith('Class 8')) {
          studentClassType = "Grade 8";
        } else if (className.startsWith('Class 9')) {
          studentClassType = "Grade 9";
        } else if (className.startsWith('Class 10')) {
          studentClassType = "Grade 10";
        } else if (className === 'Class 11A') {
          studentClassType = "Grade 11A";
        } else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(className)) {
          studentClassType = "Grade 11E";
        } else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(className)) {
          studentClassType = "Grade 12 Social";
        } else if (className.startsWith('Class 12')) {
          studentClassType = "Grade 12";
        }
      }

      // Fetch exam settings for all available mocks
      const allSettings: { [mockName: string]: ExamSettings } = {};
      
      for (const mockName of readyMocks) {
        const settingsQuery = query(
          collection(db, "examSettings"),
          where("type", "==", studentClassType),
          where("mock", "==", mockName)
        );
        const settingsSnapshot = await getDocs(settingsQuery);
        
        if (!settingsSnapshot.empty) {
          const fetchedSettings: ExamSettings = {};
          settingsSnapshot.forEach(doc => {
            const data = doc.data();
            fetchedSettings[data.subject] = { maxScore: data.maxScore };
          });
          allSettings[mockName] = fetchedSettings;
        }
      }

      setAllExamSettings(allSettings);
      
      // Set current exam settings to the highest available mock
      if (readyMocks.length > 0) {
        const highestMock = readyMocks[readyMocks.length - 1];
        setExamSettings(allSettings[highestMock] || {});
        
        // Update current exam scores to match the selected tab
        const mockKey = highestMock === 'mock1' ? 'mock_1' : 
                       highestMock === 'mock2' ? 'mock_2' : 
                       highestMock === 'mock3' ? 'mock_3' : 'mock_4';
        
        if (mockData.mockResults && (mockData.mockResults as any)[mockKey]) {
          setExamScores(processScores((mockData.mockResults as any)[mockKey]));
        }
      }

      // Check if Mock 4 is ready
      const mock4DocRef = doc(db, "examSettings", "mock_4");
      const mock4DocSnap = await getDoc(mock4DocRef);
      
      let isMock4Ready = false;
      if (mock4DocSnap.exists()) {
        const data = mock4DocSnap.data();
        if (data.isReady === true) {
          isMock4Ready = true;
        }
      }
      setMock4Ready(isMock4Ready);

      toast.success("Result found!");

    } catch (err: any) {
      console.error("Error fetching result:", err);
      toast.error("Failed to fetch result. Please try again.");
    } finally {
      setLoading(false);
      setIsAllMocksLoading(false);
    }
  };

  const examResults = useMemo(() => {
    if (!examScores || !examSettings) return null;

    const subjects = Object.keys(examSettings);
    let totalScore = 0;
    let totalMaxScore = 0;

    subjects.forEach(subject => {
      const score = examScores[subject] || 0;
      
      if (subject === 'english') {
        // English is bonus subject - only add if score > 25
        if (score > 25) {
          totalScore += (score - 25); // Add only the bonus amount
        }
        // Don't add English to totalMaxScore as it's bonus only
      } else {
        // Regular subjects - add both score and max score
        totalScore += score;
        totalMaxScore += examSettings[subject]?.maxScore || 0;
      }
    });
    
    const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const totalGrade = calculateGrade(totalScore, totalMaxScore);

    return { subjects, totalScore, totalMaxScore, totalPercentage, totalGrade };
  }, [examSettings, examScores]);

  const animatedTotalScore = useCountUp(examResults?.totalScore ?? 0, 3000, [examResults]);
  
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    if (studentData && allExamSettings[tab]) {
      const mockKey = tab === 'mock1' ? 'mock_1' : 
                     tab === 'mock2' ? 'mock_2' : 
                     tab === 'mock3' ? 'mock_3' : 'mock_4';
      
      if (studentData.mockResults && (studentData.mockResults as any)[mockKey]) {
        // Process scores to handle "absent" values
        const processScores = (scores: any) => {
          const processed: ExamScores = {};
          Object.keys(scores).forEach(subject => {
            const score = scores[subject];
            if (score === 'absent' || score === -1 || score === null || score === undefined) {
              processed[subject] = 0;
            } else if (typeof score === 'number') {
              processed[subject] = score;
            } else {
              processed[subject] = 0;
            }
          });
          return processed;
        };
        
        setExamScores(processScores((studentData.mockResults as any)[mockKey]));
        setExamSettings(allExamSettings[tab]);
      }
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleFetchResult();
    }
  };

  const gradeStyles = getGradeDependentStyles(examResults?.totalGrade ?? '');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-start p-4 pt-10">
      <Toaster richColors position="top-center" />
      
      <div className="mb-8">
        <Image
            src="/favicon.png"
            alt="School Logo"
            width={112}
            height={112}
            className="rounded-full"
        />
      </div>

      <CardBox className="w-full max-w-lg mx-auto shadow-2xl dark:shadow-black/20">
        <div className="p-6">
            <h1 className="text-2xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">Mock Exams Result</h1>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">Enter your student ID to find your mock exam result.</p>
            
            <div className="relative">
              <div className="flex rounded-md">
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 2121"
                  className="block w-full px-4 py-3 rounded-l-md bg-gray-50 border border-gray-300 text-slate-900 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                  disabled={loading}
                />
                <Button
                  onClick={handleFetchResult}
                  disabled={loading}
                  color="void"
                  className="!rounded-l-none bg-company-purple-dark border-company-purple-dark text-white hover:bg-company-purple hover:border-company-purple"
                  icon={mdiMagnify}
                  label={loading ? "Searching..." : "Search"}
                />
              </div>
            </div>
        </div>
      </CardBox>

      {loading && <LoadingAnimation />}

      {!loading && examResults && examScores && examSettings && studentData && (
        <div className="w-full max-w-4xl mx-auto mt-6 space-y-6">
            {/* Mock Exam Results Title */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Mock Exam Results</h2>
              <p className="text-slate-600 dark:text-slate-400">View your performance across all mock exams</p>
            </div>

            {/* Enhanced Results Section */}
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <MockExamResultsPublic
                  availableTabs={availableTabs}
                  selectedTab={selectedTab}
                  handleTabChange={handleTabChange}
                  isExamLoading={false}
                  examSettings={examSettings}
                  examScores={examScores}
                  examResults={examResults}
                  animatedTotalScore={animatedTotalScore}
                  studentClassType={studentData.class.includes('12R') || studentData.class.includes('12S') || studentData.class.includes('12T') ? "Grade 12 Social" : "Grade 12"}
                  progressStatus="Paid Star"
                  calculateGrade={calculateGrade}
                  SUBJECT_ORDER={SUBJECT_ORDER}
                  SOCIAL_STUDIES_LABELS={SOCIAL_STUDIES_LABELS}
                  seatInfo={studentData.seat}
                  phoneInfo={null}
                  studentName={studentData.fullName}
                  isReadyToPublishResult={mockReadiness[selectedTab] || false}
                  lastPaymentMonth={lastPaymentMonth}
                />
              </div>
            </div>

            {/* Performance Chart Section */}
            <div className="w-full">
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Your Exam Journey</h2>
              {isAllMocksLoading ? (
                  <PerformanceRadarChartSkeleton />
              ) : (
                  <PerformanceRadarChartPublic 
                    allMockData={Object.fromEntries(
                      Object.entries(allMockScores).filter(([key]) => availableMocks.includes(key))
                    )}
                    studentClassType={studentData.class.includes('12R') || studentData.class.includes('12S') || studentData.class.includes('12T') ? "Grade 12 Social" : "Grade 12"} 
                    allExamSettings={allExamSettings}
                    mockReadiness={mockReadiness}
                    studentName={studentData.fullName}
                    lastPaymentMonth={lastPaymentMonth}
                  />
              )}
            </div>
        </div>
      )}
    </div>
  );
}