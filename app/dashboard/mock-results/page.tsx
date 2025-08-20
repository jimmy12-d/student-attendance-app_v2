"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  mdiMagnify, 
  mdiDownload, 
  mdiFileExcel, 
  mdiChartLine,
  mdiAccountGroup,
  mdiTrophy,
  mdiClipboardListOutline
} from '@mdi/js';
import { db } from '../../../firebase-config';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';
import Button from '../../_components/Button';
import Icon from '../../_components/Icon';
import CustomMultiSelectDropdown from '../_components/CustomMultiSelectDropdown';
import CustomDropdown from '../students/components/CustomDropdown';

// Import reusable components
import {
  // Types
  StudentResult,
  ClassStats,
  
  // Grade calculations
  calculateGrade,
  calculateStudentTotals,
  getMaxScores,
  calculateClassStats,
  
  // Grade styles
  getGradeStyles,
  getGradeHoverColor,
  getGradeColor,
  getScoreColor,
  
  // Subject configuration
  getCurrentSubjectLabels,
  getOrderedSubjects,
  shouldShowSubject,
  
  // Data export
  exportStudentsToCSV,
  downloadCSV,
  generateCSVFilename,
  
  // Firebase utilities
  fetchAvailableMocks,
  fetchExamSettings,
  fetchStudentsData,
  
  // Filter utilities
  filterStudents,
  sortStudents,
  getUniqueValues
} from './components';

const MockResultsPage = () => {
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMock, setSelectedMock] = useState<string>('mock_1');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [availableMocks, setAvailableMocks] = useState<string[]>(['mock_1']);
  const [allExamSettings, setAllExamSettings] = useState<{ [mockName: string]: { [subject: string]: { maxScore: number } } }>({});

  // Sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Statistics
  const [classStats, setClassStats] = useState<ClassStats>({
    totalStudents: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0
  });

  // For backward compatibility, use the first selected grade for display logic
  const selectedGrade = selectedGrades.length > 0 ? selectedGrades[0] : 'all';

  const currentSubjectLabels = getCurrentSubjectLabels(selectedGrade);

  // Sorting function
  const handleSort = (field: string) => {
    const isCurrentField = sortField === field;
    const newDirection = isCurrentField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Sort students based on current sort field and direction
  const sortedStudents = useMemo(() => {
    if (!sortField) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.fullName.toLowerCase();
          bValue = b.fullName.toLowerCase();
          break;
        case 'studentId':
          aValue = a.studentId.toString();
          bValue = b.studentId.toString();
          break;
        case 'class':
          aValue = a.class;
          bValue = b.class;
          break;
        case 'shift':
          aValue = a.shift;
          bValue = b.shift;
          break;
        case 'room':
          aValue = a.roomLabel;
          bValue = b.roomLabel;
          break;
        case 'totalScore':
          aValue = a.totalScores[selectedMock] || 0;
          bValue = b.totalScores[selectedMock] || 0;
          break;
        case 'averageScore':
          aValue = a.averageScores[selectedMock] || 0;
          bValue = b.averageScores[selectedMock] || 0;
          break;
        default:
          // Handle subject scores
          if (Object.keys(currentSubjectLabels).includes(sortField)) {
            const mockData_a = a.mockResults[selectedMock] || {};
            const mockData_b = b.mockResults[selectedMock] || {};
            aValue = mockData_a[sortField] || 0;
            bValue = mockData_b[sortField] || 0;
          } else {
            return 0;
          }
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
  }, [filteredStudents, sortField, sortDirection, selectedMock, currentSubjectLabels]);

  // Fetch available mocks from examControls
  useEffect(() => {
    const fetchAvailableMocks = async () => {
      try {
        const availableMocksList: string[] = [];
        
        // Check mock1, mock2, mock3, mock4 from examControls
        const mockKeys = ['mock1', 'mock2', 'mock3', 'mock4'];
        
        for (const mockKey of mockKeys) {
          try {
            const controlDocRef = doc(db, 'examControls', mockKey);
            const docSnap = await getDoc(controlDocRef);
            if (docSnap.exists() && docSnap.data().isReady === true) {
              // Convert mockKey to underscore format for consistency
              const mockKeyFormatted = mockKey.replace('mock', 'mock_');
              availableMocksList.push(mockKeyFormatted);
            }
          } catch (error) {
            console.log(`No examControls found for ${mockKey}`);
          }
        }
        
        // If no mocks are available, fallback to mock_1
        if (availableMocksList.length === 0) {
          availableMocksList.push('mock_1');
        }
        
        setAvailableMocks(availableMocksList);
        // Set selected mock to the first available
        if (availableMocksList.length > 0) {
          setSelectedMock(availableMocksList[0]);
        }
      } catch (error) {
        console.error('Error fetching available mocks:', error);
        // Fallback to mock_1 only
        setAvailableMocks(['mock_1']);
      }
    };

    fetchAvailableMocks();
  }, []);

  // Fetch exam settings for all mocks
  useEffect(() => {
    const fetchExamSettings = async () => {
      try {
        const allSettings: { [mockName: string]: { [subject: string]: { maxScore: number } } } = {};
        const mockNames = ['mock1', 'mock2', 'mock3', 'mock4'];
        const classTypes = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11A', 'Grade 11E', 'Grade 12', 'Grade 12 Social'];
        
        for (const mockName of mockNames) {
          for (const classType of classTypes) {
            const settingsQuery = query(
              collection(db, "examSettings"),
              where("type", "==", classType),
              where("mock", "==", mockName)
            );
            const settingsSnapshot = await getDocs(settingsQuery);
            
            if (!settingsSnapshot.empty) {
              const mockSettings: { [subject: string]: { maxScore: number } } = {};
              settingsSnapshot.forEach(doc => {
                const data = doc.data();
                mockSettings[data.subject] = { maxScore: data.maxScore };
              });
              
              // Store settings with the class type as suffix to handle different class types
              allSettings[`${mockName}_${classType.replace(/\s+/g, '_')}`] = mockSettings;
            }
          }
        }

        setAllExamSettings(allSettings);
      } catch (error) {
        console.error('Error fetching exam settings:', error);
      }
    };

    fetchExamSettings();
  }, []);

  // Fetch students data from mockResults collection
  useEffect(() => {
    const fetchStudentsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch from mockResults collection instead of students
        const studentsQuery = query(
          collection(db, 'mockResults'),
          orderBy('fullName')
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData: StudentResult[] = [];

        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          const mockResults = data.mockResults || {};
          
          // Calculate total and average scores for each mock
          const totalScores: { [key: string]: number } = {};
          const averageScores: { [key: string]: number } = {};
          
          ['mock_1', 'mock_2', 'mock_3', 'mock_4'].forEach(mockKey => {
            const mockData = mockResults[mockKey];
            if (mockData && typeof mockData === 'object') {
              const scores = Object.values(mockData).filter((score): score is number => 
                typeof score === 'number' && score >= 0
              );
              totalScores[mockKey] = scores.reduce((sum, score) => sum + score, 0);
              averageScores[mockKey] = scores.length > 0 ? totalScores[mockKey] / scores.length : 0;
            }
          });

          studentsData.push({
            id: doc.id,
            fullName: data.fullName || 'N/A',
            studentId: data.studentId || 'N/A',
            phone: data.phone || 'N/A',
            class: data.class || 'N/A',
            shift: data.shift || 'N/A',
            room: data.room || 0,
            roomLabel: data.roomLabel || 'N/A',
            seat: data.seat || 'N/A',
            mockResults: mockResults,
            totalScores,
            averageScores
          });
        });

        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students data:', error);
        setError('Failed to fetch students data');
        toast.error('Failed to load students data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsData();
  }, []);

  // Filter students based on search and filters
  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class filter
    if (selectedClasses.length > 0) {
      filtered = filtered.filter(student => selectedClasses.includes(student.class));
    }

    // Grade filter
    if (selectedGrades.length > 0) {
      const selectedGrade = selectedGrades[0]; // Use first selected grade for filtering
      if (selectedGrade === 'Grade 12') {
        filtered = filtered.filter(student => 
          student.class.includes('12') && 
          !student.class.includes('12S') && 
          !student.class.includes('12R') && 
          !student.class.includes('12T')
        );
      } else if (selectedGrade === 'Grade 12 Social') {
        filtered = filtered.filter(student => 
          student.class.includes('12S') || 
          student.class.includes('12R') || 
          student.class.includes('12T')
        );
      }
    }

    setFilteredStudents(filtered);

    // Calculate statistics for the selected mock using new total score logic
    const studentTotals = filtered
      .map(student => {
        const mockData = student.mockResults[selectedMock] || {};
        const hasResults = Object.keys(mockData).length > 0;
        const maxScores = getMaxScores(student.class, selectedMock, allExamSettings);
        return hasResults ? calculateStudentTotals(mockData, student.class, maxScores) : null;
      })
      .filter((totals): totals is NonNullable<typeof totals> => totals !== null);

    if (studentTotals.length > 0) {
      const totalScores = studentTotals.map(t => t.totalScore);
      const totalPercentages = studentTotals.map(t => t.totalPercentage);
      
      const total = totalScores.reduce((sum, score) => sum + score, 0);
      const average = total / totalScores.length;
      const highest = Math.max(...totalScores);
      const lowest = Math.min(...totalScores);
      const passRate = (totalPercentages.filter(percentage => percentage >= 50).length / totalPercentages.length) * 100;

      setClassStats({
        totalStudents: filtered.length,
        averageScore: average,
        highestScore: highest,
        lowestScore: lowest,
        passRate
      });
    } else {
      setClassStats({
        totalStudents: filtered.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0
      });
    }
  }, [students, searchTerm, selectedClasses, selectedGrades, selectedMock]);

  // Get unique classes for filters
  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).filter(c => c !== 'N/A');

  // Prepare options for multi-select dropdowns
  const classOptions = uniqueClasses.map(cls => ({ value: cls, label: cls }));
  const mockOptions = availableMocks.map(mock => ({ 
    value: mock, 
    label: mock.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) 
  }));
  const gradeOptions = [
    { value: 'Grade 12', label: 'Grade 12' },
    { value: 'Grade 12 Social', label: 'Grade 12 Social' }
  ];

  // Export to CSV function
  const exportToCSV = () => {
    exportStudentsToCSV(
      sortedStudents,
      selectedMock,
      selectedGrade,
      (classType: string, mockName: string) => getMaxScores(classType, mockName, allExamSettings)
    );
    toast.success('Results exported to CSV successfully!');
  };

  if (isLoading) {
    return (
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiChartLine} title="Mock Exam Results" main>
        </SectionTitleLineWithButton>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading results...</div>
        </div>
      </SectionMain>
    );
  }

  if (error) {
    return (
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiChartLine} title="Mock Exam Results" main>
        </SectionTitleLineWithButton>
        <CardBox>
          <div className="text-center text-red-600 p-8">
            <p className="text-lg mb-4">Error loading results</p>
            <p>{error}</p>
          </div>
        </CardBox>
      </SectionMain>
    );
  }

  return (
    <SectionMain>
      <Toaster position="top-right" />
      <SectionTitleLineWithButton icon={mdiChartLine} title="Mock Exam Results" main>
        <Button
          icon={mdiDownload}
          label="Export CSV"
          color="lightDark"
          onClick={exportToCSV}
          className="mr-3"
        />
      </SectionTitleLineWithButton>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-sm border border-blue-200/50 dark:border-blue-700/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{classStats.totalStudents}</p>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">Total Students</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Icon path={mdiAccountGroup} className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl shadow-sm border border-emerald-200/50 dark:border-emerald-700/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{classStats.averageScore.toFixed(1)}</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">Average Score</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Icon path={mdiChartLine} className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl shadow-sm border border-amber-200/50 dark:border-amber-700/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{classStats.highestScore.toFixed(1)}</p>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">Highest Score</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Icon path={mdiTrophy} className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl shadow-sm border border-purple-200/50 dark:border-purple-700/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{classStats.passRate.toFixed(1)}%</p>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Pass Rate</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Icon path={mdiClipboardListOutline} className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Column Visibility Style */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl relative z-30 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters & Search
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredStudents.length} of {students.length} students shown
            </span>
            {/* Clear Filters Button */}
            {(selectedGrades.length > 0 || selectedClasses.length > 0 || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedGrades([]);
                  setSelectedClasses([]);
                  setSearchTerm('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mock Selection */}
          <div className="space-y-2">
            <CustomDropdown
              id="mock-exam-select"
              label="Mock Exam"
              value={selectedMock}
              onChange={setSelectedMock}
              options={mockOptions}
              placeholder="Select mock exam..."
              className="w-full"
            />
          </div>

          {/* Grade Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Grade
              {selectedGrades.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                  {selectedGrades.length}
                </span>
              )}
            </label>
            <CustomMultiSelectDropdown
              options={gradeOptions}
              selectedValues={selectedGrades}
              onChange={setSelectedGrades}
              placeholder="Select grades..."
              fieldData={{
                className: "w-full px-3 py-2.5 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 text-sm font-medium text-gray-900 dark:text-white transition-all duration-200 hover:shadow-md"
              }}
            />
          </div>

          {/* Class Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Classes
              {selectedClasses.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                  {selectedClasses.length}
                </span>
              )}
            </label>
            <CustomMultiSelectDropdown
              options={classOptions}
              selectedValues={selectedClasses}
              onChange={setSelectedClasses}
              placeholder="Select classes..."
              fieldData={{
                className: "w-full px-3 py-2.5 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 text-sm font-medium text-gray-900 dark:text-white transition-all duration-200 hover:shadow-md"
              }}
            />
          </div>

          {/* Search - spans 2 columns */}
          <div className="space-y-2 col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2.5 pl-10 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 hover:shadow-md"
              />
              <Icon 
                path={mdiMagnify} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={18} 
              />
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedGrades.length > 0 || selectedClasses.length > 0 || searchTerm) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>

            {selectedGrades.map(grade => (
              <span key={grade} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                Grade: {grade}
                <button
                  onClick={() => setSelectedGrades(prev => prev.filter(g => g !== grade))}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            ))}

            {selectedClasses.map(cls => (
              <span key={cls} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                Class: {cls}
                <button
                  onClick={() => setSelectedClasses(prev => prev.filter(c => c !== cls))}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}

            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10z" />
            </svg>
            Student Results
            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {filteredStudents.length} students
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 shadow-sm">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full text-left"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Student Info</span>
                    {sortField === 'name' && (
                      <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                  <button
                    onClick={() => handleSort('room')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full text-left"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Room/Seat</span>
                    {sortField === 'room' && (
                      <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                  <button
                    onClick={() => handleSort('totalScore')}
                    className="flex items-center justify-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Total Score</span>
                    {sortField === 'totalScore' && (
                      <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </th>
                {getOrderedSubjects(selectedGrade).map(subject => (
                  <th key={subject} className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                    <button
                      onClick={() => handleSort(subject)}
                      className="flex items-center justify-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{currentSubjectLabels[subject]}</span>
                      {sortField === subject && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={3 + getOrderedSubjects(selectedGrade).length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.002-5.824-2.651M15 9.34c1.115-.17 2.054-.861 2.478-1.85.424-.99.424-2.13 0-3.12C16.054 3.381 15.115 2.69 14 2.52" />
                      </svg>
                      <div className="text-gray-500 dark:text-gray-400">
                        <p className="font-medium">No students found</p>
                        <p className="text-sm">Try adjusting your filters or search criteria</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => {
                  const mockData = student.mockResults[selectedMock] || {};
                  const hasResults = Object.keys(mockData).length > 0;
                  const maxScores = getMaxScores(student.class, selectedMock, allExamSettings);
                  const studentTotals = hasResults ? calculateStudentTotals(mockData, student.class, maxScores) : null;
                  
                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-700/20'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {/* Grade Badge (like avatar) */}
                          <div className="flex-shrink-0">
                            {hasResults && studentTotals ? (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getGradeColor(studentTotals.totalGrade)}`}>
                                {studentTotals.totalGrade}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700">
                                ?
                              </div>
                            )}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold transition-colors duration-200 ${
                              hasResults && studentTotals
                                ? `text-gray-900 dark:text-white hover:${getGradeHoverColor(studentTotals.totalGrade)}`
                                : 'text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300'
                            }`}>
                              {student.fullName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">{student.class}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.roomLabel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Seat {student.seat}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {hasResults && studentTotals ? (
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-bold ${
                              studentTotals.totalScore >= (studentTotals.totalMaxScore * 0.5)
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-red-500 dark:text-red-400'
                            }`}>
                              {studentTotals.totalScore}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              /{studentTotals.totalMaxScore}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
                        )}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-center">
                        {hasResults && studentTotals ? (
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getGradeStyles(studentTotals.totalGrade)}`}>
                              {studentTotals.totalGrade}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {studentTotals.totalPercentage.toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
                        )}
                      </td> */}
                      {getOrderedSubjects(selectedGrade).map(subject => {
                        // Get the actual field to use based on student type and filter
                        const isGrade12Social = student.class.includes('12S') || student.class.includes('12R') || student.class.includes('12T');
                        const isGrade12Science = student.class.includes('12') && !isGrade12Social;
                        
                        let actualField = subject;
                        // When showing "All" grades, we need to map fields correctly for each student type
                        if (selectedGrade === 'all') {
                          // For Grade 12 Science students: Math should come from 'khmer' field, Khmer from 'math' field
                          // For Grade 12 Social students: Khmer should come from 'math' field, Math from 'khmer' field  
                          if (isGrade12Science) {
                            // Science students: use khmer field for Math score, math field for Khmer score
                            if (subject === 'math') actualField = 'math'; // Math score is in khmer field
                            if (subject === 'khmer') actualField = 'khmer'; // Khmer score is in math field
                          } else if (isGrade12Social) {
                            // Social students: use math field for Khmer score, khmer field for Math score
                            if (subject === 'math') actualField = 'math'; // Khmer score is in math field 
                            if (subject === 'khmer') actualField = 'khmer'; // Math score is in khmer field
                          }
                        } else if (selectedGrade === 'Grade 12') {
                          // For Grade 12 filter: use khmer field for Math, math field for Khmer
                          if (subject === 'math') actualField = 'math'; // Math score from khmer field
                          if (subject === 'khmer') actualField = 'khmer'; // Khmer score from math field
                        } else if (selectedGrade === 'Grade 12 Social') {
                          // For Grade 12 Social filter: use math field for Khmer, khmer field for Math
                          if (subject === 'math') actualField = 'math'; // Khmer score from math field
                          if (subject === 'khmer') actualField = 'khmer'; // Math score from khmer field
                        }
                        
                        const score = mockData[actualField];
                        const maxScore = maxScores[subject] || 0;
                        const grade = score !== undefined ? calculateGrade(score, maxScore) : 'N/A';
                        
                        // Handle subject visibility based on filter and student type
                        let shouldShow = true;
                        if (selectedGrade === 'Grade 12' && subject === 'history') {
                          // When filtering Grade 12 only, don't show history column at all
                          return null;
                        } else if (selectedGrade === 'all') {
                          // When showing all grades, only show subjects that apply to this specific student
                          if (isGrade12Science && subject === 'history') {
                            // Science students don't have Earth/History
                            shouldShow = false;
                          }
                        }
                        
                        return (
                          <td key={subject} className="px-6 py-4 whitespace-nowrap text-center">
                            {shouldShow && score !== undefined ? (
                              <div className="flex flex-col items-center space-y-1">
                                {/* Combined Score and Grade Badge */}
                                <span className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-bold ${getGradeStyles(grade)}`}>
                                  <span className="mr-1">{score}</span>
                                  <span className="text-xs opacity-75">/{maxScore}</span>
                                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                                    {grade}
                                  </span>
                                </span>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {((score / maxScore) * 100).toFixed(1)}%
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
                            )}
                          </td>
                        );
                      }).filter(Boolean)}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionMain>
  );
};

export default MockResultsPage;
