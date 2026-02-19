import { JournalEntry } from '../types';

export const BASELINE_SCENARIO: JournalEntry[] = [
    {
        id: 'BASE-001',
        date: '2026-01-01',
        description: 'Capital Investment',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        amount: 10_000_000,
        vat: 0,
        type: 'Asset',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-002',
        date: '2026-01-05',
        description: 'Product Sales',
        debitAccount: '현금',
        creditAccount: '매출',
        amount: 5_000_000,
        vat: 500_000,
        type: 'Revenue',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-003',
        date: '2026-01-10',
        description: 'Salary Payment',
        debitAccount: '급여',
        creditAccount: '보통예금',
        amount: 3_000_000,
        vat: 0,
        type: 'Expense',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-004',
        date: '2026-01-12',
        description: 'Office Supplies',
        debitAccount: '소모품비',
        creditAccount: '현금',
        amount: 200_000,
        vat: 20_000,
        type: 'Expense',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-005',
        date: '2026-01-15',
        description: 'Bank Transfer',
        debitAccount: '현금',
        creditAccount: '보통예금',
        amount: 2_000_000,
        vat: 0,
        type: 'Asset',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-006',
        date: '2026-01-18',
        description: 'Credit Sales',
        debitAccount: '매출채권',
        creditAccount: '매출',
        amount: 3_000_000,
        vat: 300_000,
        type: 'Revenue',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-007',
        date: '2026-01-20',
        description: 'AR Collection',
        debitAccount: '보통예금',
        creditAccount: '매출채권',
        amount: 3_300_000,
        vat: 0,
        type: 'Asset',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-008',
        date: '2026-01-25',
        description: 'Rent Payment',
        debitAccount: '임차료',
        creditAccount: '보통예금',
        amount: 1_000_000,
        vat: 100_000,
        type: 'Expense',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-009',
        date: '2026-01-28',
        description: 'Advertising',
        debitAccount: '광고선전비',
        creditAccount: '현금',
        amount: 500_000,
        vat: 50_000,
        type: 'Expense',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    },
    {
        id: 'BASE-010',
        date: '2026-01-31',
        description: 'Service Revenue',
        debitAccount: '보통예금',
        creditAccount: '매출',
        amount: 2_000_000,
        vat: 200_000,
        type: 'Revenue',
        status: 'Approved',
        vendor: undefined,
        controlTrail: []
    }
];

export const EXPECTED_BASELINE_RESULTS = {
    cash: 16_130_000,
    cashInflow: 21_000_000,
    cashOutflow: 4_870_000,
    revenue: 10_000_000,
    expenses: 4_700_000,
    netIncome: 5_300_000
};
