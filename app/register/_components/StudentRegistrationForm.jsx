"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { db } from '../../../firebase-config';
import { collection, addDoc, serverTimestamp} from 'firebase/firestore';
import { toast } from 'sonner';
import { mdiAccount, mdiSchool, mdiAccountMultiple, mdiLockOutline, mdiEye, mdiEyeOff, mdiCheck, mdiContentCopy } from '@mdi/js';
import Icon from '../../_components/Icon';
import RegisterComboboxx from '../../_components/RegisterComboboxx';
import { useClassTypes } from '../_hooks/useClassTypes';
import { generateUniqueUsername } from '../_utils/usernameGenerator';

const StudentRegistrationForm = () => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    nameKhmer: '',
    phone: '',
    grade: '',
    school: '',
    scheduleType: '',
    motherName: '',
    motherPhone: '',
    fatherName: '',
    fatherPhone: '',
    password: '',
    confirmPassword: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [errors, setErrors] = useState({});

  // Class types hook
  const { classTypes, loadingClassTypes } = useClassTypes();

  const totalSteps = 4;

  // No shift selection logic needed for registration

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Personal Information
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.nameKhmer.trim()) newErrors.nameKhmer = 'Name in Khmer is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 2: // Academic Information  
        if (!formData.grade) newErrors.grade = 'Grade selection is required';
        if (!formData.school.trim()) newErrors.school = 'Current school is required';
        if (!formData.scheduleType) newErrors.scheduleType = 'Schedule preference is required';
        break;
      case 3: // Parent Information
        if (!formData.motherName.trim() && !formData.fatherName.trim()) {
          newErrors.parentInfo = 'At least one parent information is required';
        }
        break;
      case 4: // Password Setup
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    try {
      // Generate unique username
      const username = await generateUniqueUsername(formData.fullName);
      setGeneratedUsername(username);

      // Prepare student data
      const studentData = {
        fullName: formData.fullName.trim(),
        nameKhmer: formData.nameKhmer.trim() || '',
        phone: formData.phone.trim(),
        grade: formData.grade,
        class: 'Unassigned', // Will be assigned by admin during activation
        shift: 'Unassigned', // Will be assigned by admin during activation
        school: formData.school.trim() || '',
        scheduleType: formData.scheduleType || '',
        motherName: formData.motherName.trim() || '',
        motherPhone: formData.motherPhone.trim() || '',
        fatherName: formData.fatherName.trim() || '',
        fatherPhone: formData.fatherPhone.trim() || '',
        username: username,
        password: formData.password, // This will be hashed in the backend
        registrationStatus: 'pending', // New field to track registration status
        registeredAt: serverTimestamp(),
        ay: '2026',
        dropped: false,
        onWaitlist: false,
        isActive: false, // Will be activated by admin
        registrationSource: 'self-registration'
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'students'), studentData);
      
      setRegistrationComplete(true);
      toast.success('Registration submitted successfully! Please save your username.');
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Username copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const renderStepContent = () => {
    if (registrationComplete) {
      return (
        <div className="text-center py-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Icon path={mdiCheck} size={48} className="text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Registration Complete!
          </h2>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Your Username
            </h3>
            <div className="flex items-center justify-center space-x-2">
              <code className="text-2xl font-mono bg-white dark:bg-slate-800 px-4 py-2 rounded border text-blue-600 dark:text-blue-400">
                {generatedUsername}
              </code>
              <button
                onClick={() => copyToClipboard(generatedUsername)}
                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                title="Copy username"
              >
                <Icon path={mdiContentCopy} size={20} />
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Important:</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 text-left space-y-1">
              <li>• Please take a screenshot or write down your username</li>
              <li>• Your account is pending admin approval</li>
              <li>• You'll be notified when your account is activated</li>
              <li>• Use this username to login once activated</li>
            </ul>
          </div>

          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go to Login Page
          </button>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Icon path={mdiAccount} size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Personal Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tell us about yourself
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name in Khmer *
                </label>
                <input
                  type="text"
                  value={formData.nameKhmer}
                  onChange={(e) => handleInputChange('nameKhmer', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                    errors.nameKhmer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="បញ្ចូលឈ្មោះជាភាសាខ្មែរ"
                />
                {errors.nameKhmer && <p className="text-red-500 text-sm mt-1">{errors.nameKhmer}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Icon path={mdiSchool} size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Academic Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your class and schedule
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade *
                </label>
                <RegisterComboboxx
                  options={classTypes || []}
                  selectedValue={formData.grade}
                  onChange={(value) => handleInputChange('grade', value)}
                  placeholder="Select your grade"
                  fieldData={{
                    className: `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                      errors.grade ? 'border-red-500' : 'border-gray-300'
                    }`
                  }}
                />
                {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Admin will assign you to a specific class and shift after approval
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current School *
                </label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                    errors.school ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your current school"
                />
                {errors.school && <p className="text-red-500 text-sm mt-1">{errors.school}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Preference *
                </label>
                <RegisterComboboxx
                  options={[
                    { value: 'fix', label: 'Fix' },
                    { value: 'flip-flop', label: 'Flip-Flop' }
                  ]}
                  selectedValue={formData.scheduleType}
                  onChange={(value) => handleInputChange('scheduleType', value)}
                  placeholder="Select schedule preference"
                  fieldData={{
                    className: `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                      errors.scheduleType ? 'border-red-500' : 'border-gray-300'
                    }`
                  }}
                />
                {errors.scheduleType && <p className="text-red-500 text-sm mt-1">{errors.scheduleType}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This is your preference. Final schedule will be assigned by admin.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Icon path={mdiAccountMultiple} size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Parent Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Provide at least one parent's information
              </p>
            </div>

            {errors.parentInfo && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{errors.parentInfo}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mother's Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    placeholder="Enter mother's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mother's Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.motherPhone}
                    onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    placeholder="Enter mother's phone"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Father's Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    placeholder="Enter father's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Father's Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.fatherPhone}
                    onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    placeholder="Enter father's phone"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Icon path={mdiLockOutline} size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Set Your Password
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create a secure password for your account
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    <Icon path={showPassword ? mdiEyeOff : mdiEye} size={20} />
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    <Icon path={showConfirmPassword ? mdiEyeOff : mdiEye} size={20} />
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• At least 6 characters long</li>
                  <li>• Use a combination of letters and numbers</li>
                  <li>• Keep it secure and memorable</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {!registrationComplete && (
        <>
          {/* Progress bar */}
          <div className="bg-gray-50 dark:bg-slate-700 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 self-start">
                ← Back to Login
              </Link>
              <div className="flex justify-between sm:justify-end items-center gap-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round((currentStep / totalSteps) * 100)}% Complete
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Form content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {renderStepContent()}

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500'
                }`}
              >
                Previous
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                >
                  {loading ? 'Submitting...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {registrationComplete && (
        <div className="p-6 lg:p-8">
          {renderStepContent()}
        </div>
      )}
    </div>
  );
};

export default StudentRegistrationForm;