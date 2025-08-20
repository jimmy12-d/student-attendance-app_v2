"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
import { doc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase-config';

import { mdiFaceRecognition } from '@mdi/js';
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import LoadingSpinner from '../../_components/LoadingSpinner';

import { Student, AttendanceRecord } from './_lib/types';
import { useFaceIO } from './_hooks/useFaceIO';
import { useStudents } from './_hooks/useStudents';
import { EnrollmentSection } from './_components/EnrollmentSection';
import { RecognitionSection } from './_components/RecognitionSection';
import { StatisticsSection } from './_components/StatisticsSection';
import { EnrolledStudentsList } from './_components/EnrolledStudentsList';

const FaceIOAttendanceScanner = () => {
  const { faceio, isLoading: isFaceIOLoading, loadingMessage } = useFaceIO();
  const { students, setStudents } = useStudents();
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [showEnrollment, setShowEnrollment] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize success sound
  useEffect(() => {
    audioRef.current = new Audio('/success_sound_2.mp3');
  }, []);

  const playSuccessSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  // Enroll new face
  const handleEnrollment = useCallback(async () => {
    if (!faceio || !selectedStudent) {
      toast.error('Please select a student and ensure FaceIO is loaded');
      return;
    }

    setIsEnrolling(true);
    
    try {
      const student = students.find(s => s.id === selectedStudent);
      if (!student) {
        throw new Error('Selected student not found');
      }

      toast.info('Look at the camera to enroll your face...');
      
      // Enroll user with FaceIO
      const userInfo = await faceio.enroll({
        locale: "auto",
        challenge: false, // Disable PIN challenge
        payload: {
          studentId: student.id,
          email: student.email,
          name: student.fullName,
          enrolledAt: new Date().toISOString()
        }
      });

      console.log('FaceIO enrollment successful:', userInfo);

      // Update student record in Firestore with Face ID
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        faceId: userInfo.facialId,
        faceioEnrolledAt: new Date(),
        faceioData: {
          facialId: userInfo.facialId,
          timestamp: userInfo.timestamp,
          enrolledAt: new Date().toISOString()
        }
      });

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === student.id 
          ? { ...s, faceId: userInfo.facialId }
          : s
      ));

      playSuccessSound();
      toast.success(`Face enrolled successfully for ${student.fullName}`);
      setSelectedStudent('');
      setShowEnrollment(false);

    } catch (error: any) {
      console.error('Enrollment failed:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error type:', typeof error);
      
      let errorMessage = 'Enrollment failed';
      
      // Handle numeric error codes (FaceIO throws numbers directly)
      const errorCode = typeof error === 'number' ? error : error.code;
      
      if (errorCode === 4) {
        errorMessage = 'User already enrolled. Please use recognition instead.';
      } else if (errorCode === 2) {
        errorMessage = 'No face detected. Please ensure good lighting and look at camera.';
      } else if (errorCode === 7) {
        errorMessage = 'Session timed out. Please try again.';
      } else if (errorCode === 21) {
        errorMessage = 'FaceIO service connection failed. This might be due to:\n• Network connectivity issues\n• FaceIO service downtime\n• Invalid app configuration\n\nPlease check your internet connection and try again in a few minutes.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  }, [faceio, selectedStudent, students, setStudents]);

  // Recognize face and mark attendance
  const handleRecognition = useCallback(async () => {
    if (!faceio) {
      toast.error('FaceIO not initialized');
      return;
    }

    setIsRecognizing(true);
    
    try {
      toast.info('Look at the camera for attendance...');
      
      // Authenticate user with FaceIO
      const userData = await faceio.authenticate({
        locale: "auto",
        challenge: false, // Disable PIN challenge
      });

      console.log('FaceIO recognition successful:', userData);

      // Find student by Face ID
      const student = students.find(s => s.faceId === userData.facialId);
      
      if (!student) {
        throw new Error('Student not found in database');
      }

      // Check if already marked today
      const today = new Date().toDateString();
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('studentId', '==', student.id),
        where('date', '==', today)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        const existingRecord = attendanceSnapshot.docs[0].data();
        toast.warning(`${student.fullName} already marked ${existingRecord.status} today`);
        playSuccessSound();
        return;
      }

      // Determine attendance status based on time
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // You can adjust these time thresholds as needed
      const cutoffTime = new Date();
      cutoffTime.setHours(8, 30, 0, 0); // 8:30 AM cutoff for late
      
      const status = now > cutoffTime ? 'late' : 'present';

      // Create attendance record
      const attendanceRecord: AttendanceRecord = {
        studentId: student.id,
        studentName: student.fullName,
        date: today,
        timeIn: timeString,
        status: status,
        method: 'faceio',
        timestamp: new Date()
      };

      // Save to Firestore
      await addDoc(collection(db, 'attendance'), attendanceRecord);

      // Show success message
      const message = `${student.fullName} marked ${status} at ${timeString}`;
      
      if (status === 'late') {
        toast.warning(message);
      } else {
        toast.success(message);
      }
      
      playSuccessSound();

    } catch (error: any) {
      console.error('Recognition failed:', error);
      let errorMessage = 'Recognition failed';
      
      // Handle numeric error codes (FaceIO throws numbers directly)
      const errorCode = typeof error === 'number' ? error : error.code;
      
      if (errorCode === 2) {
        errorMessage = 'No face detected. Please ensure good lighting and look at camera.';
      } else if (errorCode === 9) {
        errorMessage = 'Face not recognized. Please enroll first or try again.';
      } else if (errorCode === 20) {
        errorMessage = 'Webcam not available. Please close other apps using the camera and try again.';
      } else if (errorCode === 21) {
        errorMessage = 'FaceIO service connection failed. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = 'Webcam not available. Please close other apps using the camera and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRecognizing(false);
    }
  }, [faceio, students]);

  // Unenroll student function
  const handleUnenroll = useCallback(async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName}'s face enrollment? They will need to enroll again.`)) {
      return;
    }

    try {
      // Update student record in Firestore to remove Face ID
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        faceId: null,
        faceioEnrolledAt: null,
        faceioData: null
      });

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === studentId 
          ? { ...s, faceId: undefined }
          : s
      ));

      toast.success(`${studentName} has been unenrolled. They can enroll again.`);

    } catch (error: any) {
      console.error('Unenroll failed:', error);
      toast.error('Failed to unenroll student');
    }
  }, [setStudents]);

  const enrolledStudents = useMemo(() => students.filter(s => s.faceId), [students]);
  const unenrolledStudents = useMemo(() => students.filter(s => !s.faceId), [students]);
  
  // Sort unenrolled students by shift (morning first) and then by name
  const sortedUnenrolledStudents = useMemo(() => {
    return unenrolledStudents
      .slice() // Create a copy to avoid mutating original array
      .sort((a, b) => {
        // First sort by shift (morning first)
        const shiftA = a.shift?.toLowerCase() || 'unknown';
        const shiftB = b.shift?.toLowerCase() || 'unknown';
        
        if (shiftA === 'morning' && shiftB !== 'morning') return -1;
        if (shiftB === 'morning' && shiftA !== 'morning') return 1;
        if (shiftA === 'afternoon' && shiftB === 'evening') return -1;
        if (shiftB === 'afternoon' && shiftA === 'evening') return 1;
        
        // Then sort by name within same shift
        const nameA = a.fullName || '';
        const nameB = b.fullName || '';
        return nameA.localeCompare(nameB);
      });
  }, [unenrolledStudents]);
  return (
    <CardBox>
      <div className="space-y-6 p-6">
        
        {/* Status Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">FaceIO Attendance System</h3>
          <p className="text-blue-600">
            Advanced facial recognition powered by FaceIO. Students need to enroll once before using recognition.
          </p>
          
          {isFaceIOLoading && (
            <div className="mt-3 flex items-center text-blue-600">
              <LoadingSpinner />
              <span className="ml-2">{loadingMessage}</span>
            </div>
          )}
        </div>

        {/* Recognition Section */}
        {!isFaceIOLoading && (
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Attendance Recognition */}
            <RecognitionSection 
              handleRecognition={handleRecognition}
              isRecognizing={isRecognizing}
              isEnrolling={isEnrolling}
            />

            {/* Face Enrollment */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Face Enrollment</h4>
                <button
                  onClick={() => setShowEnrollment(!showEnrollment)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {showEnrollment ? 'Hide' : 'Show'} Enrollment
                </button>
              </div>
              
              <EnrollmentSection 
                showEnrollment={showEnrollment}
                students={students}
                unenrolledStudents={unenrolledStudents}
                sortedUnenrolledStudents={sortedUnenrolledStudents}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                handleEnrollment={handleEnrollment}
                isEnrolling={isEnrolling}
                isRecognizing={isRecognizing}
              />
            </div>
          </div>
        )}

        {/* Statistics */}
        {!isFaceIOLoading && (
          <>
            <StatisticsSection 
              enrolledStudents={enrolledStudents}
              unenrolledStudents={unenrolledStudents}
              totalStudents={students.length}
            />
            <EnrolledStudentsList 
              enrolledStudents={enrolledStudents} 
              onUnenroll={handleUnenroll}
            />
          </>
        )}
      </div>
      
      {/* Required FaceIO modal container */}
      <div id="faceio-modal"></div>
    </CardBox>
  );
};

export default function FaceIOAttendancePage() {
  return (
    <>
      <Head>
        <title>{getPageTitle('FaceIO Attendance')}</title>
      </Head>
      <SectionMain>
        <SectionTitleLineWithButton 
          icon={mdiFaceRecognition} 
          title="FaceIO Attendance System" 
          main 
        />
        <FaceIOAttendanceScanner />
      </SectionMain>
    </>
  );
}
