
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from 'sonner';
import {
  mdiMagnify,
  mdiCashRegister,
  mdiAccount,
  mdiClose,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiDownload,
  mdiHistory,
} from "@mdi/js";

import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import FormField from "../../_components/FormField";
import Button from "../../_components/Button";
import Icon from "../../_components/Icon";
import LoadingSpinner from "../../_components/LoadingSpinner";
import CardBox from "../../_components/CardBox";
import NotificationBar from "../../_components/NotificationBar";
import CardBoxModal from "../../_components/CardBox/Modal";

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, Timestamp, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';

// Components
import { PrinterManager } from "./components/PrinterManager";
import { TransactionManager } from "./components/TransactionManager";
import { TransactionHistory } from "./components/TransactionHistory";
import { calculateProratedAmount } from "./utils/dateUtils";

// Types
import { Student, Transaction, Printer } from "./types";

const POSStudentPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showTransactionHistory, setShowTransactionHistory] = useState(false);
    const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
    const [classType, setClassType] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadingTransactionId, setDownloadingTransactionId] = useState<string | undefined>();
    const [reprintingTransactionId, setReprintingTransactionId] = useState<string | undefined>();
    const [paymentMonth, setPaymentMonth] = useState(''); // For storing YYYY-MM
    const [displayPaymentMonth, setDisplayPaymentMonth] = useState(''); // For display
    const [showMonthInput, setShowMonthInput] = useState(false);
    const [isPostTransactionModalActive, setIsPostTransactionModalActive] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QrCode'>('QrCode');
    const [joinDate, setJoinDate] = useState('');
    const [classStudyDays, setClassStudyDays] = useState<number[]>([]);

    const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
    
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const studentsRef = collection(db, "students");
            const q = query(
                studentsRef,
                where("ay", "==", "2026"),
                orderBy("createdAt", "desc") // Sort by createdAt in descending order
            );
            const querySnapshot = await getDocs(q);
            const studentsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
                } as Student;
            });
            setStudents(studentsData);
        } catch (err) {
            console.error("Error fetching students: ", err);
            setError("Failed to fetch students. Please try again.");
            toast.error("Failed to fetch students.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    const fetchPaymentAmount = async (student: Student) => {
        if (!student || !student.class) return;
        setIsProcessing(true);
        try {
            // Extract the actual class ID from student.class
            const classIdMatch = student.class.match(/Class\s*(.*)/);
            const classId = classIdMatch ? classIdMatch[1] : student.class; // Use the part after "Class " or the original string if no match
    
            const classDocRef = doc(db, 'classes', classId); // Use the extracted classId
            const classDocSnap = await getDoc(classDocRef);

            if (classDocSnap.exists()) {
                const classData = classDocSnap.data();
                const fetchedClassType = classData.type;
                const studyDays = classData.studyDays || [1, 2, 3, 4, 5, 6]; // Get study days from class data or use default
                setClassType(fetchedClassType);
                setClassStudyDays(studyDays); // Store study days in state

                if (fetchedClassType) {
                    const classTypeDocRef = doc(db, 'classTypes', fetchedClassType);
                    const classTypeDocSnap = await getDoc(classTypeDocRef);
                    if (classTypeDocSnap.exists()) {
                        const classTypeData = classTypeDocSnap.data();
                        setPaymentAmount(classTypeData.price);
                        setSubjects(classTypeData.subject || []);
                    } else {
                        throw new Error(`Class type '${fetchedClassType}' not found.`);
                    }
                } else {
                    throw new Error(`Class '${classId}' has no type defined.`);
                }
            } else {
                throw new Error(`Class '${classId}' not found.`);
            }
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Error fetching payment amount.');
            setPaymentAmount(null);
        }
        setIsProcessing(false);
    };

    const filteredStudents = students.filter(student =>
        student.fullName && student.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Function to format payment month from YYYY-MM to readable text
    const formatPaymentMonth = (paymentMonth: string | null | undefined): string => {
        if (!paymentMonth) return '';
        
        try {
            const [year, month] = paymentMonth.split('-').map(Number);
            const date = new Date(year, month - 1); // month is 0-indexed
            return date.toLocaleString('default', { month: 'short' });
        } catch {
            return '';
        }
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setLastTransaction(null);
        setPaymentAmount(null);
        setClassType(null);
        setSubjects([]);
        
        if (student.lastPaymentMonth) {
            // For existing students, calculate next month from lastPaymentMonth
            const [year, month] = student.lastPaymentMonth.split("-").map(Number);
            let nextMonth = month + 1;
            let nextYear = year;
            if (nextMonth > 12) {
                nextMonth = 1;
                nextYear++;
            }
            const nextPaymentMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
            setPaymentMonth(nextPaymentMonth);
            const nextPaymentDate = new Date(nextYear, nextMonth - 1);
            setDisplayPaymentMonth(nextPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
            setShowMonthInput(false);
            // Set a current date as join date for existing students to enable the charge button
            setJoinDate(new Date().toISOString().split('T')[0]);
        } else {
            // For new students, allow setting join date and payment month
            setPaymentMonth('');
            setDisplayPaymentMonth('');
            setShowMonthInput(true);
            setJoinDate('');
        }

        fetchPaymentAmount(student);
    };

    const handleJoinDateSelect = (date: string) => {
        setJoinDate(date);
        if (date) {
            const joinDateTime = new Date(date);
            const year = joinDateTime.getFullYear();
            const month = String(joinDateTime.getMonth() + 1).padStart(2, '0');
            setPaymentMonth(`${year}-${month}`);
            setDisplayPaymentMonth(joinDateTime.toLocaleString('default', { month: 'long', year: 'numeric' }));
        }
    };

    const handleClear = () => {
        setSelectedStudent(null);
        setPaymentAmount(null);
        setSearchQuery("");
        setLastTransaction(null);
        setClassType(null);
        setSubjects([]);
        setPaymentMonth('');
        setDisplayPaymentMonth('');
        setShowMonthInput(false);
        setJoinDate('');
        setClassStudyDays([]);
    };
    const handleCharge = async () => {
        if (!selectedStudent || paymentAmount === null || !classType || !paymentMonth) {
            toast.error("Please select a student and ensure all payment details are loaded and month is set.");
            return;
        }
        
        if (!selectedPrinter || !selectedPrinter.online) {
            toast.error("Please select an online printer before charging.");
            return;
        }

        setIsProcessing(true);

        try {
            // --- Get the next receipt number from the cloud function ---
            const functions = getFunctions(undefined, 'asia-southeast1'); // Set region here
            const getNextReceiptNumber = httpsCallable(functions, 'getNextReceiptNumber');

            const result = await getNextReceiptNumber();
            const receiptNumber = (result.data as { receiptNumber: string }).receiptNumber;

            const calculatedAmount = calculateProratedAmount(paymentAmount || 0, new Date(joinDate), paymentMonth, classStudyDays);
            // Round to 4 decimal places
            const roundedAmount = Number(calculatedAmount.toFixed(4));
            const transactionData: any = {
                studentId: selectedStudent.id,
                studentName: selectedStudent.fullName,
                className: selectedStudent.class,
                classType: classType,
                subjects: subjects,
                fullAmount: Number(paymentAmount.toFixed(4)),
                amount: roundedAmount,
                receiptNumber: receiptNumber,
                paymentMonth: displayPaymentMonth, // Use the display month for receipt
                paymentMethod: paymentMethod,
                date: new Date().toISOString(),
                joinDate: joinDate, // Add join date for reference
                cashier: "Admin" // Replace with actual user later
            };

            const docRef = await addDoc(collection(db, "transactions"), transactionData);
            
            // Now, update the student's record with the new last payment month
            await updateDoc(doc(db, "students", selectedStudent.id), {
                lastPaymentMonth: paymentMonth 
            });

            // Update the local student state to reflect the change immediately
            setStudents(prevStudents =>
                prevStudents.map(student =>
                    student.id === selectedStudent.id
                        ? { ...student, lastPaymentMonth: paymentMonth }
                        : student
                )
            );

            const finalTransaction = { ...transactionData, transactionId: docRef.id };
            
            setLastTransaction(finalTransaction);
            toast.success(`Charged ${selectedStudent.fullName} $${roundedAmount.toFixed(2)} (from full price: $${paymentAmount.toFixed(2)})`);

            // Show post-transaction modal instead of printing automatically
            setIsPostTransactionModalActive(true);

        } catch (error) {
            console.error("Error processing transaction: ", error);
            toast.error("Failed to process transaction.");
        }
        setIsProcessing(false);
    };
    


    const handlePrintReceipt = async () => {
        if (!lastTransaction || !selectedPrinter || !selectedPrinter.printNodeId) {
            toast.error("No valid transaction or printer selected.");
            return;
        }

        if (isPrinting) return; // Prevent multiple clicks
        setIsPrinting(true);

        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    printerId: selectedPrinter.printNodeId,
                    title: `Receipt for ${lastTransaction.studentName}`,
                    transactionData: lastTransaction,
                    pageHeight: 540, // Height for printing
                    action: 'print'
                }),
            });

            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response from server`);
                }
            } else {
                // Handle non-JSON responses
                const textResponse = await response.text();
                if (response.status === 503) {
                    throw new Error(`PrintNode service unavailable. Please ensure the PrintNode client is running on your computer and try again.`);
                }
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) {
                let errorMessage = result?.details || result?.error || 'Print job failed';
                if (response.status === 503) {
                    errorMessage = `PrintNode service unavailable: ${errorMessage}`;
                }
                throw new Error(errorMessage);
            }
            
            toast.success("Receipt sent to printer.");
            closePostTransactionModal();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to print receipt.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownloadReceipt = async () => {
        if (!lastTransaction) {
            toast.error("No transaction data to download.");
            return;
        }

        if (isDownloading) return; // Prevent multiple clicks
        setIsDownloading(true);

        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionData: lastTransaction,
                    pageHeight: 350, // Height for downloading
                    action: 'generate'
                })
            });

            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response from server`);
                }
            } else {
                // Handle non-JSON responses
                const textResponse = await response.text();
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) throw new Error(result?.details || result?.error || 'Failed to generate PDF');
            if (!result.success || !result.pdfBase64) throw new Error('Failed to generate PDF.');

            const byteCharacters = atob(result.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt-${lastTransaction.receiptNumber}-${lastTransaction.studentName}-${lastTransaction.paymentMonth}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast.success("Receipt downloaded.");
            closePostTransactionModal();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to download receipt.");
        } finally {
            setIsDownloading(false);
        }
    };

    const closePostTransactionModal = () => {
        setIsPostTransactionModalActive(false);
        handleClear();
    };

    const handleReprintTransaction = async (transaction: Transaction) => {
        if (!selectedPrinter || !selectedPrinter.printNodeId) {
            toast.error("No printer selected.");
            return;
        }

        setReprintingTransactionId(transaction.transactionId);
        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    printerId: selectedPrinter.printNodeId,
                    title: `Reprint Receipt for ${transaction.studentName}`,
                    transactionData: transaction,
                    pageHeight: 540,
                    action: 'print'
                }),
            });

            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response from server`);
                }
            } else {
                // Handle non-JSON responses
                const textResponse = await response.text();
                if (response.status === 503) {
                    throw new Error(`PrintNode service unavailable. Please ensure the PrintNode client is running on your computer and try again.`);
                }
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) {
                let errorMessage = result?.details || result?.error || 'Reprint job failed';
                if (response.status === 503) {
                    errorMessage = `PrintNode service unavailable: ${errorMessage}`;
                }
                throw new Error(errorMessage);
            }
            
            toast.success("Receipt sent to printer for reprinting.");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to reprint receipt.");
        } finally {
            setReprintingTransactionId(undefined);
        }
    };

    const handleDownloadTransaction = async (transaction: Transaction) => {
        setDownloadingTransactionId(transaction.transactionId);
        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionData: transaction,
                    pageHeight: 350,
                    action: 'generate'
                })
            });
            
            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response from server`);
                }
            } else {
                // Handle non-JSON responses
                const textResponse = await response.text();
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) throw new Error(result?.details || result?.error || 'Failed to generate PDF');
            if (!result.success || !result.pdfBase64) throw new Error('Failed to generate PDF.');

            const byteCharacters = atob(result.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt-${transaction.receiptNumber}-${transaction.studentName}-${transaction.paymentMonth}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast.success("Receipt downloaded.");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to download receipt.");
        } finally {
            setDownloadingTransactionId(undefined);
        }
    };

    const fetchTransactionHistory = async (studentId: string) => {
        setLoadingTransactions(true);
        try {
            const transactionsRef = collection(db, "transactions");
            const q = query(transactionsRef, where("studentId", "==", studentId));
            const querySnapshot = await getDocs(q);
            const transactions = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                transactionId: doc.id
            } as Transaction));
            setStudentTransactions(transactions.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ));
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transaction history");
        }
        setLoadingTransactions(false);
    };

    const handleViewTransactions = (student: Student) => {
        setShowTransactionHistory(true);
        fetchTransactionHistory(student.id);
    };

    const decrementMonth = (dateStr: string) => {
        const [year, month] = dateStr.split("-").map(Number);
        if (month === 1) {
            return `${year - 1}-12`;
        }
        return `${year}-${String(month - 1).padStart(2, '0')}`;
    };

    const handleRemoveTransaction = async (transaction: Transaction) => {
        try {
            // Remove the transaction
            await deleteDoc(doc(db, "transactions", transaction.transactionId));

            // Update student's lastPaymentMonth
            const studentDoc = doc(db, "students", transaction.studentId);
            const studentSnap = await getDoc(studentDoc);
            if (studentSnap.exists()) {
                const currentLastPayment = studentSnap.data().lastPaymentMonth;
                // Only decrement if this is the most recent transaction
                if (currentLastPayment) {
                    await updateDoc(studentDoc, {
                        lastPaymentMonth: decrementMonth(currentLastPayment)
                    });
                }
            }

            // Refresh transaction list and student data
            fetchTransactionHistory(transaction.studentId);
            fetchStudents(); // Refresh student list to update lastPaymentMonth
            toast.success("Transaction removed successfully");
        } catch (error) {
            console.error("Error removing transaction:", error);
            toast.error("Failed to remove transaction");
        }
    };

    return (
        <SectionMain>
            <SectionTitleLineWithButton icon={mdiCashRegister} title="POS - Monthly Payments" main>
                <PrinterManager
                    selectedPrinter={selectedPrinter}
                    onPrinterSelect={setSelectedPrinter}
                />
            </SectionTitleLineWithButton>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col space-y-2 self-start">
                    <CardBox className="mb-0">
                        <FormField>
                            {() => (
                                <div className="relative">
                                    <input
                                        type="search"
                                        placeholder="Search Students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                                    />
                                    <Icon path={mdiMagnify} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            )}
                        </FormField>
                    </CardBox>
                    <CardBox className="mt-2">
                        {loading ? <LoadingSpinner /> :
                            <div className="relative">
                                <div className="space-y-2 h-[calc(100vh-220px)] overflow-y-auto px-2 py-2 mb-4">
                                    {filteredStudents.map(student => (
                                        <div key={student.id}
                                             className={`p-3 border-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between min-w-0
                                             ${selectedStudent?.id === student.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-lg transform scale-105'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                             }`}
                                             onClick={() => handleSelectStudent(student)}>
                                            <div className="flex-grow min-w-0 mr-2">
                                                <p className="font-semibold truncate">{student.fullName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-sm text-gray-500 truncate">{student.class}</p>
                                                    {student.lastPaymentMonth && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            {formatPaymentMonth(student.lastPaymentMonth)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center flex-shrink-0">
                                                {selectedStudent?.id === student.id && <Icon path={mdiCheckCircle} className="text-blue-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Fading gradient overlay at the bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-900/70 to-transparent pointer-events-none z-10" />
                            </div>
                        }
                    </CardBox>
                </div>
                
                <div className="lg:col-span-2">
                    {selectedStudent && (
                        <div className="mb-4 flex justify-end">
                            <Button
                                color="info"
                                label="View Transaction History"
                                onClick={() => handleViewTransactions(selectedStudent)}
                                icon={mdiHistory}
                            />
                        </div>
                    )}
                    <TransactionManager
                        selectedStudent={selectedStudent}
                        classType={classType}
                        paymentAmount={paymentAmount}
                        subjects={subjects}
                        paymentMonth={paymentMonth}
                        displayPaymentMonth={displayPaymentMonth}
                        showMonthInput={showMonthInput}
                        isProcessing={isProcessing}
                        paymentMethod={paymentMethod}
                        onPaymentMethodChange={setPaymentMethod}
                        joinDate={joinDate}
                        onJoinDateSelect={handleJoinDateSelect}
                        fullAmount={paymentAmount || 0}
                        classStudyDays={classStudyDays}
                        isNewStudent={!selectedStudent?.lastPaymentMonth}
                    />

                    {/* Action Buttons Section */}
                    {selectedStudent ? (
                        <CardBox>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        Complete Transaction
                                    </h3>
                                    {isProcessing && (
                                        <div className="flex items-center text-blue-600">
                                            <LoadingSpinner />
                                            <span className="ml-2 text-sm">Processing...</span>
                                        </div>
                                    )}
                                </div>
                                
                                {paymentAmount === null ? (
                                    <NotificationBar color="danger" icon={mdiAlertCircle}>
                                        Could not determine payment amount. Please check student's class configuration.
                                    </NotificationBar>
                                ) : (
                                    <div className="flex items-center space-x-3">
                                        <Button 
                                            label="Clear" 
                                            color="white" 
                                            onClick={handleClear} 
                                            icon={mdiClose}
                                            className="min-w-0"
                                        />
                                        <Button 
                                            label={isProcessing ? "Processing..." : `Charge $${selectedStudent?.lastPaymentMonth ? (paymentAmount || 0).toFixed(2) : calculateProratedAmount(paymentAmount || 0, new Date(joinDate), paymentMonth, classStudyDays).toFixed(2)}`} 
                                            color="success" 
                                            onClick={handleCharge} 
                                            disabled={isProcessing || paymentAmount === null || !selectedPrinter?.online || !paymentMonth || !joinDate} 
                                            className="flex-grow"
                                            icon={mdiCashRegister}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardBox>
                    ) : (
                        <CardBox>
                            <div className="text-center py-12">
                                <Icon path={mdiAccount} className="mx-auto text-gray-300 dark:text-gray-600" size={3}/>
                                <p className="mt-4 text-gray-500 text-lg">Select a student to begin a transaction</p>
                                <p className="text-sm text-gray-400 mt-2">Search for a student above to get started</p>
                            </div>
                        </CardBox>
                    )}
                </div>
            </div>
            {isPostTransactionModalActive && (
                <CardBoxModal
                    title="Transaction Complete"
                    isActive={true}
                    onConfirm={closePostTransactionModal}
                    onCancel={closePostTransactionModal}
                    buttonLabel="Done"
                >
                    <div className="space-y-4">
                        <p>What would you like to do next?</p>
                        <div className="flex justify-around space-x-2">
                            <Button 
                                label={isPrinting ? "Printing..." : "Print"} 
                                color="info" 
                                onClick={handlePrintReceipt}
                                disabled={isPrinting || isDownloading}
                            />
                            <Button 
                                label={isDownloading ? "Downloading..." : "Download"} 
                                color="success" 
                                onClick={handleDownloadReceipt} 
                                icon={mdiDownload}
                                disabled={isPrinting || isDownloading}
                            />
                            <Button 
                                label="Cancel" 
                                color="outline" 
                                onClick={closePostTransactionModal}
                                icon={mdiClose}
                                disabled={isPrinting || isDownloading}
                            />
                        </div>
                    </div>
                </CardBoxModal>
            )}

            <TransactionHistory
                isOpen={showTransactionHistory}
                onClose={() => setShowTransactionHistory(false)}
                transactions={studentTransactions}
                isLoading={loadingTransactions}
                onRemoveTransaction={handleRemoveTransaction}
                onDownloadReceipt={handleDownloadTransaction}
                onReprintReceipt={handleReprintTransaction}
                downloadingTransactionId={downloadingTransactionId}
                reprintingTransactionId={reprintingTransactionId}
            />
        </SectionMain>
    );
};

export default POSStudentPage;

