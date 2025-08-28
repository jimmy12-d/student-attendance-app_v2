"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  mdiMagnify, 
  mdiDownload, 
  mdiChartLine,
  mdiAccountGroup,
  mdiTrophy,
  mdiClipboardListOutline,
  mdiPencilOutline,
  mdiCheckAll,
  mdiClose,
  mdiContentSave,
  mdiChartBox
} from '@mdi/js';
import { db } from '../../../firebase-config';
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';
import Button from '../../_components/Button';
import Icon from '../../_components/Icon';
import CustomMultiSelectDropdown from '../_components/CustomMultiSelectDropdown';
import CustomDropdown from '../students/components/CustomDropdown';
import SubjectCompletionView from './components/SubjectCompletionView';

// Import reusable components
import {
  // Types
  StudentResult,
  ClassStats,
  
  // Grade calculations
  calculateGrade,
  calculateStudentTotals,
  getMaxScores,
  
  // Grade styles
  getGradeStyles,
  getGradeHoverColor,
  getGradeColor,
  
  // Subject configuration
  getCurrentSubjectLabels,
  getOrderedSubjects,
  
  // Data export
  exportStudentsToCSV
} from './components';

const MockResultsPage = () => {
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMock, setSelectedMock] = useState<string>('mock_1');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
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

  // Absent mode state
  const [isAbsentMode, setIsAbsentMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [absentSubjects, setAbsentSubjects] = useState<{ [studentId: string]: string[] }>({});
  const [isSubmittingAbsent, setIsSubmittingAbsent] = useState(false);

  // Subject completion view state
  const [showCompletionView, setShowCompletionView] = useState(false);

  const currentSubjectLabels = getCurrentSubjectLabels(selectedGrade || 'all');

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
          // Use the same calculation as the display to ensure consistency
          const mockData_a = a.mockResults[selectedMock] || {};
          const mockData_b = b.mockResults[selectedMock] || {};
          const maxScores_a = getMaxScores(a.class, selectedMock, allExamSettings);
          const maxScores_b = getMaxScores(b.class, selectedMock, allExamSettings);
          const absentSubjects_a = selectedMock === 'mock_4' ? a.mock_4_absent_subjects : undefined;
          const absentSubjects_b = selectedMock === 'mock_4' ? b.mock_4_absent_subjects : undefined;
          
          // Calculate total scores using the same logic as display
          const hasResults_a = Object.keys(mockData_a).length > 0;
          const hasResults_b = Object.keys(mockData_b).length > 0;
          const totals_a = hasResults_a ? calculateStudentTotals(mockData_a, a.class, maxScores_a, absentSubjects_a) : null;
          const totals_b = hasResults_b ? calculateStudentTotals(mockData_b, b.class, maxScores_b, absentSubjects_b) : null;
          
          aValue = totals_a ? totals_a.totalScore : 0;
          bValue = totals_b ? totals_b.totalScore : 0;
          break;
        case 'averageScore':
          // Use the same calculation as display for consistency
          const mockData_avg_a = a.mockResults[selectedMock] || {};
          const mockData_avg_b = b.mockResults[selectedMock] || {};
          const maxScores_avg_a = getMaxScores(a.class, selectedMock, allExamSettings);
          const maxScores_avg_b = getMaxScores(b.class, selectedMock, allExamSettings);
          const absentSubjects_avg_a = selectedMock === 'mock_4' ? a.mock_4_absent_subjects : undefined;
          const absentSubjects_avg_b = selectedMock === 'mock_4' ? b.mock_4_absent_subjects : undefined;
          
          const hasResults_avg_a = Object.keys(mockData_avg_a).length > 0;
          const hasResults_avg_b = Object.keys(mockData_avg_b).length > 0;
          const totals_avg_a = hasResults_avg_a ? calculateStudentTotals(mockData_avg_a, a.class, maxScores_avg_a, absentSubjects_avg_a) : null;
          const totals_avg_b = hasResults_avg_b ? calculateStudentTotals(mockData_avg_b, b.class, maxScores_avg_b, absentSubjects_avg_b) : null;
          
          aValue = totals_avg_a ? totals_avg_a.totalPercentage : 0;
          bValue = totals_avg_b ? totals_avg_b.totalPercentage : 0;
          break;
        default:
          // Handle subject scores
          if (Object.keys(currentSubjectLabels).includes(sortField)) {
            const mockData_a = a.mockResults[selectedMock] || {};
            const mockData_b = b.mockResults[selectedMock] || {};
            aValue = Number(mockData_a[sortField]) || 0;
            bValue = Number(mockData_b[sortField]) || 0;
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
  }, [filteredStudents, sortField, sortDirection, selectedMock, currentSubjectLabels, allExamSettings]);

  // Fetch available mocks from examControls
  useEffect(() => {
    const fetchAvailableMocks = async () => {
      try {
        const availableMocksList: string[] = [];
        
        // Check mock1, mock2, mock3, mock4 from examControls
        const mockKeys = ['mock4', 'mock3', 'mock2', 'mock1'];
        
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
        
        // Debug: Log mock_4 structure for first few students
        if (studentsData.length < 3 && mockResults.mock_4) {
          console.log(`Mock 4 data for ${data.fullName}:`, mockResults.mock_4);
        }
        
        // Calculate total and average scores for each mock using proper logic
        const totalScores: { [key: string]: number } = {};
        const averageScores: { [key: string]: number } = {};
        
        ['mock_1', 'mock_2', 'mock_3', 'mock_4'].forEach(mockKey => {
          const mockData = mockResults[mockKey];
          if (mockData && typeof mockData === 'object') {
            // Get maxScores from examSettings for this mock
            const maxScoresForMock = getMaxScores(data.class, mockKey, allExamSettings);
            
            // Only calculate if we have maxScores data, otherwise use fallback
            if (Object.keys(maxScoresForMock).length > 0) {
              // Get absent subjects for this mock (only mock_4 supports absent)
              const absentSubjects = mockKey === 'mock_4' ? (mockData.absent_subjects || []) : [];
              
              // Use proper calculation that handles absent, maxScores, English bonus, etc.
              const { totalScore, totalMaxScore } = calculateStudentTotals(
                mockData, 
                data.class, 
                maxScoresForMock,
                absentSubjects
              );
              
              totalScores[mockKey] = totalScore;
              averageScores[mockKey] = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
            } else {
              // Fallback to simple sum if maxScores not available yet
              const scores = Object.values(mockData).filter((score): score is number => 
                typeof score === 'number' && score >= 0
              );
              totalScores[mockKey] = scores.reduce((sum, score) => sum + score, 0);
              averageScores[mockKey] = scores.length > 0 ? totalScores[mockKey] / scores.length : 0;
            }
          } else {
            totalScores[mockKey] = 0;
            averageScores[mockKey] = 0;
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
          averageScores,
          // Include absent data from mock_4 map
          mock_4_absent_subjects: mockResults.mock_4?.absent_subjects || [],
          mock_4_absent_timestamp: mockResults.mock_4?.absent_timestamp || null,
          mock_4_absent_recorded_by: mockResults.mock_4?.absent_recorded_by || null
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

  useEffect(() => {
    // Only fetch students data after exam settings are loaded
    if (Object.keys(allExamSettings).length > 0) {
      fetchStudentsData();
    }
  }, [allExamSettings]);

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
    if (selectedGrade) {
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
        const absentSubjects = selectedMock === 'mock_4' ? student.mock_4_absent_subjects : undefined;
        return hasResults ? calculateStudentTotals(mockData, student.class, maxScores, absentSubjects) : null;
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
  }, [students, searchTerm, selectedClasses, selectedGrade, selectedMock]);

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

  // Absent Student function for Mock 4
  const handleAbsentStudent = () => {
    if (selectedMock === 'mock_4') {
      // Navigate to absent student page or show modal
      toast.info('Navigating to absent student management for Mock 4...');
      // You can implement navigation here, e.g.:
      // router.push('/dashboard/absent-students?mock=mock_4');
    } else {
      toast.error('Absent student management is only available for Mock 4');
    }
  };

  // Handle Write Absent Mode
  const handleWriteAbsentMode = () => {
    if (selectedMock !== 'mock_4') {
      toast.error('Write Absent Mode is only available for Mock 4');
      return;
    }
    
    setIsAbsentMode(!isAbsentMode);
    setSelectedStudents([]);
    setAbsentSubjects({});
    if (!isAbsentMode) {
      toast.info('Switched to Write Absent Mode for Mock 4. Select students and subjects to mark as absent.');
    } else {
      toast.info('Exited Write Absent Mode');
    }
  };

  // Handle student selection for absent mode
  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        // Remove from selection
        const newSelection = prev.filter(id => id !== studentId);
        // Also remove from absent subjects
        setAbsentSubjects(prevSubjects => {
          const { [studentId]: removed, ...rest } = prevSubjects;
          return rest;
        });
        return newSelection;
      } else {
        // Add to selection
        return [...prev, studentId];
      }
    });
  };

  // Handle select all students
  const handleSelectAllStudents = () => {
    if (selectedStudents.length === sortedStudents.length) {
      // Deselect all
      setSelectedStudents([]);
      setAbsentSubjects({});
    } else {
      // Select all
      setSelectedStudents(sortedStudents.map(s => s.id));
    }
  };

  // Handle subject selection for absent students
  const handleSubjectSelection = (studentId: string, subject: string) => {
    setAbsentSubjects(prev => {
      const currentSubjects = prev[studentId] || [];
      if (currentSubjects.includes(subject)) {
        // Remove subject
        return {
          ...prev,
          [studentId]: currentSubjects.filter(s => s !== subject)
        };
      } else {
        // Add subject
        return {
          ...prev,
          [studentId]: [...currentSubjects, subject]
        };
      }
    });
  };

  // Handle select all subjects for selected students
  const handleSelectAllSubjects = () => {
    const availableSubjects = getOrderedSubjects(selectedGrade);
    const allSelected = selectedStudents.every(studentId => {
      const studentSubjects = absentSubjects[studentId] || [];
      return availableSubjects.every(subject => studentSubjects.includes(subject));
    });

    if (allSelected) {
      // Deselect all subjects for all selected students
      setAbsentSubjects(prev => {
        const newAbsentSubjects = { ...prev };
        selectedStudents.forEach(studentId => {
          newAbsentSubjects[studentId] = [];
        });
        return newAbsentSubjects;
      });
    } else {
      // Select all subjects for all selected students
      setAbsentSubjects(prev => {
        const newAbsentSubjects = { ...prev };
        selectedStudents.forEach(studentId => {
          newAbsentSubjects[studentId] = [...availableSubjects];
        });
        return newAbsentSubjects;
      });
    }
  };

  // Submit absent records
  const handleSubmitAbsentRecords = async () => {
    if (selectedMock !== 'mock_4') {
      toast.error('Absent records can only be saved for Mock 4');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    const hasSubjects = selectedStudents.some(studentId => 
      absentSubjects[studentId] && absentSubjects[studentId].length > 0
    );

    if (!hasSubjects) {
      toast.error('Please select at least one subject for the selected students');
      return;
    }

    setIsSubmittingAbsent(true);
    try {
      // Prepare the absent data for each student
      const updatePromises = selectedStudents.map(async (studentId) => {
        const student = students.find(s => s.id === studentId);
        const studentAbsentSubjects = absentSubjects[studentId] || [];
        
        if (studentAbsentSubjects.length === 0) {
          return; // Skip if no subjects selected for this student
        }

        // Update the student document in mockResults collection
        const studentDocRef = doc(db, 'mockResults', studentId);
        
        // Create the absent subjects object within mock_4
        const updateData = {
          [`mockResults.mock_4.absent_subjects`]: studentAbsentSubjects,
          [`mockResults.mock_4.absent_timestamp`]: new Date().toISOString(),
          [`mockResults.mock_4.absent_recorded_by`]: 'admin' // You can replace this with actual user info
        };

        await updateDoc(studentDocRef, updateData);
        
        console.log(`Updated absent subjects for student ${student?.fullName}:`, {
          studentId,
          studentName: student?.fullName,
          absentSubjects: studentAbsentSubjects,
          updateData
        });
        
        return {
          studentId,
          studentName: student?.fullName,
          class: student?.class,
          absentSubjects: studentAbsentSubjects,
          mock: selectedMock,
          timestamp: new Date().toISOString()
        };
      });

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(result => result !== undefined);
      
      toast.success(`Successfully recorded absent subjects for ${successfulUpdates.length} students in Mock 4`);
      
      // Reset absent mode
      setIsAbsentMode(false);
      setSelectedStudents([]);
      setAbsentSubjects({});
      
      // Refresh the data to show the changes
      await fetchStudentsData();
      
    } catch (error) {
      console.error('Error saving absent records to Firebase:', error);
      toast.error('Failed to save absent records to database');
    } finally {
      setIsSubmittingAbsent(false);
    }
  };



  // Toggle completion view
  const handleToggleCompletionView = () => {
    setShowCompletionView(!showCompletionView);
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
        <div className="flex items-center space-x-4">
        {selectedMock === 'mock_4' && (
          <Button
            icon={mdiPencilOutline}
            label={isAbsentMode ? "Exit Absent Mode" : "Absent Mode"}
            color={isAbsentMode ? "danger" : "lightDark"}
            onClick={handleWriteAbsentMode}
            className="mr-3"
          />
        )}
        <Button
          icon={mdiChartBox}
          label={showCompletionView ? "Hide Completion View" : "Completion"}
          color={showCompletionView ? "warning" : "success"}
          onClick={handleToggleCompletionView}
          className="mr-3"
        />
        <Button
          icon={mdiDownload}
          label="Export CSV"
          color="info"
          onClick={exportToCSV}
          className="mr-3"
        />
        </div>
      </SectionTitleLineWithButton>

      {/* Absent Mode Panel */}
      {isAbsentMode && selectedMock === 'mock_4' && (
        <CardBox className="mb-6 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Icon path={mdiPencilOutline} className="text-orange-600 dark:text-orange-400" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Absent Mode - Mock 4</h3>
                <p className="text-sm text-orange-600 dark:text-orange-400">Select students and mark subjects as absent for Mock 4</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                icon={mdiCheckAll}
                label={selectedStudents.length === sortedStudents.length ? "Deselect All" : "Select All"}
                color="info"
                onClick={handleSelectAllStudents}
                small
              />
              {selectedStudents.length > 0 && (
                <Button
                  icon={mdiClipboardListOutline}
                  label={(() => {
                    const availableSubjects = getOrderedSubjects(selectedGrade);
                    const allSelected = selectedStudents.every(studentId => {
                      const studentSubjects = absentSubjects[studentId] || [];
                      return availableSubjects.every(subject => studentSubjects.includes(subject));
                    });
                    return allSelected ? "Deselect All Subjects" : "Select All Subjects";
                  })()}
                  color="warning"
                  onClick={handleSelectAllSubjects}
                  small
                />
              )}
              <Button
                icon={mdiContentSave}
                label={isSubmittingAbsent ? "Saving..." : "Save Absent Records"}
                color="success"
                onClick={handleSubmitAbsentRecords}
                disabled={isSubmittingAbsent || selectedStudents.length === 0}
                small
              />
              <Button
                icon={mdiClose}
                label="Cancel"
                color="danger"
                onClick={handleWriteAbsentMode}
                small
              />
            </div>
          </div>
          
          {selectedStudents.length > 0 && (
            <div className="border-t border-orange-200 dark:border-orange-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Selected Students ({selectedStudents.length}): Click on subjects to mark as absent
                </p>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  {(() => {
                    const availableSubjects = getOrderedSubjects(selectedGrade);
                    const allSelected = selectedStudents.every(studentId => {
                      const studentSubjects = absentSubjects[studentId] || [];
                      return availableSubjects.every(subject => studentSubjects.includes(subject));
                    });
                    const totalSubjectSelections = selectedStudents.reduce((total, studentId) => {
                      return total + (absentSubjects[studentId] || []).length;
                    }, 0);
                    const maxPossibleSelections = selectedStudents.length * availableSubjects.length;
                    
                    return allSelected && selectedStudents.length > 0 
                      ? "All subjects selected" 
                      : `${totalSubjectSelections}/${maxPossibleSelections} subject selections`;
                  })()}
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedStudents.map(studentId => {
                  const student = students.find(s => s.id === studentId);
                  if (!student) return null;
                  
                  const availableSubjects = getOrderedSubjects(selectedGrade);
                  const studentAbsentSubjects = absentSubjects[studentId] || [];
                  
                  return (
                    <div key={studentId} className="flex items-center  justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">{student.fullName}</span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({student.class})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableSubjects.map(subject => {
                          const isSelected = studentAbsentSubjects.includes(subject);
                          const subjectLabel = currentSubjectLabels[subject] || subject;
                          
                          return (
                            <button
                              key={subject}
                              onClick={() => handleSubjectSelection(studentId, subject)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              {subjectLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardBox>
      )}

      {/* Subject Completion View */}
      {showCompletionView && (
        <SubjectCompletionView
          students={filteredStudents}
          selectedMock={selectedMock}
          selectedGrade={selectedGrade}
          onClose={handleToggleCompletionView}
        />
      )}

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
            {(selectedGrade || selectedClasses.length > 0 || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedGrade('');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <CustomDropdown
              id="grade-select"
              label="Grade"
              value={selectedGrade}
              onChange={setSelectedGrade}
              options={gradeOptions}
              placeholder="All Grades"
              className="w-full"
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
        {(selectedGrade || selectedClasses.length > 0 || searchTerm) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>

            {selectedGrade && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                Grade: {selectedGrade}
                <button
                  onClick={() => setSelectedGrade('')}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            )}

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
        <div className="relative">
          <div className="overflow-x-auto max-h-[calc(150vh-200px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-40 bg-gradient-to-r from-gray-50/95 to-gray-100/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-sm shadow-lg border-b border-gray-300 dark:border-slate-500">
                <tr>
                {isAbsentMode && (
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-slate-600 sticky top-0 left-0 z-40 bg-gray-50 dark:bg-slate-800 w-[60px]">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === sortedStudents.length && sortedStudents.length > 0}
                      onChange={handleSelectAllStudents}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </th>
                )}
                <th className={`px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-slate-600 sticky top-0 ${isAbsentMode ? 'left-[60px]' : 'left-0'} z-40 bg-gray-50 dark:bg-slate-800 frozen-column-shadow min-w-[280px] w-[280px] max-w-[280px]`}>
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
                <th className="px-2 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50/95 to-gray-100/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-sm">
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
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50/95 to-gray-100/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-sm">
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
                  <th key={subject} className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-gradient-to-r from-gray-50/95 to-gray-100/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-sm">
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
                  <td colSpan={1} className="px-6 py-12 text-center sticky left-0 z-30 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 frozen-column-shadow min-w-[280px] w-[280px] max-w-[280px]">
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
                  <td colSpan={2 + getOrderedSubjects(selectedGrade).length} className="px-6 py-12 text-center">
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => {
                  const mockData = student.mockResults[selectedMock] || {};
                  const hasResults = Object.keys(mockData).length > 0;
                  const maxScores = getMaxScores(student.class, selectedMock, allExamSettings);
                  const absentSubjects = selectedMock === 'mock_4' ? student.mock_4_absent_subjects : undefined;
                  const studentTotals = hasResults ? calculateStudentTotals(mockData, student.class, maxScores, absentSubjects) : null;
                  
                  return (
                    <tr key={student.id} className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'}`}>
                      {isAbsentMode && (
                        <td className={`px-4 py-2 whitespace-nowrap text-center sticky left-0 z-40 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-gray-200 dark:border-slate-700 w-[60px] ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'}`}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleStudentSelection(student.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                      )}
                      <td className={`px-4 py-2 whitespace-nowrap sticky ${isAbsentMode ? 'left-[60px]' : 'left-0'} z-40 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-gray-200 dark:border-slate-700 frozen-column-shadow min-w-[280px] w-[280px] max-w-[280px] ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-slate-800'}`}>
                        <div className="flex items-center space-x-3">
                          {/* Grade Badge (like avatar) */}
                          <div className="flex-shrink-0">
                            {hasResults && studentTotals ? (
                              <div className={`group relative w-10 h-10 rounded-full flex items-center justify-center text-2xl font-extrabold shadow-2xl transform hover:scale-105 transition-all duration-500 ease-out backdrop-blur-sm border border-white/30 ${getGradeColor(studentTotals.totalGrade)}`}>
                                {/* Sophisticated glass overlay */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-white/10 to-transparent opacity-80"></div>
                                
                                {/* Subtle inner glow */}
                                <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-[0.5px]"></div>
                                
                                {/* Grade text with sophisticated styling */}
                                <span className="relative text-white font-black drop-shadow-2xl z-20 tracking-tight text-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(255,255,255,0.2)'}}>
                                  {studentTotals.totalGrade}
                                </span>
                                
                                {/* Subtle bottom reflection */}
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full blur-sm"></div>
                              </div>
                            ) : (
                              <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-2xl font-light text-slate-400 dark:text-slate-500 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 shadow-xl border border-slate-200/60 dark:border-slate-600/60 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
                                {/* Glass overlay for consistency */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-60"></div>
                                
                                {/* Sophisticated question mark */}
                                <span className="relative z-10 drop-shadow-lg opacity-70 font-extralight tracking-wider">?</span>
                                
                                {/* Subtle reflection */}
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-white/15 rounded-full blur-sm"></div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold transition-colors duration-200 truncate ${
                              hasResults && studentTotals
                                ? `text-gray-900 dark:text-white group-hover:${getGradeHoverColor(studentTotals.totalGrade)}`
                                : 'text-gray-900 dark:text-white'
                            }`} title={student.fullName}>
                              {student.fullName}
                              {selectedMock === 'mock_4' && student.mock_4_absent_subjects && student.mock_4_absent_subjects.length > 0 && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title={`Absent in: ${student.mock_4_absent_subjects.join(', ')}`}>
                                  Absent
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              <span className="font-medium">{student.class}</span>
                              {selectedMock === 'mock_4' && student.mock_4_absent_subjects && student.mock_4_absent_subjects.length > 0 && (
                                <span className="ml-2 text-red-500 dark:text-red-400">
                                  ({student.mock_4_absent_subjects.length} subject{student.mock_4_absent_subjects.length > 1 ? 's' : ''} absent)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.roomLabel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Seat {student.seat}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        {hasResults && studentTotals ? (
                          <div className="flex flex-col items-center">
                            <span className={`text-xl font-bold ${(() => {
                              if (studentTotals.totalGrade === 'NC') return 'text-gray-600';
                              const gradeColor = getGradeColor(studentTotals.totalGrade);
                              if (gradeColor.includes('green')) return 'text-green-600';
                              if (gradeColor.includes('blue')) return 'text-blue-600';
                              if (gradeColor.includes('yellow')) return 'text-yellow-500';
                              if (gradeColor.includes('orange')) return 'text-orange-300';
                              if (gradeColor.includes('purple')) return 'text-purple-600';
                              if (gradeColor.includes('red')) return 'text-red-600';
                              return 'text-gray-600';
                            })()}`}>
                              {studentTotals.totalGrade === 'NC' ? 'NC' : studentTotals.totalScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">NC</span>
                        )}
                      </td>
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
                        
                        // Check if student is absent for this subject in Mock 4
                        const isAbsent = selectedMock === 'mock_4' && 
                                        student.mock_4_absent_subjects && 
                                        student.mock_4_absent_subjects.includes(subject);
                        
                        // Determine what to display
                        let displayContent;
                        let grade = 'N/A';
                        
                        if (isAbsent) {
                          // Student is marked as absent
                          displayContent = (
                            <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-red-500/90 text-white border-2 border-red-600 shadow-sm">
                              <span className="text-xs">Absent</span>
                            </span>
                          );
                        } else if (score !== undefined && score !== null) {
                          // Student has a score
                          grade = calculateGrade(score, maxScore);
                          displayContent = (
                            <span className={`inline-flex items-center px-3 py-2 rounded-full font-bold border-1 shadow-sm ${getGradeStyles(grade)}`}>
                              <span className="text-base">{score}</span>
                              <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold border border-white/30">
                                {grade}
                              </span>
                            </span>
                          );
                        } else {
                          // No score and not absent - display NC (Not Complete)
                          displayContent = (
                            <span className="inline-flex items-center px-3 py-2 rounded-full font-bold bg-gray-400/90 text-white border-2 border-gray-500 shadow-sm">
                              <span className="text-xs">NC</span>
                            </span>
                          );
                        }
                        
                        // Handle subject visibility based on filter and student type
                        let shouldShow = true;
                        if (selectedGrade === 'Grade 12' && subject === 'history') {
                          // When filtering Grade 12 only, show history column (Science students will show NC/empty)
                          shouldShow = true;
                        } else if (selectedGrade === 'all') {
                          // When showing all grades, only show subjects that apply to this specific student
                          if (isGrade12Science && subject === 'history') {
                            // Science students don't have Earth/History
                            shouldShow = false;
                          }
                        }
                        
                        return (
                          <td key={subject} className="px-2 py-2 whitespace-nowrap text-center">
                            {shouldShow ? (
                              <div className="flex flex-col items-center space-y-1">
                                {displayContent}
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
      </div>
    </SectionMain>
  );
};

export default MockResultsPage;
