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

        // Helper function to format date as YYYY-MM-DD HH:mm:ss as required by the ABA API
        const formatDateTime = (dateInput: string | Date) => {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date: ${dateInput}`);
            }
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        // Format the dates properly
        const formattedFromDate = formatDateTime(fromDate);
        const formattedToDate = formatDateTime(toDate);

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
            from_date: formattedFromDate,
            to_date: formattedToDate,
            from_amount: "50",
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

        const listData = await response.json();

        if (!response.ok) {
            console.error('ABA PayWay API Error:', listData);
            return NextResponse.json({ error: 'Failed to fetch transactions from ABA PayWay', details: listData }, { status: response.status });
        }

        // If we have transactions, fetch details for each one
        if (listData.data && Array.isArray(listData.data)) {
            const detailedTransactions = await Promise.all(
                listData.data.map(async (transaction) => {
                    const detailsRequestBody = {
                        req_time: req_time,
                        merchant_id: ABA_PAYWAY_MERCHANT_ID,
                        transaction_id: transaction.transaction_id,
                        hash: ""
                    };

                    // Create hash for transaction detail request
                    detailsRequestBody.hash = CryptoJS.HmacSHA512(
                        detailsRequestBody.req_time + 
                        detailsRequestBody.merchant_id + 
                        detailsRequestBody.transaction_id,
                        ABA_PAYWAY_API_KEY
                    ).toString(CryptoJS.enc.Base64);

                    const detailResponse = await fetch(`${ABA_PAYWAY_API_URL}/api/payment-gateway/v1/payments/transaction-detail`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(detailsRequestBody)
                    });

                    const detailData = await detailResponse.json();
                    
                    if (detailResponse.ok && detailData.data) {
                        // Combine list data with detail data
                        return {
                            ...transaction,
                            payer_name: `${detailData.data.first_name || ''} ${detailData.data.last_name || ''}`.trim() || 'N/A'
                        };
                    }
                    
                    return {
                        ...transaction,
                        payer_name: 'N/A'
                    };
                })
            );

            return NextResponse.json({ ...listData, data: detailedTransactions });
        }

        return NextResponse.json(listData);

    } catch (error) {
        console.error('Error fetching ABA transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}