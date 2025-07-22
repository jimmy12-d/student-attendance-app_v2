import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const ABA_PAYWAY_API_URL = process.env.ABA_PAYWAY_API_URL!;
const ABA_PAYWAY_MERCHANT_ID = process.env.ABA_PAYWAY_MERCHANT_ID!;
const ABA_PAYWAY_API_KEY = process.env.ABA_PAYWAY_API_KEY!;

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
    
    const hashString = req_time + merchant_id + from_date + to_date + from_amount + to_amount + status + page + pagination;
    
    const hmac = CryptoJS.HmacSHA512(hashString, apiKey);
    return CryptoJS.enc.Base64.stringify(hmac);
};

export async function POST(request: NextRequest) {
    if (!ABA_PAYWAY_API_URL || !ABA_PAYWAY_MERCHANT_ID || !ABA_PAYWAY_API_KEY) {
        return NextResponse.json({ error: 'PayWay credentials not configured on the server.' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { fromDate, toDate } = body; 

        if (!fromDate || !toDate) {
            return NextResponse.json({ error: 'fromDate and toDate are required in the request body' }, { status: 400 });
        }

        const now = new Date();
        const req_time = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const requestBody = {
            req_time: req_time,
            merchant_id: ABA_PAYWAY_MERCHANT_ID,
            from_date: null,
            to_date: null,
            from_amount: "0.01",
            to_amount: "1000",
            status: null,
            page: "1",
            pagination: "40",
            hash: ""
        };

        requestBody.hash = createTransactionListHash(requestBody, ABA_PAYWAY_API_KEY);
        
        const apiUrl = `${ABA_PAYWAY_API_URL}/api/payment-gateway/v1/payments/transaction-list-2`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('ABA PayWay API Error:', data);
            return NextResponse.json({ error: 'Failed to fetch transactions from ABA PayWay', details: data }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching ABA transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}