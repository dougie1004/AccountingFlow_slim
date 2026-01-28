import { JournalEntry } from '../types';

export const generateComprehensiveMockData = (): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const today = new Date();
    let slipCounter = 1;

    // Helper to generate date strings "YYYY-MM-DD"
    const getDateStr = (dayOffset: number) => {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        return d.toISOString().split('T')[0];
    };

    const getSlipId = (d: string) => `JE-${d.replace(/-/g, '')}-${String(slipCounter++).padStart(3, '0')}`;

    // Helper to add entry
    const add = (
        dateOffset: number,
        desc: string,
        debit: string,
        credit: string,
        amount: number,
        type: string,
        vendor: string,
        options?: { vat?: number; dueDateOffset?: number; isSettled?: boolean; settledDateOffset?: number, costCenter?: string }
    ) => {
        const dateStr = getDateStr(dateOffset);
        const vat = options?.vat || 0;
        const slipNumber = getSlipId(dateStr);
        const costCenter = options?.costCenter || 'HQ';

        entries.push({
            id: crypto.randomUUID(),
            slipNumber,
            date: dateStr,
            description: desc,
            costCenter,
            debitAccount: debit,
            creditAccount: credit,
            amount: amount,
            vat: vat,
            type: type,
            vendor: vendor,
            status: 'Approved',
            dueDate: options?.dueDateOffset ? getDateStr(options.dueDateOffset) : undefined,
            isSettled: options?.isSettled ?? true,
            settledDate: options?.settledDateOffset ? getDateStr(options.settledDateOffset) : undefined,
            auditTrail: ['User Generated', 'Confirmed']
        });
    };

    // --- 1. 자금 조달 (Basic Funding) ---
    add(-60, '자본금 납입', '보통예금 (Bank)', '자본금 (Capital)', 50000000, 'Equity', '주주 납입', { costCenter: 'Finance' });

    // --- 2. 기본 자산 취득 (Basic Assets) ---
    add(-40, '업무용 고성능 노트북', '비품 (Equipment)', '보통예금 (Bank)', 3500000, 'Asset', 'Samsung Electronics', { vat: 350000, costCenter: 'R&D Center' });
    add(-38, '디자인용 태블릿', '비품 (Equipment)', '미지급금 (Accounts Payable)', 1200000, 'Asset', 'Apple Korea', { vat: 120000, costCenter: 'Design Team' });

    // --- 3. 매출 (Sales & AR) - Fact based ---
    // Cash Sales
    add(-25, '웹사이트 개발 착수금', '보통예금 (Bank)', '매출 (Revenue)', 12000000, 'Revenue', 'ABC Corp', { vat: 1200000, costCenter: 'Sales Dept' });

    // AR (Unsettled)
    add(-10, '유지보수 용역비 청구', '외상매출금 (Accounts Receivable)', '매출 (Revenue)', 3000000, 'Revenue', 'XYZ Inc', { vat: 300000, dueDateOffset: 10, isSettled: false, costCenter: 'Sales Dept' });

    // --- 4. 매입 및 비용 (Multidimensional Cost Centers) ---
    // Rent -> HQ
    add(-20, '사무실 임차료 (2월)', '지급임차료 (Rent Expense)', '보통예금 (Bank)', 2000000, 'Expense', 'Building Owner', { vat: 0, costCenter: 'HQ' });

    // Entertainment -> Sales (Mainly)
    add(-15, '고객사 접대 회식', '접대비 (Entertainment)', '미지급금 (Accounts Payable)', 450000, 'Expense', 'Hanwoo House', { vat: 45000, costCenter: 'Sales Dept' });

    // Welfare -> R&D (Overtime meals)
    add(-12, '야근 식대 (연구소)', '복리후생비 (Welfare)', '미지급금 (Accounts Payable)', 180000, 'Expense', 'Burger King', { vat: 0, costCenter: 'R&D Center' });

    // Supplies -> Admin
    add(-10, '사무용품 구입 (A4, Toner)', '소모품비 (Supplies)', '미지급금 (Accounts Payable)', 120000, 'Expense', 'Office Depot', { vat: 12000, costCenter: 'HQ' });

    // Ads -> Marketing
    add(-5, '구글 온라인 광고비', '광고선전비 (Ads)', '미지급금 (Accounts Payable)', 1500000, 'Expense', 'Google Ads', { vat: 0, costCenter: 'Marketing' });

    // --- 5. 급여 (Payroll) - Split by Department ---
    const payrollDate = getDateStr(-5);

    // 5-1. Sales Dept Payroll
    const slip1 = getSlipId(payrollDate);
    entries.push(...generatePayrollEntries(payrollDate, 5000000, '2월 급여 (Sales)', slip1, 'Sales Dept'));

    // 5-2. R&D Dept Payroll
    const slip2 = getSlipId(payrollDate); // different slip
    entries.push(...generatePayrollEntries(payrollDate, 7000000, '2월 급여 (R&D)', slip2, 'R&D Center'));

    // 5-3. HQ Payroll
    const slip3 = getSlipId(payrollDate);
    entries.push(...generatePayrollEntries(payrollDate, 4000000, '2월 급여 (HQ)', slip3, 'HQ'));

    // --- 6. Today's Transactions (Live Demo) ---
    // Inflow: Project Payment
    add(0, '프로젝트 중도금 입금 (Alpha)', '보통예금 (Bank)', '매출 (Revenue)', 8800000, 'Revenue', 'Alpha Tech', { vat: 880000, costCenter: 'Sales Dept' });

    // Outflow: Infrastructure
    add(0, 'AWS 클라우드 인프라 비용', '지급수수료 (Fees)', '보통예금 (Bank)', 1250000, 'Expense', 'Amazon Web Services', { vat: 125000, costCenter: 'R&D Center' });

    // Outflow: Urgent Supply (Cash)
    add(0, '긴급 시제품 자재 구입', '원재료비 (Materials)', '보통예금 (Bank)', 450000, 'Expense', 'Local Market', { vat: 45000, costCenter: 'R&D Center' });

    return entries;
};

// Payroll Generator (Split Approach for 1:1 Ledger Structure)
const generatePayrollEntries = (
    date: string,
    totalSalary: number,
    desc: string,
    slipNumber: string,
    costCenter: string
): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const baseId = crypto.randomUUID();

    // Rates (Approx. 2024 Korea)
    const pension = Math.floor(totalSalary * 0.045);
    const health = Math.floor(totalSalary * 0.03545);
    const employment = Math.floor(totalSalary * 0.009);
    const incomeTax = Math.floor(totalSalary * 0.03); // Simplified impact
    const localTax = Math.floor(incomeTax * 0.1);

    const totalDeductions = pension + health + employment + incomeTax + localTax;
    const netPay = totalSalary - totalDeductions;

    // Helper to create entry (Splitting Debit Side to match Credits)
    const create = (idSuffix: string, amt: number, crAcc: string) => ({
        id: `${baseId}-${idSuffix}`,
        slipNumber, // Grouping Key
        date,
        description: desc,
        costCenter, // Dynamic Cost Center
        debitAccount: '급여 (Salaries)', // Expense Account matches everywhere
        creditAccount: crAcc,            // Liability or Asset (Bank)
        amount: amt,
        vat: 0,
        type: 'Payroll',
        vendor: 'Employees',
        status: 'Approved',
        isSettled: true,
        auditTrail: ['System Generated (Payroll Engine)']
    });

    // 1. National Pension (국민연금)
    entries.push(create('pension', pension, '예수금(국민연금)'));
    // 2. Health Insurance (건강보험)
    entries.push(create('health', health, '예수금(건강보험)'));
    // 3. Employment Insurance (고용보험)
    entries.push(create('emp', employment, '예수금(고용보험)'));
    // 4. Income Tax (소득세)
    entries.push(create('income', incomeTax, '예수금(원천세)'));
    // 5. Local Tax (지방소득세)
    entries.push(create('local', localTax, '예수금(지방소득세)'));
    // 6. Net Pay (실수령액 이체)
    entries.push(create('net', netPay, '보통예금 (Bank)'));

    return entries;
};

export const generateMockBatch = (count: number): JournalEntry[] => {
    return generateComprehensiveMockData().slice(0, count);
};

export const getRawMockData = () => {
    return {
        bankData: [
            { date: '2024-03-01', desc: 'AWS Cloud Services', in: 0, out: 154000, type: 'Expense' },
            { date: '2024-03-02', desc: 'Client Payment', in: 3300000, out: 0, type: 'Revenue' },
            { date: '2024-03-05', desc: 'Office Supplies', in: 0, out: 45000, type: 'Expense' },
        ]
    };
};
