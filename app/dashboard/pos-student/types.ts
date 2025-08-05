export interface Student {
    id: string;
    fullName: string;
    class: string;
    phone?: string;
    lastPaymentMonth?: string;
    discount?: number;
    createdAt: Date;
}

export interface Transaction {
    studentId: string;
    studentName: string;
    className: string;
    classType: string;
    subjects: string[];
    fullAmount: number;
    proratedAmount?: number; // Amount after prorating but before discount
    discountAmount?: number; // Discount amount applied
    amount: number; // Final amount after all calculations
    receiptNumber: string;
    paymentMonth: string;
    paymentMethod: 'Cash' | 'QRPayment';
    transactionId?: string;
    date: string;
    joinDate: string;
    cashier?: string;
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
