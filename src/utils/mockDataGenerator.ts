import { JournalEntry, EntryType } from '../types';

export const getRawMockData = () => {
    const mockEntries: Partial<JournalEntry>[] = [];

    // Data Set A: Bank Statement Scenarios
    const bankData = [
        { date: '2026-01-02', desc: '주주 자본금 납입', in: 100000000, out: 0, type: 'Equity' },
        { date: '2026-01-05', desc: 'AWS Korea', in: 0, out: 1500000, type: 'Expense' },
        { date: '2026-01-10', desc: '스타벅스 역삼점', in: 0, out: 25600, type: 'Expense' },
        { date: '2026-01-15', desc: '급여 이체 (김철수 외)', in: 0, out: 15000000, type: 'Payroll' },
        { date: '2026-01-20', desc: '이자 수익', in: 5200, out: 0, type: 'Revenue' },
    ];

    return { bankData };
};

export const generateMockBatch = () => {
    const mockEntries: Partial<JournalEntry>[] = [];
    const { bankData } = getRawMockData();

    bankData.forEach(item => {
        mockEntries.push({
            date: item.date,
            description: item.desc,
            amount: item.in > 0 ? item.in : item.out,
            vendor: item.desc.split(' ')[0],
        });
    });

    // Data Set B: Purchases (20 items)
    const suppliers = [
        { name: 'Apple Korea', desc: 'MacBook Pro M4', type: 'Asset' as EntryType },
        { name: 'Microsoft', desc: 'Office 365', type: 'Expense' as EntryType },
        { name: 'JetBrains', desc: 'IDE License', type: 'Expense' as EntryType },
        { name: 'FastFive', desc: 'Office Rent', type: 'Expense' as EntryType },
        { name: 'KT', desc: 'Internet', type: 'Expense' as EntryType },
        { name: 'SKT', desc: 'Phone', type: 'Expense' as EntryType },
        { name: 'Kim&Chang', desc: 'Legal Fee', type: 'Expense' as EntryType },
        { name: 'Samil PwC', desc: 'Consulting', type: 'Expense' as EntryType },
        { name: 'Coupang', desc: 'Office Supplies', type: 'Expense' as EntryType },
        { name: 'Baemin', desc: 'Team Dinner', type: 'Expense' as EntryType },
    ];

    for (let i = 0; i < 20; i++) {
        const s = suppliers[i % suppliers.length];
        const amount = Math.floor(Math.random() * 4990000) + 10000;
        mockEntries.push({
            date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
            description: s.desc,
            vendor: s.name,
            amount: amount,
            vat: Math.floor(amount * 0.1),
        });
    }

    // Data Set C: Sales (20 items)
    const clients = [
        'Samsung Electronics', 'Naver', 'Kakao', 'Line', 'Coupang',
        'KB Kookmin', 'Shinhan Bank', 'Toss Bank', 'Hyundai Motor', 'SK Hynix',
        'LG Energy', 'POSCO', 'Danggeun', 'Viva Republica', 'Yanolja', 'Krafton',
        'Mushinsa', 'Bucks', 'Woowa Bros', 'Market Kurly'
    ];

    clients.forEach((client, i) => {
        const amount = 272000;
        mockEntries.push({
            date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
            description: 'AuditFlow SaaS Subscription (Monthly)',
            vendor: client,
            amount: amount,
            vat: 27200,
        });
    });

    return mockEntries;
};

export const simulateAIParsing = (entry: Partial<JournalEntry>): JournalEntry => {
    let type: EntryType = 'Expense';
    let debitAccount = '소모품비';
    let creditAccount = '보통예금';

    const desc = entry.description || '';
    const amount = entry.amount || 0;

    if (desc.includes('자본금') || (amount >= 100000000 && desc.includes('납입'))) {
        type = 'Equity';
        debitAccount = '미수금'; // 미확정 시에는 납입 전 미수 처리
        creditAccount = '자본금';
    } else if (desc.includes('MacBook') || amount > 1000000) {
        type = 'Asset';
        debitAccount = '비품';
        creditAccount = '미지급금'; // 미확정 시 미지급 처리
    } else if (desc.includes('SaaS') || desc.includes('수익')) {
        type = 'Revenue';
        debitAccount = '미수금'; // 미확정 시 미수 처리
        creditAccount = '매출';
    } else if (desc.includes('급여')) {
        type = 'Payroll';
        debitAccount = '급여';
        creditAccount = '미지급급여';
    } else if (desc.includes('Rent') || desc.includes('FastFive')) {
        type = 'Expense';
        debitAccount = '임차료';
        creditAccount = '미지급금'; // 미확정 시 미지급 처리
    }

    const hasEvidence = Math.random() > 0.3; // 70% have evidence

    return {
        id: crypto.randomUUID(),
        date: entry.date || '2026-01-01',
        description: entry.description || '',
        vendor: entry.vendor || '',
        debitAccount,
        creditAccount,
        amount: entry.amount || 0,
        vat: entry.vat || 0,
        type,
        status: 'Unconfirmed',
        // Audit Readiness Mock
        version: 1,
        attachmentUrl: hasEvidence ? `https://storage.accountingflow.ai/evidence/${Math.floor(Math.random() * 1000)}.jpg` : undefined,
        ocrData: hasEvidence ? JSON.stringify({
            amount: entry.amount,
            date: entry.date,
            vendor: entry.vendor
        }) : undefined
    };
};
