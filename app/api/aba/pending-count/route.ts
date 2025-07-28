import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import { adminDb } from '../../../../firebase-admin-config';
// Fallback imports for client SDK
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/firebase-config';

// Reuse environment variables and hash creation logic from the other ABA API route
const ABA_PAYWAY_API_URL = process.env.ABA_PAYWAY_API_URL!;
const ABA_PAYWAY_MERCHANT_ID = process.env.ABA_PAYWAY_MERCHANT_ID!;
const ABA_PAYWAY_API_KEY = process.env.ABA_PAYWAY_API_KEY!;

// Use the full, correct hash creation function from the other ABA API route
const createTransactionListHash = (params: { [key: string]: any }, apiKey: string): string => {
    const req_time = params.req_time || '';
    const merchant_id = params.merchant_id || '';
    const from_date = params.from_date === null ? '' : (params.from_date || '');
    const to_date = params.to_date === null ? '' : (params.to_date || '');
    const from_amount = params.from_amount === null ? '' : (params.from_amount || '');
    const to_amount = params.to_amount === null ? '' : (params.to_amount || '');
    const status = params.status === null ? '' : (params.status || '');
    const page = params.page || '';
    const pagination = params.pagination || '';
    
    // This is the full, correct hash string format required by the API
    const hashString = req_time + merchant_id + from_date + to_date + from_amount + to_amount + status + page + pagination;
    
    const hmac = CryptoJS.HmacSHA512(hashString, apiKey);
    return CryptoJS.enc.Base64.stringify(hmac);
};


// This API route specifically calculates the number of pending ABA approvals.
export async function GET(request: NextRequest) {
    if (!ABA_PAYWAY_API_URL || !ABA_PAYWAY_MERCHANT_ID || !ABA_PAYWAY_API_KEY) {
        return NextResponse.json({ error: 'PayWay credentials not configured on the server.' }, { status: 500 });
    }

    try {
        // 1. Fetch APPROVED transactions from ABA PayWay with specific filters
        const now = new Date();
        const req_time = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        // Helper function to format date as YYYY-MM-DD HH:mm:ss as required by the ABA API
        const formatDateTime = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };
        
        // Calculate 'to_date' as today at 23:59:59
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const toDateStr = formatDateTime(todayEnd);

        // Calculate 'from_date' as 7 days ago at 00:00:00
        const sevenDaysAgoStart = new Date();
        sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 2);
        sevenDaysAgoStart.setHours(0, 0, 0, 0);
        const fromDateStr = formatDateTime(sevenDaysAgoStart);


        // The request body must match the structure used for hashing
        const requestBody = {
            req_time: req_time,
            merchant_id: ABA_PAYWAY_MERCHANT_ID,
            from_date: fromDateStr,
            to_date: toDateStr,
            from_amount: "50",
            to_amount: "1000",
            status: null, // CORRECTED: Set status to null as the API doesn't support filtering here
            page: "1",
            pagination: "50", // Fetch up to 50 matching transactions
            hash: ""
        };

        requestBody.hash = createTransactionListHash(requestBody, ABA_PAYWAY_API_KEY);
        
        const apiUrl = `${ABA_PAYWAY_API_URL}/api/payment-gateway/v1/payments/transaction-list-2`;

        const abaResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        const abaData = await abaResponse.json();

        // CORRECTED: Check for successful status code 0 and existence of data array
        if (!abaResponse.ok || abaData.status?.code !== '00' || !Array.isArray(abaData.data)) {
             console.error('2_[ABA Pending Count] ABA PayWay API Error or no data in response:', abaData);
             return NextResponse.json({ pendingCount: 0 });
        }
        
        // CORRECTED: Filter for approved transactions *after* receiving the data
        const allTransactions: any[] = abaData.data;
        const approvedTransactions = allTransactions.filter(t => t.payment_status === 'APPROVED');
        
        const approvedTransactionIds = new Set(approvedTransactions.map(t => t.transaction_id));
        
        // 2. Fetch processed transaction IDs from Firestore
        let processedSnapshot;
        
        try {
            // Always try client SDK first since Admin SDK credentials are not configured
            processedSnapshot = await getDocs(query(collection(db, "processedAbaTransactions")));
        } catch (dbError) {
            console.error('[ABA Pending Count] Database error:', dbError || 'Unknown database error');
            return NextResponse.json({ pendingCount: 0, error: 'Database connection failed' }, { status: 500 });
        }

        const processedTransactionIds = new Set(processedSnapshot.docs.map(doc => doc.id));

        // 3. Calculate the difference
        let pendingCount = 0;
        for (const tranId of approvedTransactionIds) {
            if (!processedTransactionIds.has(tranId)) {
                pendingCount++;
            }
        }
        
        return NextResponse.json({ pendingCount });

    } catch (error) {
        console.error('Error fetching ABA pending transaction count:', error?.message || error || 'Unknown error');
        return NextResponse.json({ pendingCount: 0, error: 'Internal Server Error' }, { status: 500 });
    }
} 