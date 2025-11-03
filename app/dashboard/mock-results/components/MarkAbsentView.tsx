"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { doc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import Icon from '../../../_components/Icon';
import { 
  mdiMagnify,
  mdiClose,
  mdiCheckAll,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
  mdiAlertCircle,
  mdiAccountRemove
} from '@mdi/js';
import { toast } from 'sonner';

interface Student {
  studentId: string;
  docId?: string; // Firestore document ID
  studentName: string;
  class: string;
  classType: string;
  shift: string;
  scores: { [subject: string]: number };
}

interface MarkAbsentViewProps {
  students: Student[];
  onClose: () => void;
  onUpdate: () => void;
  getSubjectsForClass: (classType: string) => string[];
}

export const MarkAbsentView: React.FC<MarkAbsentViewProps> = ({
  students,
  onClose,
  onUpdate,
  getSubjectsForClass,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterClass, setFilterClass] = useState<string>('');

  // Get all subjects and their status for selected students
  const subjectsWithStatus = useMemo(() => {
    // If no students selected, show all subjects
    if (selectedStudents.size === 0) {
      const subjectsSet = new Set<string>();
      students.forEach(student => {
        const subjects = getSubjectsForClass(student.classType);
        subjects.forEach(subject => subjectsSet.add(subject));
      });
      return Array.from(subjectsSet).sort().map(subject => ({
        name: subject,
        status: 'available' as 'available' | 'filled' | 'absent' | 'mixed'
      }));
    }

    // Get all subjects for selected students and check their status
    const subjectsMap = new Map<string, { nullCount: number, filledCount: number, absentCount: number }>();
    
    selectedStudents.forEach(studentId => {
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        const subjects = getSubjectsForClass(student.classType);
        subjects.forEach(subject => {
          // Use the subject name as-is (capitalized) since scores object has capitalized keys
          const score = student.scores[subject];
          
          if (!subjectsMap.has(subject)) {
            subjectsMap.set(subject, { nullCount: 0, filledCount: 0, absentCount: 0 });
          }
          
          const counts = subjectsMap.get(subject)!;
          if (score === null || score === undefined) {
            counts.nullCount++;
          } else if (score === -1 || (typeof score === 'string' && String(score).toLowerCase() === 'absent')) {
            counts.absentCount++;
          } else {
            counts.filledCount++;
          }
        });
      }
    });
    
    const totalSelectedStudents = selectedStudents.size;
    
    return Array.from(subjectsMap.entries())
      .map(([subject, counts]) => {
        let status: 'available' | 'filled' | 'absent' | 'mixed';
        
        if (counts.nullCount === totalSelectedStudents) {
          status = 'available';
        } else if (counts.absentCount === totalSelectedStudents) {
          status = 'absent';
        } else if (counts.filledCount === totalSelectedStudents) {
          status = 'filled';
        } else {
          status = 'mixed';
        }
        
        return { name: subject, status, counts };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, getSubjectsForClass, selectedStudents]);

  // Get only available subjects (for selection)
  const availableSubjects = useMemo(() => {
    return subjectsWithStatus
      .filter(s => s.status === 'available' || s.status === 'mixed')
      .map(s => s.name);
  }, [subjectsWithStatus]);

  // Clear selected subjects that are no longer available when student selection changes
  useEffect(() => {
    if (selectedSubjects.size > 0) {
      const availableSubjectsSet = new Set(availableSubjects);
      const updatedSelectedSubjects = new Set(
        Array.from(selectedSubjects).filter(subject => availableSubjectsSet.has(subject))
      );
      if (updatedSelectedSubjects.size !== selectedSubjects.size) {
        setSelectedSubjects(updatedSelectedSubjects);
      }
    }
  }, [availableSubjects, selectedSubjects]);

  // Get unique classes
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.classType))).sort();
  }, [students]);

  // Filter students based on search and class
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchTerm === '' || 
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = filterClass === '' || student.classType === filterClass;
      
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Toggle all filtered students
  const toggleAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.studentId)));
    }
  };

  // Toggle subject selection
  const toggleSubject = (subject: string) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subject)) {
      newSelected.delete(subject);
    } else {
      newSelected.add(subject);
    }
    setSelectedSubjects(newSelected);
  };

  // Toggle all subjects
  const toggleAllSubjects = () => {
    if (selectedSubjects.size === availableSubjects.length) {
      setSelectedSubjects(new Set());
    } else {
      setSelectedSubjects(new Set(availableSubjects));
    }
  };

  // Mark students as absent
  const markAsAbsent = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (selectedSubjects.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      setIsProcessing(true);
      const batch = writeBatch(db);
      let updateCount = 0;
      const missingDocs: string[] = [];

      // First, check which documents exist
      for (const studentId of selectedStudents) {
        // Find the student to get the docId
        const student = students.find(s => s.studentId === studentId);
        const documentId = student?.docId || studentId; // Use docId if available, fallback to studentId
        
        const docRef = doc(db, 'mockExam1', documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const updates: { [key: string]: string } = {};

          // Convert subject names to lowercase for Firebase field names
          selectedSubjects.forEach(subject => {
            updates[subject.toLowerCase()] = 'absent';
          });

          batch.update(docRef, updates);
          updateCount++;
        } else {
          missingDocs.push(studentId);
        }
      }

      if (updateCount === 0) {
        toast.error('No valid student documents found to update');
        return;
      }

      await batch.commit();
      
      // Show single success message
      const message = `Marked ${updateCount} student${updateCount > 1 ? 's' : ''} as absent for ${selectedSubjects.size} subject${selectedSubjects.size > 1 ? 's' : ''}`;
      
      if (missingDocs.length > 0) {
        toast.warning(
          `${message}. ${missingDocs.length} student${missingDocs.length > 1 ? 's' : ''} skipped (not found in database).`,
          { duration: 5000 }
        );
      } else {
        toast.success(message);
      }
      
      // Clear selections
      setSelectedStudents(new Set());
      setSelectedSubjects(new Set());
      
      // Refresh parent data
      onUpdate();
      
    } catch (error) {
      console.error('❌ Error marking students as absent:', error);
      toast.error('Failed to mark students as absent');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-110 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-7xl w-full my-8 relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-t-3xl px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Icon path={mdiAccountRemove} className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mark Students as Absent</h2>
              <p className="text-red-100 text-sm mt-1">
                Select students and subjects to mark as absent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Icon path={mdiClose} className="text-white" size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Students */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <span>Select Students</span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({filteredStudents.length} total)
                  </span>
                </h3>
                <button
                  onClick={toggleAllStudents}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center space-x-2">
                    <Icon 
                      path={selectedStudents.size === filteredStudents.length ? mdiCheckboxMarkedOutline : mdiCheckboxBlankOutline} 
                      size={18} 
                    />
                    <span>Select All</span>
                  </div>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm transition-all"
                  />
                  <Icon 
                    path={mdiMagnify} 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" 
                    size={20} 
                  />
                </div>

                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm transition-all"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Students List */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Icon path={mdiAlertCircle} size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No students found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudents.has(student.studentId);
                      return (
                        <button
                          key={student.studentId}
                          onClick={() => toggleStudent(student.studentId)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-lg scale-[1.02]'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                {student.studentName}
                              </div>
                              <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                {student.classType}
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-white border-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && (
                                <Icon path={mdiCheckboxMarkedOutline} size={20} className="text-blue-500" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Subjects */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <span>Select Subjects</span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({subjectsWithStatus.length} total)
                  </span>
                </h3>
                <button
                  onClick={toggleAllSubjects}
                  disabled={availableSubjects.length === 0}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    availableSubjects.length === 0
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon path={mdiCheckAll} size={18} />
                    <span>Select All</span>
                  </div>
                </button>
              </div>

              {/* Subjects Grid */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
                {subjectsWithStatus.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Icon path={mdiAlertCircle} size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No subjects available</p>
                    <p className="text-sm mt-2">
                      {selectedStudents.size === 0 
                        ? 'Select students to see available subjects'
                        : 'No subjects found for the selected students'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {subjectsWithStatus.map((subjectInfo) => {
                      const { name: subject, status } = subjectInfo;
                      const isSelected = selectedSubjects.has(subject);
                      const isAvailable = status === 'available' || status === 'mixed';
                      
                      // Different styles based on status
                      let buttonClass = '';
                      let icon = null;
                      let statusLabel = '';
                      
                      if (status === 'filled') {
                        buttonClass = 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-600 cursor-not-allowed';
                        statusLabel = 'Filled';
                      } else if (status === 'absent') {
                        buttonClass = 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-700 cursor-not-allowed';
                        statusLabel = 'Absent';
                      } else if (status === 'mixed') {
                        if (isSelected) {
                          buttonClass = 'bg-purple-500 text-white shadow-lg scale-[1.02] border-2 border-purple-600';
                        } else {
                          buttonClass = 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700';
                        }
                        statusLabel = 'Mixed';
                      } else {
                        // available
                        if (isSelected) {
                          buttonClass = 'bg-purple-500 text-white shadow-lg scale-[1.02] border-2 border-purple-600';
                        } else {
                          buttonClass = 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600';
                        }
                      }
                      
                      return (
                        <button
                          key={subject}
                          onClick={() => isAvailable && toggleSubject(subject)}
                          disabled={!isAvailable}
                          className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${buttonClass}`}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm">{subject}</span>
                              {isSelected && (
                                <Icon path={mdiCheckboxMarkedOutline} size={18} />
                              )}
                            </div>
                            {!isAvailable && (
                              <span className="text-xs font-normal opacity-75">{statusLabel}</span>
                            )}
                            {status === 'mixed' && (
                              <span className="text-xs font-normal opacity-75">{statusLabel}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                <div className="flex items-start space-x-3">
                  <Icon path={mdiAlertCircle} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Important Notice
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Marking students as absent will update their scores in the database. 
                      Selected subjects will be marked as "absent" for all selected students.
                      This action cannot be undone automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-8 py-3 rounded-2xl font-semibold transition-all duration-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            <button
              onClick={markAsAbsent}
              disabled={isProcessing || selectedStudents.size === 0 || selectedSubjects.size === 0}
              className="px-8 py-3 rounded-2xl font-semibold transition-all duration-300 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {isProcessing ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <Icon path={mdiAccountRemove} size={20} />
                  <span>Mark as Absent ({selectedStudents.size * selectedSubjects.size} updates)</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkAbsentView;
