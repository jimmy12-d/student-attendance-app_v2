"use client";

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import Image from 'next/image';
import Button from '../_components/Button';
import { useRouter } from 'next/navigation';
import { setUser } from '../_stores/mainSlice';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase-config';
import { mdiLogout, mdiMagnify, mdiContentSave } from '@mdi/js';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import RouteGuard from '../_components/RouteGuard';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  class: string;
  shift: string;
  room: number;
  seat: string;
  mockResults?: {
    mock_1?: any;
    mock_2?: any;
    mock_3?: any;
    mock_4?: any;
  };
}

// Subject mapping for Grade 12 Social Studies
const SOCIAL_STUDIES_LABELS: { [key: string]: string } = {
  math: 'Khmer',
  khmer: 'Math', 
  chemistry: 'History',
  physics: 'Moral',
  biology: 'Geometry',
  history: 'Earth',
  english: 'English',
};

const TeacherDashboard = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const userName = useAppSelector((state) => state.main.userName);
  const userSubject = useAppSelector((state) => state.main.userSubject);

  // Search and result states
  const [searchRoom, setSearchRoom] = useState('');
  const [searchSeat, setSearchSeat] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [mock4Score, setMock4Score] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [sessionStats, setSessionStats] = useState({ studentsFound: 0, scoresEntered: 0 });
  const [_, setExamSettings] = useState<{ [subject: string]: { maxScore: number } }>({});
  const [currentMaxScore, setCurrentMaxScore] = useState(100);

  // Helper function to determine if student is in Grade 12 Social
  const isGrade12Social = (studentClass: string) => {
    return studentClass.includes('12R') || studentClass.includes('12S') || studentClass.includes('12T');
  };

  // Helper function to get the actual subject to save for the student
  const getActualSubject = (teacherSubject: string, studentClass: string) => {
    if (!isGrade12Social(studentClass)) {
      return teacherSubject.toLowerCase();
    }
    
    // For Grade 12 Social students, map teacher's subject to database field
    const teacherSubjectLower = teacherSubject.toLowerCase();
    
    // Direct mapping: teacher subject -> database field
    switch (teacherSubjectLower) {
      case 'math': return 'khmer';        // Math teacher -> store in khmer field
      case 'khmer': return 'math';         // Khmer teacher -> store in math field  
      case 'chemistry': return 'history';  // Chemistry teacher -> store in history field
      case 'physics': return 'biology';    // Physics teacher -> store in biology field (Moral)
      case 'biology': return 'chemistry';  // Biology teacher -> store in chemistry field (Geometry)
      case 'history': return 'chemistry';    // History teacher -> store in physics field (Earth)
      case 'english': return 'english';    // English stays the same
      default: return teacherSubjectLower;
    }
  };

  // Helper function to get display subject name
  const getDisplaySubject = (teacherSubject: string, studentClass: string) => {
    if (!isGrade12Social(studentClass)) {
      return teacherSubject;
    }
    
    return SOCIAL_STUDIES_LABELS[teacherSubject.toLowerCase()] || teacherSubject;
  };

  // Function to fetch exam settings for mock_4
  const fetchExamSettings = async (studentClass: string) => {
    try {
      // Determine student class type from class name
      let studentClassType = 'Grade 12 Science'; // default
      if (studentClass) {
        if (studentClass.startsWith('Class 7')) {
          studentClassType = "Grade 7";
        } else if (studentClass.startsWith('Class 8')) {
          studentClassType = "Grade 8";
        } else if (studentClass.startsWith('Class 9')) {
          studentClassType = "Grade 9";
        } else if (studentClass.startsWith('Class 10')) {
          studentClassType = "Grade 10";
        } else if (studentClass === 'Class 11A') {
          studentClassType = "Grade 11A";
        } else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(studentClass)) {
          studentClassType = "Grade 11E";
        } else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(studentClass)) {
          studentClassType = "Grade 12 Social";
        } else if (studentClass.startsWith('Class 12')) {
          studentClassType = "Grade 12";
        }
      }

      // Convert class type format for document ID
      const settingsKey = `mock4_${studentClassType.replace(/\s+/g, '_')}`;
      
      // Get exam settings for this specific mock and class type
      const examSettingsRef = doc(db, 'examSettings', settingsKey);
      const examSettingsDoc = await getDoc(examSettingsRef);
      
      if (examSettingsDoc.exists()) {
        const settings = examSettingsDoc.data();
        setExamSettings(settings);
        return settings;
      } else {
        console.warn(`No exam settings found for ${settingsKey}`);
        return {};
      }
    } catch (error) {
      console.error('Error fetching exam settings:', error);
      return {};
    }
  };

  const getMaxScore = async (studentClass?: string, teacherSubject?: string) => {
    if (!teacherSubject || !studentClass) return 100;
    
    try {
      // Get the actual database field that will be used to store the score
      const actualSubject = getActualSubject(teacherSubject, studentClass);
      
      // Determine student class type from class name
      let studentClassType = 'Grade 12'; // default
      if (studentClass) {
        if (studentClass.startsWith('Class 7')) {
          studentClassType = "Grade 7";
        } else if (studentClass.startsWith('Class 8')) {
          studentClassType = "Grade 8";
        } else if (studentClass.startsWith('Class 9')) {
          studentClassType = "Grade 9";
        } else if (studentClass.startsWith('Class 10')) {
          studentClassType = "Grade 10";
        } else if (studentClass === 'Class 11A') {
          studentClassType = "Grade 11A";
        } else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(studentClass)) {
          studentClassType = "Grade 11E";
        } else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(studentClass)) {
          studentClassType = "Grade 12 Social";
        } else if (studentClass.startsWith('Class 12')) {
          studentClassType = "Grade 12";
        }
      }

      // Query exam settings where subject matches the actual field and type matches class type
      const examSettingsRef = collection(db, 'examSettings');
      const q = query(
        examSettingsRef,
        where('subject', '==', actualSubject),
        where('type', '==', studentClassType),
        where('mock', '==', 'mock4')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const settingsDoc = querySnapshot.docs[0];
        const settings = settingsDoc.data();
        console.log(`Found maxScore for ${actualSubject} in ${studentClassType}: ${settings.maxScore}`);
        return settings.maxScore || 100;
      }
      
      console.warn(`No exam settings found for subject: ${actualSubject}, type: ${studentClassType}, mock: mock4`);
      
      // Fallback to hardcoded values based on actual subject field
      // English is always 50 for both Grade 12 and Grade 12 Social
      if (actualSubject === 'english') return 50;
      
      // For Grade 12 Social students: Math field (storing Khmer) = 125, Khmer field (storing Math) = 75, others = 75
      if (studentClass && isGrade12Social(studentClass)) {
        if (actualSubject === 'math') return 125; // Khmer score stored in math field
        if (actualSubject === 'khmer') return 75; // Math score stored in khmer field
        return 75; // All other subjects for Grade 12 Social
      }
      
      // For regular Grade 12 students: Khmer field (storing Math) = 125, Math field (storing Khmer) = 75, others = 75
      if (actualSubject === 'khmer') return 125; // Math score stored in khmer field
      if (actualSubject === 'math') return 75;   // Khmer score stored in math field
      return 75; // All other subjects for regular Grade 12
    } catch (error) {
      console.error('Error fetching maxScore from examSettings:', error);
      
      // Fallback to hardcoded values on error
      const actualSubject = getActualSubject(teacherSubject, studentClass);
      if (actualSubject === 'english') return 50;
      if (studentClass && isGrade12Social(studentClass)) {
        if (actualSubject === 'math') return 125;
        if (actualSubject === 'khmer') return 75;
        return 75;
      }
      if (actualSubject === 'khmer') return 125;
      if (actualSubject === 'math') return 75;
      return 75;
    }
  };

  const handleLogout = async () => {
    try {
      // Clear cached session
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teacherSession');
      }
      await signOut(auth);
      dispatch(setUser(null));
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearchStudent = async () => {
    if (!searchRoom || !searchSeat) {
      setMessage({ type: 'error', text: 'Please enter both room and seat number' });
      return;
    }

    setIsSearching(true);
    setMessage(null);
    setFoundStudent(null);

    try {
      // Search for student by room and seat in mockResults collection
      const mockResultsRef = collection(db, 'mockResults');
      
      // Convert room to number for consistent searching
      const roomNumber = parseInt(searchRoom);
      
      // Try multiple seat formats to handle inconsistent data storage
      const seatFormats = [
        searchSeat, // Original format (e.g., "10")
        searchSeat.padStart(2, '0'), // Zero-padded format (e.g., "01", "10")
        parseInt(searchSeat).toString(), // Remove leading zeros (e.g., "01" → "1")
        parseInt(searchSeat) // As a number
      ];
            
      let studentFound = false;
      let studentDoc = null;
      
      // Try each seat format until we find a match
      for (const seatFormat of seatFormats) {
        if (studentFound) break;
                
        const q = query(
          mockResultsRef,
          where('room', '==', roomNumber),
          where('seat', '==', seatFormat)
        );

        const querySnapshot = await getDocs(q);
                
        if (!querySnapshot.empty) {
          studentDoc = querySnapshot.docs[0];
          studentFound = true;
          break;
        }
      }

      if (studentFound && studentDoc) {
        const studentData = studentDoc.data();
        
        setFoundStudent({
          id: studentDoc.id,
          studentId: studentData.studentId,
          fullName: studentData.fullName,
          class: studentData.class,
          shift: studentData.shift,
          room: studentData.room,
          seat: studentData.seat,
          mockResults: studentData.mockResults
        });
        
        // Update session stats
        setSessionStats(prev => ({ ...prev, studentsFound: prev.studentsFound + 1 }));
        
        // Fetch exam settings for this student's class
        await fetchExamSettings(studentData.class);
        
        // Get max score for this student and subject
        const maxScore = await getMaxScore(studentData.class, userSubject || '');
        setCurrentMaxScore(maxScore);
        
        // Get actual subject for checking existing scores
        const actualSubject = getActualSubject(userSubject || '', studentData.class);
        
        // Check if mock_4 already exists for this subject
        if (studentData.mockResults?.mock_4?.[actualSubject]) {
          setMock4Score(studentData.mockResults.mock_4[actualSubject].toString());
          setMessage({ type: 'success', text: `Student found! Current Mock 4 ${userSubject} score: ${studentData.mockResults.mock_4[actualSubject]}` });
        } else {
          setMock4Score('');
          setMessage({ type: 'success', text: 'Student found! No Mock 4 score recorded yet.' });
        }
      } else {
        // If still not found, try a broader search to see what students exist in this room
        const broadQuery = query(mockResultsRef, where('room', '==', roomNumber));
        const broadSnapshot = await getDocs(broadQuery);
        
        setMessage({ type: 'error', text: `No student found with Room ${roomNumber} and Seat ${searchSeat}. Please check the room and seat numbers.` });
      }
    } catch (error) {
      console.error('Error searching for student:', error);
      setMessage({ type: 'error', text: 'Error searching for student. Please try again.' });
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search effect when room or seat changes
  useEffect(() => {
    if (searchRoom && searchSeat && searchRoom.length > 0 && searchSeat.length > 0) {
      // Clear previous results
      setFoundStudent(null);
      setMock4Score('');
      setMessage(null);
      
      // Auto-search with new values after a delay
      const timeoutId = setTimeout(() => {
        handleSearchStudent();
      }, 500); // 500ms delay to avoid too frequent searches
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchRoom, searchSeat]);

  const handleSaveScore = async () => {
    if (!foundStudent || !mock4Score || !userSubject) {
      setMessage({ type: 'error', text: 'Please ensure student is found and score is entered' });
      return;
    }

    const score = parseFloat(mock4Score);
    if (isNaN(score) || score < 0 || score > currentMaxScore) {
      setMessage({ type: 'error', text: `Please enter a valid score between 0 and ${currentMaxScore}` });
      return;
    }

    // Check if the score has more than 2 decimal places
    if (score % 1 !== 0 && score.toString().split('.')[1]?.length > 2) {
      setMessage({ type: 'error', text: 'Score can have at most 2 decimal places' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Get the actual subject to save based on student class and teacher subject
      const actualSubject = getActualSubject(userSubject, foundStudent.class);
      
      // Update the mockResults document
      const docRef = doc(db, 'mockResults', foundStudent.id);
      
      const updateData = {
        [`mockResults.mock_4.${actualSubject}`]: score,
        [`mockResults.mock_4.${actualSubject}_teacher`]: userName, // Track which teacher input this score
        [`mockResults.mock_4.${actualSubject}_timestamp`]: Timestamp.now(), // Track when it was input
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updateData);
      
      // Show success toast with student name and score
      toast.success(`Score Saved!`, {
        description: `${foundStudent.fullName} - ${userSubject}: ${score}/${currentMaxScore}`,
        duration: 4000,
      });
      
      // Update session stats
      setSessionStats(prev => ({ ...prev, scoresEntered: prev.scoresEntered + 1 }));
      
      // Update local state
      setFoundStudent(prev => prev ? {
        ...prev,
        mockResults: {
          ...prev.mockResults,
          mock_4: {
            ...prev.mockResults?.mock_4,
            [actualSubject]: score
          }
        }
      } : null);
      
    } catch (error) {
      console.error('Error saving score:', error);
      setMessage({ type: 'error', text: 'Error saving score. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const clearSearch = () => {
    setSearchRoom('');
    setSearchSeat('');
    setFoundStudent(null);
    setMock4Score('');
    setMessage(null);
    setCurrentMaxScore(100); // Reset to default
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center">
                <Image src="/favicon.png" alt="Logo" width={60} height={60} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome, {userName}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Teacher Portal - Subject: {userSubject || 'Loading...'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              icon={mdiLogout}
              label="Logout"
              color="danger"
              roundedFull
              small
            />
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Subject</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userSubject || 'Loading...'}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Scores Entered</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionStats.scoresEntered}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Mock 4 Score Input Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg px-8 py-6 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mock 4 Score Input
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Subject: <span className="font-medium text-blue-600 dark:text-blue-400">{userSubject}</span>
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Input grades efficiently</span>
            </div>
          </div>

          {/* Search Form - Improved Layout */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Student
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="room">
                  Room Number
                </label>
                <input
                  type="number"
                  id="room"
                  value={searchRoom}
                  onChange={(e) => setSearchRoom(e.target.value)}
                  placeholder="e.g., 208"
                  className="w-full h-[42px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="seat">
                  Seat Number
                </label>
                <input
                  type="text"
                  id="seat"
                  value={searchSeat}
                  onChange={(e) => setSearchSeat(e.target.value)}
                  placeholder="e.g., 04"
                  className="w-full h-[42px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-medium"
                  title="Auto-search when room and seat are entered"
                />
              </div>

              <div className="flex flex-col lg:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
                <Button
                  onClick={handleSearchStudent}
                  icon={mdiMagnify}
                  label={isSearching ? "Searching..." : "Search Student"}
                  color="info"
                  disabled={isSearching || !searchRoom || !searchSeat}
                  className="h-[42px] w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reset</label>
                <Button
                  onClick={clearSearch}
                  label="Clear"
                  color="lightDark"
                  className="h-[42px] w-full"
                  small
                />
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`p-4 mb-6 text-sm rounded-xl border ${
              message.type === 'success' 
                ? 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
                : 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
            }`}>
              <div className="flex items-start">
                <svg className={`w-5 h-5 mr-2 mt-0.5 ${
                  message.type === 'success' ? 'text-green-500' : 'text-red-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {message.type === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <span className="font-medium">{message.text}</span>
              </div>
            </div>
          )}

          {/* Score Input - Enhanced Design */}
          {foundStudent && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Score Input - {foundStudent.fullName}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="score">
                    Mock 4 {userSubject} Score (Max: {currentMaxScore})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="score"
                      value={mock4Score}
                      onChange={(e) => setMock4Score(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={`Enter score (0-${currentMaxScore})`}
                      min="0"
                      max={currentMaxScore}
                      step="0.01"
                      className="w-full h-[42px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl font-bold pl-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Score</label>
                  <div className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-center w-full h-[42px] flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                      {foundStudent.mockResults?.mock_4?.[getActualSubject(userSubject || '', foundStudent.class)] || 'Not set'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Save Score</label>
                  <Button
                    onClick={handleSaveScore}
                    icon={mdiContentSave}
                    label={isSaving ? "Saving..." : (foundStudent.mockResults?.mock_4?.[getActualSubject(userSubject || '', foundStudent.class)] ? "Update Score" : "Save Score")}
                    color="success"
                    disabled={isSaving || !mock4Score || isNaN(parseFloat(mock4Score)) || parseFloat(mock4Score) < 0 || parseFloat(mock4Score) > currentMaxScore}
                    className="h-[42px] w-full font-medium"
                  />
                </div>
              </div>
              
              {/* Score validation indicator - Fixed height area */}
              <div className="mt-3 h-6 flex items-center text-sm">
                {mock4Score && (
                  <>
                    {(() => {
                      const score = parseFloat(mock4Score);
                      const isValidRange = score >= 0 && score <= currentMaxScore;
                      const hasValidDecimals = score % 1 === 0 || score.toString().split('.')[1]?.length <= 2;
                      const isValid = !isNaN(score) && isValidRange && hasValidDecimals;
                      
                      if (isValid) {
                        return (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Valid score
                          </div>
                        );
                      } else {
                        let errorMessage = `Score must be between 0 and ${currentMaxScore}`;
                        if (!hasValidDecimals) {
                          errorMessage = 'Score can have at most 2 decimal places';
                        }
                        return (
                          <div className="flex items-center text-red-600 dark:text-red-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errorMessage}
                          </div>
                        );
                      }
                    })()}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Instructions */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-3">
                How to Input Mock 4 Scores
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <p className="text-blue-800 dark:text-blue-200">Enter the <strong>room number</strong> and <strong>seat number</strong> - search happens automatically!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <p className="text-blue-800 dark:text-blue-200">Once found, enter the Mock 4 score for your subject: <strong className="text-blue-900 dark:text-blue-100">{userSubject}</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <p className="text-blue-800 dark:text-blue-200">Score limits are determined by exam settings for each subject and class type</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <p className="text-blue-800 dark:text-blue-200">You can <strong>update existing scores</strong> if needed</p>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedTeacherDashboard = () => {
  return (
    <RouteGuard requiredRole="teacher">
      <TeacherDashboard />
    </RouteGuard>
  );
};

export default ProtectedTeacherDashboard;
