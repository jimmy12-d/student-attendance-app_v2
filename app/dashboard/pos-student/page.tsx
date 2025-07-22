
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from 'sonner';
import {
  mdiMagnify,
  mdiCashRegister,
  mdiAccount,
  mdiClose,
  mdiReceipt,
  mdiPrinter,
  mdiChevronDown,
  mdiReload,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiInformation,
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
import { collection, getDocs, Timestamp, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

// Interface
import { Student } from "../../_interfaces";

interface Transaction {
    studentId: string;
    studentName: string;
    className: string;
    subjects: string[];
    amount: number;
    receiptNumber: string;
    paymentMonth: string;
    paymentMethod: 'Cash' | 'Credit';
    transactionId?: string;
    date: string;
    cashier?: string;
}

interface Printer {
    id: string;
    name: string;
    displayName?: string;
    location?: string;
    type: 'printnode' | 'standard';
    printNodeId?: number;
    description?: string;
    online?: boolean;
}

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


    // Printer management state
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
    const [isPrinterDropdownOpen, setIsPrinterDropdownOpen] = useState(false);
    const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
    
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "students"));
            const studentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
            })) as Student[];
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
                setClassType(fetchedClassType);

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
    
    // Printer related functions from approvals page
    const loadPrintersFromPrintNode = useCallback(async () => {
        try {
            setIsLoadingPrinters(true);
            const response = await fetch('/api/printnode?action=printers');
            const data = await response.json();
            
            if (data.success) {
                const printNodePrinters: Printer[] = data.printers.map((printer: any) => ({
                    id: `printnode-${printer.id}`,
                    name: printer.name,
                    displayName: printer.name,
                    location: printer.computer?.name || 'Unknown location',
                    type: 'printnode' as const,
                    printNodeId: printer.id,
                    description: printer.description,
                    online: printer.computer?.state === 'connected'
                }));
                
                setPrinters(printNodePrinters);
                
                const targetPrinter = printNodePrinters.find(p => p.name.includes('BP003'));
                if (targetPrinter) {
                    setSelectedPrinter(targetPrinter);
                    toast.info(`Printer BP003 auto-selected.`);
                }
            } else {
                toast.error('Failed to load printers from PrintNode');
            }
        } catch (error) {
            toast.error('Could not connect to PrintNode service');
        } finally {
            setIsLoadingPrinters(false);
        }
    }, []);

    useEffect(() => {
        loadPrintersFromPrintNode();
    }, [loadPrintersFromPrintNode]);

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
                <div className="relative w-72 printer-dropdown">
                    <button
                        onClick={() => setIsPrinterDropdownOpen(!isPrinterDropdownOpen)}
                        className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        disabled={isLoadingPrinters}
                    >
                        <div className="flex items-center">
                        <Icon path={mdiPrinter} size={18} className={`mr-2 ${selectedPrinter?.online ? 'text-green-500' : 'text-red-500'}`} />
                        <div className="text-left">
                            {isLoadingPrinters ? (
                                <span className="text-gray-500">Loading printers...</span>
                            ) : selectedPrinter ? (
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedPrinter.displayName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedPrinter.location}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-gray-500">Select Printer</span>
                            )}
                        </div>
                        </div>
                        <Icon path={mdiChevronDown} size={16} className={`text-gray-400 transition-transform duration-200 ${isPrinterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isPrinterDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 py-2">
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Printers</span>
                                <button onClick={loadPrintersFromPrintNode} className="text-blue-600 hover:text-blue-700">
                                    <Icon path={mdiReload} size={14} />
                                </button>
                            </div>
                        </div>
                        {printers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No printers found</div>
                        ) : (
                            printers.map((printer) => (
                            <button
                                key={printer.id}
                                onClick={() => { setSelectedPrinter(printer); setIsPrinterDropdownOpen(false); }}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedPrinter?.id === printer.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{printer.displayName}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{printer.location}</div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${printer.online ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                            </button>
                            ))
                        )}
                        </div>
                    )}
                </div>
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
                                         className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between
                                         ${selectedStudent?.id === student.id ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
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
                    {/* Transaction Details */}
                    <CardBox className="mb-6">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                                    <Icon path={mdiReceipt} size={1} className="mr-2 text-blue-500" />
                                    Transaction Details
                                </h3>
                                {selectedStudent && (
                                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Ready to Process
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Student Information Card */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                                        <Icon path={mdiAccount} size={0.8} className="mr-2" />
                                        Student Information
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {selectedStudent ? selectedStudent.fullName : 'No student selected'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Class:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {selectedStudent ? selectedStudent.class : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Grade:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {classType || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Information Card */}
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center">
                                        <Icon path={mdiCashRegister} size={0.8} className="mr-2" />
                                        Payment Information
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                                            <span className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                                                {paymentAmount !== null ? `$${paymentAmount}` : '$0'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Payment For:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {displayPaymentMonth || 'Not set'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Method:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                paymentMethod === 'Cash' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                            }`}>
                                                {paymentMethod}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subjects Section */}
                            {subjects.length > 0 && (
                                <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-3 flex items-center">
                                        <Icon path={mdiInformation} size={0.8} className="mr-2" />
                                        Subjects Included
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map((subject, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 transition-all duration-200 hover:scale-105"
                                            >
                                                {subject}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Month Input Section */}
                            {showMonthInput && (
                                <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
                                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">
                                        Set First Payment Month
                                    </h4>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="month"
                                            value={paymentMonth}
                                            onChange={(e) => {
                                                setPaymentMonth(e.target.value);
                                                const [year, month] = e.target.value.split('-');
                                                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                                    'July', 'August', 'September', 'October', 'November', 'December'];
                                                setDisplayPaymentMonth(`${monthNames[parseInt(month) - 1]} ${year}`);
                                            }}
                                            className="flex-1 px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-800"
                                        />
                                        <Button
                                            label="Confirm"
                                            color="success"
                                            onClick={() => setShowMonthInput(false)}
                                            disabled={!paymentMonth}
                                            className="whitespace-nowrap"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Payment Method Selection */}
                            <div className="mt-6">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                    Payment Method
                                </label>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setPaymentMethod('Cash')}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                                            paymentMethod === 'Cash'
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-lg transform scale-105'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-2xl mb-2">💵</div>
                                            <div className="font-medium">Cash</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('Credit')}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                                            paymentMethod === 'Credit'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-lg transform scale-105'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-2xl mb-2">💳</div>
                                            <div className="font-medium">Credit</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CardBox>

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
                        <Button label="Print" color="info" onClick={handlePrintReceipt} icon={mdiPrinter} />
                        <Button label="Download" color="success" onClick={handleDownloadReceipt} icon={mdiDownload} />
                    </div>
                </div>
            </CardBoxModal>
        </SectionMain>
    );
};

export default POSStudentPage;

