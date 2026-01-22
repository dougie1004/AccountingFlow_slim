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

    // 1. Initial Compass Capital (Seed & Series A)
    entries.push({
        date: formatDate(yearStart),
        description: '초기 자본금 납입 (주주배정 유상증자)',
        vendor: 'Initial Investors',
        amount: 2000000000, // 20억 (Starts big for manufacturing)
        vat: 0,
        type: 'Equity',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        status: 'Approved'
    });

    // 2. Manufacturing Assets (Factory & Equipment)
    const assets = [
        { name: 'SMT Assembly Line Alpha', cost: 450000000, date: '2026-01-05', account: '기계장치' },
        { name: 'Precision Optical Inspection (AOI)', cost: 120000000, date: '2026-01-08', account: '기계장치' },
        { name: 'Aging Test Chamber', cost: 55000000, date: '2026-01-12', account: '비품' },
        { name: 'Logistics Forklift (Electric)', cost: 35000000, date: '2026-01-15', account: '차량운반구' }
    ];

    assets.forEach((asset, idx) => {
        // Purchase
        entries.push({
            date: asset.date,
            description: `설비 취득 - ${asset.name}`,
            vendor: 'Hanwha Precision',
            amount: asset.cost,
            vat: Math.floor(asset.cost * 0.1),
            type: 'Asset',
            debitAccount: asset.account,
            creditAccount: '미지급금',
            status: 'Approved'
        });

        // Payment
        entries.push({
            date: formatDate(new Date(new Date(asset.date).getTime() + 86400000 * 10)),
            description: `설비 잔금 지급 - ${asset.name}`,
            vendor: 'Hanwha Precision',
            amount: asset.cost + Math.floor(asset.cost * 0.1),
            vat: 0,
            type: 'Liability',
            debitAccount: '미지급금',
            creditAccount: '보통예금',
            status: 'Approved'
        });
    });

    // 3. Raw Materials (SCM - AI Server Components)
    const rawMaterials = [
        { item: 'NVIDIA H100 GPU', cost: 45000000, qty: 10, vendor: 'NVIDIA Corp' },
        { item: 'Intel Xeon Platinum 8480', cost: 15000000, qty: 20, vendor: 'Intel Korea' },
        { item: 'Samsung DDR5 128GB ECC', cost: 800000, qty: 200, vendor: 'Samsung Electronics' },
        { item: 'Server Chassis 4U-Rack', cost: 450000, qty: 50, vendor: 'Supermicro' },
        { item: 'Liquid Cooling Kit', cost: 1200000, qty: 50, vendor: 'CoolIT Systems' }
    ];

    rawMaterials.forEach(mat => {
        const totalCost = mat.cost * mat.qty;
        const date = formatDate(randomDate(yearStart, today));
        entries.push({
            date,
            description: `원자재 매입 - ${mat.item} (${mat.qty} units)`,
            vendor: mat.vendor,
            amount: totalCost,
            vat: totalCost * 0.1,
            type: 'Expense', // Will be reclassified as Inventory in context logic usually, but here mapped as cost initially
            debitAccount: '원재료', // Raw Materials
            creditAccount: '외상매입금',
            status: 'Approved',
            ocrData: JSON.stringify({ item: mat.item, quantity: mat.qty, unitPrice: mat.cost })
        });
    });

    // 4. Manufacturing Process (WIP -> Finished Goods)
    const productionProducts = ['Hyperscale Server KE-100', 'Edge Inference Gateway', 'NVMoF Storage Array'];
    // To prevent negative inventory, we must produce goods before selling them.
    for (let i = 0; i < 20; i++) {
        const product = productionProducts[i % productionProducts.length];
        const date = formatDate(randomDate(yearStart, today));

        // Material Usage & Production
        const productionCost = 150000000 + Math.floor(Math.random() * 100000000);

        entries.push({
            date,
            description: `[생산] 제품 입고 - ${product} (Lot #${i + 100})`,
            vendor: 'Internal Production',
            amount: productionCost,
            vat: 0,
            type: 'Asset', // Inventory Increase
            debitAccount: '제품', // Finished Goods
            creditAccount: '재공품', // Credit WIP (Simplified: assume WIP exists or credit Raw Materials directly in simple mock)
            status: 'Approved'
        });

        // Simplified: Material Consumption Entry to offset Purchase
        entries.push({
            date,
            description: `[생산] 원재료 불출 - ${product}`,
            vendor: 'Internal Production',
            amount: Math.floor(productionCost * 0.6), // 60% Material
            vat: 0,
            type: 'Asset', // Inventory Decrease
            debitAccount: '재공품', // Debit WIP
            creditAccount: '원재료', // Credit Raw Materials
            status: 'Approved'
        });
    }

    // 5. Finished Goods Sales (Revenue - AI Servers & Storage)
    const productionProductsList = ['Hyperscale Server KE-100', 'Edge Inference Gateway', 'NVMoF Storage Array'];
    const clientList = ['Naver Cloud Platform', 'Kakao Enterprise', 'KT Cloud', 'Samsung SDS', 'SK C&C'];

    for (let i = 0; i < 20; i++) {
        const client = clientList[i % clientList.length];
        const product = productionProductsList[i % productionProductsList.length];
        // High value B2B sales - Enterprise Scale
        const contractAmount = 250000000 + Math.floor(Math.random() * 300000000);
        const date = formatDate(randomDate(yearStart, today));

        // Sales Entry
        entries.push({
            date,
            description: `제품 매출 - ${product} (Supply Contract #${i + 200})`,
            vendor: client,
            amount: contractAmount,
            vat: contractAmount * 0.1,
            type: 'Revenue',
            debitAccount: '외상매출금',
            creditAccount: '제품매출', // Product Sales
            status: 'Approved'
        });

        // COGS Entry (Standard Costing Simulation)
        const estimatedCost = Math.floor(contractAmount * 0.72); // 72% Cost Ratio (High HW Cost)
        entries.push({
            date,
            description: `매출원가 대체 - ${product}`,
            vendor: 'Internal Strategy Div',
            amount: estimatedCost,
            vat: 0,
            type: 'Expense',
            debitAccount: '매출원가', // COGS
            creditAccount: '제품', // Finished Goods
            status: 'Approved'
        });

        // Collection
        if (Math.random() > 0.4) {
            entries.push({
                date: formatDate(new Date(new Date(date).getTime() + 86400000 * 30)),
                description: `매출채권 수금 - ${client} (전자어음/현금)`,
                vendor: client,
                amount: contractAmount * 1.1,
                vat: 0,
                type: 'Asset',
                debitAccount: '보통예금',
                creditAccount: '외상매출금',
                status: 'Approved'
            });
        }
    }

    // 5. Manufacturing Expenses
    // Electricity for factory
    for (let i = 0; i < 6; i++) {
        entries.push({
            date: `2026-0${i + 1}-25`,
            description: '공장 산업용 전력비',
            vendor: 'KEPCO',
            amount: 15000000 + Math.random() * 2000000,
            vat: 1500000,
            type: 'Expense',
            debitAccount: '전력비', // Manufacturing Overhead
            creditAccount: '미지급금',
            status: 'Approved'
        });
    }

    // Logistics
    for (let i = 0; i < 10; i++) {
        entries.push({
            date: formatDate(randomDate(yearStart, today)),
            description: '제품 운송 및 통관비',
            vendor: 'CJ Logistics Global',
            amount: 2500000,
            vat: 250000,
            type: 'Expense',
            debitAccount: '운반비',
            creditAccount: '미지급금',
            status: 'Approved'
        });
    }

    return entries;
};

// Deprecated: kept for backward compatibility if needed, but aliased
export const getRawMockData = () => ({
    bankData: [
        { date: '2026-01-20', desc: '삼성증권 배당금', in: 150000, out: 0, type: 'Dividend' },
        { date: '2026-01-21', desc: '임차료 납부 - 에이전트 오피스', in: 0, out: 2500000, type: 'Rent' },
        { date: '2026-01-22', desc: '쿠팡플레이 정기결제', in: 0, out: 4900, type: 'Subscription' },
    ]
});
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
