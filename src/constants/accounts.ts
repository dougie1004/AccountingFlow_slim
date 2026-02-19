/**
 * AccountingFlow Standard Chart of Accounts (COA)
 * Defines the single source of truth for account properties.
 */

import { AccountNature, ConstitutionViolationError } from '../types';

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface AccountDef {
    code: string; // Standard Accounting Code (e.g. '101')
    name: string;
    category: AccountCategory;
    nature: AccountNature; // Constitutional Nature (Phase 12)
    description?: string;
    english?: string;
    sortOrder: number; // For Liquid -> Fixed ordering
}

export const STANDARD_ACCOUNTS: AccountDef[] = [
    // --- Assets (자산) ---
    { code: '101', name: '현금', category: 'Asset', nature: AccountNature.ASSET, english: 'Cash', sortOrder: 10 },
    { code: '103', name: '보통예금', category: 'Asset', nature: AccountNature.ASSET, english: 'Bank', sortOrder: 20 },
    { code: '108', name: '외상매출금', category: 'Asset', nature: AccountNature.ASSET, english: 'Accounts Receivable', sortOrder: 30 },
    { code: '108', name: '매출채권', category: 'Asset', nature: AccountNature.ASSET, english: 'Accounts Receivable', sortOrder: 31 },
    { code: '120', name: '미수금', category: 'Asset', nature: AccountNature.ASSET, english: 'Other Receivables', sortOrder: 40 },
    { code: '131', name: '선급금', category: 'Asset', nature: AccountNature.ASSET, english: 'Prepayments', sortOrder: 50 },
    { code: '133', name: '선급비용', category: 'Asset', nature: AccountNature.ASSET, english: 'Prepaid Expense', sortOrder: 60 },
    { code: '146', name: '상품', category: 'Asset', nature: AccountNature.ASSET, english: 'Inventory (Merchandise)', sortOrder: 70 },
    { code: '135', name: '부가가치세대급금', category: 'Asset', nature: AccountNature.ASSET, english: 'VAT Asset', sortOrder: 80 },
    { code: '138', name: '가지급금', category: 'Asset', nature: AccountNature.ASSET, english: 'Suspense Payments', sortOrder: 90 },
    { code: '212', name: '비품', category: 'Asset', nature: AccountNature.ASSET, english: 'Equipment', sortOrder: 100 },
    { code: '206', name: '기계장치', category: 'Asset', nature: AccountNature.ASSET, english: 'Machinery', sortOrder: 110 },
    { code: '208', name: '차량운반구', category: 'Asset', nature: AccountNature.ASSET, english: 'Vehicles', sortOrder: 120 },
    { code: '202', name: '건물', category: 'Asset', nature: AccountNature.ASSET, english: 'Building', sortOrder: 130 },
    { code: '231', name: '보증금', category: 'Asset', nature: AccountNature.ASSET, english: 'Deposits', sortOrder: 140 },
    { code: '232', name: '산업재산권', category: 'Asset', nature: AccountNature.ASSET, english: 'Industrial Property Rights', sortOrder: 145 },
    { code: '213', name: '감가상각누계액', category: 'Asset', nature: AccountNature.ASSET, sortOrder: 150 },

    // --- Liabilities (부채) ---
    { code: '251', name: '외상매입금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Accounts Payable', sortOrder: 210 },
    { code: '251', name: '매입채무', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Accounts Payable', sortOrder: 211 },
    { code: '253', name: '미지급금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Other Payables', sortOrder: 220 },
    { code: '254', name: '예수금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Withholding Tax (General)', sortOrder: 230 },
    { code: '254', name: '예수금(원천세)', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Withholding Income Tax', sortOrder: 231 },
    { code: '254', name: '예수금(사회보험료)', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Withholding Social Insurance', sortOrder: 232 },
    { code: '255', name: '부가가치세예수금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'VAT Liability', sortOrder: 240 },
    { code: '259', name: '선수금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Advances Received', sortOrder: 250 },
    { code: '260', name: '가수금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Suspense Receipts', sortOrder: 260 },
    { code: '261', name: '단기차입금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Short-term Loan', sortOrder: 270 },
    { code: '293', name: '장기차입금', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Long-term Loan', sortOrder: 280 },
    { code: '298', name: '국고보조금(이연)', category: 'Liability', nature: AccountNature.LIABILITY, english: 'Deferred Govt Grant', sortOrder: 290 },

    // --- Equity (자본) ---
    { code: '331', name: '자본금', category: 'Equity', nature: AccountNature.EQUITY, english: 'Capital Stock', sortOrder: 310 },
    { code: '341', name: '자본잉여금', category: 'Equity', nature: AccountNature.EQUITY, english: 'Capital Surplus', sortOrder: 315 },
    { code: '371', name: '이익잉여금', category: 'Equity', nature: AccountNature.EQUITY, english: 'Retained Earnings', sortOrder: 320 },

    // --- Revenue (수익) ---
    { code: '401', name: '매출', category: 'Revenue', nature: AccountNature.REVENUE, english: 'Sales Revenue', sortOrder: 410 },
    { code: '401', name: 'SaaS 매출', category: 'Revenue', nature: AccountNature.REVENUE, sortOrder: 411 },
    { code: '402', name: '컨설팅 매출', category: 'Revenue', nature: AccountNature.REVENUE, english: 'Consulting Revenue', sortOrder: 412 },
    { code: '901', name: '이자수익', category: 'Revenue', nature: AccountNature.REVENUE, english: 'Interest Income', sortOrder: 420 },
    { code: '903', name: '국고보조금수익', category: 'Revenue', nature: AccountNature.REVENUE, sortOrder: 430 },
    { code: '903', name: '영업외수익(국고보조금)', category: 'Revenue', nature: AccountNature.REVENUE, english: 'Govt Grant Income', sortOrder: 431 },
    { code: '904', name: '잡이익', category: 'Revenue', nature: AccountNature.REVENUE, sortOrder: 440 },

    // --- Expenses (비용) ---
    { code: '451', name: '매출원가', category: 'Expense', nature: AccountNature.COGS, sortOrder: 510 },
    { code: '451', name: '인프라 원가', category: 'Expense', nature: AccountNature.COGS, sortOrder: 511 },
    { code: '451', name: 'Gemini API 원가', category: 'Expense', nature: AccountNature.COGS, sortOrder: 512 },
    { code: '801', name: '급여', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 520 },
    { code: '811', name: '복리후생비', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 530 },
    { code: '819', name: '임차료', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 540 },
    { code: '819', name: '지급임차료', category: 'Expense', nature: AccountNature.SG_AND_A, english: 'Rent Expense', sortOrder: 541 },
    { code: '831', name: '지급수수료', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 550 },
    { code: '818', name: '감가상각비', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 560 },
    { code: '830', name: '광고선전비', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 570 },
    { code: '820', name: '소모품비', category: 'Expense', nature: AccountNature.SG_AND_A, sortOrder: 580 },
    { code: '812', name: '여비교통비', category: 'Expense', nature: AccountNature.SG_AND_A, english: 'Travel & Transportation', sortOrder: 590 },
    { code: '811', name: '식비', category: 'Expense', nature: AccountNature.SG_AND_A, english: 'Meal Expense', sortOrder: 595 },
    { code: '951', name: '이자비용', category: 'Expense', nature: AccountNature.NON_OPERATING, sortOrder: 600 },
];

import { ConstitutionMonitor } from '../constitution/ConstitutionMonitor';

export const getAccountNature = (accountName: string): AccountNature => {
    const monitor = ConstitutionMonitor.getInstance();
    const n = normalize(accountName);

    const found = STANDARD_ACCOUNTS.find(a => normalize(a.name) === n || normalize(a.name) === n.split('(')[0]);
    if (found) {
        monitor.logNatureDetection(accountName, found.nature, 'EXPLICIT');
        return found.nature;
    }

    // Heuristics
    if (['매출', '수익', 'revenue', 'sales'].some(k => n.includes(k))) return AccountNature.REVENUE;
    if (['원가', 'cost'].some(k => n.includes(k))) return AccountNature.COGS;
    if (['비용', '급여', '임차', '수수료', 'expense', 'fee', '전력', '세금', '공과', '여비', '교통', '광고', '복리', '통신', '식비', '식사', '접대'].some(k => n.includes(k))) return AccountNature.SG_AND_A;
    if (['익', '영업외'].some(k => n.includes(k)) && n.includes('이익') === false) return AccountNature.NON_OPERATING;
    if (['채무', '미지급', '예수금', '부채', 'payable', 'liability'].some(k => n.includes(k))) return AccountNature.LIABILITY;
    if (['자본', '자본금', '잉여금', 'equity'].some(k => n.includes(k))) return AccountNature.EQUITY;
    if (['자산', '현금', '예금', '채권', 'asset', 'cash', 'bank'].some(k => n.includes(k))) return AccountNature.ASSET;

    monitor.recordViolation('MISSING_NATURE', accountName);
    throw new ConstitutionViolationError(`Account "${accountName}" has no detectable Nature. Refusing to calculate. (Article 1/4 Violation)`);
};

export const getAccountCategory = (accountName: string, providedNature?: AccountNature): AccountCategory => {
    const nature = providedNature || getAccountNature(accountName);
    switch (nature) {
        case AccountNature.ASSET: return 'Asset';
        case AccountNature.LIABILITY: return 'Liability';
        case AccountNature.EQUITY: return 'Equity';
        case AccountNature.REVENUE: return 'Revenue'; // [FIX] Explicitly handle revenue
        case AccountNature.COGS:
        case AccountNature.SG_AND_A:
            return 'Expense';
        case AccountNature.NON_OPERATING:
            const n = normalize(accountName);
            if (['매출', '수익', '이익'].some(k => n.includes(k))) return 'Revenue';
            return 'Expense';
        default:
            // [FIX] Categorize as Asset only if keywords match, otherwise default to Expense to avoid B/S pollution
            const name = normalize(accountName);
            if (['자산', '현금', '예금', '채권', 'asset', 'cash', 'bank'].some(k => name.includes(k))) return 'Asset';
            return 'Expense';
    }
};

/**
 * Robust account matching for AR/AP detection.
 * Handles varied formatting, casing, and semantic variations.
 */
const normalize = (val: any): string => (val || '').toString().toLowerCase().replace(/\s+/g, '');

export const isArAccount = (accountName: string): boolean => {
    const n = normalize(accountName);
    const keywords = ['미수', '외상매출', '매출채권', 'receivable'];
    return keywords.some(k => n.includes(k));
};

export const isApAccount = (accountName: string): boolean => {
    const n = normalize(accountName);
    // Include '미지급', '외상매입', '매입채무', '예수금' (Withholding), 'accrued', 'payable'
    const keywords = ['미지급', '외상매입', '매입채무', '예수금', 'accrued', 'payable'];
    return keywords.some(k => n.includes(k));
};

/**
 * 🏛️ CashPolicy (Constitutional Concept)
 * Cash is not a string; it is a policy-driven object.
 */
export const CashPolicy = {
    // 1. Identification: Which accounts represent liquid cash?
    includes: (accountName: string): boolean => {
        const n = (accountName || '').toLowerCase().replace(/\s+/g, '');
        return ['예금', '현금', 'bank', 'cash'].some(k => n.includes(k));
    },

    // 2. Movement Rule: Is this an external flow or internal transfer?
    isExternalFlow: (debit: string, credit: string): 'INFLOW' | 'OUTFLOW' | 'INTERNAL' | 'NON_CASH' => {
        const isD = CashPolicy.includes(debit);
        const isC = CashPolicy.includes(credit);

        if (isD && !isC) return 'INFLOW';
        if (!isD && isC) return 'OUTFLOW';
        if (isD && isC) return 'INTERNAL';
        return 'NON_CASH';
    }
};

export const isCashAccount = CashPolicy.includes;

export const isSuspenseAccount = (accountName: string): boolean => {
    const n = normalize(accountName);
    const keywords = ['가지급금', '가수금', '전도금', 'suspense', 'pettycash'];
    return keywords.some(k => n.includes(k));
};

export const CLEARING_REASON = {
    EXP_CONFIRMED: { label: "비용 확정", code: "EXP_CONFIRMED" },
    EMPLOYEE_SETTLED: { label: "임직원 정산 완료", code: "EMPLOYEE_SETTLED" },
    ADVANCE_OFFSET: { label: "선급금 상계", code: "ADVANCE_OFFSET" },
    MISPOSTING_FIX: { label: "오분개 수정", code: "MISPOSTING_FIX" },
    REVENUE_CONFIRMED: { label: "수익 확정", code: "REVENUE_CONFIRMED" },
    CUSTOMER_IDENTIFIED: { label: "거래처 확인", code: "CUSTOMER_IDENTIFIED" },
    REFUND_COMPLETED: { label: "환불 완료", code: "REFUND_COMPLETED" },
    ERROR_CORRECTION: { label: "오류 정정", code: "ERROR_CORRECTION" },
} as const;

export const BLOCKED_REASON = {
    EVIDENCE_MISSING: { label: "증빙 누락", code: "EVIDENCE_MISSING" },
    COUNTERPARTY_DISPUTE: { label: "거래처 분쟁", code: "COUNTERPARTY_DISPUTE" },
    AMOUNT_UNCERTAIN: { label: "금액 불확정", code: "AMOUNT_UNCERTAIN" },
    POLICY_VIOLATION: { label: "규정 위반 의심", code: "POLICY_VIOLATION" },
    OTHER: { label: "기타 사유", code: "OTHER" },
} as const;

export type ClearingReasonCode = keyof typeof CLEARING_REASON;
export type BlockedReasonCode = keyof typeof BLOCKED_REASON;

export const ACCOUNT_NAMES = STANDARD_ACCOUNTS.map(a => a.name);

export const ALL_ACCOUNTS = STANDARD_ACCOUNTS.map(a => ({
    name: a.name,
    code: a.code,
    description: a.category
}));
