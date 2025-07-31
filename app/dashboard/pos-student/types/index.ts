export interface Student {
    id: string;
    fullName: string;
    class: string;
    lastPaymentMonth?: string;
    discount?: number;
    createdAt: Date;
}

export interface Transaction {
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
