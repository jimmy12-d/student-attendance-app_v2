"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase-config';
import { collection, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, Timestamp, where, orderBy } from 'firebase/firestore';
import { AdminAvailability, AppointmentRequest } from '../../_interfaces';
import { mdiCalendarClock, mdiPlus, mdiPencil, mdiDelete, mdiCheck, mdiClose, mdiClockOutline, mdiCalendar, mdiAlertCircle, mdiAccountCheck, mdiAccountRemove, mdiChevronDown, mdiChevronUp, mdiAccount, mdiChartLine } from '@mdi/js';
import Icon from '../../_components/Icon';
import DatePicker from '../../_components/DatePicker';
import { getTodayLocalString, formatDateForDisplay } from '../../_utils/dateUtils';
import { StudentDetailsModal } from '../students/components/StudentDetailsModal';
import { Student } from '../../_interfaces';

interface SlotInfo {
  time: string;
  date: string;
  status: 'free' | 'pending' | 'approved' | 'rejected';
  request?: AppointmentRequest;
}

interface AppointmentScheduleGridProps {
  availabilities: AdminAvailability[];
  appointmentRequests: AppointmentRequest[];
  onApproveRequest: (request: AppointmentRequest) => void;
  onRejectRequest: (request: AppointmentRequest) => void;
  onDeleteRequest: (request: AppointmentRequest) => void;
  onMarkAttendance: (request: AppointmentRequest, status: 'met' | 'no-show') => void;
}

const AppointmentScheduleGrid: React.FC<AppointmentScheduleGridProps> = ({
  availabilities,
  appointmentRequests,
  onApproveRequest,
  onRejectRequest,
  onDeleteRequest,
  onMarkAttendance
}) => {
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showExamResultsModal, setShowExamResultsModal] = useState(false);
  const [examResults, setExamResults] = useState<any>(null);
  const [loadingExamResults, setLoadingExamResults] = useState(false);

  const toggleSlot = (slotKey: string) => {
    setExpandedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotKey)) {
        newSet.delete(slotKey);
      } else {
        newSet.add(slotKey);
      }
      return newSet;
    });
  };

  const fetchStudentDetails = async (studentId: string) => {
    try {
      const studentDocRef = doc(db, 'students', studentId);
      const studentDoc = await getDoc(studentDocRef);
      if (studentDoc.exists()) {
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        setSelectedStudent(studentData);
        setShowStudentModal(true);
      } else {
        alert('Student not found');
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      alert('Failed to load student details');
    }
  };

  const fetchExamResults = async (studentId: string, studentName: string) => {
    try {
      setLoadingExamResults(true);
      setShowExamResultsModal(true);
      
      // Query mockExam1 collection for this student
      const mockExamQuery = query(
        collection(db, 'mockExam1'),
        where('studentId', '==', studentId)
      );
      
      const snapshot = await getDocs(mockExamQuery);
      
      if (!snapshot.empty) {
        const examData = snapshot.docs[0].data();
        const mock1Result = examData.mock1Result || {};
        const classType = examData.classType || 'N/A';
        
        // Fetch exam settings to get max scores
        const examSettingsQuery = query(
          collection(db, 'examSettings'),
          where('mock', '==', 'mock1')
        );
        
        const settingsSnapshot = await getDocs(examSettingsQuery);
        const maxScoresMap: { [key: string]: number } = {};
        
        // Build map with key format: "Grade 12_math" -> maxScore
        settingsSnapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.type}_${data.subject}`;
          maxScoresMap[key] = data.maxScore;
        });
        
        // Clean scores object - ensure only numbers are included
        const cleanedScores: { [key: string]: number } = {};
        Object.entries(mock1Result).forEach(([key, value]) => {
          // Only include numeric values or -1 (for absent)
          if (typeof value === 'number') {
            cleanedScores[key] = value;
          }
        });
        
        setExamResults({
          studentName: examData.fullName || studentName,
          classType: classType,
          scores: cleanedScores,
          maxScoresMap: maxScoresMap, // Store the map for lookup
        });
      } else {
        setExamResults({
          studentName,
          classType: 'N/A',
          scores: {},
          maxScoresMap: {},
          noData: true,
        });
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
      alert('Failed to load exam results');
      setShowExamResultsModal(false);
    } finally {
      setLoadingExamResults(false);
    }
  };
  // Generate all time slots for active availabilities
  const generateTimeSlots = (availability: AdminAvailability): SlotInfo[] => {
    const slots: SlotInfo[] = [];
    const startTime = new Date(`2000-01-01T${availability.startTime}`);
    const endTime = new Date(`2000-01-01T${availability.endTime}`);
    const slotDuration = availability.slotDuration;

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
      
      // Find matching appointment request
      const matchingRequest = appointmentRequests.find(req => 
        req.appointmentDate === availability.date && 
        req.appointmentTime === timeString
      );

      slots.push({
        time: timeString,
        date: availability.date,
        status: matchingRequest ? matchingRequest.status as 'pending' | 'approved' | 'rejected' : 'free',
        request: matchingRequest
      });

      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
    }

    return slots;
  };

  // Group slots by date
  const slotsByDate = availabilities.reduce((acc, availability) => {
    const date = availability.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(...generateTimeSlots(availability));
    return acc;
  }, {} as Record<string, SlotInfo[]>);

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort();

  const getSlotColor = (status: string) => {
    switch (status) {
      case 'free': return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
      case 'pending': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'approved': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'rejected': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getSlotIcon = (status: string) => {
    switch (status) {
      case 'pending': return mdiClockOutline;
      case 'approved': return mdiCheck;
      case 'rejected': return mdiClose;
      default: return null;
    }
  };

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl mb-4">
          <Icon path={mdiCalendarClock} size={16} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No availability schedules</h3>
        <p className="text-slate-600 dark:text-slate-400">Create availability schedules in the Admin Availability tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/25">
              <Icon path={mdiCalendar} size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatDateForDisplay(date)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {slotsByDate[date].length} time slots available
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {slotsByDate[date].map((slot, index) => {
              const slotKey = `${slot.date}-${slot.time}-${index}`;
              const isExpanded = expandedSlots.has(slotKey);
              
              return (
                <div
                  key={slotKey}
                  className={`relative border rounded-xl p-3 transition-all duration-200 ${getSlotColor(slot.status)} ${
                    slot.status !== 'free' ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                      {slot.time}
                    </div>
                    
                    {slot.status !== 'free' && slot.request && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1">
                          {getSlotIcon(slot.status) && (
                            <Icon 
                              path={getSlotIcon(slot.status)!} 
                              size={12} 
                              className={`${
                                slot.status === 'approved' ? 'text-green-600' :
                                slot.status === 'rejected' ? 'text-red-600' :
                                'text-yellow-600'
                              }`} 
                            />
                          )}
                          <span className={`text-xs font-medium capitalize ${
                            slot.status === 'approved' ? 'text-green-700 dark:text-green-300' :
                            slot.status === 'rejected' ? 'text-red-700 dark:text-red-300' :
                            'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {slot.status}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {slot.request.studentName}
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        {slot.status === 'approved' && (
                          <button
                            onClick={() => toggleSlot(slotKey)}
                            className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <Icon path={isExpanded ? mdiChevronUp : mdiChevronDown} size={12} />
                            {isExpanded ? 'Hide' : 'Show'} Actions
                          </button>
                        )}
                        
                        {/* Expanded Content - Only for approved slots */}
                        {slot.status === 'approved' && isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                            {slot.request.attendanceStatus ? (
                              <div className={`text-xs font-medium px-2 py-1 rounded ${
                                slot.request.attendanceStatus === 'met' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {slot.request.attendanceStatus === 'met' ? '✓ Met' : '✕ No Show'}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <button
                                  onClick={() => onMarkAttendance(slot.request!, 'met')}
                                  className="w-full bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                  title="Mark as Met"
                                >
                                  <Icon path={mdiAccountCheck} size={12} />
                                  Met
                                </button>
                                <button
                                  onClick={() => onMarkAttendance(slot.request!, 'no-show')}
                                  className="w-full bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                                  title="Mark as No Show"
                                >
                                  <Icon path={mdiAccountRemove} size={12} />
                                  No Show
                                </button>
                              </div>
                            )}
                            
                            <button
                              onClick={() => fetchStudentDetails(slot.request!.studentId)}
                              className="w-full bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                              title="View Student Details"
                            >
                              <Icon path={mdiAccount} size={12} />
                              View Student
                            </button>
                            
                            <button
                              onClick={() => fetchExamResults(slot.request!.studentId, slot.request!.studentName)}
                              className="w-full bg-indigo-600 text-white text-xs px-2 py-1 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                              title="View Exam Results"
                            >
                              <Icon path={mdiChartLine} size={12} />
                              Exam Results
                            </button>
                          </div>
                        )}
                        
                        {/* Pending status buttons */}
                        {slot.status === 'pending' && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => onApproveRequest(slot.request!)}
                              className="flex-1 bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition-colors"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => onRejectRequest(slot.request!)}
                              className="flex-1 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition-colors"
                              title="Reject"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        
                        {/* Rejected reason */}
                        {slot.status === 'rejected' && slot.request.rejectionReason && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 truncate" title={slot.request.rejectionReason}>
                            {slot.request.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {slot.status === 'free' && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Student Details Modal */}
      <StudentDetailsModal
        student={selectedStudent}
        isOpen={showStudentModal}
        onClose={() => {
          setShowStudentModal(false);
          setSelectedStudent(null);
        }}
        onEdit={() => {}}
        onDelete={() => {}}
        hideActions={true}
        defaultTab="basic"
      />
      
      {/* Exam Results Modal */}
      {showExamResultsModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center z-120 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Icon path={mdiChartLine} size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Mock Exam Results</h3>
                  {examResults && <p className="text-sm text-gray-600 dark:text-gray-400">{examResults.studentName}</p>}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExamResultsModal(false);
                  setExamResults(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Icon path={mdiClose} size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {loadingExamResults ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading exam results...</p>
              </div>
            ) : examResults?.noData ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Icon path={mdiChartLine} size={32} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Exam Results Found</h4>
                <p className="text-gray-600 dark:text-gray-400">This student hasn't taken the mock exam yet.</p>
              </div>
            ) : examResults ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Class Type</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{examResults.classType}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subject Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(examResults.scores).length > 0 ? (
                      Object.entries(examResults.scores).map(([subject, score]: [string, any]) => {
                        // Key format: "Grade 12_math" (subject is already lowercase in mock1Result)
                        const maxScoreKey = `${examResults.classType}_${subject}`;
                        const maxScore = examResults.maxScoresMap[maxScoreKey] || 100;
                        const actualScore = score === -1 ? 0 : (score || 0);
                        const percentage = maxScore > 0 ? (actualScore / maxScore) * 100 : 0;
                        const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : percentage >= 50 ? 'E' : 'F';
                        
                        const getGradeColor = (g: string) => {
                          switch(g) {
                            case 'A': return 'from-green-500 to-emerald-500';
                            case 'B': return 'from-blue-500 to-cyan-500';
                            case 'C': return 'from-purple-500 to-pink-500';
                            case 'D': return 'from-yellow-500 to-amber-500';
                            case 'E': return 'from-orange-500 to-red-400';
                            case 'F': return 'from-red-500 to-rose-500';
                            default: return 'from-gray-500 to-slate-500';
                          }
                        };

                        return (
                          <div key={subject} className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-gray-900 dark:text-white capitalize">{subject}</h5>
                              <span className={`px-4 py-2 rounded-full text-base font-bold text-white bg-gradient-to-r ${getGradeColor(grade)} shadow-sm`}>
                                {grade}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-base">
                                <span className="text-gray-600 dark:text-gray-400">Score:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {score === -1 ? 'Absent' : <>{score || 0} <span className="text-sm text-gray-500 dark:text-gray-400">/ {maxScore}</span></>}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full bg-gradient-to-r ${getGradeColor(grade)} transition-all duration-300`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                        No subject scores available
                      </div>
                    )}
                  </div>
                </div>

                {Object.keys(examResults.scores).length > 0 && (() => {
                  const scores = Object.values(examResults.scores) as number[];
                  const totalScore = scores.reduce((sum, score) => sum + (score === -1 ? 0 : (score || 0)), 0);
                  
                  // Calculate total grade based on total score / total max score
                  const subjects = Object.keys(examResults.scores);
                  let totalMaxScore = 0;
                  subjects.forEach(subject => {
                    // Key format: "Grade 12_math" (subject is already lowercase in mock1Result)
                    const maxScoreKey = `${examResults.classType}_${subject}`;
                    totalMaxScore += examResults.maxScoresMap[maxScoreKey] || 100;
                  });
                  
                  const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
                  const totalGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : percentage >= 50 ? 'E' : 'F';
                  
                  const getGradeColor = (g: string) => {
                    switch(g) {
                      case 'A': return 'from-green-500 to-emerald-500';
                      case 'B': return 'from-blue-500 to-cyan-500';
                      case 'C': return 'from-purple-500 to-pink-500';
                      case 'D': return 'from-yellow-500 to-amber-500';
                      case 'E': return 'from-orange-500 to-red-400';
                      case 'F': return 'from-red-500 to-rose-500';
                      default: return 'from-gray-500 to-slate-500';
                    }
                  };
                  
                  return (
                    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-6 border-2 border-indigo-300 dark:border-indigo-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Overall Performance</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Score</p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {totalScore} / {totalMaxScore}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Grade</p>
                          <span className={`inline-block px-4 py-2 rounded-full text-xl font-bold text-white bg-gradient-to-r ${getGradeColor(totalGrade)} shadow-lg`}>
                            {totalGrade}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowExamResultsModal(false);
                  setExamResults(null);
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentsManagementPage = () => {
  const [availabilities, setAvailabilities] = useState<AdminAvailability[]>([]);
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'availability' | 'schedule' | 'requests'>('availability');
  
  // Form state for creating/editing availability
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<AdminAvailability | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<AppointmentRequest | null>(null);
  
  // Get today's date in YYYY-MM-DD format
  const today = getTodayLocalString();
  
  const [formData, setFormData] = useState({
    date: today,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    minPriorHours: 2,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load availabilities sorted by date
      const availabilitiesQuery = query(collection(db, 'adminAvailability'), orderBy('date'), orderBy('startTime'));
      const availabilitiesSnapshot = await getDocs(availabilitiesQuery);
      const availabilitiesData = availabilitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminAvailability));
      setAvailabilities(availabilitiesData);

      // Load appointment requests
      const requestsQuery = query(
        collection(db, 'appointmentRequests'),
        orderBy('requestedAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppointmentRequest));
      setAppointmentRequests(requestsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      const availabilityData = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotDuration,
        minPriorHours: formData.minPriorHours,
        isActive: true,
        updatedAt: Timestamp.now(),
        updatedBy: 'admin',
      };

      if (editingAvailability) {
        // Update existing
        const availabilityRef = doc(db, 'adminAvailability', editingAvailability.id);
        await updateDoc(availabilityRef, availabilityData);
      } else {
        // Create new
        await addDoc(collection(db, 'adminAvailability'), {
          ...availabilityData,
          createdAt: Timestamp.now(),
          createdBy: 'admin',
        });
      }

      setShowAvailabilityForm(false);
      setEditingAvailability(null);
      setFormData({
        date: today,
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        minPriorHours: 2,
      });
      loadData();
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability');
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability?')) return;
    
    try {
      await deleteDoc(doc(db, 'adminAvailability', id));
      loadData();
    } catch (error) {
      console.error('Error deleting availability:', error);
      alert('Failed to delete availability');
    }
  };

  const handleToggleAvailability = async (availability: AdminAvailability) => {
    try {
      const availabilityRef = doc(db, 'adminAvailability', availability.id);
      await updateDoc(availabilityRef, {
        isActive: !availability.isActive,
        updatedAt: Timestamp.now(),
        updatedBy: 'admin',
      });
      loadData();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleApproveRequest = async (request: AppointmentRequest) => {
    try {
      const requestRef = doc(db, 'appointmentRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        processedAt: Timestamp.now(),
        processedBy: 'admin',
      });
      loadData();
      alert('Appointment approved successfully!');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  const handleDeleteRequest = async (request: AppointmentRequest) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      await deleteDoc(doc(db, 'appointmentRequests', requestToDelete.id));
      loadData();
      alert('Appointment request deleted successfully.');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    } finally {
      setShowDeleteModal(false);
      setRequestToDelete(null);
    }
  };

  const cancelDeleteRequest = () => {
    setShowDeleteModal(false);
    setRequestToDelete(null);
  };

  const handleRejectRequest = async (request: AppointmentRequest) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const requestRef = doc(db, 'appointmentRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: reason,
        processedAt: Timestamp.now(),
        processedBy: 'admin',
      });
      loadData();
      alert('Appointment rejected.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const handleMarkAttendance = async (request: AppointmentRequest, status: 'met' | 'no-show') => {
    try {
      const requestRef = doc(db, 'appointmentRequests', request.id);
      await updateDoc(requestRef, {
        attendanceStatus: status,
        attendanceMarkedAt: Timestamp.now(),
        attendanceMarkedBy: 'admin',
      });
      loadData();
      alert(`Appointment marked as ${status === 'met' ? 'Met' : 'No Show'}`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  const startEditAvailability = (availability: AdminAvailability) => {
    setEditingAvailability(availability);
    setFormData({
      date: availability.date,
      startTime: availability.startTime,
      endTime: availability.endTime,
      slotDuration: availability.slotDuration,
      minPriorHours: availability.minPriorHours || 2,
    });
    setShowAvailabilityForm(true);
  };

  const cancelForm = () => {
    setShowAvailabilityForm(false);
    setEditingAvailability(null);
    setFormData({
      date: today,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      minPriorHours: 2,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/25">
            <Icon path={mdiCalendarClock} size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Appointment Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              Manage admin availability and student appointment requests
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 text-center ${
                activeTab === 'availability'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Admin Availability
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 text-center ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Schedule View
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 text-center relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Appointment Requests
              {appointmentRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg shadow-red-500/25 animate-pulse">
                  {appointmentRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Admin Availability Schedules</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your available time slots for appointments</p>
              </div>
              <button
                onClick={() => setShowAvailabilityForm(true)}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300"
              >
                <Icon path={mdiPlus} size={16} />
                Add Availability
              </button>
            </div>

          {/* Availability Form Modal */}
          {showAvailabilityForm && (
            <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center z-110 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  {editingAvailability ? 'Edit Availability' : 'Add Availability'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
                    <DatePicker
                      selectedDate={formData.date}
                      onDateChange={(date) => setFormData({ ...formData, date })}
                      placeholder="Select appointment date"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Slot Duration (minutes)</label>
                    <select
                      value={formData.slotDuration}
                      onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) })}
                      className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Minimum Prior Hours Required
                    </label>
                    <select
                      value={formData.minPriorHours}
                      onChange={(e) => setFormData({ ...formData, minPriorHours: parseInt(e.target.value) })}
                      className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={0}>No restriction (book anytime)</option>
                      <option value={1}>At least 1 hour before</option>
                      <option value={2}>At least 2 hours before</option>
                      <option value={3}>At least 3 hours before</option>
                      <option value={6}>At least 6 hours before</option>
                      <option value={12}>At least 12 hours before</option>
                      <option value={24}>At least 1 day before</option>
                      <option value={48}>At least 2 days before</option>
                      <option value={72}>At least 3 days before</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Students must book appointments at least this many hours in advance
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveAvailability}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    {editingAvailability ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={cancelForm}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Availability List */}
          <div className="grid gap-4">
            {availabilities.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <Icon path={mdiCalendarClock} size={16} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No availability schedules yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Click "Add Availability" to create one</p>
              </div>
            ) : (
              availabilities.map(availability => (
                <div
                  key={availability.id}
                  className={`border dark:border-gray-700 rounded-lg p-4 ${
                    availability.isActive ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Admin Meeting Time</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p className="flex items-center gap-2">
                          <Icon path={mdiCalendar} size={16} />
                          {formatDateForDisplay(availability.date)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Icon path={mdiClockOutline} size={16} />
                          {availability.startTime} - {availability.endTime}
                        </p>
                        <p>Slot Duration: {availability.slotDuration} minutes</p>
                        <p className="flex items-center gap-2">
                          <Icon path={mdiAlertCircle} size={16} />
                          Min. Prior Hours: {availability.minPriorHours || 0} hour{(availability.minPriorHours || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          availability.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {availability.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAvailability(availability)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title={availability.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Icon 
                          path={availability.isActive ? mdiClose : mdiCheck} 
                          size={16} 
                          className={availability.isActive ? 'text-red-600' : 'text-green-600'}
                        />
                      </button>
                      <button
                        onClick={() => startEditAvailability(availability)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <Icon path={mdiPencil} size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteAvailability(availability.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Icon path={mdiDelete} size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Appointment Schedule</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">View and manage appointment slots across all dates</p>
            </div>

            <AppointmentScheduleGrid
              availabilities={availabilities.filter(a => a.isActive)}
              appointmentRequests={appointmentRequests}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onDeleteRequest={handleDeleteRequest}
              onMarkAttendance={handleMarkAttendance}
            />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Appointment Requests</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Review and manage student appointment requests in detail</p>
              </div>
              <div className="flex gap-2">
                <select className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {appointmentRequests.length === 0 ? (
                <div className="text-center py-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl mb-4">
                    <Icon path={mdiCalendarClock} size={16} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No appointment requests yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Student requests will appear here once submitted</p>
                </div>
              ) : (
                appointmentRequests.map(request => (
                  <div key={request.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          request.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                          request.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                          request.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <Icon 
                            path={
                              request.status === 'approved' ? mdiCheck :
                              request.status === 'pending' ? mdiClockOutline :
                              request.status === 'rejected' ? mdiClose :
                              mdiCalendarClock
                            } 
                            size={20} 
                            className={`${
                              request.status === 'approved' ? 'text-green-600' :
                              request.status === 'pending' ? 'text-yellow-600' :
                              request.status === 'rejected' ? 'text-red-600' :
                              'text-gray-600'
                            }`} 
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{request.studentName}</h3>
                          <p className="text-slate-600 dark:text-slate-400">{request.studentClass} - {request.studentShift}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                        {request.status === 'approved' && request.attendanceStatus && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.attendanceStatus === 'met' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {request.attendanceStatus === 'met' ? '✓ Met' : '✕ No Show'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                          <Icon path={mdiCalendar} size={16} />
                          Appointment Details
                        </h4>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <p><strong>Date:</strong> {request.appointmentDate}</p>
                          <p><strong>Time:</strong> {request.appointmentTime}</p>
                          <p><strong>Duration:</strong> {request.duration} minutes</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                          <Icon path={mdiClockOutline} size={16} />
                          Admin Actions
                        </h4>
                        {request.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleApproveRequest(request)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Icon path={mdiCheck} size={16} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Icon path={mdiClose} size={16} />
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status === 'approved' && request.attendanceStatus && (
                          <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
                            request.attendanceStatus === 'met' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            <Icon 
                              path={request.attendanceStatus === 'met' ? mdiAccountCheck : mdiAccountRemove} 
                              size={20} 
                            />
                            <span className="font-semibold">
                              {request.attendanceStatus === 'met' ? 'Student Met' : 'Student No Show'}
                            </span>
                          </div>
                        )}
                        {request.status === 'approved' && !request.attendanceStatus && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Mark attendance:</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMarkAttendance(request, 'met')}
                                className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Icon path={mdiAccountCheck} size={16} />
                                Met
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(request, 'no-show')}
                                className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Icon path={mdiAccountRemove} size={16} />
                                No Show
                              </button>
                            </div>
                          </div>
                        )}
                        {request.status === 'rejected' && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                            Appointment rejected
                          </p>
                        )}
                        {request.status === 'cancelled' && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                            Appointment cancelled
                          </p>
                        )}
                      </div>
                    </div>

                    {request.rejectionReason && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Rejection Reason</h4>
                        <p className="text-red-700 dark:text-red-300">{request.rejectionReason}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                        View Student Profile
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(request)}
                        className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors flex items-center gap-2"
                      >
                        <Icon path={mdiDelete} size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && requestToDelete && (
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center z-110 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Icon path={mdiDelete} size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Appointment Request</h3>
                  <p className="text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to delete the appointment request from <strong>{requestToDelete.studentName}</strong>?
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Date:</strong> {requestToDelete.appointmentDate}</p>
                    <p><strong>Time:</strong> {requestToDelete.appointmentTime}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteRequest}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRequest}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Request
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AppointmentsManagementPage;
