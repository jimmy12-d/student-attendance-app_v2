import { useState, useRef, useEffect } from 'react';
import {
    mdiCashRegister,
    mdiAccount,
    mdiReceiptText,
    mdiCalendar,
    mdiChevronLeft,
    mdiChevronRight,
    mdiCurrencyUsd,
    mdiClose,
    mdiClockAlert,
    mdiQrcodeScan,
    mdiCashMultiple,
} from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import FormField from "../../../_components/FormField";
import { Student } from '../types';
import { calculateProratedAmount } from '../utils/dateUtils';

interface TransactionManagerProps {
    selectedStudent: Student | null;
    classType: string | null;
    paymentAmount: number | null;
    subjects: string[];
    paymentMonth: string;
    displayPaymentMonth: string;
    paymentMethod: 'Cash' | 'QR Payment' | null;
    showMonthInput: boolean;
    isProcessing: boolean;
    joinDate: string;
    onPaymentMethodChange: (method: 'Cash' | 'QR Payment' | null) => void;
    onJoinDateSelect: (date: string) => void;
    classStudyDays?: number[] | null;
    fullAmount: number;
    isNewStudent?: boolean;
    onUserInteractionChange?: (isInteracting: boolean) => void;
    manualDiscountAmount: number;
    manualDiscountReason: string;
    showDiscountInput: boolean;
    onDiscountAmountChange: (amount: number) => void;
    onDiscountReasonChange: (reason: string) => void;
    onShowDiscountInputChange: (show: boolean) => void;
    lateFeeOverride: boolean;
    showLateFeeInput: boolean;
    onLateFeeOverrideChange: (override: boolean) => void;
    onShowLateFeeInputChange: (show: boolean) => void;
    calculateLateFeeAmount: () => number;
    isLatePayment: boolean;
    calculateFinalChargeAmount: () => number;
}

export const TransactionManager = ({
    selectedStudent,
    classType,
    paymentAmount,
    subjects,
    paymentMonth,
    displayPaymentMonth,
    paymentMethod,
    showMonthInput,
    isProcessing,
    joinDate,
    onPaymentMethodChange,
    onJoinDateSelect,
    classStudyDays,
    fullAmount,
    isNewStudent,
    onUserInteractionChange,
    manualDiscountAmount,
    manualDiscountReason,
    showDiscountInput,
    onDiscountAmountChange,
    onDiscountReasonChange,
    onShowDiscountInputChange,
    lateFeeOverride,
    showLateFeeInput,
    onLateFeeOverrideChange,
    onShowLateFeeInputChange,
    calculateLateFeeAmount,
    isLatePayment,
    calculateFinalChargeAmount
}: TransactionManagerProps) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
                // Notify parent that interaction has ended
                if (onUserInteractionChange) {
                    onUserInteractionChange(false);
                }
            }
        };

        if (showDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker, onUserInteractionChange]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateSelect = (day: number) => {
        // Create date string directly to avoid timezone issues
        const year = currentYear;
        const month = String(currentMonth + 1).padStart(2, '0'); // +1 because months are 0-indexed
        const dayStr = String(day).padStart(2, '0');
        const dateString = `${year}-${month}-${dayStr}`;
        onJoinDateSelect(dateString);
        setShowDatePicker(false);
        // Notify parent that interaction has ended
        if (onUserInteractionChange) {
            onUserInteractionChange(false);
        }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return 'Select join date';
        const date = new Date(dateString);
        // Format as YYYY-MM-DD to match the old calendar picker
        return dateString; // Return the ISO date string directly (YYYY-MM-DD)
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];
        const today = new Date();
        const selectedDate = joinDate ? new Date(joinDate) : null;

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    className={`w-8 h-8 text-sm rounded-lg transition-all duration-200 ${
                        isSelected
                            ? 'bg-blue-500 text-white font-semibold shadow-lg'
                            : isToday
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        //  <CardBox className="mb-6">
            <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-emerald-100 dark:border-gray-600 shadow-sm">
                <div className="flex items-center justify-between mb-6 -mt-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <Icon path={mdiReceiptText} size={24} className="mr-2 text-blue-500" />
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
                            <Icon path={mdiAccount} size={24} className="mr-4" />
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
                            <Icon path={mdiCashRegister} size={24} className="mr-4" />
                            Payment Information
                        </h4>
                        <div className="space-y-2">
                            {/* Show full amount first */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Full Price:</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    ${fullAmount.toFixed(2)}
                                </span>
                            </div>
                            
                            {/* Show scholarship discount if applicable */}
                            {selectedStudent?.discount && selectedStudent.discount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Scholarship Discount:</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        -${selectedStudent.discount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            
                            {/* Show prorated amount for new students after scholarship discount */}
                            {isNewStudent && joinDate && paymentMonth && selectedStudent?.discount && selectedStudent.discount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">After Scholarship & Prorating:</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        ${(() => {
                                            const discountedPrice = Math.max(0, fullAmount - selectedStudent.discount);
                                            return calculateProratedAmount(discountedPrice, new Date(joinDate), paymentMonth, classStudyDays).toFixed(2);
                                        })()}
                                    </span>
                                </div>
                            )}
                            
                            {/* Show manual discount if applicable */}
            {/* Show manual discount if applicable */}
            {manualDiscountAmount > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600 dark:text-blue-400">Manual Discount:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                        -${manualDiscountAmount.toFixed(2)}
                    </span>
                </div>
            )}
            
            {/* Show late fee if applicable */}
            {calculateLateFeeAmount() > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                        Late Payment Fee:
                        {lateFeeOverride && <span className="text-xs ml-1">(Waived)</span>}
                    </span>
                    <span className={`font-medium ${lateFeeOverride ? 'line-through text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                        +$5.00
                    </span>
                </div>
            )}
            
            {/* Show final charge amount */}                            {/* Show final charge amount */}
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                    Final Charge:
                                </span>
                                <span className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                                    {joinDate && paymentMonth 
                                        ? `$${calculateFinalChargeAmount().toFixed(2)}`
                                        : '$0.00'
                                    }
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
                                        : paymentMethod === 'QR Payment'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                                }`}>
                                    {paymentMethod || 'Not selected'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Month Input Section */}
                {showMonthInput && (
                    <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">
                            Set Student Details
                        </h4>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="flex items-center text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                                    Join Date
                                </label>
                                <div className="relative" ref={datePickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newShowDatePicker = !showDatePicker;
                                            setShowDatePicker(newShowDatePicker);
                                            // Notify parent about user interaction
                                            if (onUserInteractionChange) {
                                                onUserInteractionChange(newShowDatePicker);
                                            }
                                        }}
                                        className="w-full px-4 py-3 border border-orange-300 dark:border-orange-600 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <Icon path={mdiCalendar} size={20} className="mr-2 text-gray-900 dark:text-white" />
                                            <span className={joinDate ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                                                {formatDisplayDate(joinDate)}
                                            </span>
                                        </div>
                                    </button>

                                    {showDatePicker && (
                                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl z-50 p-4 min-w-[320px]">
                                            {/* Calendar Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <button
                                                    onClick={() => navigateMonth('prev')}
                                                    className="flex items-center justify-center w-10 h-10 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
                                                >
                                                    <Icon path={mdiChevronLeft} size={30} className="text-blue-600 dark:text-blue-400" />
                                                </button>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    {months[currentMonth]} {currentYear}
                                                </h3>
                                                <button
                                                    onClick={() => navigateMonth('next')}
                                                    className="flex items-center justify-center w-10 h-10 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
                                                >
                                                    <Icon path={mdiChevronRight} size={30} className="text-blue-600 dark:text-blue-400" />
                                                </button>
                                            </div>

                                            {/* Days of Week Header */}
                                            <div className="grid grid-cols-7 mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Calendar Days */}
                                            <div className="grid grid-cols-7 gap-1">
                                                {renderCalendar()}
                                            </div>

                                            {/* Footer */}
                                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                                                <button
                                                    onClick={() => {
                                                        setShowDatePicker(false);
                                                        if (onUserInteractionChange) {
                                                            onUserInteractionChange(false);
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        onJoinDateSelect(today);
                                                        setShowDatePicker(false);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                >
                                                    Today
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {joinDate && (
                                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
                                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                        Payment Details:
                                    </p>
                                    <div className="mt-1 space-y-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Full Price: ${fullAmount.toFixed(2)}
                                        </p>
                                        {/* Show scholarship discount if applicable */}
                                        {selectedStudent?.discount && selectedStudent.discount > 0 && (
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                                Scholarship Discount: -${selectedStudent.discount.toFixed(2)}
                                            </p>
                                        )}
                                        {/* Show prorated amount after scholarship discount */}
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            After Prorating: ${(() => {
                                                const discountedPrice = Math.max(0, fullAmount - (selectedStudent?.discount || 0));
                                                return calculateProratedAmount(discountedPrice, new Date(joinDate), paymentMonth, classStudyDays).toFixed(2);
                                            })()}
                                        </p>
                                        {/* Show manual discount if applicable */}
                                        {manualDiscountAmount > 0 && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                Manual Discount: -${manualDiscountAmount.toFixed(2)}
                                            </p>
                                        )}
                                        {/* Show late fee if applicable */}
                                        {calculateLateFeeAmount() > 0 && (
                                            <p className={`text-sm ${lateFeeOverride ? 'line-through text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                                                Late Payment Fee: +$5.00 {lateFeeOverride && '(Waived)'}
                                            </p>
                                        )}
                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            Final Charge: ${calculateFinalChargeAmount().toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Payment Method Selection */}
                <div className="mt-6">
                    <h3 className="pb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => onPaymentMethodChange('QR Payment')}
                            className={`flex-1 p-6 rounded-lg border-2 transition-all duration-200 ${
                                paymentMethod === 'QR Payment'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                            }`}
                        >
                            <div className="text-center">
                                <Icon path={mdiQrcodeScan} size={58} w="w-10" h="h-10" className="mx-auto mb-3 text-current" />
                                <div className="font-medium text-sm">QR Payment</div>
                            </div>
                        </button>
                        <button
                            onClick={() => onPaymentMethodChange('Cash')}
                            className={`flex-1 p-6 rounded-lg border-2 transition-all duration-200 ${
                                paymentMethod === 'Cash'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                            }`}
                        >
                            <div className="text-center">
                                <Icon path={mdiCashMultiple} size={64} w="w-12" h="h-12" className="mx-auto mb-3 text-current" />
                                <div className="font-medium text-sm">Cash</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Manual Discount Section */}
                <div className="mt-6">
                    <div className="flex flex-col gap-4 mb-4">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            Manual Discount
                        </h3>
                        <Button
                            color={showDiscountInput ? "danger" : "info"}
                            label={showDiscountInput ? "Cancel" : "Apply Discount"}
                            onClick={() => {
                                if (showDiscountInput) {
                                    onDiscountAmountChange(0);
                                    onDiscountReasonChange('');
                                }
                                onShowDiscountInputChange(!showDiscountInput);
                            }}
                            icon={showDiscountInput ? mdiClose : mdiCurrencyUsd}
                            small
                        />
                    </div>
                    
                    {showDiscountInput && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField label="Discount Amount ($)">
                                    {() => (
                                        <input
                                            type="number"
                                            min="0"
                                            max={paymentAmount || 0}
                                            step="0.01"
                                            value={manualDiscountAmount === 0 ? '' : manualDiscountAmount}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || value === null) {
                                                    onDiscountAmountChange(0);
                                                } else {
                                                    const numValue = parseFloat(value);
                                                    onDiscountAmountChange(isNaN(numValue) ? 0 : numValue);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                                            placeholder="0.00"
                                        />
                                    )}
                                </FormField>
                                
                                <FormField label="Reason (Optional)">
                                    {() => (
                                        <input
                                            type="text"
                                            value={manualDiscountReason}
                                            onChange={(e) => onDiscountReasonChange(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                                            placeholder="E.g., Early payment, Special promotion..."
                                            maxLength={100}
                                        />
                                    )}
                                </FormField>
                            </div>
                            
                            {manualDiscountAmount > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-blue-700 dark:text-blue-300">
                                            Discount Applied: <strong>${manualDiscountAmount.toFixed(2)}</strong>
                                        </span>
                                        <span className="text-blue-700 dark:text-blue-300">
                                            New Total: <strong>${calculateFinalChargeAmount().toFixed(2)}</strong>
                                        </span>
                                    </div>
                                    {manualDiscountReason && (
                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                            Reason: {manualDiscountReason}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Late Fee Override Section */}
                {isLatePayment && !isNewStudent && (
                    <div className="mt-4">
                        {/* Late Fee Information */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700/50 mb-3">
                            <div className="flex items-start space-x-3">
                                <Icon path={mdiClockAlert} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                                        Late Payment Detected
                                    </h4>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                                        This payment is being made after the 5th of the month. A $5.00 late fee applies.
                                    </p>
                                    
                                    {selectedStudent?.lateFeePermission === true ? (
                                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-700">
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                ✓ This student has late fee permission - no late fee will be charged.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-orange-700 dark:text-orange-300">
                                                    Late Fee Amount:
                                                </span>
                                                <span className="font-semibold text-orange-800 dark:text-orange-200">
                                                    +$5.00
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    id="lateFeeOverride"
                                                    type="checkbox"
                                                    checked={lateFeeOverride}
                                                    onChange={(e) => onLateFeeOverrideChange(e.target.checked)}
                                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="lateFeeOverride" className="text-sm text-orange-700 dark:text-orange-300">
                                                    Waive late fee
                                                </label>
                                            </div>
                                            
                                            {lateFeeOverride && (
                                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded border border-blue-200 dark:border-blue-700 mt-2">
                                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                                        ✓ Late fee waived by admin.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Current calculation showing late fee effect */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Current Fee:</span>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {calculateLateFeeAmount() > 0 ? `+$${calculateLateFeeAmount().toFixed(2)}` : 'Waived'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Final Total:</span>
                                    <p className="font-medium text-green-600 dark:text-green-400">
                                        ${calculateFinalChargeAmount().toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        // </CardBox>
    );
};
