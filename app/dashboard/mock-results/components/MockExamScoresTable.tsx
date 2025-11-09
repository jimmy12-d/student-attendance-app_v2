"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import Icon from '../../../_components/Icon';
import { 
  mdiChartLine, 
  mdiMagnify,
  mdiDownload,
  mdiSortAscending,
  mdiSortDescending,
  mdiChartBox,
  mdiAccountGroup,
  mdiPercent
} from '@mdi/js';
import { toast } from 'sonner';
import Button from '../../../_components/Button';
import SimpleSubjectCompletionView from './SimpleSubjectCompletionView';
import MarkAbsentView from './MarkAbsentView';
import CustomCombobox from '../../../_components/CustomCombobox';
import { sortGrades } from './subjectConfig';

// Types
interface FormResponse {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  classType?: string;
  shift: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  submittedAt: any;
  approvalStatus: string;
  registrationStatus?: string;
  paymentStatus?: string;
}

interface ScoreData {
  studentId: string;
  docId?: string; // Firestore document ID
  studentName: string;
  class: string;
  classType: string;
  shift: string;
  scores: { [subject: string]: number };
  totalScore: number;
  averageScore: number;
  maxScores: { [subject: string]: number };
}

interface ExamSetting {
  type: string;
  subject: string;
  maxScore: number;
  mock: string;
}

// Question ID to subject mapping for form q57n4s6X6pMAX6yHRoQ0
const QUESTION_SUBJECT_MAP: { [key: string]: string } = {
  // Grade 12 Science subjects
  'q_1761298889704_ry0vs9': 'Math',
  'q_1761298959004_xr53dh': 'Khmer',
  'q_1761298974654_ti02hf': 'Chemistry',
  'q_1761298992770_x74nnh': 'Physics',
  'q_1761299006371_6tcg56': 'Biology',
  'q_1761299012871_p1qejj': 'History',
  
  // Grade 12 Social subjects
  'q_1761304490669_qchcls': 'Khmer',
  'q_1761304490669_v55ltg': 'Math',
  'q_1761304490669_1y6jzq': 'Moral',
  'q_1761304490669_tdgeg7': 'History',
  'q_1761304490669_aracq': 'Geography',
  'q_1761304490669_p9rmr': 'Earth',
  
  // Grade 11A subjects
  'q_1761305102392_xtaayf': 'Math',
  'q_1761305102392_qpjldy': 'Khmer',
  'q_1761305258541_3fypy': 'Chemistry',
  'q_1761305102392_ui8utf': 'Physics',
  'q_1761305102392_6lle3b': 'Biology',
  'q_1761305266108_9zp4r': 'History',
  
  // Grade 11E subjects
  'q_1761299572863_wqy7hd': 'Math',
  'q_1761299572863_49mee': 'Chemistry',
  'q_1761299796963_aqmlx': 'Physics',
  'q_1761299804279_zq4r3s': 'Biology',
  
  // Grade 7-8 subjects
  'q_1761299425719_419q6o': 'Math',
  'q_1761299464653_cxma3q': 'Chemistry',
  'q_1761299471836_3x6erg': 'Physics',
  
  // Grade 9 subjects
  'q_1761299479385_768xb4': 'Math',
  'q_1761299479385_2kzft4': 'Geometry',
  'q_1761299479385_rlt5l': 'Physics',
  'q_1761299527714_lpuxj': 'Chemistry',
  
  // Grade 10 subjects
  'q_1761299544130_b0xaz': 'Math',
  'q_1761299544130_ode2jr': 'Geometry',
  'q_1761299544130_g3t4kq': 'Physics',
  'q_1761299544130_j99mun': 'Chemistry',
};

// Subject display names
const SUBJECT_DISPLAY_NAMES: { [key: string]: string } = {
  'Khmer': 'Khmer',
  'Math': 'Math',
  'Physics': 'Physics',
  'Chemistry': 'Chemistry',
  'Biology': 'Biology',
  'History': 'History',
  'Moral': 'Moral',
  'Geography': 'Geography',
  'Earth': 'Earth',
};

// Determine subjects based on class - now dynamically from examSettings
const getSubjectsForClass = (classType: string, examSettingsMap: { [key: string]: number } = {}): string[] => {
  // Extract subjects from examSettings for this classType
  const subjects: string[] = [];
  
  // Get all keys that match this classType
  Object.keys(examSettingsMap).forEach(key => {
    // Key format: "Grade 12_math"
    const parts = key.split('_');
    if (parts.length >= 2) {
      const keyClassType = parts[0]; // "Grade 12"
      const subject = parts[1]; // "math"
      
      if (keyClassType === classType) {
        // Capitalize first letter
        const capitalizedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
        if (!subjects.includes(capitalizedSubject)) {
          subjects.push(capitalizedSubject);
        }
      }
    }
  });
  
  // Define subject ordering for consistent display
  // Different ordering for Social (12S) vs Science classes
  const isSocialClass = classType.toLowerCase().includes('12s') || 
                        classType.toLowerCase().includes('social');
  
  const subjectOrder: { [key: string]: number } = isSocialClass ? {
    // Social class order: Khmer first, then Math
    'Khmer': 1,
    'Math': 2,
    'History': 3,
    'Moral': 4,
    'Geography': 5,
    'Earth': 6
  } : {
    // Science class order: Math first, then Khmer
    'Math': 1,
    'Khmer': 2,
    'Chemistry': 3,
    'Physics': 4,
    'Biology': 5,
    'History': 6,
    'Geometry': 7,
    'Moral': 8,
    'Geography': 9,
    'Earth': 10
  };
  
  // Sort subjects by predefined order
  subjects.sort((a, b) => {
    const orderA = subjectOrder[a] || 999;
    const orderB = subjectOrder[b] || 999;
    return orderA - orderB;
  });
  
  return subjects;
};

// Column label mapping based on subject position
const COLUMN_LABELS = [
  'Math/Khm',   // Position 0: Math or Khmer
  'Khm/Math', // Position 1: Khmer or Math
  'Chem/His',   // Position 2: Chemistry or History
  'Phy/Moral',  // Position 3: Physics or Moral
  'Bio/Geo',   // Position 4: Biology or Geography
  'His/Ear'     // Position 5: History or Earth
];

// Get column label for a subject based on class type
const getColumnLabel = (subject: string, className: string, examSettingsMap: { [key: string]: number } = {}): string => {
  const subjects = getSubjectsForClass(className, examSettingsMap);
  const position = subjects.indexOf(subject);
  
  if (position === -1) return subject;
  return COLUMN_LABELS[position] || subject;
};

// Grade calculation function
const calculateGrade = (score: number, maxScore: number): string => {
  if (!maxScore || maxScore === 0) return 'N/A';
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  if (percentage >= 50) return 'E';
  return 'F';
};

// Calculate total grade based on sum of scores / sum of maxScores
// Include all subjects in maxScores, even if subject field is null
const calculateTotalGrade = (scores: { [subject: string]: number }, maxScores: { [subject: string]: number }): string => {
  // Use maxScores as the source of truth for which subjects to include
  const subjects = Object.keys(maxScores);
  
  if (subjects.length === 0) return 'N/A';
  
  let totalScore = 0;
  let totalMaxScore = 0;
  
  subjects.forEach(subject => {
    // Include the subject's maxScore regardless of whether score exists
    totalMaxScore += maxScores[subject] || 0;
    
    // Add the score if it exists and is valid (not null, undefined, or absent marker -1)
    if (scores[subject] !== undefined && scores[subject] !== null && scores[subject] !== -1) {
      totalScore += scores[subject];
    }
    // If score is null/undefined/absent, it contributes 0 to totalScore but maxScore is still included
  });
  
  if (totalMaxScore === 0) return 'N/A';
  
  return calculateGrade(totalScore, totalMaxScore);
};

// Grade styles function
const getGradeStyles = (grade: string): string => {
  switch (grade) {
    case 'A':
      return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm border border-emerald-400/50';
    case 'B':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm border border-blue-400/50';
    case 'C':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm border border-purple-400/50';
    case 'D':
      return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm border border-yellow-400/50';
    case 'E':
      return 'bg-gradient-to-r from-orange-500 to-red-400 text-white shadow-sm border border-orange-400/50';
    case 'F':
      return 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm border border-red-400/50';
    default:
      return 'bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-sm border border-slate-400/50';
  }
};

// Get grade color for total score display
const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A': return 'text-green-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-yellow-500';
    case 'D': return 'text-orange-300';
    case 'E': return 'text-purple-600';
    case 'F': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

interface MockExamScoresTableProps {
  formId?: string;
}

export const MockExamScoresTable: React.FC<MockExamScoresTableProps> = ({ 
  formId = 'q57n4s6X6pMAX6yHRoQ0' 
}) => {
  
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [filteredData, setFilteredData] = useState<ScoreData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dataSource, setDataSource] = useState<'expected' | 'real'>('real'); // Toggle between expected and real scores
  const [showCompletionView, setShowCompletionView] = useState(false); // Toggle completion view
  const [examSettings, setExamSettings] = useState<{ [key: string]: number }>({}); // Store maxScores from examSettings
  const [showAbsentView, setShowAbsentView] = useState(false); // Show absent marking view

  // Fetch exam settings from Firestore
  const fetchExamSettings = async (mockExam: string = 'mock1') => {
    try {
      const examSettingsQuery = query(
        collection(db, 'examSettings'),
        where('mock', '==', mockExam)
      );
      
      const snapshot = await getDocs(examSettingsQuery);
      const settings: { [key: string]: number } = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data() as ExamSetting;
        // Create key: "Grade 12_math" -> maxScore
        const key = `${data.type}_${data.subject}`;
        settings[key] = data.maxScore;
      });
      
      setExamSettings(settings);
      return settings;
    } catch (error) {
      toast.error('Failed to load exam settings');
      return {};
    }
  };

  // Get maxScore for a specific subject and class type
  const getMaxScore = (classType: string, subject: string, settingsMap: { [key: string]: number }): number => {
    const normalizedSubject = subject.toLowerCase();
    const key = `${classType}_${normalizedSubject}`;
    
    const maxScore = settingsMap[key];
    if (maxScore !== undefined) {
      return maxScore;
    }
    
    // Fallback to 100 if not found
    return 100;
  };

  // Fetch data from form_responses (Expected Scores)
  const fetchFormResponses = async () => {
    try {
      setIsLoading(true);
      
      // Fetch exam settings first
      const settingsMap = await fetchExamSettings('mock1');
      
      const responsesQuery = query(
        collection(db, 'form_responses'),
        where('formId', '==', formId),
        orderBy('submittedAt', 'desc')
      );
      
      const snapshot = await getDocs(responsesQuery);
      const processedData: ScoreData[] = [];
      
      // Fetch all students at once and create a lookup map
      const studentsMap = new Map<string, { class: string; shift: string }>();
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        studentsSnapshot.forEach(doc => {
          const studentData = doc.data();
          // Map both studentId field and document ID to class and shift
          if (studentData.class) {
            const studentInfo = {
              class: studentData.class,
              shift: studentData.shift || 'N/A'
            };
            // Use studentId field if it exists
            if (studentData.studentId) {
              studentsMap.set(studentData.studentId, studentInfo);
            }
            // Also map by document ID
            studentsMap.set(doc.id, studentInfo);
          }
        });
      } catch (error) {
        console.error('Error fetching students for class lookup:', error);
      }
      
      snapshot.forEach((doc) => {
        const data = doc.data() as FormResponse;
        
        const classType = data.classType || data.class || '';
        
        // Get class and shift from students map or fall back to defaults
        const studentInfo = data.studentId && studentsMap.has(data.studentId) 
          ? studentsMap.get(data.studentId)! 
          : { class: data.class || 'N/A', shift: data.shift || 'N/A' };
        
        // Extract scores from answers
        const scores: { [subject: string]: number } = {};
        const maxScores: { [subject: string]: number } = {};
        let totalScore = 0;
        let scoreCount = 0;
        
        // Get all subjects for this class to ensure maxScores includes all subjects
        const allSubjects = getSubjectsForClass(classType, settingsMap);
        
        // Initialize maxScores for all subjects in the class
        allSubjects.forEach(subject => {
          maxScores[subject] = getMaxScore(classType, subject, settingsMap);
        });
        
        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach((answer) => {
            const subject = QUESTION_SUBJECT_MAP[answer.questionId];
            
            if (subject) {
              // Parse the score (handle both string and array formats)
              let scoreValue = 0;
              if (Array.isArray(answer.answer)) {
                scoreValue = parseFloat(answer.answer[0]) || 0;
              } else {
                scoreValue = parseFloat(answer.answer) || 0;
              }
              
              scores[subject] = scoreValue;
              totalScore += scoreValue;
              scoreCount++;
              
              // Update max score from examSettings (already initialized above)
              maxScores[subject] = getMaxScore(classType, subject, settingsMap);
            }
          });
        }
        
        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        
        processedData.push({
          studentId: data.studentId,
          studentName: data.studentName,
          class: studentInfo.class,
          classType: classType,
          shift: studentInfo.shift,
          scores,
          totalScore,
          averageScore,
          maxScores,
        });
      });
      
      setScoreData(processedData);
      setFilteredData(processedData);
      toast.success(`Loaded ${processedData.length} expected scores`);
    } catch (error) {
      toast.error('Failed to load expected scores');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data from mockExam1 (Real Results)
  const fetchRealResults = async (silent = false) => {
    try {
      setIsLoading(true);
      
      // Fetch exam settings first
      const settingsMap = await fetchExamSettings('mock1');
      
      const mockExamQuery = query(
        collection(db, 'mockExam1'),
        orderBy('fullName')
      );
      
      const snapshot = await getDocs(mockExamQuery);
      const processedData: ScoreData[] = [];
      
      // Subject fields that might contain scores in mockExam1 - now in mock1Result
      const possibleSubjects = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'geometry', 'moral', 'geography', 'earth'];
      
      // Fetch all students at once and create a lookup map
      const studentsMap = new Map<string, { class: string; shift: string }>();
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        studentsSnapshot.forEach(doc => {
          const studentData = doc.data();
          // Map both studentId field and document ID to class and shift
          if (studentData.class) {
            const studentInfo = {
              class: studentData.class,
              shift: studentData.shift || 'N/A'
            };
            // Use studentId field if it exists
            if (studentData.studentId) {
              studentsMap.set(studentData.studentId, studentInfo);
            }
            // Also map by document ID
            studentsMap.set(doc.id, studentInfo);
          }
        });
      } catch (error) {
        console.error('Error fetching students for class lookup:', error);
      }
      
      // Process each document
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Get class and shift from students map or fall back to defaults
        const studentInfo = data.studentId && studentsMap.has(data.studentId) 
          ? studentsMap.get(data.studentId)! 
          : { class: data.classType || 'N/A', shift: 'N/A' };
        
        // Extract scores from the document - now from mock1Result
        const scores: { [subject: string]: number } = {};
        const maxScores: { [subject: string]: number } = {};
        const teacherFields: { [key: string]: any } = {}; // Store teacher-related fields
        let totalScore = 0;
        let scoreCount = 0;
        
        const classType = data.classType || 'N/A';
        
        // Get all subjects for this class to ensure maxScores includes all subjects
        const allSubjects = getSubjectsForClass(classType, settingsMap);
        
        // Initialize maxScores for all subjects in the class
        allSubjects.forEach(subject => {
          const subjectLower = subject.toLowerCase();
          maxScores[subject] = getMaxScore(classType, subjectLower, settingsMap);
        });
        
        // Read from mock1Result structure
        const mock1Result = data.mock1Result || {};
        
        possibleSubjects.forEach((subject) => {
          if (mock1Result[subject] !== undefined) {
            // Check if value is "absent" or a number
            if (mock1Result[subject] === 'absent') {
              // Store as special value to indicate absence
              const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
              scores[subjectName] = -1; // Use -1 to indicate absent
              // maxScores already initialized above
            } else if (typeof mock1Result[subject] === 'number') {
              // Capitalize first letter for consistency
              const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
              scores[subjectName] = mock1Result[subject];
              totalScore += mock1Result[subject];
              scoreCount++;
              
              // maxScores already initialized above
            }
            
            // Store teacher field if it exists (e.g., physics_teacher -> Physics_teacher)
            const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
            const teacherFieldName = `${subject}_teacher`;
            if (mock1Result[teacherFieldName]) {
              teacherFields[`${subjectName}_teacher`] = mock1Result[teacherFieldName];
            }
            
            // Store timestamp field if it exists
            const timestampFieldName = `${subject}_timestamp`;
            if (mock1Result[timestampFieldName]) {
              teacherFields[`${subjectName}_timestamp`] = mock1Result[timestampFieldName];
            }
          }
        });
        
        // Include ALL students from mockExam1 collection, even those without scores
        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        
        processedData.push({
          studentId: data.studentId || docSnapshot.id,
          docId: docSnapshot.id, // Store the actual Firestore document ID
          studentName: data.fullName || 'Unknown',
          class: studentInfo.class, // Use the class fetched from students collection
          classType: data.classType || 'N/A',
          shift: studentInfo.shift, // Use the shift fetched from students collection
          scores,
          totalScore,
          averageScore,
          maxScores,
          ...teacherFields, // Spread teacher fields into the data
        });
      }

      
      setScoreData(processedData);
      setFilteredData(processedData);
      if (!silent) {
        toast.success(`Loaded ${processedData.length} real exam results`);
      }
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load real exam results');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data based on selected source
  useEffect(() => {
    if (dataSource === 'expected') {
      fetchFormResponses();
    } else {
      fetchRealResults();
    }
  }, [formId, dataSource]);

  // Filter and search
  useEffect(() => {
    let filtered = scoreData;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedClassType) {
      filtered = filtered.filter(student => student.classType === selectedClassType);
    }

    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }

    setFilteredData(filtered);
  }, [scoreData, searchTerm, selectedClassType, selectedClass]);

  // Reset class filter when classType changes
  useEffect(() => {
    setSelectedClass('');
  }, [selectedClassType]);

  // Sorting
  const handleSort = (field: string) => {
    const isCurrentField = sortField === field;
    const newDirection = isCurrentField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'studentName':
          aValue = a.studentName.toLowerCase();
          bValue = b.studentName.toLowerCase();
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'totalGrade':
          // Convert grades to numbers for sorting (A=6, B=5, C=4, D=3, E=2, F=1, N/A=0)
          const gradeToNumber = (grade: string) => {
            switch (grade) {
              case 'A': return 6;
              case 'B': return 5;
              case 'C': return 4;
              case 'D': return 3;
              case 'E': return 2;
              case 'F': return 1;
              default: return 0;
            }
          };
          aValue = gradeToNumber(calculateTotalGrade(a.scores, a.maxScores));
          bValue = gradeToNumber(calculateTotalGrade(b.scores, b.maxScores));
          break;
        case 'averageScore':
          aValue = a.averageScore;
          bValue = b.averageScore;
          break;
        default:
          // Subject scores - handle NC (undefined/null) and Absent (-1) as lowest values
          const aScore = a.scores[sortField];
          const bScore = b.scores[sortField];
          
          // Priority order for ascending: NC (-999) < Absent (-1) < 0 < actual scores
          // NC (undefined/null) gets -999 to be sorted before Absent (-1)
          aValue = (aScore === undefined || aScore === null) ? -999 : aScore;
          bValue = (bScore === undefined || bScore === null) ? -999 : bScore;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue - bValue)
          : (bValue - aValue);
      }
    });
  }, [filteredData, sortField, sortDirection]);

  // Get unique classTypes and classes
  const uniqueClassTypes = sortGrades(Array.from(new Set(scoreData.map(s => s.classType))));
  
  // Get classes filtered by selected classType
  const availableClasses = useMemo(() => {
    let classesData = scoreData;
    if (selectedClassType) {
      classesData = scoreData.filter(s => s.classType === selectedClassType);
    }
    return Array.from(new Set(classesData.map(s => s.class))).sort();
  }, [scoreData, selectedClassType]);

  // Determine the subjects to display based on filtered data
  const displayedSubjects = useMemo(() => {
    // If we have a selected class type, use that
    if (selectedClassType) {
      return getSubjectsForClass(selectedClassType, examSettings);
    }
    
    // Otherwise, try to find the most common class type in filtered data
    if (filteredData.length > 0) {
      // Get the first student's class type as default
      return getSubjectsForClass(filteredData[0].classType, examSettings);
    }
    
    return [];
  }, [selectedClassType, filteredData, examSettings]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Class'];
    
    // Add column labels
    headers.push(...COLUMN_LABELS);
    headers.push('Total Score', 'Grade');

    const rows = sortedData.map(student => {
      const subjects = getSubjectsForClass(student.classType, examSettings);
      const classWithShift = student.shift && student.shift !== 'N/A' 
        ? `${student.class} - ${student.shift}` 
        : student.class;
      const row = [
        student.studentId,
        student.studentName,
        classWithShift,
      ];
      
      // Add scores in organized order
      subjects.forEach(subject => {
        const score = student.scores[subject];
        row.push(score === -1 ? 'absent' : (score || 0).toString());
      });
      
      // Fill remaining columns
      for (let i = subjects.length; i < COLUMN_LABELS.length; i++) {
        row.push('-');
      }
      
      row.push(student.totalScore.toFixed(2), calculateTotalGrade(student.scores, student.maxScores));
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mock_exam_scores_${formId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Exported to CSV successfully!');
  };

  // Statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
      };
    }

    const totalScores = filteredData.map(s => s.totalScore);
    const averageScores = filteredData.map(s => s.averageScore);
    
    return {
      totalStudents: filteredData.length,
      averageScore: totalScores.reduce((a, b) => a + b, 0) / totalScores.length,
      highestScore: Math.max(...totalScores),
      lowestScore: Math.min(...totalScores),
      passRate: (averageScores.filter(score => score >= 50).length / averageScores.length) * 100,
    };
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading exam results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full border border-white/20 dark:border-slate-700/50 shadow-lg">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-white bg-clip-text text-transparent">
              Mock Exam Analytics
            </h1>
            <div className="w-3 h-3 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            Comprehensive analysis of student performance and completion metrics
          </p>
        </div>
        {/* Data Source Toggle */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/20 to-white/40 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-800/40 backdrop-blur-xl rounded-3xl"></div>
          <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl shadow-inner">
                  <Icon path={mdiChartLine} className="text-slate-600 dark:text-slate-300" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Data Source</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Choose your analysis perspective
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Completion View Toggle Button */}
                {dataSource === 'real' && (
                  <>
                    <button
                      onClick={() => setShowCompletionView(!showCompletionView)}
                      className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${
                        showCompletionView 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40' 
                          : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:text-white hover:shadow-xl'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon path={mdiChartBox} size={18} />
                        <span>{showCompletionView ? "Hide Analytics" : "Show Analytics"}</span>
                      </div>
                    </button>
                    
                    {/* Mark Absent Button */}
                    <button
                      onClick={() => setShowAbsentView(true)}
                      className="px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-gradient-to-r hover:from-red-500 hover:to-orange-600 hover:text-white hover:shadow-xl"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon path={mdiAccountGroup} size={18} />
                        <span>Mark Absent</span>
                      </div>
                    </button>
                  </>
                )}
                
                {/* Data Source Buttons */}
                <div className="flex items-center bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-2xl p-2 shadow-inner">
                  <button
                    onClick={() => setDataSource('expected')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      dataSource === 'expected'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Expected Scores
                  </button>
                  <button
                    onClick={() => setDataSource('real')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      dataSource === 'real'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Real Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mark Absent View */}
        {showAbsentView && dataSource === 'real' && (
          <MarkAbsentView
            students={filteredData}
            onClose={() => setShowAbsentView(false)}
            onUpdate={() => fetchRealResults(true)}
            getSubjectsForClass={(classType) => getSubjectsForClass(classType, examSettings)}
          />
        )}

      {/* Subject Completion View */}
      {showCompletionView && dataSource === 'real' && (
        <SimpleSubjectCompletionView
          students={filteredData}
          onClose={() => setShowCompletionView(false)}
        />
      )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-indigo-600/10 rounded-3xl"></div>
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <Icon path={mdiAccountGroup} className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stats.totalStudents}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">students</div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Total Students</h4>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-1000" 
                     style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-600/5 to-cyan-600/10 rounded-3xl"></div>
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                  <Icon path={mdiChartLine} className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {stats.averageScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">points</div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Average Performance</h4>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-1.5 rounded-full transition-all duration-1000" 
                     style={{ width: `${Math.min((stats.averageScore / 100) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-visible lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-600/5 to-pink-600/10 rounded-3xl"></div>
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                  <Icon path={mdiChartBox} className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {(() => {
                      const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
                      filteredData.forEach(student => {
                        const grade = calculateTotalGrade(student.scores, student.maxScores);
                        if (gradeCounts.hasOwnProperty(grade)) {
                          gradeCounts[grade as keyof typeof gradeCounts]++;
                        }
                      });
                      const totalGraded = Object.values(gradeCounts).reduce((a, b) => a + b, 0);
                      const passingGrades = gradeCounts.A + gradeCounts.B + gradeCounts.C + gradeCounts.D + gradeCounts.E;
                      const passRate = totalGraded > 0 ? (passingGrades / totalGraded) * 100 : 0;
                      return passRate.toFixed(1) + '%';
                    })()}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">pass rate</div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Grade Distribution</h4>
              <div className="grid grid-cols-6 gap-2">
                {(() => {
                  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
                  const gradePercentages = { A: 0.90, B: 0.80, C: 0.70, D: 0.60, E: 0.50, F: 0 };
                  
                  // Calculate total max score across all students
                  const totalMaxScore = filteredData.length > 0 
                    ? Object.values(filteredData[0].maxScores).reduce((sum, score) => sum + (score || 0), 0)
                    : 0;
                  
                  filteredData.forEach(student => {
                    const grade = calculateTotalGrade(student.scores, student.maxScores);
                    if (gradeCounts.hasOwnProperty(grade)) {
                      gradeCounts[grade as keyof typeof gradeCounts]++;
                    }
                  });
                  const totalGraded = Object.values(gradeCounts).reduce((a, b) => a + b, 0);
                  return Object.entries(gradeCounts).map(([grade, count]) => {
                    const percentage = totalGraded > 0 ? ((count / totalGraded) * 100).toFixed(1) : '0';
                    const minScore = totalMaxScore > 0 ? (gradePercentages[grade as keyof typeof gradePercentages] * totalMaxScore).toFixed(0) : '0';
                    const scoreDisplay = grade === 'F' ? `<${(0.50 * totalMaxScore).toFixed(0)}` : `≥${minScore}`;
                    
                    return (
                      <div key={grade} className="group/grade relative flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-all duration-300 hover:scale-125 hover:z-10 hover:shadow-xl">
                        <span className={`text-lg font-bold px-3 py-1 rounded-lg mb-1 ${getGradeStyles(grade)}`}>
                          {grade}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {count}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 invisible opacity-0 group-hover/grade:visible group-hover/grade:opacity-100 transition-all duration-200 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl z-50 pointer-events-none">
                          <div className="font-semibold mb-1">Score: {scoreDisplay}/{totalMaxScore}</div>
                          <div>{percentage}% ({count}/{totalGraded} students)</div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>      {/* Filters */}
        <div className="relative z-[10]">
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/30 dark:from-slate-800/30 dark:via-slate-800/10 dark:to-slate-800/30 backdrop-blur-xl rounded-3xl"></div>
          <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/20 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl shadow-inner">
                <Icon path={mdiMagnify} className="text-slate-600 dark:text-slate-300" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Search & Filter</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Find and organize your data
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Search - Spans 2 columns */}
              <div className="space-y-3 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Search Students</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <Icon 
                    path={mdiMagnify} 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" 
                    size={20} 
                  />
                </div>
              </div>

              {/* ClassType Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Filter by Grade</label>
                <CustomCombobox
                  options={[
                    { value: '', label: 'All Grades' },
                    ...uniqueClassTypes.map(ct => ({ value: ct, label: ct }))
                  ]}
                  selectedValue={selectedClassType}
                  onChange={setSelectedClassType}
                  placeholder="Select grade..."
                  editable={false}
                  fieldData={{
                    className: "w-full px-4 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-all duration-300 shadow-sm hover:shadow-md dark:text-white"
                  }}
                />
              </div>

              {/* Class Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Filter by Class</label>
                <CustomCombobox
                  options={[
                    { value: '', label: 'All Classes' },
                    ...availableClasses.map(cls => ({ value: cls, label: cls }))
                  ]}
                  selectedValue={selectedClass}
                  onChange={setSelectedClass}
                  placeholder="Select class..."
                  editable={false}
                  fieldData={{
                    className: "w-full px-4 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-all duration-300 shadow-sm hover:shadow-md dark:text-white"
                  }}
                />
              </div>

              {/* Export Button */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Export Data</label>
                <button
                  onClick={exportToCSV}
                  className="w-full px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-3"
                >
                  <Icon path={mdiDownload} size={20} />
                  <span className="font-medium">Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/20 to-white/40 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-800/40 backdrop-blur-xl rounded-3xl"></div>
          <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-700/80 dark:to-slate-600/80 border-b border-slate-200/50 dark:border-slate-600/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl shadow-inner">
                    <Icon path={mdiChartLine} className="text-slate-600 dark:text-slate-300" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Exam Results</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Detailed performance breakdown
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-600/50">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {filteredData.length} students
                  </span>
                </div>
              </div>
            </div>       
             <div className="overflow-x-auto max-h-[calc(120vh-300px)] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-40 bg-gradient-to-r from-gray-50/95 to-gray-100/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-sm shadow-lg border-b border-gray-300 dark:border-slate-500">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-slate-600 sticky top-0 left-0 z-50 bg-gray-50 dark:bg-slate-800">
                  <button
                    onClick={() => handleSort('studentName')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>Student Name</span>
                    {sortField === 'studentName' && (
                      <Icon 
                        path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                        size={16} 
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  <button
                    onClick={() => handleSort('totalScore')}
                    className="flex items-center justify-center space-x-1 hover:text-blue-600 transition-colors w-full"
                  >
                    <span>Total</span>
                    {sortField === 'totalScore' && (
                      <Icon 
                        path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                        size={16} 
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  <button
                    onClick={() => handleSort('totalGrade')}
                    className="flex items-center justify-center space-x-1 hover:text-blue-600 transition-colors w-full"
                  >
                    <span>Grade</span>
                    {sortField === 'totalGrade' && (
                      <Icon 
                        path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                        size={16} 
                      />
                    )}
                  </button>
                </th>
                {/* Organized subject columns based on column labels - now clickable for sorting */}
                {COLUMN_LABELS.map((label, index) => {
                  // Get the actual subject name for this column based on displayed subjects
                  const subjectForSorting = displayedSubjects[index] || '';
                  
                  return (
                    <th key={label} className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                      {subjectForSorting ? (
                        <button
                          onClick={() => handleSort(subjectForSorting)}
                          className="flex items-center justify-center space-x-1 hover:text-blue-600 transition-colors w-full"
                        >
                          <span>{label}</span>
                          {sortField === subjectForSorting && (
                            <Icon 
                              path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                              size={16} 
                            />
                          )}
                        </button>
                      ) : (
                        <span>{label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={100} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Icon path={mdiChartLine} size={24} className="text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-500 dark:text-gray-400">No exam results found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((student, index) => {
                  const subjects = getSubjectsForClass(student.classType, examSettings);
                  
                  return (
                    <tr key={student.studentId} className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'}`}>
                      <td className={`px-6 py-3 whitespace-nowrap sticky left-0 z-40 border-r border-gray-200 dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'} group-hover:bg-slate-50 dark:group-hover:bg-slate-900`}>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{student.studentName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.class}{student.shift && student.shift !== 'N/A' ? ` - ${student.shift}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {student.totalScore > 0 ? (
                          <div className="flex flex-col items-center space-y-1">
                            <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-semibold text-gray-900 dark:text-white border border-slate-200 dark:border-slate-600 shadow-sm">
                              {student.totalScore.toString().replace(/\.0$/, '')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              / {Object.values(student.maxScores).reduce((sum, score) => sum + (score || 0), 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-gray-400/90 text-white border-2 border-gray-500 shadow-sm">
                            <span className="text-xs">{Object.values(student.scores).some(s => s === -1) ? 'Absent' : 'NC'}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {student.totalScore > 0 ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-sm ${getGradeStyles(calculateTotalGrade(student.scores, student.maxScores))}`}>
                            {calculateTotalGrade(student.scores, student.maxScores)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-gray-400/90 text-white border-2 border-gray-500 shadow-sm">
                            <span className="text-xs">{Object.values(student.scores).some(s => s === -1) ? 'Absent' : 'NC'}</span>
                          </span>
                        )}
                      </td>
                      {/* Organized subject scores based on class type */}
                      {(() => {
                        // Check if this is an evening class (Grade 12E or Grade 11E) - skip column 2 (index 1)
                        const isEveningClass = student.classType === 'Grade 12E' || student.classType === 'Grade 11E';
                        const isSocialClass = student.classType === 'Grade 12 Social';
                        const cells: React.ReactNode[] = [];
                        
                        // Map subjects to their proper column positions
                        // For Grade 12S (Social): Khmer first, Math second
                        // For Science classes: Math first, Khmer second
                        const subjectToColumnIndex: { [key: string]: number } = isSocialClass ? {
                          'Khmer': 0,  // Social class: Khmer in column 1
                          'Math': 1,   // Social class: Math in column 2
                          'History': 2,
                          'Moral': 3,
                          'Geography': 4,
                          'Earth': 5
                        } : {
                          'Math': 0,    // Science class: Math in column 1
                          'Khmer': 1,   // Science class: Khmer in column 2
                          'Chemistry': 2,
                          'Physics': 3,
                          'Biology': 4,
                          'History': 5,
                          'Geometry': 1, // Shares column with Khmer
                          'Moral': 3, // Shares column with Physics
                          'Geography': 4, // Shares column with Biology
                          'Earth': 5 // Shares column with History
                        };
                        
                        // Create all 6 columns
                        for (let colIndex = 0; colIndex < COLUMN_LABELS.length; colIndex++) {
                          // Skip column 1 (Khmer/Math) for evening classes
                          if (isEveningClass && colIndex === 1) {
                            cells.push(
                              <td key={`${student.studentId}-skip-${colIndex}`} className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="text-gray-400 dark:text-gray-500">-</span>
                              </td>
                            );
                            continue;
                          }
                          
                          // Find the subject that belongs in this column
                          const subjectForColumn = subjects.find(subject => subjectToColumnIndex[subject] === colIndex);
                          
                          if (subjectForColumn) {
                            const score = student.scores[subjectForColumn];
                            const maxScore = student.maxScores[subjectForColumn] || 100;
                            const hasScore = score !== undefined && score !== null;
                            const isAbsent = score === -1;
                            
                            let displayContent;
                            
                            if (isAbsent) {
                              displayContent = (
                                <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-gray-400/90 text-white border-2 border-gray-500 shadow-sm">
                                  <span className="text-xs">Absent</span>
                                </span>
                              );
                            } else if (hasScore && score >= 0) {
                              const grade = calculateGrade(score, maxScore);
                              displayContent = (
                                <span className={`inline-flex items-center px-3 py-2 rounded-full font-bold border-1 shadow-sm ${getGradeStyles(grade)}`}>
                                  <span className="text-base">{score.toFixed(0)}</span>
                                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold border border-white/30">
                                    {grade}
                                  </span>
                                </span>
                              );
                            } else {
                              displayContent = (
                                <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-gray-400/90 text-white border-2 border-gray-500 shadow-sm">
                                  <span className="text-xs">NC</span>
                                </span>
                              );
                            }
                            
                            cells.push(
                              <td key={`${student.studentId}-${subjectForColumn}-${colIndex}`} className="px-2 py-2 whitespace-nowrap text-center overflow-visible">
                                <div className="flex flex-col items-center space-y-1">
                                  {displayContent}
                                </div>
                              </td>
                            );
                          } else {
                            // Empty column
                            cells.push(
                              <td key={`${student.studentId}-empty-${colIndex}`} className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="text-gray-400 dark:text-gray-500">-</span>
                              </td>
                            );
                          }
                        }
                        
                        return cells;
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MockExamScoresTable;
