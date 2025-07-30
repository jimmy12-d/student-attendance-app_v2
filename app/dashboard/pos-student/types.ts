export interface Student {
    id: string;
    fullName: string;
    class: string;
    lastPaymentMonth?: string;
    createdAt: Date;
}

export interface Transaction {
    studentId: string;
    studentName: string;
    className: string;
    classType: string;
    subjects: string[];
    fullAmount: number;
    amount: number;
    receiptNumber: string;
    paymentMonth: string;
    paymentMethod: 'Cash' | 'Credit';
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
