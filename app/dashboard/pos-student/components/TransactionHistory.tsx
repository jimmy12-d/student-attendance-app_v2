import React, { useState } from 'react';
import Button from '../../../_components/Button';
import LoadingSpinner from '../../../_components/LoadingSpinner';
import CardBoxModal from '../../../_components/CardBox/Modal';
import Icon from '../../../_components/Icon';
import { Transaction } from '../types';
import { mdiDownload, mdiPrinter, mdiDelete, mdiCalendarMonth, mdiCash, mdiAlertCircle } from '@mdi/js';

interface TransactionHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    isLoading: boolean;
    onRemoveTransaction: (transaction: Transaction) => void;
    onDownloadReceipt?: (transaction: Transaction) => void;
    onReprintReceipt?: (transaction: Transaction) => void;
    downloadingTransactionId?: string;
    reprintingTransactionId?: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    isOpen,
    onClose,
    transactions,
    isLoading,
    onRemoveTransaction,
    onDownloadReceipt,
    onReprintReceipt,
    downloadingTransactionId,
    reprintingTransactionId
}) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [transactionToRemove, setTransactionToRemove] = useState<Transaction | null>(null);

    const handleRemoveClick = (transaction: Transaction) => {
        setTransactionToRemove(transaction);
        setShowConfirmModal(true);
    };

    const handleConfirmRemove = () => {
        if (transactionToRemove) {
            onRemoveTransaction(transactionToRemove);
            setShowConfirmModal(false);
            setTransactionToRemove(null);
        }
    };

    const handleCancelRemove = () => {
        setShowConfirmModal(false);
        setTransactionToRemove(null);
    };
    return (
        <>
            {isOpen && (
                <CardBoxModal
                    title="Transaction History"
                    isActive={true}
                    onConfirm={onClose}
                    onCancel={onClose}
                    buttonLabel="Close"
                >
                    <div className="pr-4 pb-4">
                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <LoadingSpinner />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No payment history found for this student.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="max-h-[500px] overflow-y-auto space-y-3">
                                {transactions.map((transaction) => (
                                    <div key={transaction.transactionId} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                                                        <Icon path={mdiCash} size={0.8} className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-gray-100">Receipt #{transaction.receiptNumber}</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <Icon path={mdiCalendarMonth} size={0.7} className="text-green-600 dark:text-green-400" />
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Month</span>
                                                </div>
                                                <p className="text-lg font-bold text-green-700 dark:text-green-300">{transaction.paymentMonth}</p>
                                            </div>
                                            
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <Icon path={mdiCash} size={0.7} className="text-blue-600 dark:text-blue-400" />
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount Paid</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                        ${typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : '0.00'}
                                                    </p>
                                                    {transaction.fullAmount !== transaction.amount && (
                                                        <p className="text-xs text-gray-500">
                                                            Full: ${typeof transaction.fullAmount === 'number' ? transaction.fullAmount.toFixed(2) : '0.00'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <div className="flex space-x-2">
                                                {onDownloadReceipt && (
                                                    <Button
                                                        color="info"
                                                        label={downloadingTransactionId === transaction.transactionId ? "Downloading..." : "Download"}
                                                        onClick={() => onDownloadReceipt(transaction)}
                                                        icon={mdiDownload}
                                                        small
                                                        className="text-xs"
                                                        disabled={downloadingTransactionId === transaction.transactionId}
                                                    />
                                                )}
                                                {onReprintReceipt && (
                                                    <Button
                                                        color="success"
                                                        label={reprintingTransactionId === transaction.transactionId ? "Reprinting..." : "Reprint"}
                                                        onClick={() => onReprintReceipt(transaction)}
                                                        icon={mdiPrinter}
                                                        small
                                                        className="text-xs"
                                                        disabled={reprintingTransactionId === transaction.transactionId}
                                                    />
                                                )}
                                            </div>
                                            <Button
                                                color="danger"
                                                label="Remove"
                                                onClick={() => handleRemoveClick(transaction)}
                                                icon={mdiDelete}
                                                small
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                </CardBoxModal>
            )}

            {/* Confirmation Modal */}
            <CardBoxModal
                title="Confirm Transaction Removal"
                isActive={showConfirmModal}
                onConfirm={handleConfirmRemove}
                onCancel={handleCancelRemove}
                buttonLabel="Remove"
                buttonColor="danger"
            >
                <div className="flex items-start space-x-3 p-2">
                    <div className="flex-shrink-0">
                        <Icon 
                            path={mdiAlertCircle} 
                            size={1.5} 
                            className="text-red-500" 
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Are you sure you want to remove this transaction?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            This will also update the student's last payment month. This action cannot be undone.
                        </p>
                        {transactionToRemove && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                                <div className="text-sm">
                                    <p><strong>Receipt:</strong> #{transactionToRemove.receiptNumber}</p>
                                    <p><strong>Payment Month:</strong> {transactionToRemove.paymentMonth}</p>
                                    <p><strong>Amount:</strong> ${typeof transactionToRemove.amount === 'number' ? transactionToRemove.amount.toFixed(2) : '0.00'}</p>
                                    <p><strong>Date:</strong> {new Date(transactionToRemove.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardBoxModal>
        </>
    );
};
