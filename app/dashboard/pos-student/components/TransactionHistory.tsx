import React, { useState } from 'react';
import Button from '../../../_components/Button';
import LoadingSpinner from '../../../_components/LoadingSpinner';
import CardBoxModal from '../../../_components/CardBox/Modal';
import Icon from '../../../_components/Icon';
import { Transaction } from '../types';
import { mdiDownload, mdiPrinter, mdiDelete, mdiCalendarMonth, mdiCash, mdiAlertCircle, mdiAccountCircle, mdiContentCopy, mdiQrcode, mdiCheckCircle, mdiInformation } from '@mdi/js';
import { toast } from 'sonner';

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
    onRefreshData?: () => void; // Add refresh callback
    printerStatus?: boolean; // Add printer status prop
}

// Helper function to check if QR code should be shown for the payment month
const shouldShowQRCode = (paymentMonth: string): boolean => {
    if (!paymentMonth) return false;
    
    try {
        // Extract month and year from payment month string (e.g., "August 2025")
        const monthMap: { [key: string]: number } = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        };
        
        const parts = paymentMonth.toLowerCase().split(' ');
        if (parts.length !== 2) return false;
        
        const monthName = parts[0];
        const year = parseInt(parts[1]);
        const month = monthMap[monthName];
        
        if (!month || isNaN(year)) return false;
        
        // Check if payment is for August 2025 or later
        if (year > 2025) return true;
        if (year === 2025 && month >= 8) return true;
        
        return false;
    } catch (error) {
        console.warn('Error parsing payment month for QR code check:', error);
        return false;
    }
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    isOpen,
    onClose,
    transactions,
    isLoading,
    onRemoveTransaction,
    onDownloadReceipt,
    onReprintReceipt,
    downloadingTransactionId,
    reprintingTransactionId,
    onRefreshData,
    printerStatus
}) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [transactionToRemove, setTransactionToRemove] = useState<Transaction | null>(null);
    const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [selectedTransactionForInstructions, setSelectedTransactionForInstructions] = useState<Transaction | null>(null);

    const handleRemoveClick = (transaction: Transaction) => {
        setTransactionToRemove(transaction);
        setShowConfirmModal(true);
    };

    const handleConfirmRemove = async () => {
        if (transactionToRemove) {
            try {
                await onRemoveTransaction(transactionToRemove);
                setShowConfirmModal(false);
                setTransactionToRemove(null);
                
                // Auto refresh data after successful refund
                if (onRefreshData) {
                    onRefreshData();
                }
            } catch (error) {
                // Handle error if needed, but still close modal
                setShowConfirmModal(false);
                setTransactionToRemove(null);
            }
        }
    };

    const handleCancelRemove = () => {
        setShowConfirmModal(false);
        setTransactionToRemove(null);
    };

    const copyTokenToClipboard = async (token: string, transactionId: string) => {
        try {
            await navigator.clipboard.writeText(token);
            setCopiedTokenId(transactionId);
            
            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopiedTokenId(null);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy token:', error);
        }
    };

    const handleViewInstructions = (transaction: Transaction) => {
        setSelectedTransactionForInstructions(transaction);
        setShowInstructionModal(true);
    };

    const copyInstructionsToClipboard = async () => {
        if (!selectedTransactionForInstructions?.registrationToken) return;
        
        const instructions = `Portal Account Setup Instructions:

INSTRUCTIONS:
1. Click on this link: https://t.me/rodwell_portal_password_bot?start=${selectedTransactionForInstructions.registrationToken}

2. After creating password, go to: portal.rodwell.center/login

3. Download the app:
   • Android: Download the app from browser
   • iOS: Add to Home Screen from Safari

4. Login with: Your phone number + new password`;

        try {
            await navigator.clipboard.writeText(instructions);
            toast.success("Instructions copied to clipboard!");
        } catch (error) {
            console.error('Failed to copy instructions:', error);
            toast.error("Failed to copy instructions");
        }
    };
    return (
        <>
            {isOpen && !showInstructionModal && (
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
                                                        <Icon path={mdiCash} size={24} className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-gray-100">Receipt #{transaction.receiptNumber}</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' ,
                                                            hour: 'numeric',
                                                            minute: 'numeric'
                                                        })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <Icon path={mdiAccountCircle} size={20} className="text-purple-600 dark:text-purple-400" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cashier:</span>
                                                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                                    {transaction.cashier || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <Icon path={mdiCalendarMonth} size={20} className="text-green-600 dark:text-green-400" />
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Month</span>
                                                </div>
                                                <p className="text-lg font-bold text-green-700 dark:text-green-300">{transaction.paymentMonth}</p>
                                            </div>
                                            
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <Icon path={mdiCash} size={22} className="text-blue-600 dark:text-blue-400" />
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

                                        {/* Registration Token Section */}
                                        {transaction.registrationToken && (
                                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 sm:p-4 mb-4 border border-purple-200 dark:border-purple-700">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                        <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg flex-shrink-0">
                                                            <Icon path={mdiQrcode} size={20} className="text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300 block">Portal Registration Token</span>
                                                            <p className="text-xs text-purple-600 dark:text-purple-400 truncate">Generated for student portal access</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col space-y-2 flex-shrink-0">
                                                        <Button
                                                            color="warning"
                                                            label="View Instructions"
                                                            onClick={() => handleViewInstructions(transaction)}
                                                            icon={mdiInformation}
                                                            small
                                                            className="text-xs w-full"
                                                        />
                                                        <Button
                                                            color={copiedTokenId === transaction.transactionId ? "success" : "info"}
                                                            label={copiedTokenId === transaction.transactionId ? "Copied!" : "Copy Token"}
                                                            onClick={() => copyTokenToClipboard(transaction.registrationToken!, transaction.transactionId!)}
                                                            icon={copiedTokenId === transaction.transactionId ? mdiCheckCircle : mdiContentCopy}
                                                            small
                                                            className="text-xs w-full"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-gray-800 rounded p-2 border border-purple-100 dark:border-purple-600 overflow-hidden">
                                                    <code className="text-xs text-gray-700 dark:text-gray-300 break-all font-mono block">
                                                        {transaction.registrationToken}
                                                    </code>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <div className="flex space-x-2">
                                                {onReprintReceipt && (
                                                    <Button
                                                        color="success"
                                                        label={reprintingTransactionId === transaction.transactionId ? "Reprinting..." : "Reprint"}
                                                        onClick={() => onReprintReceipt(transaction)}
                                                        icon={mdiPrinter}
                                                        small
                                                        className="text-xs"
                                                        disabled={reprintingTransactionId === transaction.transactionId || printerStatus === false}
                                                    />
                                                )}
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
                                            </div>
                                            <Button
                                                color="danger"
                                                label="Refund"
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
                <div className="flex items-start space-x-1 pr-4 -ml-2">
                    <div className="flex-shrink-0">
                        <Icon 
                            path={mdiAlertCircle} 
                            size={16} 
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
            
            {/* Portal Instructions Modal */}
            {showInstructionModal && (
                <CardBoxModal
                    title="Portal Account Setup Instructions"
                    isActive={true}
                    onConfirm={() => setShowInstructionModal(false)}
                    onCancel={() => setShowInstructionModal(false)}
                    buttonLabel="Close"
                >
                <div className="space-y-4 pr-2 sm:pr-4 pb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Icon path={mdiInformation} size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-sm sm:text-base">
                                Portal Instructions
                            </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mb-4">
                            Follow these steps to set up your student portal account:
                        </p>
                        
                        <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                                <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        <Icon path={mdiAccountCircle} size={14} className="inline mr-1 text-purple-600 dark:text-purple-400" />
                                        Click on this link to create your password:
                                    </p>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded border text-xs break-all overflow-hidden">
                                        <code className="text-purple-600 dark:text-purple-300 block">
                                            https://t.me/rodwell_portal_password_bot?start={selectedTransactionForInstructions?.registrationToken || 'TOKEN'}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2 sm:space-x-3">
                                <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        <Icon path={mdiCash} size={14} className="inline mr-1 text-green-600 dark:text-green-400" />
                                        After creating password, go to:
                                    </p>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded border text-xs overflow-hidden">
                                        <code className="text-green-600 dark:text-green-300 block">portal.rodwell.center/login</code>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2 sm:space-x-3">
                                <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        <Icon path={mdiDownload} size={14} className="inline mr-1 text-orange-600 dark:text-orange-400" />
                                        Download the app:
                                    </p>
                                    <div className="ml-2 sm:ml-4 space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        <p><Icon path={mdiDownload} size={12} className="inline mr-1 text-green-600 dark:text-green-400" /> Android: Download the app from browser</p>
                                        <p><Icon path={mdiDownload} size={12} className="inline mr-1 text-blue-600 dark:text-blue-400" /> iOS: Add to Home Screen from Safari</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2 sm:space-x-3">
                                <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                        <Icon path={mdiAccountCircle} size={14} className="inline mr-1 text-blue-600 dark:text-blue-400" />
                                        Login with: Your phone number + new password
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200 dark:border-blue-700">
                            <Button
                                color="info"
                                label="Copy All Instructions"
                                onClick={copyInstructionsToClipboard}
                                icon={mdiContentCopy}
                                className="w-full text-xs sm:text-sm"
                            />
                        </div>
                    </div>
                </div>
            </CardBoxModal>
            )}
        </>
    );
};
