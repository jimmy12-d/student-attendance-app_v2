
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
import { collection, getDocs, Timestamp, addDoc, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';

// Components
import { PrinterManager } from "./components/PrinterManager";
import { TransactionManager } from "./components/TransactionManager";

// Types
import { Student, Transaction, Printer } from "./types";

const POSStudentPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
    const [classType, setClassType] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMonth, setPaymentMonth] = useState(''); // For storing YYYY-MM
    const [displayPaymentMonth, setDisplayPaymentMonth] = useState(''); // For display
    const [showMonthInput, setShowMonthInput] = useState(false);
    const [isPostTransactionModalActive, setIsPostTransactionModalActive] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit'>('Cash');
    const [joinDate, setJoinDate] = useState('');
    const [classStudyDays, setClassStudyDays] = useState<number[]>([]);

    const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
    
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const studentsRef = collection(db, "students");
            const q = query(studentsRef, where("ay", "==", "2026"));
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
                    console.log("Fetched class type:", fetchedClassType, "with study days:", studyDays);
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

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setLastTransaction(null);
        setPaymentAmount(null);
        setClassType(null);
        setSubjects([]);
        setPaymentMonth('');
        setDisplayPaymentMonth('');
        setShowMonthInput(false);

        if (student.lastPaymentMonth) {
            const [year, month] = student.lastPaymentMonth.split('-').map(Number);
            const lastPaymentDate = new Date(year, month - 1);
            lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 1);
            const nextYear = lastPaymentDate.getFullYear();
            const nextMonth = lastPaymentDate.getMonth() + 1;
            setPaymentMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
            setDisplayPaymentMonth(lastPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
        } else {
            setShowMonthInput(true);
        }

        fetchPaymentAmount(student);
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

            const transactionData: Omit<Transaction, 'transactionId'> = {
                studentId: selectedStudent.id,
                studentName: selectedStudent.fullName,
                className: selectedStudent.class,
                subjects: subjects,
                amount: paymentAmount,
                receiptNumber: receiptNumber,
                paymentMonth: displayPaymentMonth, // Use the display month for receipt
                paymentMethod: paymentMethod,
                date: new Date().toISOString(),
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
            toast.success(`Charged ${selectedStudent.fullName} $${paymentAmount}`);

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

            const result = await response.json();
            if (!response.ok) throw new Error(result.details || 'Print job failed');
            
            toast.success("Receipt sent to printer.");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to print receipt.");
        } finally {
            closePostTransactionModal();
        }
    };

    const handleDownloadReceipt = async () => {
        if (!lastTransaction) {
            toast.error("No transaction data to download.");
            return;
        }

        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionData: lastTransaction,
                    pageHeight: 320, // Height for downloading
                    action: 'generate'
                })
            });
            const result = await response.json();
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
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to download receipt.");
        } finally {
            closePostTransactionModal();
        }
    };

    const closePostTransactionModal = () => {
        setIsPostTransactionModalActive(false);
        handleClear();
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
                <div className="lg:col-span-1 flex flex-col space-y-4">
                    <CardBox>
                        <FormField>
                            {() => (
                                <div className="relative">
                                    <input
                                        type="search"
                                        placeholder="Search Students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    />
                                    <Icon path={mdiMagnify} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            )}
                        </FormField>
                    </CardBox>
                    <CardBox className="flex-grow">
                        {loading ? <LoadingSpinner /> :
                            <div className="space-y-2">
                                {filteredStudents.map(student => (
                                    <div key={student.id}
                                         className={`p-3 border-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between
                                         ${selectedStudent?.id === student.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-lg transform scale-105'
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                         }`}
                                         onClick={() => handleSelectStudent(student)}>
                                        <div>
                                            <p className="font-semibold">{student.fullName}</p>
                                            <p className="text-sm text-gray-500">{student.class}</p>
                                        </div>
                                        {selectedStudent?.id === student.id && <Icon path={mdiCheckCircle} className="text-blue-500" />}
                                    </div>
                                ))}
                            </div>
                        }
                    </CardBox>
                </div>
                
                <div className="lg:col-span-2">
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
                        onMonthSelect={(month) => {
                            const [year, monthNum] = month.split('-');
                            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
                            setPaymentMonth(month);
                            setDisplayPaymentMonth(`${monthNames[parseInt(monthNum) - 1]} ${year}`);
                        }}
                        onConfirmMonth={() => setShowMonthInput(false)}
                        joinDate={joinDate}
                        onJoinDateSelect={setJoinDate}
                        fullAmount={paymentAmount || 0}
                        classStudyDays={classStudyDays} // Using the actual study days from the class document
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
                                            label={isProcessing ? "Processing..." : `Charge $${paymentAmount}`} 
                                            color="success" 
                                            onClick={handleCharge} 
                                            disabled={isProcessing || paymentAmount === null || !selectedPrinter?.online || !paymentMonth} 
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
            <CardBoxModal
                title="Transaction Complete"
                isActive={isPostTransactionModalActive}
                onConfirm={closePostTransactionModal}
                onCancel={closePostTransactionModal}
                buttonLabel="Done"
            >
                <div className="space-y-4">
                    <p>What would you like to do next?</p>
                    <div className="flex justify-around">
                        <Button label="Print" color="info" onClick={handlePrintReceipt} />
                        <Button label="Download" color="success" onClick={handleDownloadReceipt} icon={mdiDownload} />
                    </div>
                </div>
            </CardBoxModal>
        </SectionMain>
    );
};

export default POSStudentPage;

