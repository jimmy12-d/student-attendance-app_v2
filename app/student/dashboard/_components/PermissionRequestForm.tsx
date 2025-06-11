"use client";

import React, { useState } from 'react';
import { useAppSelector } from '../../../_stores/hooks';
import { db } from '../../../../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../../_components/Button';
import FormField from '../../../_components/FormField';
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from 'yup';

export const PermissionRequestForm = () => {
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const validationSchema = Yup.object().shape({
    permissionStartDate: Yup.date().required('Start date is required'),
    duration: Yup.number().min(1, 'Duration must be at least 1 day').required('Duration is required'),
    reason: Yup.string().required('Please select a reason'),
    customReason: Yup.string().when('reason', {
      is: 'Other',
      then: (schema) => schema.required('Please specify your reason'),
      otherwise: (schema) => schema.notRequired(),
    }),
    details: Yup.string()
      .required('Details are required')
      .test(
        'min-words',
        'Details must be at least 10 words long',
        (value) => (value || '').split(/\s+/).filter(Boolean).length >= 10
      ),
  });

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    setFormStatus({ message: '', type: '' });
    if (!studentDocId || !studentAuthUid) {
      setFormStatus({ message: 'Error: User not authenticated properly.', type: 'error' });
      setSubmitting(false);
      return;
    }

    const { permissionStartDate, duration, reason, customReason, details } = values;

    const startDate = new Date(permissionStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);

    const finalReason = reason === 'Other' ? customReason : reason;

    const newPermissionRequest = {
      studentId: studentDocId,
      studentAuthUid: studentAuthUid,
      studentName: userName,
      reason: finalReason,
      details: details,
      permissionStartDate: startDate.toISOString().split('T')[0],
      permissionEndDate: endDate.toISOString().split('T')[0],
      duration: duration,
      status: 'pending',
      requestDate: serverTimestamp(),
    };

    console.log("Submitting to Firestore:", newPermissionRequest);

    try {
      await addDoc(collection(db, 'permissions'), newPermissionRequest);
      setFormStatus({ message: 'Your request has been submitted successfully!', type: 'success' });
      resetForm({
        values: {
          permissionStartDate: '',
          duration: 1,
          reason: '',
          customReason: '',
          details: '',
        }
      });
    } catch (error: any) {
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
        initialValues={{
          permissionStartDate: '',
          duration: 1,
          reason: '',
          customReason: '',
          details: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Start Date" labelFor="permissionStartDate">
                {(fieldData) => (
                  <Field id="permissionStartDate" name="permissionStartDate" type="date" {...fieldData} />
                )}
              </FormField>
              <FormField label="Duration (days)" labelFor="duration">
                {(fieldData) => (
                  <Field id="duration" name="duration" type="number" min="1" {...fieldData} />
                )}
              </FormField>
            </div>

            <FormField label="Reason" labelFor="reason">
              {(fieldData) => (
                <Field as="select" id="reason" name="reason" {...fieldData}>
                  <option value="">Select a reason</option>
                  <option value="Sickness">Sickness</option>
                  <option value="Family Event">Family Event</option>
                  <option value="Appointment">Appointment</option>
                  <option value="Other">Other</option>
                </Field>
              )}
            </FormField>

            {values.reason === 'Other' && (
              <FormField label="Please Specify" labelFor="customReason">
                {(fieldData) => (
                  <Field id="customReason" name="customReason" type="text" {...fieldData} placeholder="Your reason here..." />
                )}
              </FormField>
            )}

            <FormField label="Details (min. 10 words)" labelFor="details" hasTextareaHeight>
              {(fieldData) => (
                <Field id="details" name="details" as="textarea" {...fieldData} placeholder="Please provide specific details about your absence..." />
              )}
            </FormField>
            
            <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />

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