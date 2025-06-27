"use client";

import React from 'react';
import ExamTabs from '../_components/ExamTabs';
import CircularProgress from '../_components/CircularProgress';
import ScoreCard from '../_components/ScoreCard';

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
}

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
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold">Mock Exam Results</h2>
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
                )
              );

              if (selectedTab === 'mock3') {
                if (progressStatus === 'Paid Star') {
                  return resultsView;
                } else {
                  return (
                    <div className="text-center text-yellow-400 bg-yellow-500/10 p-6 border border-yellow-500/30 rounded-2xl">
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