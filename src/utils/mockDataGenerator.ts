import { JournalEntry, EntryType } from '../types';

// Comprehensive Mock Data Generator
// Generates data for: B/S, P/L, Cash Flow, SCM, Inventory, Assets, Tax, and Partners

export const generateComprehensiveMockData = () => {
    const entries: Partial<JournalEntry>[] = [];
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);

    // Helpers
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const randomDate = (start: Date, end: Date) => {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };

    // 1. Initial Equity (Capital Injection) - Foundation for B/S
    entries.push({
        date: formatDate(yearStart),
        description: '초기 자본금 납입 (주주배정 유상증자)',
        vendor: 'Initial Investors',
        amount: 500000000, // 5억
        vat: 0,
        type: 'Equity',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        status: 'Approved'
    });

    // 2. Fixed Assets (For Asset Management & Depreciation)
    const assets = [
        { name: 'MacBook Pro M3 Max (Dev Team)', cost: 45000000, date: '2026-01-05' },
        { name: 'Office Furniture Set', cost: 12000000, date: '2026-01-10' },
        { name: 'Server Rack Equipments', cost: 85000000, date: '2026-01-15' },
        { name: 'Corporate Vehicle (Genesis GV80)', cost: 95000000, date: '2026-01-20' }
    ];

    assets.forEach((asset, idx) => {
        // Purchase entry
        entries.push({
            date: asset.date,
            description: `고정자산 취득 - ${asset.name}`,
            vendor: idx === 3 ? 'Hyundai Motors' : 'Apple/Ikea/Dell',
            amount: asset.cost,
            vat: Math.floor(asset.cost * 0.1),
            type: 'Asset',
            debitAccount: idx === 3 ? '차량운반구' : (idx === 1 ? '비품' : '공구기구'),
            creditAccount: '미지급금', // Initially AP
            status: 'Approved'
        });

        // Payment entry (Cash Out)
        entries.push({
            date: formatDate(new Date(new Date(asset.date).getTime() + 86400000 * 5)), // paid 5 days later
            description: `고정자산 대금 지급 - ${asset.name}`,
            vendor: idx === 3 ? 'Hyundai Motors' : 'Apple/Ikea/Dell',
            amount: asset.cost + Math.floor(asset.cost * 0.1),
            vat: 0,
            type: 'Liability',
            debitAccount: '미지급금',
            creditAccount: '보통예금',
            status: 'Approved'
        });
    });

    // 3. SCM & Inventory (Purchase of Goods)
    const materials = [
        { item: 'GPU Chipset A100', cost: 2000000, qty: 50, vendor: 'NVIDIA Corp' },
        { item: 'Server Chassis', cost: 500000, qty: 100, vendor: 'Supermicro' },
        { item: 'Cooling System', cost: 300000, qty: 200, vendor: 'Samsung Electro' }
    ];

    materials.forEach(mat => {
        const totalCost = mat.cost * mat.qty;
        const date = formatDate(randomDate(yearStart, today));
        entries.push({
            date,
            description: `원자재 매입 - ${mat.item} (${mat.qty} ea)`,
            vendor: mat.vendor,
            amount: totalCost,
            vat: totalCost * 0.1,
            type: 'Expense', // Classified as Expense initially, but Logic should map to Inventory later
            debitAccount: '원재료', // Correct inventory account
            creditAccount: '외상매입금',
            status: 'Approved',
            // Mock OCR Data for SCM
            ocrData: JSON.stringify({ item: mat.item, quantity: mat.qty, unitPrice: mat.cost })
        });
    });

    // 4. Sales Activity (Revenue) - multiple transactions
    const clients = ['Google Korea', 'Naver Cloud', 'Kakao Enterprise', 'LG CNS', 'Samsung SDS'];
    for (let i = 0; i < 30; i++) {
        const client = clients[i % clients.length];
        const contractAmount = 10000000 + Math.floor(Math.random() * 50000000);
        const date = formatDate(randomDate(yearStart, today));

        entries.push({
            date,
            description: `Cloud Service Fee - ${client} (Project #${i + 100})`,
            vendor: client,
            amount: contractAmount,
            vat: contractAmount * 0.1,
            type: 'Revenue',
            debitAccount: '외상매출금',
            creditAccount: '매출',
            status: 'Approved'
        });

        // Collection (Cash In) for 70% of them
        if (Math.random() > 0.3) {
            entries.push({
                date: formatDate(new Date(new Date(date).getTime() + 86400000 * 15)),
                description: `매출채권 입금 - ${client}`,
                vendor: client,
                amount: contractAmount * 1.1, // including VAT
                vat: 0,
                type: 'Asset',
                debitAccount: '보통예금',
                creditAccount: '외상매출금',
                status: 'Approved'
            });
        }
    }

    // 5. Operating Expenses & Tax Adjustments Trigger
    // Entertainment (Limit Check)
    for (let i = 0; i < 10; i++) {
        entries.push({
            date: formatDate(randomDate(yearStart, today)),
            description: '거래처 접대비 (Dinner meeting)',
            vendor: 'Gangnam Dining',
            amount: 450000,
            vat: 45000,
            type: 'Expense',
            debitAccount: '접대비',
            creditAccount: '법인카드(미지급금)',
            status: 'Approved'
        });
    }

    // R&D Expenses (Advanced Ledger)
    entries.push({
        date: formatDate(randomDate(yearStart, today)),
        description: 'AI Model Training Costs (AWS P4 instances)',
        vendor: 'AWS',
        amount: 85000000,
        vat: 8500000,
        type: 'Expense',
        debitAccount: '경상연구개발비',
        creditAccount: '보통예금',
        status: 'Approved'
    });

    // Foreign Exchange (Advanced Ledger)
    entries.push({
        date: formatDate(randomDate(yearStart, today)),
        description: 'Foreign Exchange Loss (USD Payment)',
        vendor: 'Forex Market',
        amount: 1200000,
        vat: 0,
        type: 'Expense',
        debitAccount: '외환차손',
        creditAccount: '보통예금',
        status: 'Approved'
    });

    return entries;
};

// Deprecated: kept for backward compatibility if needed, but aliased
export const getRawMockData = () => ({ bankData: [] });
export const generateMockBatch = generateComprehensiveMockData;

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
