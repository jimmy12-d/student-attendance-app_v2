// Test file for payment logic
import { calculatePaymentStatus, getPaymentStatus, getPaymentStatusDisplayText } from '../_lib/paymentLogic';

// Test cases to verify the payment logic
console.log('Testing Payment Logic...\n');

// Current date for testing (September 15, 2025)
const currentDate = new Date('2025-09-15T10:00:00');

// Test Case 1: No payment record
console.log('Test 1: No payment record');
const result1 = calculatePaymentStatus(null, currentDate);
console.log('Result:', result1);
console.log('Expected: { status: "no-record", reason: "No payment record found" }');
console.log('✓ Pass:', result1.status === 'no-record');
console.log('');

// Test Case 2: Payment from previous month
console.log('Test 2: Payment from previous month (August 2025)');
const result2 = calculatePaymentStatus('2025-08', currentDate);
console.log('Result:', result2);
console.log('Expected: { status: "unpaid", reason: "Payment is from a previous month" }');
console.log('✓ Pass:', result2.status === 'unpaid');
console.log('');

// Test Case 3: Payment from current month, not in last 3 days
console.log('Test 3: Payment from current month, not in last 3 days (September 15th)');
const result3 = calculatePaymentStatus('2025-09', currentDate);
console.log('Result:', result3);
console.log('Expected: { status: "paid", reason: "Payment is current for this month" }');
console.log('✓ Pass:', result3.status === 'paid');
console.log('');

// Test Case 4: Payment from current month, but in last 3 days
console.log('Test 4: Payment from current month, but in last 3 days (September 29th)');
const lastDayCurrentDate = new Date('2025-09-29T10:00:00');
const result4 = calculatePaymentStatus('2025-09', lastDayCurrentDate);
console.log('Result:', result4);
console.log('Expected: { status: "unpaid", reason: "Payment required for next month (last 3 days of current month)" }');
console.log('✓ Pass:', result4.status === 'unpaid');
console.log('');

// Test Case 5: Payment from current month, exactly 3 days before end (September 28th)
console.log('Test 5: Payment from current month, exactly 3 days before end (September 28th)');
const threeDaysBeforeEnd = new Date('2025-09-28T10:00:00');
const result5 = calculatePaymentStatus('2025-09', threeDaysBeforeEnd);
console.log('Result:', result5);
console.log('Expected: { status: "unpaid", reason: "Payment required for next month (last 3 days of current month)" }');
console.log('✓ Pass:', result5.status === 'unpaid');
console.log('');

// Test Case 6: Payment from current month, 4 days before end (September 27th)
console.log('Test 6: Payment from current month, 4 days before end (September 27th)');
const fourDaysBeforeEnd = new Date('2025-09-27T10:00:00');
const result6 = calculatePaymentStatus('2025-09', fourDaysBeforeEnd);
console.log('Result:', result6);
console.log('Expected: { status: "paid", reason: "Payment is current for this month" }');
console.log('✓ Pass:', result6.status === 'paid');
console.log('');

// Test the simple getPaymentStatus function
console.log('Testing simple getPaymentStatus function:');
console.log('getPaymentStatus(null):', getPaymentStatus(null, currentDate));
console.log('getPaymentStatus("2025-08"):', getPaymentStatus('2025-08', currentDate));
console.log('getPaymentStatus("2025-09"):', getPaymentStatus('2025-09', currentDate));
console.log('');

// Test display text function
console.log('Testing getPaymentStatusDisplayText function:');
console.log('getPaymentStatusDisplayText("paid"):', getPaymentStatusDisplayText('paid'));
console.log('getPaymentStatusDisplayText("unpaid"):', getPaymentStatusDisplayText('unpaid'));
console.log('getPaymentStatusDisplayText("no-record"):', getPaymentStatusDisplayText('no-record'));

export {}; // Make this a module
