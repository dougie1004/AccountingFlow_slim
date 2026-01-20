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
            description: 'AccountingFlow SaaS Subscription (Monthly)',
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
    let vendor = entry.vendor || '';
    let amount = entry.amount || 0;

    const desc = entry.description || '';

    // Simple heuristic for vendor and amount if they are in the description
    if (!vendor && !amount) {
        // Try to find a number as amount
        const amountMatch = desc.match(/[\d,]+/);
        if (amountMatch) {
            amount = parseInt(amountMatch[0].replace(/,/g, ''));
        }

        // Mock vendor and amount if it's an attachment
        if (desc.includes('[Attached:')) {
            const mockVendors = ['배달의민족', '스타벅스', '쿠팡', '네이버페이', '카카오모빌리티'];
            vendor = mockVendors[Math.floor(Math.random() * mockVendors.length)];
            if (!amount) amount = Math.floor(Math.random() * 50000) + 5000;

            // Extract date from filename if it matches KakaoTalk_YYYYMMDD
            const dateMatch = desc.match(/KakaoTalk_(\d{4})(\d{2})(\d{2})/);
            if (dateMatch) {
                entry.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
            }
        }
    }

    if (desc.includes('자본금') || (amount >= 100000000 && desc.includes('납입'))) {
        type = 'Equity';
        debitAccount = '보통예금';
        creditAccount = '자본금';
    } else if (desc.includes('MacBook') || (desc.includes('Asset') && amount > 1000000)) {
        type = 'Asset';
        debitAccount = '비품';
        creditAccount = '보통예금';
    } else if (desc.includes('SaaS') || desc.includes('수수료수익') || desc.includes('이자')) {
        type = 'Revenue';
        debitAccount = '보통예금';
        creditAccount = desc.includes('이자') ? '이자수익' : '상품매출';
    } else if (desc.includes('급여')) {
        type = 'Payroll';
        debitAccount = '급여';
        creditAccount = '보통예금';
    } else if (desc.includes('Rent') || desc.includes('FastFive')) {
        type = 'Expense';
        debitAccount = '임차료';
        creditAccount = '보통예금';
    } else if (desc.includes('AWS') || desc.includes('스타벅스')) {
        type = 'Expense';
        debitAccount = '소모품비';
        creditAccount = '보통예금';
    }

    const hasEvidence = desc.includes('[Attached:') || Math.random() > 0.3;

    return {
        id: crypto.randomUUID(),
        date: entry.date || new Date().toISOString().split('T')[0],
        description: entry.description || '',
        vendor: vendor || '일반거래',
        debitAccount,
        creditAccount,
        amount: amount,
        vat: entry.vat || Math.floor(amount * 0.1 / 1.1),
        type,
        status: 'Unconfirmed',
        version: 1,
        attachmentUrl: hasEvidence ? `https://storage.accountingflow.ai/evidence/${Math.floor(Math.random() * 1000)}.jpg` : undefined,
        ocrData: hasEvidence ? JSON.stringify({
            amount: amount,
            date: entry.date,
            vendor: vendor
        }) : undefined
    };
};

export const generateShowcaseData = (): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // 1. Initial Capital Injection (Series A)
    entries.push({
        id: 'DEMO-001',
        date: threeMonthsAgo.toISOString().split('T')[0],
        description: '[Series A] 신규 투자금 납입 (Antigravity VC)',
        vendor: 'Antigravity VC',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        amount: 2000000000, // 20억
        vat: 0,
        type: 'Equity',
        status: 'Approved'
    });

    // 2. Heavy R&D Payroll (to showcase capitalization)
    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 25);
        entries.push({
            id: `DEMO-RD-${i}`,
            date: monthDate.toISOString().split('T')[0],
            description: `[R&D] 연구소 인력 급여 및 개발비용 - ${monthDate.getMonth() + 1}월`,
            vendor: '임직원 급여',
            debitAccount: '급여',
            creditAccount: '보통예금',
            amount: 150000000, // Monthly 1.5억
            vat: 0,
            type: 'Payroll',
            status: 'Approved'
        });
    }

    // 3. SaaS Sales Growth
    for (let i = 0; i < 30; i++) {
        const date = new Date(threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()));
        const amount = 5000000 + Math.random() * 10000000;
        entries.push({
            id: `DEMO-SALE-${i}`,
            date: date.toISOString().split('T')[0],
            description: 'Enterprise SaaS Solution License - Yearly',
            vendor: ['Samsung', 'LG', 'SK', 'Hyundai'][i % 4] + ' Group',
            debitAccount: '보통예금',
            creditAccount: '상품매출',
            amount: amount,
            vat: amount * 0.1,
            type: 'Revenue',
            status: 'Approved'
        });
    }

    // 4. Clean Operating Expenses
    const vendors = ['AWS Korea', 'Slack', 'ChatGPT Enterprise', 'FastFive'];
    for (let i = 0; i < 15; i++) {
        const date = new Date(threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()));
        entries.push({
            id: `DEMO-EXP-${i}`,
            date: date.toISOString().split('T')[0],
            description: vendors[i % vendors.length] + ' Monthly Subscription',
            vendor: vendors[i % vendors.length],
            debitAccount: '소모품비',
            creditAccount: '보통예금',
            amount: 2000000 + Math.random() * 5000000,
            vat: 200000,
            type: 'Expense',
            status: 'Approved',
            attachmentUrl: 'https://demo.accountingflow.ai/receipt.jpg'
        });
    }

    return entries;
};
