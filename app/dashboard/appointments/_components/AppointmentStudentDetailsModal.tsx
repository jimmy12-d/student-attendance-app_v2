"use client";

import React, { useState } from 'react';
import { mdiClose, mdiChevronUp, mdiChevronDown, mdiAlertCircle, mdiChartLine, mdiEye, mdiEyeOff, mdiToggleSwitch, mdiToggleSwitchOff, mdiAlert } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { AppointmentRequest } from '../../../_interfaces';
import * as splitKhmer from 'split-khmer';

interface AppointmentStudentDetailModalProps {
  isOpen: boolean;
  detailData: any;
  loadingDetail: boolean;
  expandedDetailSections: Set<string>;
  onClose: () => void;
  onToggleSection: (section: string) => void;
}

const getGradeColor = (grade: string) => {
  switch(grade) {
    case 'A': return 'from-green-500 to-emerald-500';
    case 'B': return 'from-blue-500 to-cyan-500';
    case 'C': return 'from-purple-500 to-pink-500';
    case 'D': return 'from-yellow-500 to-amber-500';
    case 'E': return 'from-orange-500 to-red-400';
    case 'F': return 'from-red-500 to-rose-500';
    default: return 'from-gray-500 to-slate-500';
  }
};

const countWords = (text: string): number => {
  if (!text) return 0;
  
  // Split Khmer text
  const khmerWords = splitKhmer.split(text);
  
  // Count unique words
  return khmerWords.length;
};

export const AppointmentStudentDetailModal: React.FC<AppointmentStudentDetailModalProps> = ({
  isOpen,
  detailData,
  loadingDetail,
  expandedDetailSections,
  onClose,
  onToggleSection,
}) => {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());
  const [inBPClass, setInBPClass] = useState<boolean>(detailData?.inBPClass || false);
  const [isUpdatingBPClass, setIsUpdatingBPClass] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const toggleAnswerExpansion = (index: number) => {
    const newExpandedAnswers = new Set(expandedAnswers);
    if (newExpandedAnswers.has(index)) {
      newExpandedAnswers.delete(index);
    } else {
      newExpandedAnswers.add(index);
    }
    setExpandedAnswers(newExpandedAnswers);
  };

  const handleInBPClassToggle = async () => {
    try {
      setIsUpdatingBPClass(true);
      setUpdateMessage(null);

      const studentId = detailData.studentId;
      const newValue = !inBPClass;

      const response = await fetch('/api/students/update-bp-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          inBPClass: newValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update BP class status');
      }

      setInBPClass(newValue);
      setUpdateMessage({
        type: 'success',
        text: `✓ Student ${newValue ? 'added to' : 'removed from'} BP class`,
      });

      // Auto-hide message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (error) {
      console.error('Error updating BP class:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update BP class status';
      setUpdateMessage({
        type: 'error',
        text: `✗ ${errorMessage}`,
      });
      setTimeout(() => setUpdateMessage(null), 3000);
    } finally {
      setIsUpdatingBPClass(false);
    }
  };

  const isTextLong = (text: string): boolean => {
    // Check if text is longer than ~150 characters (approximately 3 lines at normal font size)
    return text.length > 150;
  };

  if (!isOpen || !detailData) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center z-120 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Icon path={mdiChartLine} size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Details</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{detailData.studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Icon path={mdiClose} size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading details...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* BP Class Toggle Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Icon path={mdiAlert} size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">BP Class Status</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Additional classes (BOMPON Class)</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleInBPClassToggle}
                    disabled={isUpdatingBPClass}
                    className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all duration-300 ${
                      inBPClass
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${isUpdatingBPClass ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                        inBPClass ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    >
                      <Icon
                        path={inBPClass ? mdiToggleSwitch : mdiToggleSwitchOff}
                        size={18}
                        className={inBPClass ? 'text-green-500' : 'text-gray-400'}
                      />
                    </span>
                  </button>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    inBPClass
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {inBPClass ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {updateMessage && (
                <div className={`mt-3 p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
                  updateMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                }`}>
                  {updateMessage.text}
                </div>
              )}
            </div>
            {/* Exam Results Section */}
            {detailData.examResults && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => onToggleSection('exam')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 flex items-center justify-between transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      path={expandedDetailSections.has('exam') ? mdiChevronUp : mdiChevronDown} 
                      size={20} 
                      className="text-indigo-600 dark:text-indigo-400" 
                    />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mock Exam Results</h3>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {detailData.examResults.classType}
                  </span>
                </button>
                
                {expandedDetailSections.has('exam') && (
                  <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {detailData.examResults.noData ? (
                      <div className="text-center py-8">
                        <Icon path={mdiAlertCircle} size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                        <p className="text-gray-600 dark:text-gray-400">No exam results found</p>
                      </div>
                    ) : (
                      <>
                        {/* Subject Scores */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Subject Scores</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.keys(detailData.examResults.scores).length > 0 ? (
                              Object.entries(detailData.examResults.scores).map(([subject, score]: [string, any]) => {
                                const maxScoreKey = `${detailData.examResults.classType}_${subject}`;
                                const maxScore = detailData.examResults.maxScoresMap[maxScoreKey] || 100;
                                const actualScore = score === -1 ? 0 : (score || 0);
                                const percentage = maxScore > 0 ? (actualScore / maxScore) * 100 : 0;
                                const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : percentage >= 50 ? 'E' : 'F';

                                return (
                                  <div key={subject} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="font-medium text-gray-900 dark:text-white capitalize text-sm">{subject}</h5>
                                      <span className={`px-4 py-2 rounded-full text-base font-bold text-white bg-gradient-to-r ${getGradeColor(grade)} shadow-md`}>
                                        {grade}
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {score === -1 ? 'Absent' : `${score || 0} / ${maxScore}`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                                No subject scores available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Overall Performance */}
                        {Object.keys(detailData.examResults.scores).length > 0 && (() => {
                          const scores = Object.values(detailData.examResults.scores) as number[];
                          const totalScore = scores.reduce((sum, s) => sum + (s === -1 ? 0 : (s || 0)), 0);
                          const subjects = Object.keys(detailData.examResults.scores);
                          let totalMaxScore = 0;
                          subjects.forEach(subject => {
                            const maxScoreKey = `${detailData.examResults.classType}_${subject}`;
                            totalMaxScore += detailData.examResults.maxScoresMap[maxScoreKey] || 100;
                          });
                          
                          const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
                          const totalGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : percentage >= 50 ? 'E' : 'F';
                          
                          return (
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Overall Performance</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Score</p>
                                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {totalScore} / {totalMaxScore}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Grade</p>
                                  <span className={`inline-block px-4 py-2 rounded-lg text-lg font-bold text-white bg-gradient-to-r ${getGradeColor(totalGrade)}`}>
                                    {totalGrade}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Student Answers Section */}
            {detailData.appointmentRequest && detailData.appointmentRequest.answers && detailData.appointmentRequest.answers.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => onToggleSection('answers')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 flex items-center justify-between transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      path={expandedDetailSections.has('answers') ? mdiChevronUp : mdiChevronDown} 
                      size={20} 
                      className="text-blue-600 dark:text-blue-400" 
                    />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Answers</h3>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {detailData.appointmentRequest.answers.filter((a: any) => a.meetsRequirement).length} / {detailData.appointmentRequest.answers.length} valid
                  </span>
                </button>
                
                {expandedDetailSections.has('answers') && (
                  <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {detailData.appointmentRequest.answers.map((answer: any, index: number) => {
                      const isExpanded = expandedAnswers.has(index);
                      const shouldShowExpandButton = isTextLong(answer.answer);

                      return (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Question {index + 1}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{answer.question}</p>
                            </div>
                            <div className="ml-2 flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Words</p>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{countWords(answer.answer)}</p>
                              </div>
                              {shouldShowExpandButton && (
                                <button
                                  onClick={() => toggleAnswerExpansion(index)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-indigo-600 dark:text-indigo-400"
                                  title={isExpanded ? 'Show less' : 'Show more'}
                                >
                                  <Icon path={isExpanded ? mdiEyeOff : mdiEye} size={18} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`bg-white dark:bg-gray-800 rounded p-3 mb-2 text-xs text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 relative ${
                            isExpanded ? 'max-h-none' : 'max-h-24'
                          } overflow-hidden transition-all duration-300`}>
                            <div className={isExpanded ? '' : 'line-clamp-3'}>
                              {answer.answer}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
