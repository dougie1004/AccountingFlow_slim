import { JournalEntry, EntryType, SimulationResult, Asset, Order, InventoryItem, Partner, TaxAdjustment } from '../types';

// Unified System-Wide Mock Data Generator
// This generates a consistent "Enterprise Dataset" that populates all modules.

export const generateSystemWideMockData = (): SimulationResult => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const ensureIntegrity = (entry: any): JournalEntry => ({
        ...entry,
        ledgerType: entry.status === 'Approved' ? 'Official' : 'Candidate',
        auditTrail: entry.auditTrail || [`System: Initialized as ${entry.status}`],
        postedBy: entry.status === 'Approved' ? 'SYSTEM_ADMIN' : undefined,
        postedAt: entry.status === 'Approved' ? new Date().toISOString() : undefined,
    });

    const ledger: JournalEntry[] = [];
    const assets: Asset[] = [];
    const orders: Order[] = [];
    const inventory: InventoryItem[] = [];
    const partners: Partner[] = [];
    const adjustments: TaxAdjustment[] = [];

    // --- 1. Partners ---
    const rawPartners: Partial<Partner>[] = [
        { id: 'PART-001', name: 'Antigravity VC', partnerType: 'Vendor', partnerCode: 'VC-001', status: 'Approved' },
        { id: 'PART-002', name: 'Hanwha Precision', partnerType: 'Vendor', partnerCode: 'MACH-01', status: 'Approved' },
        { id: 'PART-003', name: 'NVIDIA Corp', partnerType: 'Vendor', partnerCode: 'GPU-01', status: 'Approved' },
        { id: 'PART-004', name: 'Naver Cloud Platform', partnerType: 'Customer', partnerCode: 'CUST-01', status: 'Approved' },
        { id: 'PART-005', name: 'Samsung SDS', partnerType: 'Customer', partnerCode: 'CUST-02', status: 'Approved' },
        { id: 'PART-006', name: 'AWS Korea', partnerType: 'Vendor', partnerCode: 'CLD-01', status: 'Approved' },
        { id: 'PART-007', name: 'Forex', partnerType: 'Vendor', partnerCode: 'FX-01', status: 'Approved' },
        { id: 'PART-008', name: 'New Startup Partner', partnerType: 'Vendor', status: 'Pending' }, // For Governance
    ];
    rawPartners.forEach(p => partners.push({
        id: p.id || crypto.randomUUID(),
        name: p.name || '',
        partnerType: p.partnerType || 'Vendor',
        partnerCode: p.partnerCode,
        status: p.status as any || 'Pending',
        tags: ['Simulation', p.partnerType === 'Customer' ? 'Enterprise' : 'Infrastructure']
    }));

    // --- 2. Fixed Assets ---
    const fixedAssetData = [
        { name: 'SMT Assembly Line Alpha', cost: 450000000, date: '2025-11-05', account: '기계장치' },
        { name: 'Precision Optical Inspection (AOI)', cost: 120000000, date: '2025-11-08', account: '기계장치' },
        { name: 'R&D High-Perf Server Farm', cost: 250000000, date: '2025-11-20', account: '비품' },
    ];

    fixedAssetData.forEach((fa, idx) => {
        const id = `ASSET-${FaToId(fa.name)}`;
        assets.push({
            id,
            name: fa.name,
            acquisitionDate: fa.date,
            cost: fa.cost,
            depreciationMethod: 'STRAIGHT_LINE',
            usefulLife: 5,
            residualValue: 0,
            accumulatedDepreciation: Math.floor(fa.cost / 60) * 2, // 2 months dep
            currentValue: fa.cost - (Math.floor(fa.cost / 60) * 2),
            quantity: 1
        });

        // Add to Ledger (Acquisition)
        ledger.push(ensureIntegrity({
            id: `LEG-FA-${idx}`,
            date: fa.date,
            description: `고정자산 취득 - ${fa.name}`,
            vendor: 'Hanwha Precision',
            debitAccount: fa.account,
            creditAccount: '미지급금',
            amount: fa.cost,
            vat: fa.cost * 0.1,
            type: 'Asset',
            status: 'Approved'
        }));

        // Add to Ledger (Accumulated Depreciation - Simulation for reconciliation)
        const accDep = Math.floor(fa.cost / 60) * 2;
        ledger.push(ensureIntegrity({
            id: `LEG-FA-DEP-${idx}`,
            date: formatDate(now),
            description: `감가상각비 계상 - ${fa.name} (누계액 반영)`,
            vendor: '재무회계팀 (AI 자동결산)',
            debitAccount: '감가상각비',
            creditAccount: fa.account === '기계장치' ? '감가상각누계액(기)' : '감가상각누계액(비)',
            amount: accDep,
            vat: 0,
            type: 'Expense',
            status: 'Approved'
        }));
    });

    // --- 3. Inventory & SCM ---
    const inventoryItems = [
        { id: 'INV-GPU-H100', name: 'NVIDIA H100 GPU', sku: 'GPU-H100-80G', category: 'Raw Materials', cost: 45000000 },
        { id: 'INV-SRV-KE100', name: 'Hyperscale Server KE-100', sku: 'SRV-KE100-ENT', category: 'Finished Goods', cost: 180000000 },
    ];

    inventoryItems.forEach(item => {
        inventory.push({
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            valuationMethod: 'FIFO',
            batches: [
                { id: `BATCH-${item.sku}-01`, acquisitionDate: '2025-11-10', quantity: 50, unitCost: item.cost }
            ],
            lastNrv: item.cost * 1.05
        });
    });

    // Purchase Order
    orders.push({
        id: 'PO-2025-001',
        date: '2025-11-15',
        partnerId: 'PART-003', // NVIDIA
        typeField: 'PURCHASE',
        status: 'FULFILLED',
        totalAmount: 450000000,
        vat: 45000000,
        items: [{ sku: 'GPU-H100-80G', quantity: 10, unitPrice: 45000000, amount: 450000000 }]
    });

    // Sales Order
    orders.push({
        id: 'SO-2025-001',
        date: '2025-12-05',
        partnerId: 'PART-004', // Naver
        typeField: 'SALES',
        status: 'CONFIRMED',
        totalAmount: 1250000000,
        vat: 125000000,
        items: [{ sku: 'SRV-KE100-ENT', quantity: 5, unitPrice: 250000000, amount: 1250000000 }]
    });

    // --- 4. Core Financial Transactions ---
    // Seed Capital
    ledger.push({
        id: 'LEG-CAP-01',
        date: formatDate(threeMonthsAgo),
        description: '[Series A] 신규 투자금 납입 (Antigravity VC)',
        vendor: 'Antigravity VC',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        amount: 2000000000,
        vat: 0,
        type: 'Equity',
        status: 'Approved'
    });

    // Product Sales (Revenue)
    ledger.push(ensureIntegrity({
        id: 'LEG-REV-01',
        date: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 15)),
        description: 'Enterprise AI Cloud Subscription - Q4 License (SaaS)',
        vendor: 'Naver Cloud Platform',
        debitAccount: '외상매출금',
        creditAccount: '제품매출',
        amount: 850000000,
        vat: 85000000,
        type: 'Revenue',
        status: 'Approved'
    }));

    ledger.push({
        id: 'LEG-REV-02',
        date: formatDate(now),
        description: 'AI 솔루션 커스터마이징 및 기술 컨설팅 용역비',
        vendor: 'Samsung SDS',
        debitAccount: '보통예금',
        creditAccount: '서비스매출',
        amount: 320000000,
        vat: 32000000,
        type: 'Revenue',
        status: 'Approved'
    });

    // R&D Payrolls
    for (let i = 0; i < 3; i++) {
        const d = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 25);
        ledger.push({
            id: `LEG-RD-${i}`,
            date: formatDate(d),
            description: `[R&D] 연구소 핵심 인력 급여 및 개발비용 - ${d.getMonth() + 1}월`,
            vendor: '임직원 급여',
            debitAccount: '급여',
            creditAccount: '보통예금',
            amount: 150000000,
            vat: 0,
            type: 'Payroll',
            status: 'Approved'
        });
    }

    // Operating Expenses (Governance Samples)
    ledger.push({
        id: 'LEG-UNCONF-01',
        date: formatDate(now),
        description: '사무실 소모품 매입 (워크스테이션 부품)',
        vendor: '쿠팡비즈',
        debitAccount: '소모품비',
        creditAccount: '미지급금',
        amount: 4500000,
        vat: 450000,
        type: 'Expense',
        status: 'Unconfirmed' // For Approval view
    });

    ledger.push({
        id: 'LEG-UNCONF-02',
        date: formatDate(now),
        description: '연구실 가변 전력 증설 공사비',
        vendor: '한국전력공사',
        debitAccount: '지급임차료',
        creditAccount: '미지급금',
        amount: 12000000,
        vat: 1200000,
        type: 'Expense',
        status: 'Pending Review' // For Governance
    });

    // --- VAT Optimization Trigger Samples ---
    // 1. Maximization: Late-night meal categorized as 0 VAT
    ledger.push({
        id: 'VAT-DEMO-01',
        date: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
        description: '야근 식대 (개발팀)',
        vendor: '맛있는갈비',
        debitAccount: '복리후생비',
        creditAccount: '미지급금',
        amount: 85000,
        vat: 0, // AI will suggest 8500
        type: 'Expense',
        status: 'Unconfirmed'
    });

    // 2. Maximization: SaaS Service with domestic agent
    ledger.push({
        id: 'VAT-DEMO-02',
        date: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)),
        description: 'Cloud Infrastructure Usage (AWS)',
        vendor: 'AWS Korea',
        debitAccount: '지급수수료',
        creditAccount: '미지급금',
        amount: 450000,
        vat: 0, // AI will suggest 45000
        type: 'Expense',
        status: 'Unconfirmed'
    });

    // 3. Risk Mitigation: Non-deductible vehicle gas
    ledger.push({
        id: 'VAT-DEMO-03',
        date: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)),
        description: '주유비 (차량: 12가 3456 - 제네시스)',
        vendor: 'SK에너지',
        debitAccount: '차량유지비',
        creditAccount: '미지급금',
        amount: 650000,
        vat: 65000, // AI will suggest 0 (Risk: Non-deductible sedan)
        type: 'Expense',
        status: 'Unconfirmed'
    });

    // 4. Risk Mitigation: Tax-exempt purchase
    ledger.push({
        id: 'VAT-DEMO-04',
        date: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4)),
        description: '거래처 축하 화환 (면세 제품)',
        vendor: '대박플라워',
        debitAccount: '접대비',
        creditAccount: '미지급금',
        amount: 150000,
        vat: 15000, // AI will suggest 0 (Risk: Tax-exempt)
        type: 'Expense',
        status: 'Unconfirmed'
    });

    // Strategic Items
    ledger.push({
        id: 'LEG-SBC-01',
        date: formatDate(now),
        description: 'Stock Option Grant Compensation Expense (Q4 Accrual)',
        vendor: 'Employee Stock Pool',
        debitAccount: '주식보상비용',
        creditAccount: '자본조정',
        amount: 85000000,
        vat: 0,
        type: 'Expense',
        status: 'Approved'
    });

    ledger.push({
        id: 'LEG-FX-01',
        date: formatDate(now),
        description: 'USD/KRW Translation Gain/Loss',
        vendor: 'Forex',
        debitAccount: '화폐성외화자산',
        creditAccount: '외화환산이익',
        amount: 120000000,
        vat: 0,
        type: 'Revenue',
        status: 'Approved'
    });

    // --- 5. Tax Adjustments ---
    adjustments.push(
        { category: '접대비 한도초과', bookAmount: 25000000, taxAmount: 12000000, difference: 13000000, adjustmentType: '익금산입', disposal: '기타사회유출' },
        { category: '감가상각비 부인액', bookAmount: 45000000, taxAmount: 40000000, difference: 5000000, adjustmentType: '익금산입', disposal: '유보(발생)' },
        { category: '연구인력개발비 세액공제', bookAmount: 0, taxAmount: 112500000, difference: 112500000, adjustmentType: '세액공제', disposal: '기타' }
    );

    return {
        ledger,
        assets,
        orders,
        inventory,
        partners,
        adjustments,
        validationResults: [
            { status: 'Success', message: 'Core Ledger Integrity Verified' },
            { status: 'Warning', message: 'VAT Filing Deadline Approaching (Q4)' }
        ],
        companyConfig: {
            tenantId: 'ENT-DEMO-001',
            isReadOnly: false,
            entityMetadata: {
                companyName: '(주)안티그래비티 테크놀로지',
                regId: '123-45-67890',
                repName: '홍길동',
                corpType: 'SME',
                fiscalYearEnd: '12-31',
                isStartupTaxBenefit: true,
                hasRDDept: true,
                hasRDLab: true
            },
            taxPolicy: {
                depreciationMethod: 'StraightLine',
                entertainmentLimitBase: 12000000,
                vatFilingCycle: 'Quarterly',
                aiGovernanceThreshold: 5000000
            }
        }
    };
};

function FaToId(name: string) {
    return name.split(' ').map(s => s[0]).join('').toUpperCase();
}

// Aliases for legacy compatibility
export const generateMockBatch = () => generateSystemWideMockData().ledger;
export const generateShowcaseData = () => generateSystemWideMockData().ledger;
export const simulateAIParsing = (entry: any): JournalEntry => {
    return {
        id: crypto.randomUUID(),
        date: entry.date || new Date().toISOString().split('T')[0],
        description: entry.description || '',
        vendor: entry.vendor || 'Unknown',
        debitAccount: entry.debitAccount || '소모품비',
        creditAccount: entry.creditAccount || '보통예금',
        amount: entry.amount || 0,
        vat: entry.vat || 0,
        type: entry.type || 'Expense',
        status: 'Unconfirmed',
        version: 1
    };
};
export const getRawMockData = () => {
    return {
        bankData: [
            { date: '2026-01-01', desc: '고용보험 산출내역서 - 김철수', in: 0, out: 28000, type: '보험료' },
            { date: '2026-03-15', desc: '고용보험 산출내역서 - 이영희', in: 0, out: 33600, type: '보험료' },
            { date: '2026-01-10', desc: '고용보험 산출내역서 - 박지민', in: 0, out: 0, type: '보험료' },
            { date: '2025-12-01', desc: '고용보험 산출내역서 - 최두식', in: 0, out: 22400, type: '보험료' },
        ]
    };
};
