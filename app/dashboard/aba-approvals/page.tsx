'use client'

import { useState, useEffect } from 'react'
import {
  mdiCashCheck,
  mdiRefresh,
  mdiMagnify,
  mdiAccountPlus,
  mdiAlertCircle,
  mdiCheckCircle,
} from '@mdi/js'
import Icon from '@/app/_components/Icon'
import CardBox from '@/app/_components/CardBox'
import SectionMain from '@/app/_components/Section/Main'
import SectionTitleLineWithButton from '@/app/_components/Section/TitleLineWithButton'
import Button from '@/app/_components/Button'
import { Student } from '@/app/_interfaces'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase-config'
import CardBoxModal from '@/app/_components/CardBox/Modal'
import FormField from '@/app/_components/FormField'
import LoadingSpinner from '@/app/_components/LoadingSpinner'
import { toast } from 'sonner'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Timestamp, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore'

interface AbaTransaction {
  transaction_id: string;
  transaction_date: string;
  apv: string;
  payment_status: string;
  payment_status_code: number;
  payment_type: string;
  original_amount: number;
  original_currency: string;
  total_amount: number;
  discount_amount: number;
  refund_amount: number;
  payment_amount: number;
  payment_currency: string;
  payer_name: string;
}

const AbaApprovalsPage = () => {
  const [transactions, setTransactions] = useState<AbaTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalActive, setIsModalActive] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<AbaTransaction | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedTransactionIds, setProcessedTransactionIds] = useState<string[]>([])

  useEffect(() => {
    const fetchProcessedTransactions = async () => {
      const querySnapshot = await getDocs(collection(db, "processedAbaTransactions"));
      const ids = querySnapshot.docs.map(doc => doc.id);
      setProcessedTransactionIds(ids);
    };
    fetchProcessedTransactions();
  }, [transactions]); // Re-fetch when transactions are updated

  // Fetch all students once
  useEffect(() => {
    const fetchStudents = async () => {
      const querySnapshot = await getDocs(collection(db, 'students'))
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]
      setStudents(studentsData)
      setFilteredStudents(studentsData)
    }
    fetchStudents()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase()
      setFilteredStudents(
        students.filter(student =>
          student.fullName.toLowerCase().includes(lowercasedTerm) ||
          student.studentId.includes(lowercasedTerm)
        )
      )
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const handleMatchStudent = (transaction: AbaTransaction) => {
    setSelectedTransaction(transaction)
    setIsModalActive(true)
  }

  const handleApprove = async (student: Student) => {
    if (!selectedTransaction) return;

    const studentIdentifier = student.studentId || student.id;

    if (!studentIdentifier) {
        toast.error("Invalid student data: No unique ID found. Cannot approve transaction.");
        console.error("Error: studentIdentifier is undefined.", student);
        return;
    }

    setIsProcessing(true);

    try {
      const functions = getFunctions(undefined, 'asia-southeast1');
      const getNextReceiptNumber = httpsCallable(functions, 'getNextReceiptNumber');
      const result = await getNextReceiptNumber();
      const receiptNumber = (result.data as { receiptNumber: string }).receiptNumber;

      let paymentMonth: string;
      let displayPaymentMonth: string;

      if (student.lastPaymentMonth) {
        const [year, month] = student.lastPaymentMonth.split('-').map(Number);
        const lastPaymentDate = new Date(Date.UTC(year, month - 1));
        lastPaymentDate.setUTCMonth(lastPaymentDate.getUTCMonth() + 1);
        
        const nextYear = lastPaymentDate.getUTCFullYear();
        const nextMonth = lastPaymentDate.getUTCMonth() + 1;

        paymentMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        displayPaymentMonth = new Date(Date.UTC(nextYear, nextMonth - 1)).toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      } else {
        const today = new Date();
        paymentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        displayPaymentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
      }

      const transactionData = {
        studentId: studentIdentifier,
        studentName: student.fullName,
        className: student.class,
        subjects: [],
        amount: selectedTransaction.total_amount,
        receiptNumber: receiptNumber,
        paymentMonth: displayPaymentMonth,
        paymentMethod: 'Credit',
        date: new Date().toISOString(),
        cashier: "ABA Auto-Approval"
      };

      await addDoc(collection(db, 'transactions'), transactionData);
      
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, { lastPaymentMonth: paymentMonth });
      
      await setDoc(doc(db, "processedAbaTransactions", selectedTransaction.transaction_id), {
        studentId: studentIdentifier,
        studentName: student.fullName,
        approvedAt: Timestamp.now(),
        amount: selectedTransaction.total_amount
      });

      toast.success(`Transaction ${selectedTransaction.transaction_id} approved for ${student.fullName}`);
      
      fetchTransactions();

    } catch (error) {
      console.error("Approval Error:", error);
      toast.error("Failed to approve transaction.");
    } finally {
      setIsProcessing(false);
      setIsModalActive(false);
      setSearchTerm('');
    }
  }

  const isTransactionProcessed = (tranId: string): boolean => {
    return processedTransactionIds.includes(tranId);
  }

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      // Calculate the last 3 days automatically since ABA only allows this range
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      };

      const fromDate = formatDate(threeDaysAgo);
      const toDate = formatDate(today);

      const response = await fetch(`/api/aba`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fromDate, toDate }),
      });
      const data = await response.json()
      console.log(data);
      if (!response.ok) {
        toast.error(data.error || 'Failed to fetch transactions.')
        setTransactions([])
        return
      }

      if (data && Array.isArray(data.data)) {
        setTransactions(data.data)
      } else {
        toast.info(data.description || "No transactions found for the last 3 days.")
        setTransactions([])
      }
    } catch (error) {
      console.error('Error fetching ABA transactions:', error)
      toast.error('An error occurred while fetching transactions.')
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiCashCheck} title="ABA PayWay Approvals (Last 3 Days)" main>
        <Button
          label="Refresh Transactions"
          color="info"
          onClick={fetchTransactions}
          icon={mdiRefresh}
          disabled={isLoading}
        />
      </SectionTitleLineWithButton>

      <CardBox className="mb-6" hasTable>
        <table>
          <thead>
            <tr>
              <th className="dark:text-white">Transaction ID</th>
              <th className="dark:text-white">Date</th>
              <th className="dark:text-white">Payer Name</th>
              <th className="dark:text-white">Payment Type</th>
              <th className="dark:text-white">Amount</th>
              <th className="dark:text-white">Status</th>
              <th className="dark:text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.transaction_id}>
                  <td data-label="Transaction ID" className="dark:text-white">{transaction.transaction_id}</td>
                  <td data-label="Date" className="dark:text-white">{new Date(transaction.transaction_date).toLocaleString()}</td>
                  <td data-label="Payer Name" className="dark:text-white">{transaction.payer_name || 'N/A'}</td>
                  <td data-label="Payment Type" className="dark:text-white">{transaction.payment_type}</td>
                  <td data-label="Amount" className="font-bold text-green-600 dark:text-green-400">
                    ${transaction.total_amount} {transaction.original_currency}
                  </td>
                  <td data-label="Status">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.payment_status === 'APPROVED' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : transaction.payment_status === 'PENDING' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {transaction.payment_status}
                    </span>
                  </td>
                  <td data-label="Action">
                    <Button
                      label={isTransactionProcessed(transaction.transaction_id) ? "Processed" : "Match Student"}
                      color={isTransactionProcessed(transaction.transaction_id) ? "white" : "success"}
                      icon={isTransactionProcessed(transaction.transaction_id) ? mdiCheckCircle : mdiAccountPlus}
                      small
                      onClick={() => handleMatchStudent(transaction)}
                      disabled={isTransactionProcessed(transaction.transaction_id) || transaction.payment_status !== 'APPROVED'}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center">
                  No transactions found for the last 3 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardBox>
      <CardBoxModal
        title={`Match Student for Transaction ${selectedTransaction?.transaction_id}`}
        isActive={isModalActive}
        onConfirm={undefined} // No confirm button at the bottom
        onCancel={() => { setIsModalActive(false); setSearchTerm('')}}
      >
        <div className="space-y-4">
          <div className="dark:text-white">
            <p><strong>Payment Type:</strong> {selectedTransaction?.payment_type}</p>
            <p><strong>Amount:</strong> <span className="text-green-600 dark:text-green-400">${selectedTransaction?.total_amount}</span> {selectedTransaction?.original_currency}</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700"
            />
            <Icon path={mdiMagnify} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            {filteredStudents.length > 0 ? (
              <ul>
                {filteredStudents.map(student => (
                  <li key={student.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => handleApprove(student)}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                      disabled={isProcessing}
                    >
                      <div>
                        <p className="font-semibold dark:text-white">{student.fullName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.studentId} - {student.class}</p>
                      </div>
                      {isProcessing ? <LoadingSpinner /> : <Icon path={mdiCheckCircle} className="text-green-500" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center text-gray-500 dark:text-gray-400">No students found.</p>
            )}
          </div>
        </div>
      </CardBoxModal>
    </SectionMain>
  )
}

export default AbaApprovalsPage
