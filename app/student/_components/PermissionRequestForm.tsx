"use client";
import React, { useState } from 'react';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../_components/Button';
import FormField from '../../_components/FormField';
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from 'yup';
import CustomSingleSelectDropdown from '../../_components/CustomSingleSelectDropdown';
import { toast } from 'sonner';
import DurationSelector from './DurationSelector';

type Props = {
  onSuccess?: () => void;
};

export const PermissionRequestForm = ({ onSuccess }: Props) => {
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const reasonOptions = [
    { value: 'Sickness', label: 'Sickness' },
    { value: 'Family Event', label: 'Family Event' },
    { value: 'Appointment', label: 'Appointment' },
  ];

  const validationSchema = Yup.object().shape({
    permissionStartDate: Yup.date().required('Start date is required'),
    duration: Yup.number().min(1, 'Duration must be at least 1 day').required('Duration is required'),
    reason: Yup.string().required('Please select or specify a reason'),
    details: Yup.string()
      .required('Details are required')
      .test(
        'min-words',
        'Details must be at least 10 words long',
        (value) => (value || '').split(/\s+/).filter(Boolean).length >= 10
      ),
  });

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    if (onSuccess) {
      onSuccess(); 
    }

    if (!studentDocId || !studentAuthUid) {
      toast.error('Error: User not authenticated properly.');
      setSubmitting(false);
      return;
    }

    const { permissionStartDate, duration, reason, details } = values;

    const startDate = new Date(permissionStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);

    const newPermissionRequest = {
      studentId: studentDocId,
      authUid: studentAuthUid,
      studentName: userName,
      reason: reason,
      details: details,
      permissionStartDate: startDate.toISOString().split('T')[0],
      permissionEndDate: endDate.toISOString().split('T')[0],
      duration: duration,
      status: 'pending',
      requestedAt: serverTimestamp(),
    };

    const submissionPromise = addDoc(collection(db, 'permissions'), newPermissionRequest);

    toast.promise(submissionPromise, {
      loading: 'Submitting request...',
      success: () => {
        resetForm({
          values: {
            permissionStartDate: '',
            duration: 4000,
            reason: '',
            details: '',
          }
        });
        setSubmitting(false);
        return 'Permission request submitted successfully!';
      },
      error: (err) => {
        setSubmitting(false);
        console.error('Error submitting permission request:', err);
        return 'An error occurred. Please try again.';
      },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg mb-4">
      <Formik
        initialValues={{
          permissionStartDate: '',
          duration: 1,
          reason: '',
          details: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, setFieldValue }) => (
          
          <Form className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <FormField label="Start Date" labelFor="permissionStartDate">
                {(fieldData) => (
                  <Field id="permissionStartDate" name="permissionStartDate" type="date" {...fieldData} />
                )}
              </FormField>
              <FormField label="Duration (days)" labelFor="duration">
                {() => (
                  <DurationSelector
                    value={values.duration}
                    onChange={(value) => setFieldValue('duration', value)}
                  />
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Reason" labelFor="reason">
                {(fieldData) => (
                  <CustomSingleSelectDropdown
                    options={reasonOptions}
                    selectedValue={values.reason}
                    onChange={(value) => setFieldValue('reason', value)}
                    fieldData={fieldData}
                    id="reason"
                  />
                )}
              </FormField>

              <FormField label="Details (min. 10 words)" labelFor="details" hasTextareaHeight>
                {(fieldData) => (
                  <Field id="details" name="details" as="textarea" {...fieldData} placeholder="Please provide specific details about your absence..." />
                )}
              </FormField>
            </div>
            
            <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />

            <div className="flex justify-end">
              <Button
                type="submit"
                color="company-purple"
                label={isSubmitting ? 'Submitting...' : 'Submit Request'}
                disabled={isSubmitting}
              />
            </div>
          </Form>
        )}
      </Formik>

    </div>
  );
}; 