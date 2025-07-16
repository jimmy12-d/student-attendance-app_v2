
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  mdiMagnify,
} from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import FormField from "../../_components/FormField";

// Firebase
import { db } from "../../../firebase-config";
import { collection, getDocs, Timestamp, addDoc } from "firebase/firestore";

// Interface
import { Student } from "../../_interfaces";

const predefinedItems = [
    { name: "Book", amount: 25.00 },
    { name: "Uniform", amount: 50.00 },
    { name: "Exam Fee", amount: 75.00 },
    { name: "Others", amount: 0.00 },
];

interface Transaction {
    studentId: string;
    studentName: string;
    amount: number;
    date: string;
}

const POSStudentPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [amount, setAmount] = useState("");
    const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

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
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    const filteredStudents = students.filter(student =>
        student.fullName && student.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setAmount("");
    };

    const handleKeypadClick = (value: string) => {
        if (value === "C") {
            setAmount("");
        } else if (value === "backspace") {
            setAmount(amount.slice(0, -1));
        }
        else {
            setAmount(amount + value);
        }
    };

    const handleItemClick = (itemAmount: number) => {
        if (itemAmount === 0) {
            setAmount("");
        } else {
            setAmount(itemAmount.toString());
        }
    };

    const handleCharge = () => {
        if (!selectedStudent || !amount) {
            alert("Please select a student and enter an amount.");
            return;
        }
        // Temporarily bypass Firebase to test printing
        const transactionData = {
            studentId: selectedStudent.id,
            studentName: selectedStudent.fullName,
            amount: parseFloat(amount),
            date: new Date().toISOString(),
        };
        // try {
        //     await addDoc(collection(db, "transactions"), transactionData);
        alert(`Charged ${selectedStudent.fullName} $${amount}`);
        setLastTransaction(transactionData);
        setSelectedStudent(null);
        setAmount("");
        // } catch (error) {
        //     console.error("Error adding document: ", error);
        //     alert("Failed to save transaction.");
        // }
    };

    const handlePrintReceipt = () => {
        const printContents = document.getElementById("receipt")!.innerHTML;
        const originalContents = document.body.innerHTML;
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        setLastTransaction(null);
    };


  return (
    <SectionMain>
        <SectionTitleLineWithButton
            icon={mdiMagnify}
            title="POS Student"
            main
        >
        </SectionTitleLineWithButton>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <FormField>
                    {() => (
                        <div className="relative">
                            <input
                                type="search"
                                placeholder="Search Students..."
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                    )}
                </FormField>
                <div className="mt-4 space-y-2">
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        filteredStudents.map(student => (
                            <div key={student.id} className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => handleSelectStudent(student)}>
                                <p className="font-semibold">{student.fullName}</p>
                                <p className="text-sm text-gray-500">{student.class}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="lg:col-span-2">
                {selectedStudent ? (
                    <div className="p-4 border rounded-lg">
                        <h2 className="text-lg font-semibold">Transaction for {selectedStudent.fullName}</h2>
                        <div className="mt-4">
                            <input
                                type="text"
                                value={amount}
                                readOnly
                                className="w-full px-4 py-2 border rounded-lg text-right text-2xl"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'backspace'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleKeypadClick(key)}
                                    className="p-4 border rounded-lg hover:bg-gray-100"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {predefinedItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleItemClick(item.amount)}
                                    className="p-4 border rounded-lg hover:bg-gray-100"
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={handleCharge}
                                className="w-full p-4 border rounded-lg bg-green-500 text-white hover:bg-green-600"
                            >
                                Charge
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border rounded-lg">
                        <h2 className="text-lg font-semibold">Transaction Details</h2>
                        <p>Select a student to begin a transaction.</p>
                    </div>
                )}
                {lastTransaction && (
                    <div id="receipt" className="hidden">
                        <h2>Receipt</h2>
                        <p>Student: {lastTransaction.studentName}</p>
                        <p>Amount: ${lastTransaction.amount.toFixed(2)}</p>
                        <p>Date: {new Date(lastTransaction.date).toLocaleString()}</p>
                    </div>
                )}
                {lastTransaction && (
                    <div className="mt-4">
                        <button
                            onClick={handlePrintReceipt}
                            className="w-full p-4 border rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                        >
                            Print Receipt
                        </button>
                    </div>
                )}
            </div>
        </div>
    </SectionMain>
  );
};

export default POSStudentPage;

