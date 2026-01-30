/**
 * AccountingFlow Standard Chart of Accounts (COA)
 * Defines the single source of truth for account properties.
 */

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface AccountDef {
    name: string;
    category: AccountCategory;
    description?: string;
    english?: string; // For compatibility
}

export const STANDARD_ACCOUNTS: AccountDef[] = [
    // --- Assets (자산) ---
    { name: '현금', category: 'Asset', english: 'Cash' },
    { name: '보통예금', category: 'Asset', english: 'Bank' },
    { name: '외상매출금', category: 'Asset', english: 'Accounts Receivable' },
    { name: '미수금', category: 'Asset', english: 'Other Receivables' },
    { name: '상품', category: 'Asset', english: 'Inventory (Merchandise)' },
    { name: '매출원가', category: 'Expense' }, // COGS is Expense, but treated specially
    { name: '비품', category: 'Asset', english: 'Equipment' },
    { name: '기계장치', category: 'Asset', english: 'Machinery' },
    { name: '건물', category: 'Asset', english: 'Building' },
    { name: '토지', category: 'Asset', english: 'Land' },
    { name: '차량운반구', category: 'Asset', english: 'Vehicles' },
    { name: '부가가치세대급금', category: 'Asset', english: 'VAT Asset' },
    { name: '선급금', category: 'Asset', english: 'Prepayments' },
    { name: '선급비용', category: 'Asset', english: 'Prepaid Expense' },
    { name: '보증금', category: 'Asset', english: 'Deposits' },
    { name: '사용권자산', category: 'Asset', english: 'RoU Asset' },
    // Contra-Assets
    { name: '감가상각누계액', category: 'Asset' }, // Usually Credit balance, but classified as Asset (Contra)
    { name: '사용권자산누계액', category: 'Asset' },

    // --- Liabilities (부채) ---
    { name: '외상매입금', category: 'Liability', english: 'Accounts Payable' },
    { name: '미지급금', category: 'Liability', english: 'Other Payables' },
    { name: '미지급비용', category: 'Liability', english: 'Accrued Expense' },
    { name: '부가가치세예수금', category: 'Liability', english: 'VAT Liability' },
    { name: '예수금(원천세)', category: 'Liability', english: 'Withholding Tax' },
    { name: '예수금', category: 'Liability', english: 'Withholding Tax' },
    { name: '단기차입금', category: 'Liability', english: 'Short-term Loan' },
    { name: '장기차입금', category: 'Liability', english: 'Long-term Loan' },
    { name: '리스부채', category: 'Liability', english: 'Lease Liability' },
    { name: '임대보증금', category: 'Liability', english: 'Leasehold Deposit' },
    { name: '선수금', category: 'Liability', english: 'Advances Received' },
    { name: '미지급법인세', category: 'Liability', english: 'Tax Payable' },

    // --- Equity (자본) ---
    { name: '자본금', category: 'Equity', english: 'Capital Stock' },
    { name: '이익잉여금', category: 'Equity', english: 'Retained Earnings' },
    { name: '자본잉여금', category: 'Equity', english: 'Capital Surplus' },
    { name: '집합손익', category: 'Equity', english: 'Income Summary' }, // Temporary Equity

    // --- Revenue (수익) ---
    { name: '상품매출', category: 'Revenue', english: 'Sales Revenue' },
    { name: '제품매출', category: 'Revenue', english: 'Sales Revenue' },
    { name: '서비스매출', category: 'Revenue', english: 'Service Revenue' },
    { name: '이자수익', category: 'Revenue', english: 'Interest Income' },
    { name: '잡이익', category: 'Revenue', english: 'Misc Income' },

    // --- Expenses (비용) ---
    { name: '급여', category: 'Expense' },
    { name: '퇴직급여', category: 'Expense' },
    { name: '복리후생비', category: 'Expense' },
    { name: '여비교통비', category: 'Expense' },
    { name: '접대비', category: 'Expense' },
    { name: '통신비', category: 'Expense' },
    { name: '수도광열비', category: 'Expense' },
    { name: '세금과공과', category: 'Expense' },
    { name: '지급임차료', category: 'Expense' },
    { name: '수선비', category: 'Expense' },
    { name: '보험료', category: 'Expense' },
    { name: '운반비', category: 'Expense' },
    { name: '교육훈련비', category: 'Expense' },
    { name: '도서인쇄비', category: 'Expense' },
    { name: '소모품비', category: 'Expense' },
    { name: '지급수수료', category: 'Expense' },
    { name: '광고선전비', category: 'Expense' },
    { name: '감가상각비', category: 'Expense' },
    { name: '대손상각비', category: 'Expense' },
    { name: '이자비용', category: 'Expense' },
    { name: '법인세비용', category: 'Expense' },
    { name: '잡손실', category: 'Expense' },
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

export const ACCOUNT_NAMES = STANDARD_ACCOUNTS.map(a => a.name);

export const ALL_ACCOUNTS = STANDARD_ACCOUNTS.map(a => ({
    name: a.name,
    code: a.name,
    description: a.category
}));
