"use client";

import React from 'react';
import { 
  mdiChartBox,
  mdiPercent,
  mdiClose,
  mdiAccountGroup,
  mdiAccountCheck,
  mdiAccountOff,
  mdiAccountQuestion,
  mdiSchool
} from '@mdi/js';
import CardBox from '../../../_components/CardBox';
import Button from '../../../_components/Button';
import Icon from '../../../_components/Icon';
import { StudentResult, getCurrentSubjectLabels, getOrderedSubjects } from './index';

interface SubjectCompletionStats {
  filled: number;
  absent: number;
  nc: number;
  total: number;
  percentage: number;
  teachers: { [teacher: string]: { count: number; classTypes: Set<string> } };
  teacherCount: number;
}

interface GradeCompletionData {
  gradeName: string;
  students: StudentResult[];
  subjects: { [subject: string]: SubjectCompletionStats };
}

interface SubjectCompletionViewProps {
  students: StudentResult[];
  selectedMock: string;
  selectedGrade: string;
  onClose: () => void;
}

const SubjectCompletionView: React.FC<SubjectCompletionViewProps> = ({
  students,
  selectedMock,
  selectedGrade,
  onClose
}) => {
  
  // Calculate completion statistics for a specific grade/class group
  const calculateCompletionForGroup = (groupStudents: StudentResult[], gradeName: string): { [subject: string]: SubjectCompletionStats } => {
    const completionStats: { [subject: string]: SubjectCompletionStats } = {};
    const subjects = getOrderedSubjects(gradeName === 'All Grades' ? 'all' : gradeName);
    
    subjects.forEach(subject => {
      let filled = 0;
      let absent = 0;
      let nc = 0;
      const teachers: { [teacher: string]: { count: number; classTypes: Set<string> } } = {};
      
      groupStudents.forEach(student => {
        const mockData = student.mockResults[selectedMock] || {};
        const isAbsent = selectedMock === 'mock_4' && 
                        student.mock_4_absent_subjects && 
                        student.mock_4_absent_subjects.includes(subject);
        
        // Get the actual field to use based on student type
        const isGrade12Social = student.class.includes('12S') || student.class.includes('12R') || student.class.includes('12T');
        const isGrade12Science = student.class.includes('12') && !isGrade12Social;
        
        let actualField = subject;
        if (gradeName === 'All Grades') {
          if (isGrade12Science) {
            if (subject === 'math') actualField = 'math';
            if (subject === 'khmer') actualField = 'khmer';
          } else if (isGrade12Social) {
            if (subject === 'math') actualField = 'math';
            if (subject === 'khmer') actualField = 'khmer';
          }
        } else if (gradeName === 'Grade 12') {
          if (subject === 'math') actualField = 'math';
          if (subject === 'khmer') actualField = 'khmer';
        } else if (gradeName === 'Grade 12 Social') {
          if (subject === 'math') actualField = 'math';
          if (subject === 'khmer') actualField = 'khmer';
        }
        
        const score = mockData[actualField];
        const teacherField = `${actualField}_teacher`;
        const teacher = mockData[teacherField] || 'Unknown';
        
        if (isAbsent) {
          absent++;
        } else if (score !== undefined && score !== null) {
          filled++;
          // Count teachers who have entered scores and track their class types
          if (!teachers[teacher]) {
            teachers[teacher] = { count: 0, classTypes: new Set() };
          }
          teachers[teacher].count += 1;
          
          // Extract class type from class name
          let classType = 'General';
          if (student.class.includes('12S') || student.class.includes('12R') || student.class.includes('12T')) {
            classType = 'Social';
          } else if (student.class.includes('12')) {
            classType = 'Science';
          } else if (student.class.includes('11')) {
            classType = 'Grade 11';
          } else if (student.class.includes('10')) {
            classType = 'Grade 10';
          } else if (student.class.includes('9')) {
            classType = 'Grade 9';
          }
          
          teachers[teacher].classTypes.add(classType);
        } else {
          nc++;
        }
      });
      
      const total = filled + absent + nc;
      // Calculate percentage as filled/(filled+nc) - excluding absent students
      const percentageBase = filled + nc;
      const percentage = percentageBase > 0 ? (filled / percentageBase) * 100 : 0;
      const teacherCount = Object.keys(teachers).length;
      
      completionStats[subject] = {
        filled,
        absent,
        nc,
        total,
        percentage,
        teachers,
        teacherCount
      };
    });
    
    return completionStats;
  };

  // Group students by grade/class
  const getGradeGroups = (): GradeCompletionData[] => {
    if (selectedGrade === 'all') {
      // Group by actual grade levels
      const gradeGroups: { [key: string]: StudentResult[] } = {};
      
      students.forEach(student => {
        let gradeKey = 'Other';
        if (student.class.startsWith('Class 7')) gradeKey = 'Grade 7';
        else if (student.class.startsWith('Class 8')) gradeKey = 'Grade 8';
        else if (student.class.startsWith('Class 9')) gradeKey = 'Grade 9';
        else if (student.class.startsWith('Class 10')) gradeKey = 'Grade 10';
        else if (student.class === 'Class 11A') gradeKey = 'Grade 11A';
        else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(student.class)) gradeKey = 'Grade 11E';
        else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(student.class)) gradeKey = 'Grade 12 Social';
        else if (student.class.startsWith('Class 12')) gradeKey = 'Grade 12';
        
        if (!gradeGroups[gradeKey]) gradeGroups[gradeKey] = [];
        gradeGroups[gradeKey].push(student);
      });
      
      return Object.keys(gradeGroups).map(gradeName => ({
        gradeName,
        students: gradeGroups[gradeName],
        subjects: calculateCompletionForGroup(gradeGroups[gradeName], gradeName)
      }));
    } else {
      // Single grade view
      return [{
        gradeName: selectedGrade,
        students: students,
        subjects: calculateCompletionForGroup(students, selectedGrade)
      }];
    }
  };

  const gradeData = getGradeGroups();

  return (
    <CardBox className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Icon path={mdiChartBox} className="text-blue-600 dark:text-blue-400" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Subject Completion Statistics</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Completion percentage for {selectedMock.replace('_', ' ').toUpperCase()} - {students.length} students total (excluding absent)
            </p>
          </div>
        </div>
        <Button
          icon={mdiClose}
          label="Close"
          color="lightDark"
          onClick={onClose}
          small
        />
      </div>
      
      <div className="space-y-8">
        {gradeData.map((gradeGroup, gradeIndex) => (
          <div key={gradeGroup.gradeName} className="space-y-4">
            {/* Grade Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-3">
                <Icon path={mdiSchool} className="text-blue-600 dark:text-blue-400" size={20} />
                <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  {gradeGroup.gradeName}
                </h4>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                  {gradeGroup.students.length} students
                </span>
              </div>
            </div>
            
            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.keys(gradeGroup.subjects).map(subject => {
                const stats = gradeGroup.subjects[subject];
                const subjectLabel = getCurrentSubjectLabels(gradeGroup.gradeName === 'All Grades' ? 'all' : gradeGroup.gradeName)[subject] || subject;
                
                return (
                  <div key={`${gradeGroup.gradeName}-${subject}`} className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{subjectLabel}</h5>
                      <div className="flex items-center space-x-1">
                        <Icon path={mdiPercent} className="text-blue-600 dark:text-blue-400" size={16} />
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {stats.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                    
                    {/* Statistics */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                          <Icon path={mdiAccountCheck} size={12} />
                          <span>Filled:</span>
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{stats.filled}</span>
                      </div>
                      
                      {selectedMock === 'mock_4' && stats.absent > 0 && (
                        <div className="flex justify-between">
                          <span className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                            <Icon path={mdiAccountOff} size={12} />
                            <span>Absent:</span>
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.absent}</span>
                        </div>
                      )}
                      
                      {stats.nc > 0 && (
                        <div className="flex justify-between">
                          <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                            <Icon path={mdiAccountQuestion} size={12} />
                            <span>NC:</span>
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.nc}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                        <span className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 font-medium">
                          <Icon path={mdiAccountGroup} size={12} />
                          <span>Total:</span>
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.total}</span>
                      </div>
                      
                      {/* Teacher Information */}
                      {stats.teacherCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between mb-1">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">Teachers:</span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(stats.teachers).map(([teacher, teacherData]) => (
                              <div key={teacher} className="flex justify-between text-xs">
                                <div className="text-gray-600 dark:text-gray-400 truncate max-w-[140px]" title={`${teacher} - Class Types: ${Array.from(teacherData.classTypes).join(', ')}`}>
                                  <div className="font-medium">
                                    {teacher === 'Unknown' ? 'No teacher' : teacher}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-500">
                                    {Array.from(teacherData.classTypes).join(', ')}
                                  </div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-medium">{teacherData.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </CardBox>
  );
};

export default SubjectCompletionView;
