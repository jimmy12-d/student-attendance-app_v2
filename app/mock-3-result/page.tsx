"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { db } from "@/firebase-config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast, Toaster } from "sonner";
import { mdiMagnify } from "@mdi/js";
import { motion } from 'framer-motion';

// Reusable Components
import CardBox from "@/app/_components/CardBox";
import Button from "@/app/_components/Button";
import Icon from "@/app/_components/Icon";
import CircularProgress from "@/app/student/_components/CircularProgress";
import ScoreCard from "@/app/student/_components/ScoreCard";

// Hooks
import useCountUp from "@/app/_hooks/useCountUp";

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };

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

const SUBJECT_ORDER = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'english'];

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
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchResult = async () => {
    if (!id || !/^\d{4,5}$/.test(id.trim())) {
      toast.error("Please enter the 4-digit ID.");
      return;
    }
    setLoading(true);
    setExamScores(null);
    setExamSettings(null);
    setStudentName(null);
    setStudentGrade(null);

    try {
      const studentResultRef = doc(db, "mockExam3", id.trim());
      const studentResultSnap = await getDoc(studentResultRef);

      if (!studentResultSnap.exists()) {
        toast.error("The ID you entered was not found.");
        return;
      }

      const studentData = studentResultSnap.data() as ExamScores & { grade: string; studentName: string };
      setStudentName(studentData.studentName || 'Unknown');
      setStudentGrade(studentData.grade ? studentData.grade.replace('Grade ', '') : 'Unknown Grade');

      const settingsQuery = query(
        collection(db, "examSettings"),
        where("type", "==", studentData.grade),
        where("mock", "==", "mock3")
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (settingsSnapshot.empty) {
        toast.error(`Could not find exam settings for grade: ${studentData.grade}.`);
        return;
      }

      const fetchedSettings: ExamSettings = {};
      settingsSnapshot.forEach(doc => {
          const data = doc.data();
          fetchedSettings[data.subject] = { maxScore: data.maxScore };
      });
      
      setExamScores(studentData);
      setExamSettings(fetchedSettings);
      toast.success("Result found!");

    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const examResults = useMemo(() => {
    if (!examScores || !examSettings) return null;

    const subjects = Object.keys(examSettings);
    let totalScore = 0;
    let totalMaxScore = 0;

    subjects.forEach(subject => {
      const score = examScores[subject] || 0;
      totalScore += score;
      totalMaxScore += examSettings[subject]?.maxScore || 0;
    });
    
    const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const totalGrade = calculateGrade(totalScore, totalMaxScore);

    return { subjects, totalScore, totalMaxScore, totalPercentage, totalGrade };
  }, [examSettings, examScores]);

  const animatedTotalScore = useCountUp(examResults?.totalScore ?? 0, 3000, [examResults]);
  
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
            <h1 className="text-2xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">Mock 3 Exam Result</h1>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">Input the last 4 digits of your phone number to find your mock 3 result.</p>
            
            <div className="relative">
              <div className="flex rounded-md">
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 9355"
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

      {!loading && examResults && examScores && examSettings && (
        <div className="w-full max-w-lg mx-auto mt-6 space-y-6">
            <motion.div
                className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-black/80 p-6 shadow-2xl ${gradeStyles.shadow} transition-all duration-300`}
                whileTap={{ scale: 0.98 }}
            >
                <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-30" style={{ background: gradeStyles.glow1 }}></div>
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-30" style={{ background: gradeStyles.glow2 }}></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="text-center mb-2">
                        <p className="text-lg font-semibold text-slate-200">Result for: <span className="text-white">{studentName}</span></p>
                        {studentGrade && <p className="text-sm text-slate-400">Grade: <span className="text-slate-300 font-medium">{studentGrade}</span></p>}
                    </div>
                    <div className="relative w-40 h-40 sm:w-44 sm:h-44">
                        <CircularProgress percentage={examResults.totalPercentage} progressColor={gradeStyles.progressColor} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="px-3 py-1 text-sm font-semibold text-slate-300">Total Score</div>
                            <span className="-mt-1 text-5xl font-bold text-white tracking-tighter">{animatedTotalScore}</span>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <div className={`inline-block px-4 py-1.5 text-base font-semibold ${gradeStyles.gradeBadge} rounded-full backdrop-blur-sm`}>
                            Grade: <span className="font-extrabold text-2xl align-middle">{examResults.totalGrade}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBJECT_ORDER.map(subjectKey => {
                if (examSettings.hasOwnProperty(subjectKey)) {
                  const studentGrade = (examScores as any)?.grade;
                  const isSpecialGrade = studentGrade && ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(studentGrade);
                  const displayLabel = isSpecialGrade && subjectKey.toLowerCase() === 'khmer' ? 'Geometry' : subjectKey;
                  
                  return (
                    <ScoreCard
                      key={subjectKey}
                      subject={displayLabel}
                      score={examScores[subjectKey] || 0}
                      maxScore={examSettings[subjectKey]?.maxScore || 0}
                      grade={calculateGrade(examScores[subjectKey] || 0, examSettings[subjectKey]?.maxScore || 0)}
                    />
                  );
                }
                return null;
              })}
            </div>
        </div>
      )}
    </div>
  );
} 