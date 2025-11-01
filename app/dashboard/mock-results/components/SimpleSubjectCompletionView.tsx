"use client";

import React from 'react';
import { 
  mdiChartBox,
  mdiPercent,
  mdiClose,
  mdiAccountGroup,
  mdiAccountCheck,
  mdiAccountQuestion,
  mdiSchool,
  mdiAccount
} from '@mdi/js';
import CardBox from '../../../_components/CardBox';
import Button from '../../../_components/Button';
import Icon from '../../../_components/Icon';

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
  [key: string]: any; // Allow dynamic teacher fields
}

interface SubjectCompletionStats {
  filled: number;
  nc: number;
  total: number;
  percentage: number;
  teachers: { [teacherName: string]: number }; // Teacher name -> count
  teacherCount: number; // Unique teacher count
}

interface SimpleSubjectCompletionViewProps {
  students: ScoreData[];
  onClose: () => void;
}

const SimpleSubjectCompletionView: React.FC<SimpleSubjectCompletionViewProps> = ({
  students,
  onClose
}) => {
  
  // Get all unique subjects from all students
  const getAllSubjects = (): string[] => {
    const subjectsSet = new Set<string>();
    students.forEach(student => {
      Object.keys(student.scores).forEach(subject => {
        subjectsSet.add(subject);
      });
    });
    return Array.from(subjectsSet).sort();
  };

  // Calculate completion statistics for each subject
  const calculateCompletionStats = (): { [subject: string]: SubjectCompletionStats } => {
    const stats: { [subject: string]: SubjectCompletionStats } = {};
    const subjects = getAllSubjects();
    
    subjects.forEach(subject => {
      let filled = 0;
      let nc = 0;
      const teachers: { [teacherName: string]: number } = {};
      
      students.forEach(student => {
        const score = student.scores[subject];
        const teacherField = `${subject}_teacher`;
        const teacherName = student[teacherField];
        
        if (score !== undefined && score !== null && score > 0) {
          filled++;
          
          // Track teacher who entered this score
          if (teacherName && typeof teacherName === 'string') {
            teachers[teacherName] = (teachers[teacherName] || 0) + 1;
          }
        } else {
          nc++;
        }
      });
      
      const total = students.length; // Total documents in mockExam1 collection
      const percentage = total > 0 ? (filled / total) * 100 : 0;
      const teacherCount = Object.keys(teachers).length;
      
      stats[subject] = {
        filled,
        nc,
        total,
        percentage,
        teachers,
        teacherCount
      };
    });
    
    return stats;
  };

  // Group students by class/grade
  const groupStudentsByGrade = (): { [grade: string]: ScoreData[] } => {
    const groups: { [grade: string]: ScoreData[] } = {};
    
    students.forEach(student => {
      const grade = student.classType || student.class || 'Other';
      if (!groups[grade]) {
        groups[grade] = [];
      }
      groups[grade].push(student);
    });
    
    return groups;
  };

  const completionStats = calculateCompletionStats();
  const gradeGroups = groupStudentsByGrade();
  const subjects = getAllSubjects();

  return (
    <CardBox className="p-8 bg-white dark:bg-slate-900/70 shadow-sm border-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <Icon path={mdiChartBox} className="text-slate-600 dark:text-slate-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Subject Completion Statistics</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Mock Exam 1 • {students.length} students enrolled
            </p>
          </div>
        </div>
        <Button
          icon={mdiClose}
          label="Close"
          color="lightDark"
          onClick={onClose}
          small
          outline
        />
      </div>
      
      <div className="space-y-8">
        {/* Overall Statistics */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Icon path={mdiSchool} className="text-slate-600 dark:text-slate-400" size={20} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                  All Students
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {students.length} students
                </p>
              </div>
            </div>
          </div>
          
          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subjects.map(subject => {
              const stats = completionStats[subject];
              
              return (
                <div key={subject} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-semibold text-slate-900 dark:text-white text-base">{subject}</h5>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {stats.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">complete</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
                    <div 
                      className="bg-linear-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${stats.percentage}%` }}
                    ></div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Completed</span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">{stats.filled}</span>
                    </div>
                    
                    {/* Teacher Information */}
                    {stats.teacherCount > 0 && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {stats.teacherCount} teacher{stats.teacherCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="pl-4 space-y-1 max-h-16 overflow-y-auto">
                          {Object.entries(stats.teachers)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3) // Show top 3 teachers
                            .map(([teacherName, count]) => (
                              <div key={teacherName} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span className="truncate mr-2">{teacherName}</span>
                                <span className="font-medium text-purple-600 dark:text-purple-400">{count}</span>
                              </div>
                            ))}
                          {Object.keys(stats.teachers).length > 3 && (
                            <div className="text-xs text-slate-500 dark:text-slate-500 italic">
                              +{Object.keys(stats.teachers).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {stats.nc > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Not completed</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats.nc}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total students</span>
                      <span className="font-bold text-slate-900 dark:text-white">{stats.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Grade Breakdown */}
        <div className="space-y-8">
          <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Icon path={mdiAccountGroup} className="text-slate-600 dark:text-slate-400" size={20} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Completion by Grade/Class</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Detailed breakdown for each grade</p>
              </div>
            </div>
            
            {Object.entries(gradeGroups).map(([grade, gradeStudents]) => {
              // Calculate stats for this grade
              const gradeStats: { [subject: string]: SubjectCompletionStats } = {};
              
              subjects.forEach(subject => {
                let filled = 0;
                let nc = 0;
                const teachers: { [teacherName: string]: number } = {};
                
                gradeStudents.forEach(student => {
                  const score = student.scores[subject];
                  const teacherField = `${subject}_teacher`;
                  const teacherName = student[teacherField];
                  
                  if (score !== undefined && score !== null && score > 0) {
                    filled++;
                    
                    // Track teacher who entered this score
                    if (teacherName && typeof teacherName === 'string') {
                      teachers[teacherName] = (teachers[teacherName] || 0) + 1;
                    }
                  } else {
                    nc++;
                  }
                });
                
                const total = gradeStudents.length; // Total students in this grade
                const percentage = total > 0 ? (filled / total) * 100 : 0;
                const teacherCount = Object.keys(teachers).length;
                
                gradeStats[subject] = { filled, nc, total, percentage, teachers, teacherCount };
              });
              
              return (
                <div key={grade} className="mb-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full">
                      {grade}
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {gradeStudents.length} students
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {subjects.map(subject => {
                      const stats = gradeStats[subject];
                      if (stats.total === 0) return null;
                      
                      return (
                        <div key={`${grade}-${subject}`} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:shadow-md transition-all duration-200">
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 truncate">{subject}</div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400">{stats.filled}/{stats.total}</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${stats.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default SimpleSubjectCompletionView;
