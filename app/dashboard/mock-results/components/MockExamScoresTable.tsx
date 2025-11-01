"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
  studentName: string;
  class: string;
  classType: string;
  shift: string;
  scores: { [subject: string]: number };
  totalScore: number;
  averageScore: number;
  maxScores: { [subject: string]: number };
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

// Determine subjects based on class with specific ordering
const getSubjectsForClass = (classType: string): string[] => {
  
  const lowerClass = classType.toLowerCase();
  
  // Check for Grade 12 Social
  if (lowerClass.includes('grade 12 social') || 
      (lowerClass.includes('12') && lowerClass.includes('social'))) {
    return ['Khmer', 'Math', 'History', 'Moral', 'Geography', 'Earth'];
  } 
  // Check for Grade 12, 11E, or 11 (Science)
  else if (lowerClass.includes('grade 12') || lowerClass.includes('grade 11e') || 
           lowerClass.includes('grade 11')) {
    return ['Math', 'Khmer', 'Chemistry', 'Physics', 'Biology', 'History'];
  } 
  // Check for Grade 7-10
  else if (lowerClass.match(/grade\s*[7-9]|grade\s*10/i)) {
    return ['Math', 'Geometry', 'Chemistry', 'Physics'];
  }
  
  return [];
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
const getColumnLabel = (subject: string, className: string): string => {
  const subjects = getSubjectsForClass(className);
  const position = subjects.indexOf(subject);
  
  if (position === -1) return subject;
  return COLUMN_LABELS[position] || subject;
};

// Grade calculation function
const calculateGrade = (score: number, maxScore: number): string => {
  if (!maxScore || maxScore === 0) return 'N/A';
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 85) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  if (percentage >= 20) return 'E';
  return 'F';
};

// Grade styles function
const getGradeStyles = (grade: string): string => {
  switch (grade) {
    case 'A':
      return 'bg-green-500/90 text-white border-2 border-green-600';
    case 'B':
      return 'bg-blue-500/90 text-white border-2 border-blue-600';
    case 'C':
      return 'bg-yellow-400/90 text-white border-2 border-yellow-500';
    case 'D':
      return 'bg-orange-400/90 text-white border-2 border-orange-500';
    case 'E':
      return 'bg-purple-500/90 text-white border-2 border-purple-600';
    case 'F':
      return 'bg-red-500/90 text-white border-2 border-red-600';
    default:
      return 'bg-gray-400/90 text-white border-2 border-gray-500';
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
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dataSource, setDataSource] = useState<'expected' | 'real'>('expected'); // Toggle between expected and real scores
  const [showCompletionView, setShowCompletionView] = useState(false); // Toggle completion view

  // Fetch data from form_responses (Expected Scores)
  const fetchFormResponses = async () => {
    try {
      setIsLoading(true);
      
      const responsesQuery = query(
        collection(db, 'form_responses'),
        where('formId', '==', formId),
        orderBy('submittedAt', 'desc')
      );
      
      const snapshot = await getDocs(responsesQuery);
      const processedData: ScoreData[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as FormResponse;
        
        const classType = data.classType || data.class || '';
        
        // Extract scores from answers
        const scores: { [subject: string]: number } = {};
        const maxScores: { [subject: string]: number } = {};
        let totalScore = 0;
        let scoreCount = 0;
        
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
              
              // Set default max scores (100 for all subjects)
              maxScores[subject] = 100;
            }
          });
        }
        
        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        
        processedData.push({
          studentId: data.studentId,
          studentName: data.studentName,
          class: data.class,
          classType: classType,
          shift: data.shift,
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
      console.error('❌ Error fetching form responses:', error);
      toast.error('Failed to load expected scores');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data from mockExam1 (Real Results)
  const fetchRealResults = async () => {
    try {
      setIsLoading(true);
      
      const mockExamQuery = query(
        collection(db, 'mockExam1'),
        orderBy('fullName')
      );
      
      const snapshot = await getDocs(mockExamQuery);
      const processedData: ScoreData[] = [];
      
      // Subject fields that might contain scores in mockExam1
      const possibleSubjects = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'geometry', 'moral', 'geography', 'earth'];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Extract scores from the document
        const scores: { [subject: string]: number } = {};
        const maxScores: { [subject: string]: number } = {};
        const teacherFields: { [key: string]: any } = {}; // Store teacher-related fields
        let totalScore = 0;
        let scoreCount = 0;
        
        possibleSubjects.forEach((subject) => {
          if (data[subject] !== undefined && typeof data[subject] === 'number') {
            // Capitalize first letter for consistency
            const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
            scores[subjectName] = data[subject];
            totalScore += data[subject];
            scoreCount++;
            
            // Set default max scores (100 for all subjects)
            maxScores[subjectName] = 100;
            
            // Store teacher field if it exists (e.g., physics_teacher -> Physics_teacher)
            const teacherFieldName = `${subject}_teacher`;
            if (data[teacherFieldName]) {
              teacherFields[`${subjectName}_teacher`] = data[teacherFieldName];
            }
            
            // Store timestamp field if it exists
            const timestampFieldName = `${subject}_timestamp`;
            if (data[timestampFieldName]) {
              teacherFields[`${subjectName}_timestamp`] = data[timestampFieldName];
            }
          }
        });
        
        // Include ALL students from mockExam1 collection, even those without scores
        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        
        processedData.push({
          studentId: data.studentId || doc.id,
          studentName: data.fullName || 'Unknown',
          class: data.classType || 'N/A',
          classType: data.classType || 'N/A',
          shift: 'N/A', // mockExam1 doesn't have shift info
          scores,
          totalScore,
          averageScore,
          maxScores,
          ...teacherFields, // Spread teacher fields into the data
        });
      });
      
      setScoreData(processedData);
      setFilteredData(processedData);
      toast.success(`Loaded ${processedData.length} real exam results`);
    } catch (error) {
      console.error('❌ Error fetching real results:', error);
      toast.error('Failed to load real exam results');
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

    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }

    setFilteredData(filtered);
  }, [scoreData, searchTerm, selectedClass]);

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
        case 'class':
          aValue = a.class;
          bValue = b.class;
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'averageScore':
          aValue = a.averageScore;
          bValue = b.averageScore;
          break;
        default:
          // Subject scores
          aValue = a.scores[sortField] || 0;
          bValue = b.scores[sortField] || 0;
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

  // Get unique classes
  const uniqueClasses = Array.from(new Set(scoreData.map(s => s.class))).sort();

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Class', 'Shift'];
    
    // Add column labels
    headers.push(...COLUMN_LABELS);
    headers.push('Total Score', 'Average Score');

    const rows = sortedData.map(student => {
      const subjects = getSubjectsForClass(student.class);
      const row = [
        student.studentId,
        student.studentName,
        student.class,
        student.shift,
      ];
      
      // Add scores in organized order
      subjects.forEach(subject => {
        row.push((student.scores[subject] || 0).toString());
      });
      
      // Fill remaining columns
      for (let i = subjects.length; i < COLUMN_LABELS.length; i++) {
        row.push('-');
      }
      
      row.push(student.totalScore.toFixed(2), student.averageScore.toFixed(2));
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
                  <button
                    onClick={() => setShowCompletionView(!showCompletionView)}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${
                      showCompletionView 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40' 
                        : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon path={mdiChartBox} size={18} />
                      <span>{showCompletionView ? "Hide Analytics" : "Show Analytics"}</span>
                    </div>
                  </button>
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
            
            <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                {dataSource === 'expected' 
                  ? '� Analyzing expected performance from student submissions'
                  : '🎯 Reviewing actual exam results and completion metrics'}
              </p>
            </div>
          </div>
        </div>      {/* Subject Completion View */}
      {showCompletionView && dataSource === 'real' && (
        <SimpleSubjectCompletionView
          students={filteredData}
          onClose={() => setShowCompletionView(false)}
        />
      )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative overflow-hidden">
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
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Total Enrollment</h4>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-1000" 
                     style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden">
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

          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-600/5 to-red-600/10 rounded-3xl"></div>
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                  <Icon path={mdiChartBox} className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {stats.highestScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">points</div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Peak Achievement</h4>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 h-1.5 rounded-full transition-all duration-1000" 
                     style={{ width: `${Math.min((stats.highestScore / 100) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-600/5 to-pink-600/10 rounded-3xl"></div>
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                  <Icon path={mdiPercent} className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {stats.passRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">success rate</div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Pass Rate</h4>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 h-1.5 rounded-full transition-all duration-1000" 
                     style={{ width: `${stats.passRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>      {/* Filters */}
        <div className="relative">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Search */}
              <div className="space-y-3">
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

              {/* Class Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Filter by Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
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
            </div>        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
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
                    onClick={() => handleSort('class')}
                    className="flex items-center justify-center space-x-1 hover:text-blue-600 transition-colors w-full"
                  >
                    <span>Class</span>
                    {sortField === 'class' && (
                      <Icon 
                        path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                        size={16} 
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Shift
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
                    onClick={() => handleSort('averageScore')}
                    className="flex items-center justify-center space-x-1 hover:text-blue-600 transition-colors w-full"
                  >
                    <span>Average</span>
                    {sortField === 'averageScore' && (
                      <Icon 
                        path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                        size={16} 
                      />
                    )}
                  </button>
                </th>
                {/* Organized subject columns based on column labels */}
                {COLUMN_LABELS.map((label, index) => (
                  <th key={label} className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                    <span>{label}</span>
                  </th>
                ))}
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
                  const subjects = getSubjectsForClass(student.classType);
                  
                  return (
                    <tr key={student.studentId} className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'}`}>
                      <td className={`px-6 py-3 whitespace-nowrap sticky left-0 z-40 border-r border-gray-200 dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'} group-hover:bg-slate-50 dark:group-hover:bg-slate-900`}>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{student.studentName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{student.studentId}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">
                          {student.class}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-300">
                        {student.shift}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {student.totalScore > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              {student.totalScore.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">NC</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`font-semibold ${
                          student.averageScore >= 50 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {student.averageScore.toFixed(1)}%
                        </span>
                      </td>
                      {/* Organized subject scores based on class type */}
                      {subjects.map((subject, subjectIndex) => {
                        const score = student.scores[subject];
                        const maxScore = student.maxScores[subject] || 100;
                        const hasScore = score !== undefined && score !== null;
                        
                        let displayContent;
                        
                        if (hasScore) {
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
                        
                        return (
                          <td key={`${student.studentId}-${subject}-${subjectIndex}`} className="px-2 py-2 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center space-y-1">
                              {displayContent}
                            </div>
                          </td>
                        );
                      })}
                      {/* Fill remaining columns if class has fewer subjects */}
                      {Array(COLUMN_LABELS.length - subjects.length).fill(null).map((_, emptyIndex) => (
                        <td key={`${student.studentId}-empty-${emptyIndex}`} className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        </td>
                      ))}
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
