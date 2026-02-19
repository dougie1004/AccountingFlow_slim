import { calculateFinancials, validateTransaction } from './StrategicBridge';
import { JournalEntry } from '../types';

// Mock Entry Factory
const createEntry = (id: string, de: string, cr: string, amt: number, vat: number = 0): JournalEntry => ({
    id,
    date: '2025-01-01',
    description: 'Test Transaction',
    debitAccount: de,
    creditAccount: cr,
    amount: amt,
    vat,
    type: 'General',
    status: 'Approved'
});

console.log('\n🔍 [Accounting Engine] Unit Testing...\n');
let passed = 0, failed = 0;

const assert = (condition: boolean, msg: string) => {
    if (condition) {
        console.log(`✅ PASS: ${msg}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${msg}`);
        failed++;
    }
};

// --- NORMAL CASES ---

// [TEST 1] Revenue Recognition
const t1 = createEntry('req-1', '현금', '상품매출', 1000, 100);
const r1 = validateTransaction(t1);
assert(r1.isValid, '[Normal] Revenue Entry Valid');
const f1 = calculateFinancials([t1]);
assert(f1.revenue === 1000, 'Revenue recognized correctly (1000)');
assert(f1.netIncome === 1000, 'Net Income correct (1000)');

// [TEST 2] Expense Recognition
const t2 = createEntry('req-2', '소모품비', '보통예금', 500, 50);
const r2 = validateTransaction(t2);
assert(r2.isValid, '[Normal] Expense Entry Valid');
const f2 = calculateFinancials([t2]);
assert(f2.expenses === 500, 'Expense recognized correctly (500)');
assert(f2.netIncome === -500, 'Net Income Correct (-500)');

// [TEST 3] Complex Flow (Profit Calculation)
const t3_rev = createEntry('req-3a', '외상매출금', '제품매출', 2000, 200);
const t3_exp = createEntry('req-3b', '광고선전비', '미지급금', 500, 50);
const f3 = calculateFinancials([t3_rev, t3_exp]);
assert(f3.revenue === 2000, 'Complex Revenue recognized (2000)');
assert(f3.expenses === 500, 'Complex Expense recognized (500)');
assert(f3.netIncome === 1500, 'Complex Net Income (2000 - 500 = 1500)');


// --- FAILURE CASES (INVARIANT CHECK) ---

// [TEST 4] Negative Amount
const t4 = createEntry('fail-1', '현금', '자본금', -1000);
const r4 = validateTransaction(t4);
assert(!r4.isValid, '[Protect] Negative amount prevented');
assert(r4.errors.some(e => e.includes('cannot be negative')), 'Error message confirms negative check');

// [TEST 5] Self-Dealing (Logic Error Prevention)
const t5 = createEntry('fail-2', '현금', '현금', 500);
const r5 = validateTransaction(t5);
assert(!r5.isValid, '[Protect] Self-dealing prevented');
assert(r5.errors.some(e => e.includes('same')), 'Error message confirms self-dealing check');

// [TEST 6] Negative VAT
const t6 = createEntry('fail-3', '현금', '상품매출', 1000, -100);
const r6 = validateTransaction(t6);
assert(!r6.isValid, '[Protect] Negative VAT prevented');

console.log(`\n-----------------------------------------`);
console.log(`Test Result: ${passed} PASS, ${failed} FAIL`);
console.log(`-----------------------------------------\n`);

// if (failed > 0) process.exit(1);
