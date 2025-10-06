export interface Student {
    id: string;
    fullName: string;
    class: string;
    classType?: string;
    phone?: string;
    lastPaymentMonth?: string;
    discount?: number;
    lateFeePermission?: boolean;
    dropped?: boolean;
    onBreak?: boolean;
    onWaitlist?: boolean;
    createdAt: Date;
    // Telegram auth fields
    chatId?: string;
    passwordHash?: string;
    registrationToken?: string;
    tokenExpiresAt?: Date;
    telegramAuthEnabled?: boolean;
}

export interface Transaction {
    studentId: string;
    studentName: string;
    nameKhmer?: string; // Khmer name for the student
    fullName?: string; // Full English name for the student
    className: string;
    classType: string;
    subjects: string[];
    fullAmount: number;
    proratedAmount?: number; // Amount after prorating but before discount
    discountAmount?: number; // Discount amount applied
    manualDiscountAmount?: number; // Manual discount amount applied
    manualDiscountReason?: string; // Reason for manual discount
    lateFeeAmount?: number; // Late payment fee amount
    lateFeeWaived?: boolean; // Whether late fee was waived by admin
    amount: number; // Final amount after all calculations
    receiptNumber: string;
    paymentMonth: string;
    paymentMethod: 'Cash' | 'QRPayment';
    transactionId?: string;
    date: string;
    joinDate: string;
    cashier?: string;
    isStudentRegistered?: boolean; // Whether student is registered with Telegram
    registrationToken?: string; // Token for student portal registration
}

export interface Printer {
    id: string;
    name: string;
    displayName?: string;
    location?: string;
    type: 'printnode' | 'standard';
    printNodeId?: number;
    description?: string;
    online?: boolean;
}
