"use client";

import React, { useState } from 'react';
import StudentLayout from '../_components/StudentLayout';
import { db } from '../../../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../_components/Button';
import FormField from '../../_components/FormField';
import { Field, Form, Formik } from "formik";
import { useAppSelector } from '../../_stores/hooks';

const StudentDashboard = () => {
  return (
    <StudentLayout>
      {(userName) => ( // Consume the render prop from layout
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">Welcome, <span className="font-semibold text-gray-800 dark:text-white">{userName}</span>!</p>
          <PermissionRequestForm />
        </div>
      )}
    </StudentLayout>
  );
};

// This form component is now self-contained and doesn't need props passed down from the main page component.
const PermissionRequestForm = () => {
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });
  const userUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const handleSubmit = async (values: { reason: string; date: string }, { setSubmitting, resetForm }: any) => {
    setFormStatus({ message: '', type: '' });
    if (!userUid) {
      setFormStatus({ message: 'Error: User not authenticated.', type: 'error' });
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'permissionRequests'), {
        studentUid: userUid,
        studentName: userName,
        reason: values.reason,
        date: values.date,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });
      setFormStatus({ message: 'Your request has been submitted successfully!', type: 'success' });
      resetForm();
    } catch (error) {
      console.error('Error submitting permission request:', error);
      setFormStatus({ message: 'An error occurred while submitting your request. Please try again.', type: 'error' });
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-900 shadow-lg rounded-lg p-6 mt-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Request Permission for Absence
      </h2>
      <Formik
        initialValues={{ reason: '', date: '' }}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
            <FormField label="Date of Absence" labelFor="date">
              {(fieldData) => (
                <Field id="date" name="date" type="date" {...fieldData} />
              )}
            </FormField>
            <FormField label="Reason for Absence" labelFor="reason" hasTextareaHeight>
              {(fieldData) => (
                <Field id="reason" name="reason" as="textarea" {...fieldData} placeholder="Please provide a brief reason for your absence..." />
              )}
            </FormField>

            <div className="flex justify-end">
              <Button
                type="submit"
                color="info"
                label={isSubmitting ? 'Submitting...' : 'Submit Request'}
                disabled={isSubmitting}
              />
            </div>
          </Form>
        )}
      </Formik>

      {formStatus.message && (
        <div className={`mt-6 text-sm p-4 rounded-lg text-center ${formStatus.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
          {formStatus.message}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard; 