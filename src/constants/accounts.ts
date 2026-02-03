/**
 * AccountingFlow Standard Chart of Accounts (COA)
 * Defines the single source of truth for account properties.
 */

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface AccountDef {
    name: string;
    category: AccountCategory;
    description?: string;
    english?: string;
    sortOrder: number; // For Liquid -> Fixed ordering
}

export const STANDARD_ACCOUNTS: AccountDef[] = [
    // --- Assets (자산) ---
    { name: '현금', category: 'Asset', english: 'Cash', sortOrder: 10 },
    { name: '보통예금', category: 'Asset', english: 'Bank', sortOrder: 20 },
    { name: '외상매출금', category: 'Asset', english: 'Accounts Receivable', sortOrder: 30 },
    { name: '미수금', category: 'Asset', english: 'Other Receivables', sortOrder: 40 },
    { name: '선급금', category: 'Asset', english: 'Prepayments', sortOrder: 50 },
    { name: '선급비용', category: 'Asset', english: 'Prepaid Expense', sortOrder: 60 },
    { name: '상품', category: 'Asset', english: 'Inventory (Merchandise)', sortOrder: 70 },
    { name: '부가가치세대급금', category: 'Asset', english: 'VAT Asset', sortOrder: 80 },
    { name: '가지급금', category: 'Asset', english: 'Suspense Payments', sortOrder: 90 },
    { name: '비품', category: 'Asset', english: 'Equipment', sortOrder: 100 },
    { name: '기계장치', category: 'Asset', english: 'Machinery', sortOrder: 110 },
    { name: '차량운반구', category: 'Asset', english: 'Vehicles', sortOrder: 120 },
    { name: '건물', category: 'Asset', english: 'Building', sortOrder: 130 },
    { name: '보증금', category: 'Asset', english: 'Deposits', sortOrder: 140 },
    { name: '감가상각누계액', category: 'Asset', sortOrder: 150 },

    // --- Liabilities (부채) ---
    { name: '외상매입금', category: 'Liability', english: 'Accounts Payable', sortOrder: 210 },
    { name: '미지급금', category: 'Liability', english: 'Other Payables', sortOrder: 220 },
    { name: '예수금', category: 'Liability', english: 'Withholding Tax', sortOrder: 230 },
    { name: '부가가치세예수금', category: 'Liability', english: 'VAT Liability', sortOrder: 240 },
    { name: '선수금', category: 'Liability', english: 'Advances Received', sortOrder: 250 },
    { name: '가수금', category: 'Liability', english: 'Suspense Receipts', sortOrder: 260 },
    { name: '단기차입금', category: 'Liability', english: 'Short-term Loan', sortOrder: 270 },
    { name: '장기차입금', category: 'Liability', english: 'Long-term Loan', sortOrder: 280 },

    // --- Equity (자본) ---
    { name: '자본금', category: 'Equity', english: 'Capital Stock', sortOrder: 310 },
    { name: '이익잉여금', category: 'Equity', english: 'Retained Earnings', sortOrder: 320 },

    // --- Revenue (수익) ---
    { name: '매출', category: 'Revenue', english: 'Sales Revenue', sortOrder: 410 },
    { name: '이자수익', category: 'Revenue', english: 'Interest Income', sortOrder: 420 },

    // --- Expenses (비용) ---
    { name: '매출원가', category: 'Expense', sortOrder: 510 },
    { name: '급여', category: 'Expense', sortOrder: 520 },
    { name: '복리후생비', category: 'Expense', sortOrder: 530 },
    { name: '임차료', category: 'Expense', sortOrder: 540 },
    { name: '지급수수료', category: 'Expense', sortOrder: 550 },
    { name: '감가상각비', category: 'Expense', sortOrder: 560 },
    { name: '광고선전비', category: 'Expense', sortOrder: 570 },
    { name: '소모품비', category: 'Expense', sortOrder: 580 },
    { name: ' 여비교통비', category: 'Expense', sortOrder: 590 },
];

/**
 * Metadata-driven Account Nature Resolver.
 * Replaces string-parsing logic in the engine.
 */
export const getAccountCategory = (accountName: string): AccountCategory => {
    // 1. Exact Match from Master (Full Name)
    let found = STANDARD_ACCOUNTS.find(a => a.name === accountName);
    if (found) return found.category;

    // 2. Exact Match from Master (Clean Name without suffixes like ' (English)')
    const cleanName = accountName.split('(')[0].trim();
    found = STANDARD_ACCOUNTS.find(a => a.name === cleanName);
    if (found) return found.category;

    const n = accountName.toLowerCase();

    // 3. Fallback Rules (Keyword-based for Custom Accounts)
    // P/L keywords are ignored if the account implies BS nature (Payable, Receivable, Prepaid)
    const isBSNature = ['미지급', '선급', '미수', '선수', '보증금', '충당부채', '예수금', '부채', '채무'].some(k => n.includes(k));

    if (isBSNature) {
        if (['미지급', '예수금', '부채', '차입금', '선수', '충당부채', '채무', 'payable', 'liability'].some(k => n.includes(k))) return 'Liability';
        return 'Asset';
    }

    if (['매출', '수익', '이익', 'revenue', 'income'].some(k => n.includes(k))) return 'Revenue';
    if (['비용', '급여', '원가', '상각', '손실', '세금', '공과', '임차료', '수수료', '보험료', '운반비', '접대비', '리스료', '식대', '식사', '회식', '카페', '커피', '교통', '차량', '기름', '유류', '보험', '수리', '교육', '도서', '인쇄', '소모품', '광고', '전기', '수도', '가스', '통신', '전화', '인터넷', '우편', '택배', '수선', '여비', '방역', '소독', '청소', '폐기물', '사무용품', '주차', '출장', '협회', '가입', '가입비', '등록비', '증식', '수익', 'expense', 'cost', 'fee'].some(k => n.includes(k))) return 'Expense';

    // Default fallback
    return 'Asset';
}

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

export const isCashAccount = (accountName: string): boolean => {
    const n = normalize(accountName);
    const keywords = ['예금', '현금', 'bank', 'cash'];
    return keywords.some(k => n.includes(k));
};

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
    code: a.name,
    description: a.category
}));
