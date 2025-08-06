"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Head from 'next/head';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { mdiFileDocumentOutline, mdiCheck, mdiAccount, mdiCalendar, mdiClockOutline } from '@mdi/js';
import { useSearchParams } from 'next/navigation';

// Firebase imports
import { db } from '../../firebase-config';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';

// Components
import Icon from '../_components/Icon';
import CustomDropdown from '../dashboard/students/components/CustomDropdown';

// Custom wrapper component for reason dropdown with "Other" option
const ReasonDropdownWithOther = ({ value, onChange, className }) => {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const reasonOptions = [
    { value: 'Medical Appointment', label: 'Medical Appointment' },
    { value: 'Family Emergency', label: 'Family Emergency' },
    { value: 'Personal Matter', label: 'Personal Matter' },
    { value: 'Other', label: 'Other (specify below)' },
  ];

  // Check if current value is one of the predefined options
  const isPredefinedOption = reasonOptions.some(option => option.value === value && option.value !== 'Other');
  
  // If value is not predefined and not empty, it's a custom "Other" value
  useEffect(() => {
    if (value && !isPredefinedOption && value !== 'Other') {
      setShowOtherInput(true);
      setOtherValue(value);
    } else if (value === 'Other') {
      setShowOtherInput(true);
      setOtherValue('');
    } else {
      setShowOtherInput(false);
      setOtherValue('');
    }
  }, [value, isPredefinedOption]);

  const handleDropdownChange = (newValue) => {
    if (newValue === 'Other') {
      setShowOtherInput(true);
      setOtherValue('');
      onChange('Other');
    } else {
      setShowOtherInput(false);
      setOtherValue('');
      onChange(newValue);
    }
  };

  const handleOtherInputChange = (e) => {
    const inputValue = e.target.value;
    setOtherValue(inputValue);
    // Only update the main value if there's actual content
    if (inputValue.trim()) {
      onChange(inputValue);
    } else {
      onChange('Other'); // Keep 'Other' as placeholder until user types something
    }
  };

  return (
    <div className={className}>
      <CustomDropdown
        id="reason"
        label="Reason for Permission"
        value={showOtherInput ? 'Other' : value}
        onChange={handleDropdownChange}
        options={reasonOptions}
        placeholder="Select a reason..."
      />
      
      {showOtherInput && (
        <div className="mt-3 transition-all duration-300 ease-in-out">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Please specify your reason: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={otherValue}
            onChange={handleOtherInputChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 focus:border-green-500 transition-all duration-200"
            placeholder="Enter your custom reason..."
            maxLength={100}
            autoFocus
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className="text-gray-600 dark:text-gray-400">Please be specific about your reason</span>
            <span>{otherValue.length}/100 characters</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Validation schema
const validationSchema = Yup.object().shape({
  studentName: Yup.string().required('Student name is required'),
  studentClass: Yup.string().required('Student class is required'),
  studentShift: Yup.string().required('Student shift is required'),
  permissionStartDate: Yup.date().required('Start date is required'),
  duration: Yup.number()
    .required('Duration is required')
    .min(1, 'Duration must be at least 1 day')
    .max(30, 'Duration cannot exceed 30 days'),
  reason: Yup.string()
    .required('Reason is required')
    .test('not-just-other', 'Please specify your custom reason', function(value) {
      // If the value is exactly "Other", it means user selected Other but didn't type anything
      return value !== 'Other';
    }),
  details: Yup.string()
    .test('word-count', 'Details must contain at least 10 words', function(value) {
      if (!value || value.trim() === '') return false;
      const wordCount = value.trim().split(/\s+/).length;
      return wordCount >= 10;
    })
    .max(500, 'Details must be less than 500 characters'),
});

interface FormValues {
  studentId: string;
  studentName: string;
  studentClass: string;
  studentShift: string;
  permissionStartDate: string;
  duration: number;
  reason: string;
  details: string;
}

export default function PermissionRequestPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <PermissionRequestContent />
    </Suspense>
  );
}

// Loading component
function LoadingComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

// Main content component that uses useSearchParams
function PermissionRequestContent() {
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [studentData, setStudentData] = useState<{
    class: string;
    shift: string;
  } | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const searchParams = useSearchParams();
  const [successInfo, setSuccessInfo] = useState<{
    studentName: string;
    studentClass: string;
    studentShift: string;
    permissionStartDate: string;
    permissionEndDate: string;
    duration: number;
    reason: string;
    details?: string;
  } | null>(null);

  // Get prefilled data from URL parameters
  const studentId = searchParams?.get('studentId') || '';
  const studentName = searchParams?.get('studentName') || '';

  // Calculate end date based on start date and duration
  const calculateEndDate = (startDate: string, duration: number): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1); // -1 because if duration is 1, start = end
    return end.toISOString().split('T')[0];
  };

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        setLoadingStudent(false);
        return;
      }

      try {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (studentDoc.exists()) {
          const data = studentDoc.data();
          setStudentData({
            class: data.class || '',
            shift: data.shift || ''
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  const handleSubmit = async (values: FormValues, { setSubmitting, resetForm }: any) => {
    try {
      const permissionEndDate = calculateEndDate(values.permissionStartDate, values.duration);

      // Create permission request
      const permissionRequestData = {
        studentId: values.studentId,
        studentName: values.studentName,
        studentClass: values.studentClass,
        studentShift: values.studentShift,
        permissionStartDate: values.permissionStartDate,
        permissionEndDate,
        duration: values.duration,
        reason: values.reason,
        details: values.details || '',
        status: 'pending',
        requestedAt: serverTimestamp(),
        requestedBy: 'Anonymous' // Similar to print-request
      };

      await addDoc(collection(db, 'permissions'), permissionRequestData);
      
      // Set success state with request info
      setSuccessInfo({
        studentName: values.studentName,
        studentClass: values.studentClass,
        studentShift: values.studentShift,
        permissionStartDate: values.permissionStartDate,
        permissionEndDate,
        duration: values.duration,
        reason: values.reason,
        details: values.details
      });
      setSubmissionSuccess(true);
      
      toast.success('Permission request submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting permission request:', error);
      toast.error('Failed to submit permission request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setSubmissionSuccess(false);
    setSuccessInfo(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loadingStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading student information...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Permission Request - Student Attendance System</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Header with Logo */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 dark:border-slate-600">
                <img 
                  src="/rodwell_logo.png" 
                  alt="Rodwell Learning Center" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Rodwell Learning Center
                </h1>
                <p className="text-purple-600 dark:text-purple-400 font-medium">
                  Permission Request System
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {submissionSuccess && successInfo ? (
              /* Success State */
              <div className="p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                  <Icon path={mdiCheck} className="text-green-600 dark:text-green-400" size={32} />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Request Submitted Successfully!
                </h2>
                
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 mb-8 text-left max-w-2xl mx-auto">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center">
                    <Icon path={mdiFileDocumentOutline} className="mr-2 text-purple-600" size={20} />
                    Request Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Student:</span>
                      <p className="text-gray-900 dark:text-white">{successInfo.studentName}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Class & Shift:</span>
                      <p className="text-gray-900 dark:text-white">{successInfo.studentClass} - {successInfo.studentShift}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Start Date:</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(successInfo.permissionStartDate)}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">End Date:</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(successInfo.permissionEndDate)}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Duration:</span>
                      <p className="text-gray-900 dark:text-white">{successInfo.duration} day{successInfo.duration > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Reason:</span>
                      <p className="text-gray-900 dark:text-white">{successInfo.reason}</p>
                    </div>
                    {successInfo.details && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Details:</span>
                        <p className="text-gray-900 dark:text-white">{successInfo.details}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-blue-800 dark:text-blue-300 font-medium">
                      📋 Your permission request has been submitted and is pending admin approval.
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                      The student will be marked as having permission during the specified dates once approved.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleSubmitAnother}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    <Icon path={mdiFileDocumentOutline} className="mr-2" size={20} />
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
                    <Icon path={mdiFileDocumentOutline} className="text-white" size={24} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Student Permission Request
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Submit a request for student absence permission
                  </p>
                </div>

                <Formik
                  initialValues={{
                    studentId: studentId,
                    studentName: studentName,
                    studentClass: studentData?.class || '',
                    studentShift: studentData?.shift || '',
                    permissionStartDate: '',
                    duration: 1,
                    reason: '',
                    details: '',
                  }}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ values, setFieldValue, isSubmitting }) => (
                    <Form className="space-y-8">
                      {/* Student Information */}
                      <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                          <Icon path={mdiAccount} className="mr-3 text-purple-600" size={24} />
                          Student Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Student Name
                            </label>
                            <Field 
                              name="studentName" 
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:border-purple-500 transition-all duration-200"
                              placeholder="Full Name of Student"
                              readOnly={!!studentName}
                            />
                            <ErrorMessage name="studentName" component="div" className="text-red-500 text-sm mt-1" />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Class
                            </label>
                            <Field 
                              name="studentClass" 
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:border-purple-500 transition-all duration-200"
                              placeholder="Student Class"
                              readOnly={!!studentData?.class}
                            />
                            <ErrorMessage name="studentClass" component="div" className="text-red-500 text-sm mt-1" />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Shift
                            </label>
                            <Field 
                              name="studentShift" 
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:border-purple-500 transition-all duration-200"
                              placeholder="Student Shift"
                              readOnly={!!studentData?.shift}
                            />
                            <ErrorMessage name="studentShift" component="div" className="text-red-500 text-sm mt-1" />
                          </div>
                        </div>
                      </div>

                      {/* Permission Period */}
                      <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                          <Icon path={mdiCalendar} className="mr-3 text-blue-600" size={24} />
                          Permission Period
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Start Date
                            </label>
                            <Field 
                              name="permissionStartDate" 
                              type="date"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus:border-blue-500 transition-all duration-200"
                              min={new Date().toISOString().split('T')[0]}
                            />
                            <ErrorMessage name="permissionStartDate" component="div" className="text-red-500 text-sm mt-1" />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Duration (Days)
                            </label>
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => setFieldValue('duration', Math.max(1, values.duration - 1))}
                                className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                                disabled={values.duration <= 1}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              
                              <div className="flex-1 relative">
                                <Field 
                                  name="duration" 
                                  type="number"
                                  min="1"
                                  max="30"
                                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus:border-blue-500 transition-all duration-200 text-center font-semibold text-lg"
                                  readOnly
                                />
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => setFieldValue('duration', Math.min(30, values.duration + 1))}
                                className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                                disabled={values.duration >= 30}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            <ErrorMessage name="duration" component="div" className="text-red-500 text-sm mt-1" />
                            {values.permissionStartDate && values.duration && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <Icon path={mdiClockOutline} className="inline mr-1" size={16} />
                                End date: {formatDate(calculateEndDate(values.permissionStartDate, values.duration))}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Permission Details */}
                      <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                          Permission Details
                        </h3>
                        
                        <div className="space-y-6">
                          <div>
                            <ReasonDropdownWithOther
                              value={values.reason}
                              onChange={(value) => setFieldValue('reason', value)}
                              className="relative z-10"
                            />
                            <ErrorMessage name="reason" component="div" className="text-red-500 text-sm mt-1" />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Additional Details <span className="text-red-500">*</span>
                            </label>
                            <Field
                              as="textarea"
                              name="details"
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 focus:border-green-500 transition-all duration-200 resize-none"
                              placeholder="Please provide detailed information about the permission request. At least 10 words are required..."
                            />
                            <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span className="flex items-center">
                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                  values.details.trim().split(/\s+/).length >= 10 
                                    ? 'bg-green-500' 
                                    : 'bg-red-500'
                                }`}></span>
                                {values.details.trim() ? values.details.trim().split(/\s+/).length : 0}/10 words minimum
                              </span>
                              <span>{values.details.length}/500 characters</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 shadow-lg flex items-center justify-center"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Icon path={mdiFileDocumentOutline} className="mr-2" size={20} />
                              Submit Permission Request
                            </>
                          )}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
