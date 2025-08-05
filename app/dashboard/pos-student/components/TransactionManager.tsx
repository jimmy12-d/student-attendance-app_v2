import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
    mdiCashRegister,
    mdiAccount,
    mdiReceiptText,
    mdiCalendar,
    mdiChevronDown,
    mdiChevronLeft,
    mdiChevronRight,
} from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import CardBox from "../../../_components/CardBox";
import { Student, Transaction } from '../types';
import { calculateProratedAmount } from '../utils/dateUtils';

interface TransactionManagerProps {
    selectedStudent: Student | null;
    classType: string | null;
    paymentAmount: number | null;
    subjects: string[];
    paymentMonth: string;
    displayPaymentMonth: string;
    paymentMethod: 'Cash' | 'QRPayment';
    showMonthInput: boolean;
    isProcessing: boolean;
    joinDate: string;
    onPaymentMethodChange: (method: 'Cash' | 'QRPayment') => void;
    onJoinDateSelect: (date: string) => void;
    classStudyDays?: number[] | null;
    fullAmount: number;
    isNewStudent?: boolean;
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
}: TransactionManagerProps) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };

        if (showDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker]);

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
        <CardBox className="mb-6">
            <div className="p-6">
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
                            
                            {/* Show prorated amount if applicable for new students */}
                            {isNewStudent && joinDate && paymentMonth && selectedStudent?.discount && selectedStudent.discount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">After Discount:</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        ${Math.max(0, fullAmount - selectedStudent.discount).toFixed(2)}
                                    </span>
                                </div>
                            )}
                            
                            {/* Show discount if applicable */}
                            {selectedStudent?.discount && selectedStudent.discount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Scholarship Discount:</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        -${selectedStudent.discount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            
                            {/* Show final charge amount */}
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                    Final Charge:
                                </span>
                                <span className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                                    {joinDate && paymentMonth 
                                        ? (() => {
                                            const discountAmount = selectedStudent?.discount || 0;
                                            if (isNewStudent) {
                                                // New student: apply discount first, then prorate
                                                const discountedPrice = Math.max(0, fullAmount - discountAmount);
                                                const finalAmount = calculateProratedAmount(discountedPrice, new Date(joinDate), paymentMonth, classStudyDays);
                                                return `$${finalAmount.toFixed(2)}`;
                                            } else {
                                                // Existing student: full amount minus discount
                                                const finalAmount = Math.max(0, fullAmount - discountAmount);
                                                return `$${finalAmount.toFixed(2)}`;
                                            }
                                        })()
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
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                }`}>
                                    {paymentMethod}
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
                                        onClick={() => setShowDatePicker(!showDatePicker)}
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
                                                    onClick={() => setShowDatePicker(false)}
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
                                        {/* Show discount if applicable */}
                                        {selectedStudent?.discount && selectedStudent.discount > 0 && (
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                                Scholarship Discount: -${selectedStudent.discount.toFixed(2)}
                                            </p>
                                        )}
                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            Final Charge: ${(() => {
                                                // Apply discount first, then prorate
                                                const discountedPrice = Math.max(0, fullAmount - (selectedStudent?.discount || 0));
                                                return calculateProratedAmount(discountedPrice, new Date(joinDate), paymentMonth, classStudyDays).toFixed(2);
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}
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
                            onClick={() => onPaymentMethodChange('QRPayment')}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                                paymentMethod === 'QRPayment'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-lg transform scale-105'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <div className="text-center">
                                <img src="/scan.png" alt="QR Payment" className="h-12 w-auto mx-auto mb-2" />
                                <div className="font-medium">QR Payment</div>
                            </div>
                        </button>
                        <button
                            onClick={() => onPaymentMethodChange('Cash')}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                                paymentMethod === 'Cash'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-lg transform scale-105'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                        >
                            <div className="text-center">
                                <img src="/cash.png" alt="Cash" className="h-14 w-auto mx-auto mb-2" />
                                <div className="font-medium">Cash</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </CardBox>
    );
};
