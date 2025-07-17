"use client";

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { mdiPrinter, mdiUploadOutline, mdiFileDocumentOutline, mdiCheck } from '@mdi/js';

// Firebase imports
import { db, storage } from '../../firebase-config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Components
import SectionMain from '../_components/Section/Main';
import SectionTitleLineWithButton from '../_components/Section/TitleLineWithButton';
import CardBox from '../_components/CardBox';
import FormField from '../_components/FormField';
import Button from '../_components/Button';
import Icon from '../_components/Icon';
import LoadingSpinner from '../_components/LoadingSpinner';

// Interfaces
import { Document, PrintRequest } from '../_interfaces';

// Validation schema
const validationSchema = Yup.object().shape({
  // New document fields
  subject: Yup.string().when('uploadMode', {
    is: 'new',
    then: (schema) => schema.required('Subject is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  chapter: Yup.string().when('uploadMode', {
    is: 'new',
    then: (schema) => schema.required('Chapter is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  lessonNumber: Yup.string().when('uploadMode', {
    is: 'new',
    then: (schema) => schema.required('Lesson number is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  description: Yup.string(),
  pdfFile: Yup.mixed().when('uploadMode', {
    is: 'new',
    then: (schema) => schema.required('PDF file is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  
  // Existing document selection
  selectedDocumentId: Yup.string().when('uploadMode', {
    is: 'existing',
    then: (schema) => schema.required('Please select a document'),
    otherwise: (schema) => schema.notRequired()
  }),
  
  // Print settings
  amountToPrint: Yup.number()
    .min(1, 'Amount must be at least 1')
    .max(100, 'Amount cannot exceed 100')
    .required('Amount to print is required'),
  isMultiplePages: Yup.boolean(),
  isBothSides: Yup.boolean(),
});

interface FormValues {
  uploadMode: 'new' | 'existing';
  subject: string;
  chapter: string;
  lessonNumber: string;
  description: string;
  pdfFile: File | null;
  selectedDocumentId: string;
  amountToPrint: number;
  isMultiplePages: boolean;
  isBothSides: boolean;
}

export default function PrintRequestPage() {
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');

  // Load existing documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const documentsSnapshot = await getDocs(
          query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'))
        );
        const docs = documentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Document[];
        setExistingDocuments(docs);
        setFilteredDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load existing documents');
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, []);

  // Filter documents based on subject and chapter
  useEffect(() => {
    let filtered = existingDocuments;
    
    if (subjectFilter) {
      filtered = filtered.filter(doc => 
        doc.subject.toLowerCase().includes(subjectFilter.toLowerCase())
      );
    }
    
    if (chapterFilter) {
      filtered = filtered.filter(doc => 
        doc.chapter.toLowerCase().includes(chapterFilter.toLowerCase())
      );
    }
    
    setFilteredDocuments(filtered);
  }, [subjectFilter, chapterFilter, existingDocuments]);

  const handleSubmit = async (values: FormValues, { setSubmitting, resetForm }: any) => {
    try {
      let documentId = '';
      let pdfUrl = '';

      if (values.uploadMode === 'new') {
        // Upload new document
        if (!values.pdfFile) {
          toast.error('Please select a PDF file');
          return;
        }

        // Check file type
        if (values.pdfFile.type !== 'application/pdf') {
          toast.error('Please select a valid PDF file');
          return;
        }

        // Check file size (10MB limit)
        if (values.pdfFile.size > 10 * 1024 * 1024) {
          toast.error('File size must be less than 10MB');
          return;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${values.subject}_${values.chapter}_${values.lessonNumber}_${timestamp}.pdf`;
        const storageRef = ref(storage, `documents/${filename}`);

        // Upload file
        const uploadResult = await uploadBytes(storageRef, values.pdfFile);
        pdfUrl = await getDownloadURL(uploadResult.ref);

        // Create document record
        const documentData = {
          fileName: filename,
          pdfUrl,
          uploadedAt: serverTimestamp(),
          subject: values.subject,
          chapter: values.chapter,
          lessonNumber: values.lessonNumber,
          description: values.description || ''
        };

        const docRef = await addDoc(collection(db, 'documents'), documentData);
        documentId = docRef.id;

        toast.success('Document uploaded successfully!');
      } else {
        // Use existing document
        const selectedDoc = existingDocuments.find(doc => doc.id === values.selectedDocumentId);
        if (!selectedDoc) {
          toast.error('Selected document not found');
          return;
        }
        documentId = selectedDoc.id;
        pdfUrl = selectedDoc.pdfUrl;
      }

      // Create print request
      const printRequestData = {
        documentId,
        pdfUrl,
        amountToPrint: values.amountToPrint,
        isMultiplePages: values.isMultiplePages,
        isBothSides: values.isBothSides,
        status: 'pending',
        requestedAt: serverTimestamp(),
        requestedBy: 'Anonymous' // TODO: Add user authentication
      };

      await addDoc(collection(db, 'printRequests'), printRequestData);
      
      toast.success('Print request submitted successfully!');
      resetForm();
      
    } catch (error) {
      console.error('Error submitting print request:', error);
      toast.error('Failed to submit print request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Print Request - Document Printing System</title>
      </Head>
      <SectionMain>
        <SectionTitleLineWithButton 
          icon={mdiPrinter} 
          title="Request Document Printing" 
          main 
        />

        <CardBox>
          <Formik
            initialValues={{
              uploadMode: 'new',
              subject: '',
              chapter: '',
              lessonNumber: '',
              description: '',
              pdfFile: null,
              selectedDocumentId: '',
              amountToPrint: 1,
              isMultiplePages: false,
              isBothSides: false,
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isSubmitting }) => (
              <Form className="space-y-6">
                {/* Upload Mode Selection */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-medium mb-4">Document Selection</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <Field
                        type="radio"
                        name="uploadMode"
                        value="new"
                        className="mr-2"
                      />
                      <Icon path={mdiUploadOutline} className="mr-2" size={20} />
                      Upload New Document
                    </label>
                    <label className="flex items-center">
                      <Field
                        type="radio"
                        name="uploadMode"
                        value="existing"
                        className="mr-2"
                      />
                      <Icon path={mdiFileDocumentOutline} className="mr-2" size={20} />
                      Select Existing Document
                    </label>
                  </div>
                </div>

                {/* New Document Upload Section */}
                {values.uploadMode === 'new' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium">Document Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField label="Subject" labelFor="subject">
                        {(fieldData) => (
                          <>
                            <Field name="subject" {...fieldData} placeholder="e.g., Mathematics" />
                            <ErrorMessage name="subject" component="div" className="text-red-500 text-sm mt-1" />
                          </>
                        )}
                      </FormField>

                      <FormField label="Chapter" labelFor="chapter">
                        {(fieldData) => (
                          <>
                            <Field name="chapter" {...fieldData} placeholder="e.g., Chapter 5" />
                            <ErrorMessage name="chapter" component="div" className="text-red-500 text-sm mt-1" />
                          </>
                        )}
                      </FormField>

                      <FormField label="Lesson Number" labelFor="lessonNumber">
                        {(fieldData) => (
                          <>
                            <Field name="lessonNumber" {...fieldData} placeholder="e.g., Lesson 1" />
                            <ErrorMessage name="lessonNumber" component="div" className="text-red-500 text-sm mt-1" />
                          </>
                        )}
                      </FormField>
                    </div>

                    <FormField label="Description (Optional)" labelFor="description" hasTextareaHeight>
                      {(fieldData) => (
                        <Field 
                          name="description" 
                          as="textarea" 
                          {...fieldData} 
                          placeholder="Brief description of the document content..." 
                        />
                      )}
                    </FormField>

                    <FormField label="PDF File" labelFor="pdfFile">
                      {(fieldData) => (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setFieldValue('pdfFile', file);
                            }}
                            className={fieldData.className}
                          />
                          <ErrorMessage name="pdfFile" component="div" className="text-red-500 text-sm mt-1" />
                          {values.pdfFile && (
                            <div className="text-sm text-gray-600 mt-1">
                              Selected: {values.pdfFile.name} ({(values.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                          )}
                        </>
                      )}
                    </FormField>
                  </div>
                )}

                {/* Existing Document Selection Section */}
                {values.uploadMode === 'existing' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium">Select Document</h4>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Filter by Subject" labelFor="subjectFilter">
                        {(fieldData) => (
                          <input
                            type="text"
                            placeholder="Filter by subject..."
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className={fieldData.className}
                          />
                        )}
                      </FormField>

                      <FormField label="Filter by Chapter" labelFor="chapterFilter">
                        {(fieldData) => (
                          <input
                            type="text"
                            placeholder="Filter by chapter..."
                            value={chapterFilter}
                            onChange={(e) => setChapterFilter(e.target.value)}
                            className={fieldData.className}
                          />
                        )}
                      </FormField>
                    </div>

                    {/* Document Selection */}
                    {loadingDocuments ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded">
                        {filteredDocuments.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No documents found. Try adjusting your filters or upload a new document.
                          </div>
                        ) : (
                          <div className="space-y-2 p-2">
                            {filteredDocuments.map((doc) => (
                              <label
                                key={doc.id}
                                className={`block p-3 border rounded cursor-pointer transition-colors ${
                                  values.selectedDocumentId === doc.id
                                    ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center">
                                  <Field
                                    type="radio"
                                    name="selectedDocumentId"
                                    value={doc.id}
                                    className="mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {doc.subject} - {doc.chapter} - {doc.lessonNumber}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {doc.fileName}
                                    </div>
                                    {doc.description && (
                                      <div className="text-sm text-gray-500 mt-1">
                                        {doc.description}
                                      </div>
                                    )}
                                  </div>
                                  {values.selectedDocumentId === doc.id && (
                                    <Icon path={mdiCheck} className="text-blue-500" size={20} />
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <ErrorMessage name="selectedDocumentId" component="div" className="text-red-500 text-sm" />
                  </div>
                )}

                {/* Print Settings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-md font-medium mb-4">Print Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Amount to Print" labelFor="amountToPrint">
                      {(fieldData) => (
                        <>
                          <Field 
                            name="amountToPrint" 
                            type="number" 
                            min="1" 
                            max="100" 
                            {...fieldData} 
                          />
                          <ErrorMessage name="amountToPrint" component="div" className="text-red-500 text-sm mt-1" />
                        </>
                      )}
                    </FormField>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="isMultiplePages"
                          className="mr-2"
                        />
                        Multiple Pages
                      </label>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="isBothSides"
                          className="mr-2"
                        />
                        Print Both Sides
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    color="success"
                    icon={mdiPrinter}
                    label={isSubmitting ? "Submitting..." : "Submit Print Request"}
                    disabled={isSubmitting}
                  />
                </div>
              </Form>
            )}
          </Formik>
        </CardBox>
      </SectionMain>
    </>
  );
} 