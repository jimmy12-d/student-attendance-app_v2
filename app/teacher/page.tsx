"use client";

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import Image from 'next/image';
import Button from '../_components/Button';
import CustomCombobox from '../_components/CustomCombobox';
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
  khmerName: string;
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
  mock1Result?: {
    [subject: string]: number | string;
  };
  [key: string]: any; // Allow dynamic subject fields
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

// Subject translations to Khmer
const SUBJECT_TRANSLATIONS: { [key: string]: string } = {
  math: 'គណិតវិទ្យា',
  khmer: 'ភាសាខ្មែរ',
  chemistry: 'គីមីវិទ្យា',
  physics: 'រូបវិទ្យា',
  biology: 'ជីវវិទ្យា',
  history: 'ប្រវត្តិវិទ្យា',
  moral: 'សីលធម៌',
  geography: 'ភូមិវិទ្យា',
  earth: 'ផែនដីវិទ្យា',
  geometry: 'ធរណីមាត្រ',
  english: 'ភាសាអង់គ្លេស',
};

const TeacherDashboard = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const userName = useAppSelector((state) => state.main.userName);
  const userSubject = useAppSelector((state) => state.main.userSubject);
  const userPhone = useAppSelector((state) => state.main.userPhone);

  // Selected subject state for teachers with multiple subjects
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Selected classType state for teachers with multiple classTypes
  const [selectedClassType, setSelectedClassType] = useState<string>('');

  // Search method state
  const [searchMethod, setSearchMethod] = useState<'room' | 'name'>('room');

  // Search and result states
  const [searchRoom, setSearchRoom] = useState('');
  const [searchSeat, setSearchSeat] = useState('');
  const [searchShift, setSearchShift] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  
  // Name search states
  const [searchName, setSearchName] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<Student[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [mock4Score, setMock4Score] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [sessionStats, setSessionStats] = useState({ studentsFound: 0, scoresEntered: 0 });
  const [_, setExamSettings] = useState<{ [subject: string]: { maxScore: number } }>({});
  const [currentMaxScore, setCurrentMaxScore] = useState(100);

  // Exam schedule states
  const [teacherClassTypes, setTeacherClassTypes] = useState<string[]>([]);
  const [classTypesData, setClassTypesData] = useState<{ [key: string]: { khmerName: string } }>({});
  const [examSchedule, setExamSchedule] = useState<{ [classType: string]: { day1: string[], day2: string[], day3?: string[] } }>({});
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleFetchError, setScheduleFetchError] = useState(false);

  // Helper to get the current active subject (either selected or single subject)
  const getActiveSubject = () => {
    if (Array.isArray(userSubject)) {
      return selectedSubject || userSubject[0];
    }
    return userSubject || '';
  };
  
  // Helper to get the current active classType (either selected or single classType)
  const getActiveClassType = () => {
    if (teacherClassTypes.length > 1) {
      return selectedClassType || teacherClassTypes[0];
    }
    return teacherClassTypes[0] || '';
  };

  // Helper to get translated subject name
  const getTranslatedSubject = (subject: string) => {
    const lowerSubject = subject.toLowerCase();
    return SUBJECT_TRANSLATIONS[lowerSubject] || subject;
  };

  // Helper to determine default shift based on teacher's class types
  const getDefaultShift = (classTypes: string[]): 'Morning' | 'Afternoon' | 'Evening' => {
    // Auto-select evening for Grade 7-10, Grade 11E, and Grade 12E
    const eveningClassTypes = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11E', 'Grade 12E'];
    const hasEveningClass = classTypes.some(classType => eveningClassTypes.includes(classType));
    
    return hasEveningClass ? 'Evening' : 'Morning';
  };

  // Helper to normalize seat value (pad with leading zero)
  const normalizeSeatValue = (seat: string): string => {
    if (!seat) return '';
    const num = parseInt(seat);
    if (isNaN(num)) return seat;
    return num.toString().padStart(2, '0');
  };

  // Helper to increment seat value
  const incrementSeat = (currentSeat: string): string => {
    const num = parseInt(currentSeat);
    if (isNaN(num)) return '01';
    const newNum = Math.max(1, num + 1); // Ensure minimum is 1
    return newNum.toString().padStart(2, '0');
  };

  // Helper to decrement seat value
  const decrementSeat = (currentSeat: string): string => {
    const num = parseInt(currentSeat);
    if (isNaN(num)) return '01';
    const newNum = Math.max(1, num - 1); // Ensure minimum is 1
    return newNum.toString().padStart(2, '0');
  };

  // Helper to check if teacher should only see morning/afternoon options
  const shouldShowOnlyMorningAfternoonEvening = (classTypes: string[]): boolean => {
    const eveningClassTypes = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11E', 'Grade 12E'];
    return !classTypes.some(classType => eveningClassTypes.includes(classType));
  };

  // Initialize selected subject when userSubject changes
  useEffect(() => {
    if (Array.isArray(userSubject) && userSubject.length > 0 && !selectedSubject) {
      setSelectedSubject(userSubject[0]);
    }
  }, [userSubject, selectedSubject]);
  
  // Initialize selected classType when teacherClassTypes changes
  useEffect(() => {
    if (teacherClassTypes.length > 0 && !selectedClassType) {
      setSelectedClassType(teacherClassTypes[0]);
    }
  }, [teacherClassTypes, selectedClassType]);

  // Set default shift based on teacher's class types
  useEffect(() => {
    if (teacherClassTypes.length > 0) {
      const defaultShift = getDefaultShift(teacherClassTypes);
      setSearchShift(defaultShift);
    }
  }, [teacherClassTypes]);

  // Helper function to determine if student is in Grade 12 Social
  const isGrade12Social = (studentClass: string) => {
    return studentClass.includes('12R') || studentClass.includes('12S') || studentClass.includes('12T');
  };

  // Helper function to get the subject to use (lowercased)
  const getSubjectKey = (teacherSubject: string | string[]) => {
    // Handle array by taking first subject
    const subject = Array.isArray(teacherSubject) ? teacherSubject[0] : teacherSubject;
    return subject.toLowerCase();
  };

  // Function to fetch exam settings for mock_1
  const fetchExamSettings = async (studentClassType: string) => {
    try {
      // If it's already a class type (starts with "Grade"), use it directly
      // Otherwise, map from class name to class type
      let finalClassType = studentClassType;
      
      if (!studentClassType.startsWith('Grade')) {
        // Map from class name to class type
        let mappedClassType = 'Grade 12'; // default
        if (studentClassType) {
          if (studentClassType.startsWith('Class 7')) {
            mappedClassType = "Grade 7";
          } else if (studentClassType.startsWith('Class 8')) {
            mappedClassType = "Grade 8";
          } else if (studentClassType.startsWith('Class 9')) {
            mappedClassType = "Grade 9";
          } else if (studentClassType.startsWith('Class 10')) {
            mappedClassType = "Grade 10";
          } else if (studentClassType === 'Class 11A') {
            mappedClassType = "Grade 11A";
          } else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(studentClassType)) {
            mappedClassType = "Grade 11E";
          } else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(studentClassType)) {
            mappedClassType = "Grade 12 Social";
          } else if (studentClassType.startsWith('Class 12')) {
            mappedClassType = "Grade 12";
          }
        }
        finalClassType = mappedClassType;
      }

      // Query exam settings where subject matches the active subject and type matches class type
      const activeSubject = getActiveSubject();
      const subjectKey = getSubjectKey(activeSubject);
      
      const examSettingsRef = collection(db, 'examSettings');
      const q = query(
        examSettingsRef,
        where('subject', '==', subjectKey),
        where('type', '==', finalClassType),
        where('mock', '==', 'mock1')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const settingsDoc = querySnapshot.docs[0];
        const settings = settingsDoc.data();
        setExamSettings(settings);
        return settings;
      } else {
        console.warn(`No exam settings found for subject: ${subjectKey}, type: ${finalClassType}, mock: mock1`);
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
      // Get the subject key that will be used to store the score
      const subjectKey = getSubjectKey(teacherSubject);
      
      // If it's already a class type (starts with "Grade"), use it directly
      // Otherwise, map from class name to class type
      let studentClassType = studentClass;
      
      if (!studentClass.startsWith('Grade')) {
        // Map from class name to class type
        studentClassType = 'Grade 12'; // default
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
      }

      // Query exam settings where subject matches the actual field and type matches class type
      const examSettingsRef = collection(db, 'examSettings');
      const q = query(
        examSettingsRef,
        where('subject', '==', subjectKey),
        where('type', '==', studentClassType),
        where('mock', '==', 'mock1')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const settingsDoc = querySnapshot.docs[0];
        const settings = settingsDoc.data();
        return settings.maxScore || 100;
      }
      
      console.warn(`No exam settings found for subject: ${subjectKey}, type: ${studentClassType}, mock: mock1`);
      
      // Fallback to hardcoded values based on actual subject field
      // English is always 50 for both Grade 12 and Grade 12 Social
      if (subjectKey === 'english') return 50;
      
      // For Grade 12 Social students: Math field (storing Khmer) = 125, Khmer field (storing Math) = 75, others = 75
      if (studentClass && isGrade12Social(studentClass)) {
        if (subjectKey === 'math') return 125; // Khmer score stored in math field
        if (subjectKey === 'khmer') return 75; // Math score stored in khmer field
        return 75; // All other subjects for Grade 12 Social
      }
      
      // For regular Grade 12 students: Khmer field (storing Math) = 125, Math field (storing Khmer) = 75, others = 75
      if (subjectKey === 'khmer') return 125; // Math score stored in khmer field
      if (subjectKey === 'math') return 75;   // Khmer score stored in math field
      return 75; // All other subjects for regular Grade 12
    } catch (error) {
      console.error('Error fetching maxScore from examSettings:', error);
      
      // Fallback to hardcoded values on error
      const subjectKey = getSubjectKey(teacherSubject);
      if (subjectKey === 'english') return 50;
      if (studentClass && isGrade12Social(studentClass)) {
        if (subjectKey === 'math') return 125;
        if (subjectKey === 'khmer') return 75;
        return 75;
      }
      if (subjectKey === 'khmer') return 125;
      if (subjectKey === 'math') return 75;
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

  // Function to fetch teacher's class types
  const fetchTeacherClassTypes = async () => {
    try {
      if (!userPhone) return;

      const teacherDoc = await getDoc(doc(db, 'teachers', userPhone));
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data();
        setTeacherClassTypes(teacherData.classTypes || []);
      }
    } catch (error) {
      console.error('Error fetching teacher class types:', error);
    }
  };

  // Function to fetch class types data with khmer names
  const fetchClassTypesData = async () => {
    try {
      const classTypesSnapshot = await getDocs(collection(db, 'classTypes'));
      const classTypesMap: { [key: string]: { khmerName: string } } = {};
      
      classTypesSnapshot.forEach((doc) => {
        const data = doc.data();
        classTypesMap[doc.id] = {
          khmerName: data.khmerName || doc.id
        };
      });
      
      setClassTypesData(classTypesMap);
    } catch (error) {
      console.error('Error fetching class types data:', error);
    }
  };

  // Function to fetch exam schedule for teacher's class types
  const fetchExamSchedule = async () => {
    if (teacherClassTypes.length === 0) return;

    setIsLoadingSchedule(true);
    setScheduleFetchError(false);
    
    try {
      const scheduleData: { [classType: string]: { day1: string[], day2: string[], day3?: string[] } } = {};

      for (const classType of teacherClassTypes) {
        const scheduleDocId = `mock_1_${classType.replace(/\s+/g, ' ')}`;
        const scheduleDoc = await getDoc(doc(db, 'examSchedule', scheduleDocId));

        if (scheduleDoc.exists()) {
          const data = scheduleDoc.data();
          scheduleData[classType] = {
            day1: data.day1 || [],
            day2: data.day2 || [],
            day3: data.day3 || []
          };
        }
      }

      setExamSchedule(scheduleData);
      
      // Check if we have any schedule data
      const hasScheduleData = Object.keys(scheduleData).length > 0;
      setScheduleFetchError(!hasScheduleData);
      
    } catch (error) {
      console.error('Error fetching exam schedule:', error);
      setScheduleFetchError(true);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Function to check if teacher has scheduled exam days
  const hasScheduledExamDays = () => {
    if (scheduleFetchError || isLoadingSchedule) return false;

    const activeSubject = getActiveSubject();
    const allExamDays = teacherClassTypes.flatMap(classType =>
      getExamDaysForSubject(activeSubject, classType)
    );

    return allExamDays.length > 0;
  };

  // Function to get exam days for teacher's subject
  const getExamDaysForSubject = (subject: string | string[], classType: string) => {
    const schedule = examSchedule[classType];
    if (!schedule) return [];

    const days: string[] = [];

    // Handle both string and array subject formats
    const subjects = Array.isArray(subject) ? subject : [subject];
    const subjectLowers = subjects.map(s => s.toLowerCase());

    if (schedule.day1?.some(daySubject => subjectLowers.includes(daySubject))) days.push('Day 1');
    if (schedule.day2?.some(daySubject => subjectLowers.includes(daySubject))) days.push('Day 2');
    if (schedule.day3?.some(daySubject => subjectLowers.includes(daySubject))) days.push('Day 3');

    return days;
  };

  // Function to get the specific exam day for the active subject
  const getExamDayForActiveSubject = (classType: string) => {
    const activeSubject = getActiveSubject();
    const schedule = examSchedule[classType];
    if (!schedule) return 'day1'; // fallback to day1

    const subjectLower = activeSubject.toLowerCase();

    if (schedule.day1?.some(daySubject => daySubject.toLowerCase() === subjectLower)) return 'day1';
    if (schedule.day2?.some(daySubject => daySubject.toLowerCase() === subjectLower)) return 'day2';
    if (schedule.day3?.some(daySubject => daySubject.toLowerCase() === subjectLower)) return 'day3';

    return 'day1'; // fallback to day1 if subject not found
  };

  // Reset search when selected subject changes
  useEffect(() => {
    if (Array.isArray(userSubject) && selectedSubject) {
      clearSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);
  
  // Reset search when selected classType changes
  useEffect(() => {
    if (teacherClassTypes.length > 1 && selectedClassType) {
      clearSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassType]);

  // Function to search students by name
  const handleNameSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setNameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingName(true);
    try {
      const mockExam1Ref = collection(db, 'mockExam1');
      const querySnapshot = await getDocs(mockExam1Ref);
      
      const matches: Student[] = [];
      const searchLower = searchTerm.toLowerCase();
      
      // Get the active classType to filter by
      const activeClassType = getActiveClassType();

      for (const docSnapshot of querySnapshot.docs) {
        const studentData = docSnapshot.data();

        // Check if student's classType matches the selected classType
        if (!studentData.classType || studentData.classType !== activeClassType) {
          continue;
        }

        // Check if name matches
        const fullNameMatch = studentData.fullName?.toLowerCase().includes(searchLower);
        const khmerNameMatch = studentData.khmerName?.toLowerCase().includes(searchLower);
        
        if (fullNameMatch || khmerNameMatch) {
          // Get the exam day for the active subject for this class type
          const examDay = getExamDayForActiveSubject(studentData.classType);
          
          // Find the student's room and seat info for the active subject's exam day
          let studentInfo: { shift: string; room: number; seat: string } | null = null;
          if (studentData[examDay]) {
            // Check all shifts to find where this student is assigned
            for (const shift of ['Morning', 'Afternoon', 'Evening']) {
              const shiftData = studentData[examDay][shift];
              if (shiftData?.room && shiftData?.seat) {
                // Handle both string and number seat values
                const normalizedSeat = typeof shiftData.seat === 'number' ? shiftData.seat.toString().padStart(2, '0') : shiftData.seat;
                studentInfo = {
                  shift: shift,
                  room: parseInt(shiftData.room.replace('Room ', '')),
                  seat: normalizedSeat
                };
                break;
              }
            }
          }

          if (studentInfo) {
            // Try to fetch mock results
            let mockResultsData: { mock_1?: any; mock_2?: any; mock_3?: any; mock_4?: any; } | undefined = undefined;
            try {
              const mockResultsDocRef = doc(db, 'mockResults', studentData.studentId);
              const mockResultsDoc = await getDoc(mockResultsDocRef);
              if (mockResultsDoc.exists()) {
                const data = mockResultsDoc.data();
                mockResultsData = data.mockResults;
              }
            } catch (error) {
              console.log('No existing mock results found for this student');
            }

            matches.push({
              id: docSnapshot.id,
              studentId: studentData.studentId,
              fullName: studentData.fullName,
              khmerName: studentData.khmerName,
              class: studentData.classType,
              shift: studentInfo.shift,
              room: studentInfo.room,
              seat: studentInfo.seat,
              mockResults: mockResultsData,
              mock1Result: studentData.mock1Result // Include mock1Result from mockExam1
            });
          }
        }

        // Limit to 10 suggestions for performance
        if (matches.length >= 10) break;
      }

      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } catch (error) {
      console.error('Error searching by name:', error);
      setMessage({ type: 'error', text: 'កំហុសក្នុងការស្វែងរកតាមឈ្មោះ។ សូមព្យាយាមម្តងទៀត។' });
    } finally {
      setIsSearchingName(false);
    }
  };

  // Function to select a student from name search suggestions
  const selectStudentFromName = async (student: Student) => {
    setFoundStudent(student);
    setSearchName(`${student.fullName} (${student.khmerName})`);
    setShowSuggestions(false);
    setMessage({ type: 'success', text: `រកឃើញសិស្ស! ${student.khmerName} - ${student.shift} - Room ${student.room}, Seat ${student.seat}` });

    // Update session stats
    setSessionStats(prev => ({ ...prev, studentsFound: prev.studentsFound + 1 }));

    // Fetch exam settings
    if (student.class) {
      await fetchExamSettings(student.class);
    }

    // Get max score for this student and subject
    const activeSubject = getActiveSubject();
    const maxScore = student.class ? await getMaxScore(student.class, activeSubject) : 100;
    setCurrentMaxScore(maxScore);

    // Check if score already exists for this subject in mock1Result
    const subjectKey = getSubjectKey(activeSubject);
    if (student.mock1Result && student.mock1Result[subjectKey]) {
      setMock4Score(student.mock1Result[subjectKey].toString());
    } else {
      setMock4Score('');
    }

    // Auto-focus the score input after a short delay to ensure DOM is updated
    setTimeout(() => {
      const scoreInput = document.getElementById('score') as HTMLInputElement;
      if (scoreInput) {
        scoreInput.focus();
        scoreInput.select(); // Select all text for easy replacement
      }
    }, 100);
  };

  // Debounce name search
  useEffect(() => {
    if (searchMethod === 'name' && searchName.length >= 3) {
      const timeoutId = setTimeout(() => {
        handleNameSearch(searchName);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setNameSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchName, searchMethod, selectedClassType]);

  const handleSearchStudent = async () => {
    if (!searchRoom || !searchSeat) {
      setMessage({ type: 'error', text: 'សូមបញ្ចូលលេខបន្ទប់ និងលេខកៅអីទាំងពីរ' });
      return;
    }

    setIsSearching(true);
    setMessage(null);
    setFoundStudent(null);

    try {
      // Search for student by room and seat in mockExam1 collection
      const mockExam1Ref = collection(db, 'mockExam1');

      // Convert room to string format for consistent searching (e.g., "Room 101")
      const roomNumber = searchRoom.startsWith('Room ') ? searchRoom : `Room ${searchRoom.padStart(3, '0')}`;

      let studentFound = false;
      let studentDoc: any = null;
      let foundShift = '';
      let foundRoom = '';
      let foundSeat = '';
      
      // Get the active classType to filter by
      const activeClassType = getActiveClassType();

      // Get all documents from mockExam1 collection
      const querySnapshot = await getDocs(mockExam1Ref);

      // Search through each student document
      for (const doc of querySnapshot.docs) {
        const studentData = doc.data();

        // Check if student's classType matches the selected classType
        if (!studentData.classType || studentData.classType !== activeClassType) {
          continue; // Skip students not in the selected class type
        }

        // Get the exam day for the active subject for this class type
        const examDay = getExamDayForActiveSubject(studentData.classType);

        // Check if student has the schedule for the active subject's exam day
        if (studentData[examDay]) {
          // Check only the selected shift for matching room and seat
          const shiftData = studentData[examDay][searchShift];
          if (shiftData && shiftData.room === roomNumber) {
            // Handle both string and number seat values
            const dbSeat = typeof shiftData.seat === 'number' ? shiftData.seat.toString().padStart(2, '0') : shiftData.seat;
            if (dbSeat === searchSeat) {
              studentDoc = doc;
              foundShift = searchShift;
              foundRoom = shiftData.room;
              foundSeat = dbSeat; // Use the normalized seat value
              studentFound = true;
              break;
            }
          }
        }
      }

      if (studentFound && studentDoc) {
        const studentData = studentDoc.data();

        // Try to fetch mock results from mockResults collection using studentId
        let mockResultsData: { mock_1?: any; mock_2?: any; mock_3?: any; mock_4?: any; } | undefined = undefined;
        try {
          const mockResultsDoc = await getDoc(doc(db, 'mockResults', studentData.studentId));
          if (mockResultsDoc.exists()) {
            mockResultsData = mockResultsDoc.data().mockResults;
          }
        } catch (error) {
          console.log('No existing mock results found for åthis student');
        }

        setFoundStudent({
          id: studentDoc.id,
          studentId: studentData.studentId,
          fullName: studentData.fullName,
          khmerName: studentData.khmerName,
          class: studentData.classType || 'Unknown', // Use classType from mockExam1
          shift: foundShift,
          room: parseInt(foundRoom.replace('Room ', '')), // Convert "Room 101" to 101
          seat: foundSeat,
          mockResults: mockResultsData,
          mock1Result: studentData.mock1Result // Include mock1Result from mockExam1
        });

        // Update session stats
        setSessionStats(prev => ({ ...prev, studentsFound: prev.studentsFound + 1 }));

        // Try to fetch exam settings - may need to handle missing class info
        if (studentData.classType) {
          await fetchExamSettings(studentData.classType);
        }

        // Get max score for this student and subject using active subject
        const activeSubject = getActiveSubject();
        const maxScore = studentData.classType ? await getMaxScore(studentData.classType, activeSubject) : 100; // Default max score
        setCurrentMaxScore(maxScore);

        // Check if score already exists for this subject in mock1Result
        const subjectKey = getSubjectKey(activeSubject);
        if (studentData.mock1Result && studentData.mock1Result[subjectKey]) {
          setMock4Score(studentData.mock1Result[subjectKey].toString());
          setMessage({ type: 'success', text: `រកឃើញសិស្ស! ពិន្ទុ ${getTranslatedSubject(activeSubject)} បច្ចុប្បន្ន: ${studentData.mock1Result[subjectKey]}` });
        } else {
          setMock4Score('');
          setMessage({ type: 'success', text: `រកឃើញសិស្ស! ${studentData.khmerName} (${foundShift} - ${foundRoom}, Seat ${foundSeat})` });
        }

        // Auto-focus the score input after a short delay to ensure DOM is updated
        setTimeout(() => {
          const scoreInput = document.getElementById('score') as HTMLInputElement;
          if (scoreInput) {
            scoreInput.focus();
            scoreInput.select(); // Select all text for easy replacement
          }
        }, 100);
      } else {
        setMessage({ type: 'error', text: `រកមិនឃើញសិស្សដែលមានបន្ទប់ ${roomNumber} និងកៅអី ${searchSeat}។ សូមពិនិត្យលេខបន្ទប់ និងលេខកៅអី។` });
      }
    } catch (error) {
      console.error('Error searching for student:', error);
      setMessage({ type: 'error', text: 'កំហុសក្នុងការស្វែងរកសិស្ស។ សូមព្យាយាមម្តងទៀត។' });
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search effect when room, seat, shift, or selectedClassType changes
  useEffect(() => {
    if (searchRoom && searchSeat && searchRoom.length > 0 && searchSeat.length > 0 && hasScheduledExamDays()) {
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
  }, [searchRoom, searchSeat, searchShift, selectedClassType]);

  const handleSaveScore = async () => {
    const activeSubject = getActiveSubject();
    if (!foundStudent || !mock4Score || !activeSubject) {
      setMessage({ type: 'error', text: 'សូមធានាថារកឃើញសិស្ស និងបានបញ្ចូលពិន្ទុ' });
      return;
    }

    const score = parseFloat(mock4Score);
    if (isNaN(score) || score < 0 || score > currentMaxScore) {
      setMessage({ type: 'error', text: `សូមបញ្ចូលពិន្ទុត្រឹមត្រូវរវាង 0 និង ${currentMaxScore}` });
      return;
    }

    // Check if the score has more than 2 decimal places
    if (score % 1 !== 0 && score.toString().split('.')[1]?.length > 2) {
      setMessage({ type: 'error', text: 'ពិន្ទុអាចមានចំនួនទសភាគយ៉ាងច្រើន ២ ខ្ទង់' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Get the subject key to save based on active subject
      const subjectKey = getSubjectKey(activeSubject);
      
      // Update the mockExam1 document directly using the student's document ID
      const docRef = doc(db, 'mockExam1', foundStudent.id);
      
      // New structure: Save inside mock1Result map
      const updateData = {
        [`mock1Result.${subjectKey}`]: Math.floor(score), // Save score inside mock1Result.subject
        [`mock1Result.${subjectKey}_teacher`]: userName, // Track which teacher input this score
        [`mock1Result.${subjectKey}_timestamp`]: Timestamp.now(), // Track when it was input
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updateData);
      
      // Show success toast with student name and score
      toast.success(`ពិន្ទុត្រូវបានរក្សាទុក!`, {
        description: `${foundStudent.fullName} - ${getTranslatedSubject(activeSubject)}: ${Math.floor(score)}/${currentMaxScore}`,
        duration: 4000,
      });
      
      // Update session stats
      setSessionStats(prev => ({ ...prev, scoresEntered: prev.scoresEntered + 1 }));
      
      // Update local state - update the mock1Result in foundStudent
      setFoundStudent(prev => prev ? {
        ...prev,
        mock1Result: {
          ...prev.mock1Result,
          [subjectKey]: Math.floor(score)
        }
      } : null);
      
    } catch (error) {
      console.error('Error saving score:', error);
      setMessage({ type: 'error', text: 'កំហុសក្នុងការរក្សាទុកពិន្ទុ។ សូមព្យាយាមម្តងទៀត។' });
    } finally {
      setIsSaving(false);
    }
  };

  const clearSearch = () => {
    setSearchRoom('');
    setSearchSeat('');
    setSearchShift(getDefaultShift(teacherClassTypes));
    setSearchName('');
    setNameSuggestions([]);
    setShowSuggestions(false);
    setFoundStudent(null);
    setMock4Score('');
    setMessage(null);
    setCurrentMaxScore(100); // Reset to default
  };

  // Fetch teacher data and exam schedule on component mount
  useEffect(() => {
    const loadTeacherData = async () => {
      await fetchTeacherClassTypes();
      await fetchClassTypesData();
    };
    if (userPhone) {
      loadTeacherData();
    }
  }, [userPhone]);

  // Fetch exam schedule when teacher class types are loaded
  useEffect(() => {
    if (teacherClassTypes.length > 0) {
      fetchExamSchedule();
    }
  }, [teacherClassTypes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-3xl blur-xl"></div>
          <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-75"></div>
                  <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl">
                    <Image src="/favicon.png" alt="Logo" width={48} height={48} className="drop-shadow-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="pb-2 text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                    សូមស្វាគមន៍ត្រឡប់មកវិញ, {userName}!
                  </h1>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                      ប្រព័ន្ធគ្រូបង្រៀន • មុខវិជ្ជា: <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {Array.isArray(userSubject) 
                          ? userSubject.map(subject => getTranslatedSubject(subject)).join(', ') 
                          : getTranslatedSubject(userSubject || 'កំពុងផ្ទុក...')}
                      </span>
                    </p>
                  </div>
                  {teacherClassTypes.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">
                        ថ្នាក់បង្រៀន: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {teacherClassTypes.map(classType => 
                            classTypesData[classType]?.khmerName || classType
                          ).join(', ')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Button
                  onClick={handleLogout}
                  icon={mdiLogout}
                  label="ចាកចេញ"
                  color="danger"
                  roundedFull
                  className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">មុខវិជ្ជាបច្ចុប្បន្ន</h3>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {Array.isArray(userSubject) 
                          ? getTranslatedSubject(getActiveSubject())
                          : getTranslatedSubject(userSubject || 'កំពុងផ្ទុក...')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ពិន្ទុដែលបានបញ្ចូល</h3>
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{sessionStats.scoresEntered}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{sessionStats.studentsFound}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">សិស្សដែលបានរកឃើញ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Score Input Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
          <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="pb-4 text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    ការបញ្ចូលពិន្ទុ Mock 1
                    {!hasScheduledExamDays() && (
                      <span className="ml-3 text-lg text-red-500 dark:text-red-400 font-normal">
                        - មុខងារត្រូវបានបិទ
                      </span>
                    )}
                  </h2>
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">ថ្នាក់:</span>{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {teacherClassTypes.length > 0 ? (classTypesData[getActiveClassType()]?.khmerName || getActiveClassType()) : 'មិនទាន់កំណត់'}
                      </span>
                    </p>
                    {hasScheduledExamDays() && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">កាលវិភាគ:</span>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {(() => {
                            const activeSubject = getActiveSubject();
                            const activeClassType = getActiveClassType();
                            const examDays = getExamDaysForSubject(activeSubject, activeClassType);
                            return examDays.length > 0 ? examDays.join(', ') : 'គ្មានថ្ងៃកំណត់';
                          })()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="font-medium">ការដាក់ពិន្ទុមានប្រសិទ្ធភាព</span>
              </div>
            </div>

          {/* Subject Selector for Multiple Subjects */}
          {Array.isArray(userSubject) && userSubject.length > 1 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                      ជ្រើសរើសមុខវិជ្ជាដើម្បីដាក់ពិន្ទុ
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      អ្នកបង្រៀន {userSubject.length} មុខវិជ្ជា។ ជ្រើសរើសមួយដើម្បីបញ្ចូលពិន្ទុ។
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <label className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-2 block">
                    រើសមុខវិជ្ជា
                  </label>
                  <CustomCombobox
                    options={userSubject.map((subject) => ({
                      value: subject,
                      label: getTranslatedSubject(subject)
                    }))}
                    selectedValue={selectedSubject}
                    onChange={(value) => setSelectedSubject(value)}
                    placeholder="ជ្រើសរើសមុខវិជ្ជា"
                    editable={false}
                    fieldData={{
                      className: `w-full min-w-[160px] md:min-w-[180px] h-[42px] border-2 border-indigo-300 dark:border-indigo-700 rounded-lg text-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                        'bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [&>div]:justify-center [&>div>span]:text-center [&>div>span]:flex-1 [&>div>span]:text-gray-900 [&>div>span]:dark:text-white'
                      }`
                    }}
                  />
                </div>            
              </div>
            </div>
          )}
          
          {/* ClassType Selector for Multiple ClassTypes */}
          {teacherClassTypes.length > 1 && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 mb-6 border border-emerald-200 dark:border-emerald-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                      ជ្រើសរើសថ្នាក់
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      អ្នកបង្រៀន {teacherClassTypes.length} ថ្នាក់។ ជ្រើសរើសមួយដើម្បីស្វែងរកសិស្ស។
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <label className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2 block">
                    ជ្រើសរើសថ្នាក់
                  </label>
                  <CustomCombobox
                    options={teacherClassTypes.map((classType) => ({
                      value: classType,
                      label: classTypesData[classType]?.khmerName || classType
                    }))}
                    selectedValue={selectedClassType}
                    onChange={(value) => setSelectedClassType(value)}
                    placeholder="ជ្រើសរើសថ្នាក់"
                    editable={false}
                    fieldData={{
                      className: `w-full min-w-[180px] md:min-w-[220px] h-[42px] border-2 border-emerald-300 dark:border-emerald-700 rounded-lg text-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                        'bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent [&>div]:justify-center [&>div>span]:text-center [&>div>span]:flex-1 [&>div>span]:text-gray-900 [&>div>span]:dark:text-white'
                      }`
                    }}
                  />
                </div>            
              </div>
            </div>
          )}

          {/* Search Form - Improved Layout */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                រកសិស្ស
                {!hasScheduledExamDays() && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                    បានបិទ - គ្មានថ្ងៃពិសោធន៍កំណត់
                  </span>
                )}
              </div>
              <button
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                title="កំណត់ឡើងវិញ"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </h3>
            
            {!hasScheduledExamDays() && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    ការស្វែងរកសិស្សត្រូវបានបិទបច្ចុប្បន្នពីព្រោះមិនអាចផ្ទុកកាលវិភាគពិសោធន៍បានទេ ឬអ្នកមិនមានថ្ងៃពិសោធន៍កំណត់សម្រាប់មុខវិជ្ជារបស់អ្នក។
                  </p>
                </div>
              </div>
            )}

            {/* Search Method Tabs and Shift Selector */}
            <div className="mb-4 space-y-4">
              {/* Search Method Tabs */}
              <div className="w-full flex space-x-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-gray-600 h-[42px]">
                <button
                  onClick={() => {
                    setSearchMethod('room');
                    clearSearch();
                  }}
                  disabled={!hasScheduledExamDays()}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center ${
                    searchMethod === 'room'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  } ${!hasScheduledExamDays() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  តាមកៅអី
                </button>
                <button
                  onClick={() => {
                    setSearchMethod('name');
                    clearSearch();
                  }}
                  disabled={!hasScheduledExamDays()}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center ${
                    searchMethod === 'name'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  } ${!hasScheduledExamDays() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  តាមឈ្មោះ
                </button>
              </div>

              {/* Shift Selector */}
              {searchMethod === 'room' && (
                <div className="flex flex-col w-full">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="shift">
                    វេនប្រលង
                  </label>
                  <CustomCombobox
                    options={shouldShowOnlyMorningAfternoonEvening(teacherClassTypes) ? [
                      { value: 'Morning', label: 'ព្រឹក' },
                      { value: 'Afternoon', label: 'រសៀល' },
                      { value: 'Evening', label: 'ល្ងាច' }
                    ] : [
                      { value: 'Evening', label: 'ល្ងាច' }
                    ]}
                    selectedValue={searchShift}
                    onChange={(value) => setSearchShift(value as 'Morning' | 'Afternoon' | 'Evening')}
                    placeholder="ជ្រើសរើសវេន"
                    editable={false}
                    fieldData={{
                      className: `w-full h-[42px] border rounded-lg text-center font-medium ${
                        !hasScheduledExamDays()
                          ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [&>div]:justify-center [&>div>span]:text-center [&>div>span]:flex-1 [&>div>span]:text-gray-900 [&>div>span]:dark:text-white'
                      }`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Room/Seat Search Form */}
            {searchMethod === 'room' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="room">
                  លេខបន្ទប់
                </label>
                <input
                  type="number"
                  id="room"
                  value={searchRoom}
                  onChange={(e) => setSearchRoom(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="ឧទាហរណ៍ ២០៨"
                  disabled={!hasScheduledExamDays()}
                  className={`w-full h-[42px] px-3 py-2 border rounded-lg text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    !hasScheduledExamDays()
                      ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="seat">
                  លេខកៅអី
                </label>
                <div className="flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={() => setSearchSeat(decrementSeat(searchSeat || '01'))}
                    disabled={!hasScheduledExamDays()}
                    className={`flex-shrink-0 h-[42px] px-1 sm:px-2 border border-r-0 rounded-l-lg font-medium transition-colors ${
                      !hasScheduledExamDays()
                        ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    title="កៅអីមុន"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    id="seat"
                    value={searchSeat}
                    onChange={(e) => setSearchSeat(normalizeSeatValue(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        setSearchSeat(decrementSeat(searchSeat || '01'));
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        setSearchSeat(incrementSeat(searchSeat || '01'));
                      }
                    }}
                    placeholder="ឧទាហរណ៍ ០៤"
                    disabled={!hasScheduledExamDays()}
                    className={`flex-1 min-w-0 h-[42px] px-1 sm:px-2 py-2 border-y text-center font-medium transition-colors ${
                      !hasScheduledExamDays()
                        ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    title={!hasScheduledExamDays() ? "ការស្វែងរកសិស្សត្រូវបានបិទ" : "ស្វែងរកដោយស្វ័យប្រវត្តិនៅពេលបញ្ចូលលេខបន្ទប់ និងលេខកៅអី"}
                  />
                  <button
                    type="button"
                    onClick={() => setSearchSeat(incrementSeat(searchSeat || '01'))}
                    disabled={!hasScheduledExamDays()}
                    className={`flex-shrink-0 h-[42px] px-1 sm:px-2 border border-l-0 rounded-r-lg font-medium transition-colors ${
                      !hasScheduledExamDays()
                        ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    title="កៅអីបន្ទាប់"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">សកម្មភាព</label>
                <Button
                  onClick={handleSearchStudent}
                  icon={mdiMagnify}
                  label={isSearching ? "កំពុងស្វែងរក..." : "ស្វែងរកសិស្ស"}
                  color="info"
                  disabled={isSearching || !searchRoom || !searchSeat || !hasScheduledExamDays()}
                  className="h-[42px] w-full min-w-0"
                />
              </div>
            </div>
            )}

            {/* Name Search Form */}
            {searchMethod === 'name' && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="searchName">
                    ឈ្មោះសិស្ស (English ឬ ខ្មែរ)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="searchName"
                      value={searchName}
                      onChange={(e) => {
                        setSearchName(e.target.value);
                        if (!e.target.value) {
                          setFoundStudent(null);
                          setMock4Score('');
                        }
                      }}
                      onFocus={() => {
                        if (nameSuggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      placeholder="វាយបញ្ចូលឈ្មោះសិស្ស..."
                      disabled={!hasScheduledExamDays()}
                      className={`w-full h-[48px] pl-10 pr-4 py-2 border rounded-lg font-medium ${
                        !hasScheduledExamDays()
                          ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    />
                    {isSearchingName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {showSuggestions && nameSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                        {nameSuggestions.map((student, index) => (
                          <button
                            key={student.id}
                            onClick={() => selectStudentFromName(student)}
                            className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${
                              index !== nameSuggestions.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {student.fullName}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">•</span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {student.khmerName}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {classTypesData[student.class]?.khmerName || student.class}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {student.shift}
                                  </span>
                                  <span>•</span>
                                  <span>Room {student.room}-{student.seat}</span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {searchName.length > 0 && searchName.length < 3 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      សូមវាយបញ្ចូលយ៉ាងតិច 3 តួអក្សរដើម្បីស្វែងរក
                    </p>
                  )}
                </div>
              </div>
            )}
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
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                ការបញ្ចូលពិន្ទុ - {foundStudent.khmerName}
              </h3>
              
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">ថ្នាក់:</span> 
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {(classTypesData[foundStudent.class]?.khmerName || foundStudent.class).replace('ថ្នាក់ទី', '')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">វេន:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{foundStudent.shift}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">បន្ទប់/កៅអី:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{foundStudent.room}-{foundStudent.seat}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="score">
                    ពិន្ទុ Mock 1 {getTranslatedSubject(getActiveSubject())} (អតិបរមា: {currentMaxScore})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="score"
                      value={mock4Score}
                      onChange={(e) => setMock4Score(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={`(0-${currentMaxScore})`}
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

                {(foundStudent as any)[getSubjectKey(getActiveSubject())] && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ពិន្ទុបច្ចុប្បន្ន</label>
                    <div className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-center w-full h-[42px] flex items-center justify-center">
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {(foundStudent as any)[getSubjectKey(getActiveSubject())]}
                      </span>
                    </div>
                  </div>
                )}

                <div className={`flex flex-col ${(foundStudent as any)[getSubjectKey(getActiveSubject())] ? 'md:col-span-2' : ''}`}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">រក្សាទុកពិន្ទុ</label>
                  <Button
                    onClick={handleSaveScore}
                    icon={mdiContentSave}
                    label={isSaving ? "កំពុងរក្សាទុក..." : ((foundStudent as any)[getSubjectKey(getActiveSubject())] ? "កែរពិន្ទុ" : "រក្សាទុកពិន្ទុ")}
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
                            ពិន្ទុត្រឹមត្រូវ
                          </div>
                        );
                      } else {
                        let errorMessage = `ពិន្ទុត្រូវតែរវាង 0 និង ${currentMaxScore}`;
                        if (!hasValidDecimals) {
                          errorMessage = 'ពិន្ទុអាចមានចំនួនទសភាគយ៉ាងច្រើន ២ ខ្ទង់';
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
        </div>

        {/* Enhanced Instructions */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <div className="flex items-start space-x-4 md:space-x-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-blue-900 dark:text-blue-100 mb-3">
                របៀបបញ្ចូលពិន្ទុ Mock 1
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <p className="text-blue-800 dark:text-blue-200">ជ្រើសរើសវិធីស្វែងរក: <strong>តាមបន្ទប់/កៅអី</strong> ឬ <strong>តាមឈ្មោះសិស្ស</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <p className="text-blue-800 dark:text-blue-200">
                    <strong>ស្វែងរកតាមបន្ទប់/កៅអី:</strong> ជ្រើសរើសវេន បញ្ចូលលេខបន្ទប់ និងលេខកៅអី - ការស្វែងរកកើតឡើងដោយស្វ័យប្រវត្តិ!
                    <br />
                    <strong>ស្វែងរកតាមឈ្មោះ:</strong> វាយបញ្ចូលឈ្មោះសិស្ស (English ឬខ្មែរ) និងជ្រើសរើសពីបញ្ជីផ្ដល់ជូន
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <p className="text-blue-800 dark:text-blue-200">បន្ទាប់ពីរកឃើញ បញ្ចូលពិន្ទុ Mock 1 សម្រាប់មុខវិជ្ជារបស់អ្នក: <strong className="text-blue-900 dark:text-blue-100">{getTranslatedSubject(getActiveSubject())}</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <p className="text-blue-800 dark:text-blue-200">ដែនកំណត់ពិន្ទុត្រូវបានកំណត់ដោយការកំណត់ពិសោធន៍សម្រាប់មុខវិជ្ជា និងប្រភេទថ្នាក់នីមួយៗ</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <p className="text-blue-800 dark:text-blue-200">អ្នកអាច<strong>ធ្វើបច្ចុប្បន្នភាពពិន្ទុដែលមានស្រាប់</strong>បានប្រសិនបើចាំបាច់</p>
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
