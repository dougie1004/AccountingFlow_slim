/**
 * AccountingFlow Standard Chart of Accounts (COA)
 */

export const STANDARD_ACCOUNTS = [
    // Assets (자산)
    { name: '현금', category: 'Asset' },
    { name: '보통예금', category: 'Asset' },
    { name: '외상매출금', category: 'Asset' },
    { name: '미수금', category: 'Asset' },
    { name: '상품', category: 'Asset' },
    { name: '재공품', category: 'Asset' },
    { name: '원재료', category: 'Asset' },
    { name: '비품', category: 'Asset' },
    { name: '기계장치', category: 'Asset' },
    { name: '차량운반구', category: 'Asset' },
    { name: '건물', category: 'Asset' },
    { name: '토지', category: 'Asset' },
    { name: '부가가치세대급금', category: 'Asset' },
    { name: '선급금', category: 'Asset' },
    { name: '소모품', category: 'Asset' },

    // Liabilities (부채)
    { name: '외상매입금', category: 'Liability' },
    { name: '미지급금', category: 'Liability' },
    { name: '미지급비용', category: 'Liability' },
    { name: '부가가치세예수금', category: 'Liability' },
    { name: '단기차입금', category: 'Liability' },
    { name: '장기차입금', category: 'Liability' },
    { name: '예수금(급여)', category: 'Liability' },
    { name: '선수금', category: 'Liability' },

    // Equity (자본)
    { name: '자본금', category: 'Equity' },
    { name: '이익잉여금', category: 'Equity' },
    { name: '자본잉여금', category: 'Equity' },

    // Revenue (수익)
    { name: '상품매출', category: 'Revenue' },
    { name: '제품매출', category: 'Revenue' },
    { name: '이자수익', category: 'Revenue' },
    { name: '잡이익', category: 'Revenue' },

    // Expenses (비용)
    { name: '급여', category: 'Expense' },
    { name: '퇴직급여', category: 'Expense' },
    { name: '복리후생비', category: 'Expense' },
    { name: '임차료', category: 'Expense' },
    { name: '통신비', category: 'Expense' },
    { name: '수도광열비', category: 'Expense' },
    { name: '세금과공과', category: 'Expense' },
    { name: '감가상각비', category: 'Expense' },
    { name: '지급임차료', category: 'Expense' },
    { name: '여비교통비', category: 'Expense' },
    { name: '접대비', category: 'Expense' },
    { name: '광고선전비', category: 'Expense' },
    { name: '이자비용', category: 'Expense' },
    { name: '잡손실', category: 'Expense' },
    { name: '소모품비', category: 'Expense' },
    { name: '수선비', category: 'Expense' },
    { name: '보험료', category: 'Expense' },
    { name: '지급수수료', category: 'Expense' },
    { name: '운반비', category: 'Expense' },
];

export const ACCOUNT_NAMES = STANDARD_ACCOUNTS.map(a => a.name);

export const ALL_ACCOUNTS = STANDARD_ACCOUNTS.map(a => ({
    name: a.name,
    code: a.name, // Use name as code for guaranteed uniqueness in suggestions
    description: a.category
}));


