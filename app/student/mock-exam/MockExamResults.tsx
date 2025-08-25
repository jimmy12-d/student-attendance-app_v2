"use client";

import React from 'react';
import ExamTabs from '../_components/ExamTabs';
import CircularProgress from '../_components/CircularProgress';
import ScoreCard from '../_components/ScoreCard';
import { motion } from 'framer-motion';

// Define types for our data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };
type ExamResults = {
  subjects: string[];
  totalScore: number;
  totalMaxScore: number;
  totalPercentage: number;
  totalGrade: string;
};

interface MockExamResultsProps {
  availableTabs: string[];
  selectedTab: string;
  handleTabChange: (tab: string) => void;
  isExamLoading: boolean;
  examSettings: ExamSettings;
  examScores: ExamScores;
  examResults: ExamResults;
  animatedTotalScore: number;
  studentClassType: string | null;
  progressStatus: string;
  calculateGrade: (score: number, maxScore: number) => string;
  SUBJECT_ORDER: string[];
  SOCIAL_STUDIES_LABELS: { [key: string]: string };
  seatInfo: string | null;
  phoneInfo: string | null;
  studentName?: string;
}

const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const MockExamResults: React.FC<MockExamResultsProps> = ({
  availableTabs,
  selectedTab,
  handleTabChange,
  isExamLoading,
  examSettings,
  examScores,
  examResults,
  animatedTotalScore,
  studentClassType,
  progressStatus,
  calculateGrade,
  SUBJECT_ORDER,
  SOCIAL_STUDIES_LABELS,
  seatInfo,
  phoneInfo,
  studentName,
}) => {
  const getGradeDependentStyles = (grade: string) => {
    switch (grade) {
        case 'A': return {
            glow1: 'bg-green-500/30',
            glow2: 'bg-emerald-500/20',
            gradeBadge: 'bg-green-500/30 text-green-200 border-green-500/50',
            shadow: 'shadow-green-800/40 hover:shadow-green-700/50',
            progressColor: '#4ade80' // green-400
        };
        case 'B': return {
            glow1: 'bg-emerald-500/30',
            glow2: 'bg-teal-500/20',
            gradeBadge: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50',
            shadow: 'shadow-emerald-800/40 hover:shadow-emerald-700/50',
            progressColor: '#34d399' // emerald-400
        };
        case 'C': return {
            glow1: 'bg-sky-500/30',
            glow2: 'bg-cyan-500/20',
            gradeBadge: 'bg-sky-500/30 text-sky-200 border-sky-500/50',
            shadow: 'shadow-sky-800/40 hover:shadow-sky-700/50',
            progressColor: '#38bdf8' // sky-400
        };
        case 'D': return {
            glow1: 'bg-yellow-500/30',
            glow2: 'bg-amber-500/20',
            gradeBadge: 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50',
            shadow: 'shadow-yellow-800/40 hover:shadow-yellow-700/50',
            progressColor: '#facc15' // yellow-400
        };
        case 'E': return {
            glow1: 'bg-orange-500/30',
            glow2: 'bg-red-500/20',
            gradeBadge: 'bg-orange-500/30 text-orange-200 border-orange-500/50',
            shadow: 'shadow-orange-800/40 hover:shadow-orange-700/50',
            progressColor: '#fb923c' // orange-400
        };
        case 'F': return {
            glow1: 'bg-red-600/30',
            glow2: 'bg-rose-600/20',
            gradeBadge: 'bg-red-500/30 text-red-200 border-red-500/50',
            shadow: 'shadow-red-800/40 hover:shadow-red-700/50',
            progressColor: '#ef4444' // red-500
        };
        default: return {
            glow1: 'bg-slate-600/30',
            glow2: 'bg-slate-700/20',
            gradeBadge: 'bg-slate-600/30 text-slate-200 border-slate-500/50',
            shadow: 'shadow-slate-800/40 hover:shadow-slate-700/50',
            progressColor: '#94a3b8' // slate-400
        };
    }
  };

  const gradeStyles = getGradeDependentStyles(examResults.totalGrade);

  return (
    <div>
      <ExamTabs tabs={availableTabs} selectedTab={selectedTab} setSelectedTab={handleTabChange} disabled={isExamLoading} />
      {isExamLoading ? (
        <div className="text-center text-gray-400 p-8">Loading scores...</div>
      ) : (
        <>
          <div className="space-y-6">
            {(() => {
              const resultsView = (
                Object.keys(examSettings).length > 0 ? (
                  <>
                    <motion.div
                      className={`
                        relative 
                        overflow-hidden 
                        rounded-3xl 
                        border border-slate-800 
                        bg-gradient-to-br from-slate-900 via-slate-900/90 to-black/80 
                        p-6
                        shadow-2xl ${gradeStyles.shadow}
                        transition-all duration-300
                      `}
                      whileTap={{ scale: 0.92 }}
                    >
                        <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-30" style={{ background: gradeStyles.glow1 }}></div>
                        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-30" style={{ background: gradeStyles.glow2 }}></div>

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Student Name */}
                            {studentName && (
                              <div className="mb-4 text-center">
                                <h3 className="text-xl font-bold text-white mb-1 tracking-wide">
                                  {studentName}
                                </h3>
                                <div className="w-12 h-0.5 bg-white/50 mx-auto rounded-full"></div>
                              </div>
                            )}
                            
                            <div className="relative w-40 h-40 sm:w-44 sm:h-44">
                                <CircularProgress percentage={examResults.totalPercentage} progressColor={gradeStyles.progressColor} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="px-3 py-1 text-sm font-semibold text-slate-300 ">
                                        Total Score
                                    </div>
                                    <span className="-mt-1 text-5xl font-bold text-white tracking-tighter">
                                        {animatedTotalScore % 1 === 0 ? animatedTotalScore.toString() : animatedTotalScore.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <div className={`inline-block px-4 py-1.5 text-base font-semibold ${gradeStyles.gradeBadge} rounded-full backdrop-blur-sm`}>
                                    Grade: <span className="font-extrabold text-2xl align-middle">{examResults.totalGrade}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <div className="grid grid-cols-2 gap-4">
                      {SUBJECT_ORDER.map(subjectKey => {
                        if (examScores.hasOwnProperty(subjectKey)) {
                          // Check if it's social studies class (same logic as PerformanceRadarChart)
                          const isSocial = studentClassType && (studentClassType.includes('Social') || studentClassType.includes('S'));
                          const baseLabel = isSocial
                            ? SOCIAL_STUDIES_LABELS[subjectKey] || subjectKey
                            : subjectKey;
                          const displayLabel = capitalize(baseLabel);

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
                )
              );

              if (selectedTab === 'mock3') {
                if (progressStatus === 'Paid Star') {
                  return resultsView;
                } else {
                  return (
                    <div className="text-center text-yellow-400 bg-yellow-500/10 py-4 px-6 border border-yellow-500/30 rounded-2xl">
                      <p className="font-bold text-lg animate-pulse">Payment Required</p>
                      <p className="mt-2 text-sm animate-pulse">
                        Please pay your Star Debt first to view your Mock 3 results.
                      </p>
                    </div>
                  );
                }
              } else {
                return resultsView;
              }
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default MockExamResults; 