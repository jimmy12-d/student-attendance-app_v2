"use client";

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { mdiPrinter, mdiUploadOutline, mdiFileDocumentOutline, mdiCheck } from '@mdi/js';
import dynamic from 'next/dynamic';

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
import CustomSingleSelectDropdown from '../_components/CustomSingleSelectDropdown';

// Interfaces
import { Document, PrintRequest, Teacher } from '../_interfaces';

// Validation schema
const validationSchema = Yup.object().shape({
  // Teacher selection
  selectedTeacherId: Yup.string().required('Please select a teacher'),
  
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

  // New field for custom page range
  customPageRange: Yup.string().when(['isMultiplePages', 'pdfFile'], {
    is: (isMultiplePages: boolean, pdfFile: File | null) =>
      isMultiplePages && pdfFile !== null, // Only validate if multiple pages is selected and a PDF is uploaded
    then: (schema) =>
      schema
        .required('Please specify page(s) to print')
        .matches(
          /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/,
          'Invalid page range. Use format: 1-3, 5, 8'
        ),
    otherwise: (schema) => schema.notRequired(),
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
  selectedTeacherId: string;
  subject: string;
  chapter: string;
  lessonNumber: string;
  description: string;
  pdfFile: File | null;
  selectedDocumentId: string;
  amountToPrint: number;
  isMultiplePages: boolean;
  isBothSides: boolean;
  customPageRange: string;
}

export default function PrintRequestPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Function to get PDF page count
  const getPdfPageCount = async (file: File): Promise<number> => {
    try {
      setIsProcessingPdf(true);
      
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source dynamically
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    } catch (error) {
      console.error('Error reading PDF:', error);
      throw new Error('Failed to read PDF file');
    } finally {
      setIsProcessingPdf(false);
    }
  };
  const [successInfo, setSuccessInfo] = useState<{
    fileName: string;
    teacherName: string;
    subject: string;
    chapter: string;
    lessonNumber: string;
    amountToPrint: number;
    isMultiplePages: boolean;
    isBothSides: boolean;
    customPageRange?: string;
  } | null>(null);

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersSnapshot = await getDocs(
          query(collection(db, 'teachers'), orderBy('fullName'))
        );
        const teachersList = teachersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Teacher[];
        setTeachers(teachersList);
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      } finally {
        setLoadingTeachers(false);
      }
    };

    loadTeachers();
  }, []);

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

  // Filter documents based on teacher, subject and chapter
  useEffect(() => {
    let filtered = existingDocuments;
    
    // Filter by selected teacher
    if (selectedTeacher) {
      filtered = filtered.filter(doc => doc.teacherId === selectedTeacher.id);
    }
    
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
  }, [subjectFilter, chapterFilter, existingDocuments, selectedTeacher]);


  const handleSubmit = async (values: FormValues, { setSubmitting, resetForm }: any) => {
    try {
      // Find selected teacher
      const teacher = teachers.find(t => t.id === values.selectedTeacherId);
      if (!teacher) {
        toast.error('Please select a teacher');
        return;
      }

      let documentId = '';
      let pdfUrl = '';
      let docTotalPageCount: number | null = null; 

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
        docTotalPageCount = pdfPageCount;
        // Create document record
        const documentData = {
          fileName: filename,
          pdfUrl,
          uploadedAt: serverTimestamp(),
          subject: values.subject,
          chapter: values.chapter,
          lessonNumber: values.lessonNumber,
          description: values.description || '',
          teacherName: teacher.fullName,
          teacherId: teacher.id,
          pageCount: docTotalPageCount,
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
        docTotalPageCount = selectedDoc.pageCount || null; // Get total page count from existing document

      }
            // --- Calculate effectivePageCount for the print request ---
            let effectivePageCountForRequest: number;
            const currentDocPageCount = docTotalPageCount || 1; // Fallback to 1 if document page count isn't available
      
            if (values.isMultiplePages && values.customPageRange) {
                // Parse the customPageRange to get the actual number of pages requested
                const parsedPages = new Set<number>();
                const ranges = values.customPageRange.split(',').map(s => s.trim());
      
                for (const range of ranges) {
                    if (range.includes('-')) {
                        const [startStr, endStr] = range.split('-').map(s => s.trim());
                        const start = parseInt(startStr, 10);
                        const end = parseInt(endStr, 10);
      
                        if (!isNaN(start) && !isNaN(end) && start <= end) {
                            for (let i = start; i <= end; i++) {
                                // Ensure page is within the document's total bounds
                                if (i >= 1 && i <= currentDocPageCount) {
                                    parsedPages.add(i);
                                }
                            }
                        }
                    } else {
                        const pageNum = parseInt(range, 10);
                        if (!isNaN(pageNum)) {
                            // Ensure page is within the document's total bounds
                            if (pageNum >= 1 && pageNum <= currentDocPageCount) {
                                parsedPages.add(pageNum);
                            }
                        }
                    }
                }
                effectivePageCountForRequest = parsedPages.size;
                // As a fallback, if parsing results in 0 pages for a seemingly valid range,
                // it might mean all specified pages were out of bounds or invalid.
                // In such a case, default to 1 to avoid 0 page prints, though validation should ideally prevent this.
                if (effectivePageCountForRequest === 0 && values.customPageRange.trim() !== '') {
                    effectivePageCountForRequest = 1; // Fallback if custom range yields 0 valid pages
                }
            } else if (values.isMultiplePages) {
                // If multiple pages is true but no custom range, it means all pages of the document
                effectivePageCountForRequest = currentDocPageCount;
            } else {
                // If not multiple pages, it's a single page print
                effectivePageCountForRequest = 1;
            }
            // Ensure effectivePageCountForRequest is at least 1
            effectivePageCountForRequest = Math.max(1, effectivePageCountForRequest);
            // --- End of effectivePageCount calculation ---
      
      
            // Create print request

      // Create print request
      const printRequestData = {
        documentId,
        pdfUrl,
        amountToPrint: values.amountToPrint,
        isMultiplePages: values.isMultiplePages,
        isBothSides: values.isBothSides,
        customPageRange: values.isMultiplePages && values.customPageRange ? values.customPageRange : undefined,
        effectivePageCount: effectivePageCountForRequest,
        status: 'pending',
        requestedAt: serverTimestamp(),
        requestedBy: 'Anonymous' // TODO: Add user authentication
      };

      await addDoc(collection(db, 'printRequests'), printRequestData);
      
      // Get document info for success display
      const selectedDoc = values.uploadMode === 'existing' 
        ? existingDocuments.find(doc => doc.id === values.selectedDocumentId)
        : null;
      
      // Set success state with document info
      setSuccessInfo({
        fileName: values.uploadMode === 'new' 
          ? `${values.subject}_${values.chapter}_${values.lessonNumber}.pdf`
          : selectedDoc?.fileName || 'Document',
        teacherName: teacher.fullName,
        subject: values.uploadMode === 'new' ? values.subject : selectedDoc?.subject || '',
        chapter: values.uploadMode === 'new' ? values.chapter : selectedDoc?.chapter || '',
        lessonNumber: values.uploadMode === 'new' ? values.lessonNumber : selectedDoc?.lessonNumber || '',
        amountToPrint: values.amountToPrint,
        isMultiplePages: values.isMultiplePages,
        isBothSides: values.isBothSides,
        customPageRange: values.customPageRange || undefined
      });
      setSubmissionSuccess(true);
      
      toast.success('Print request submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting print request:', error);
      toast.error('Failed to submit print request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintAnother = () => {
    setSubmissionSuccess(false);
    setSuccessInfo(null);
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

        <CardBox className='p-6'>
          {submissionSuccess && successInfo ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <Icon path={mdiCheck} className="text-green-600 dark:text-green-400" size={24} />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Print Request Submitted Successfully!
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Request Details:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>File Name:</strong> {successInfo.fileName}</p>
                  <p><strong>Teacher:</strong> {successInfo.teacherName}</p>
                  <p><strong>Subject:</strong> {successInfo.subject}</p>
                  <p><strong>Chapter:</strong> {successInfo.chapter}</p>
                  <p><strong>Lesson:</strong> {successInfo.lessonNumber}</p>
                  <p><strong>Copies to Print:</strong> {successInfo.amountToPrint}</p>
                  <p><strong>Multiple Pages:</strong> {successInfo.isMultiplePages ? 'Yes' : 'No'}</p>
                  <p><strong>Both Sides:</strong> {successInfo.isBothSides ? 'Yes' : 'No'}</p>
                  {successInfo.isMultiplePages && successInfo.customPageRange && (
                    <p><strong>Page Range:</strong> {successInfo.customPageRange}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-400">
                  Your print request has been submitted and is pending admin approval.
                  You will be notified when it's ready for printing.
                </p>
                
                <Button
                  onClick={handlePrintAnother}
                  icon={mdiPrinter}
                  color="success"
                  label="Submit Another Print Request"
                />
              </div>
            </div>
          ) : (
            /* Form State */
          <Formik
            initialValues={{
              uploadMode: 'new',
              selectedTeacherId: '',
              subject: '',
              chapter: '',
              lessonNumber: '',
              description: '',
              pdfFile: null,
              selectedDocumentId: '',
              amountToPrint: 1,
              isMultiplePages: false,
              isBothSides: false,
              customPageRange: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isSubmitting }) => (
              <Form className="space-y-6">
                {/* Teacher Selection */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-medium mb-4">Teacher Selection</h3>
                  <FormField label="Select Teacher" labelFor="selectedTeacherId">
                    {(fieldData) => (
                      <>
                        {loadingTeachers ? (
                          <div className="flex items-center justify-center py-2">
                            <LoadingSpinner />
                            <span className="ml-2">Loading teachers...</span>
                          </div>
                        ) : (
                          <CustomSingleSelectDropdown
                            options={teachers.map(teacher => ({
                              value: teacher.id,
                              label: `${teacher.fullName} - ${teacher.subject}`
                            }))}
                            selectedValue={values.selectedTeacherId}
                            onChange={(value) => {
                              setFieldValue('selectedTeacherId', value);
                              const teacher = teachers.find(t => t.id === value);
                              setSelectedTeacher(teacher || null);
                              if (teacher) {
                                setFieldValue('subject', teacher.subject);
                              }
                            }}
                            placeholder="Select a teacher..."
                            fieldData={fieldData}
                            id="selectedTeacherId"
                          />
                        )}
                        <ErrorMessage name="selectedTeacherId" component="div" className="text-red-500 text-sm mt-1" />
                      </>
                    )}
                  </FormField>
                </div>

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

                    <FormField label="PDF File" labelFor="pdfFile">
                      {(fieldData) => (
                        <>
                        <input
                        type="file"
                        accept=".pdf"
                        onChange={async (e) => {
                            const file = e.target.files?.[0] || null;
                            setFieldValue('pdfFile', file); // This line is correct

                            // --- Add the PDF processing logic here ---
                            if (file) {
                            setIsProcessingPdf(true); // You'll need this state defined in PrintRequestPage
                            try {
                                // Dynamic import to avoid SSR issues
                                const pdfjsLib = await import('pdfjs-dist');
                                
                                // Set worker source dynamically
                                if (typeof window !== 'undefined') {
                                  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;
                                }
                                
                                // Ensure pdfjs-dist is imported and configured at the top of the file
                                const arrayBuffer = await file.arrayBuffer();
                                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                                const pdf = await loadingTask.promise;
                                setPdfPageCount(pdf.numPages); // You'll need this state defined in PrintRequestPage
                                console.log('PDF page count:', pdf.numPages);
                                // Conditionally update Formik values based on page count
                                if (pdf.numPages === 1) {
                                setFieldValue('isMultiplePages', false);
                                setFieldValue('isBothSides', false);
                                }
                            } catch (error) {
                                console.error('Error reading PDF for page count:', error);
                                toast.error('Failed to read PDF file for page count.');
                                setPdfPageCount(null);
                            } finally {
                                setIsProcessingPdf(false);
                            }
                            } else {
                            setPdfPageCount(null); // Reset page count if no file selected
                            setFieldValue('isMultiplePages', false); // Reset if no file
                            setFieldValue('isBothSides', false);   // Reset if no file
                            }
                            // --- End of PDF processing logic ---

                        }}
                        className={fieldData.className}
                        />
                          <ErrorMessage name="pdfFile" component="div" className="text-red-500 text-sm mt-1" />
                          {values.pdfFile && (
                            <div className="text-sm text-gray-600 mt-1">
                              Selected: {values.pdfFile.name} ({(values.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                              {isProcessingPdf && <span className="ml-2 text-blue-600">Processing...</span>}
                              {pdfPageCount !== null && !isProcessingPdf && (
                                <span className="ml-2 text-green-600">
                                  • {pdfPageCount} page{pdfPageCount !== 1 ? 's' : ''}
                                </span>
                              )}
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
                            disabled={pdfPageCount !== null && pdfPageCount <= 1} // Disable if 1 page or less
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
                            disabled={pdfPageCount !== null && pdfPageCount <= 1} // Disable if 1 page or less
                            />
                            Print Both Sides
                        </label>
                    </div>
                  </div>
                  
                  {/* Page Range Selection - Show only when Multiple Pages is checked */}
                  {values.isMultiplePages && pdfPageCount && pdfPageCount > 1 && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <FormField label="Page Range" labelFor="customPageRange">
                        {(fieldData) => (
                          <>
                            <Field 
                              name="customPageRange" 
                              placeholder={`e.g., 1-3, 5, 8 (Total pages: ${pdfPageCount})`}
                              {...fieldData} 
                            />
                            <ErrorMessage name="customPageRange" component="div" className="text-red-500 text-sm mt-1" />
                            <div className="text-xs text-gray-500 mt-1">
                              Leave empty to print all pages. Format: 1-3, 5, 8 (individual pages or ranges)
                            </div>
                          </>
                        )}
                      </FormField>
                    </div>
                  )}
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
          )}
        </CardBox>
      </SectionMain>
    </>
  );
} 