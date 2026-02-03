import { JournalEntry } from '../types';
import { getAccountCategory } from '../constants/accounts';

// NOTE: This engine enforces invariant-only rules.
// Adjustment / reversal entries must be normalized BEFORE entering this layer.

/**
 * INVARIANT LAYER
 * Enforces strict accounting rules.
 * 
 * Rules:
 * 1. Amounts must be positive (Zero is allowed for adjustment, Negative is FORBIDDEN).
 * 2. Self-dealing (Debit == Credit) is FORBIDDEN.
 * 3. VAT cannot be negative.
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateTransaction = (entry: JournalEntry): ValidationResult => {
    const errors: string[] = [];

    // Invariant 1: Positive Values
    if (entry.amount < 0) errors.push(`[Invariant Violation] Transaction ${entry.id}: Amount (${entry.amount}) cannot be negative.`);
    if (entry.vat < 0) errors.push(`[Invariant Violation] Transaction ${entry.id}: VAT (${entry.vat}) cannot be negative.`);

    // Invariant 2: No Self-Dealing
    if (entry.debitAccount === entry.creditAccount) {
        errors.push(`[Invariant Violation] Transaction ${entry.id}: Debit and Credit accounts cannot be the same (${entry.debitAccount}).`);
    }

    return { isValid: errors.length === 0, errors };
};

export const validateLedger = (ledger: JournalEntry[]): ValidationResult => {
    const allErrors: string[] = [];
    ledger.forEach(e => {
        const res = validateTransaction(e);
        if (!res.isValid) allErrors.push(...res.errors);
    });
    return { isValid: allErrors.length === 0, errors: allErrors };
};

/**
 * Pure Accounting Logic Engine.
 * Decoupled from React State/Context.
 */

export interface FinancialMetrics {
    cash: number;
    cashInflow: number;
    cashOutflow: number;
    revenue: number;
    expenses: number;
    ar: number;
    ap: number;
    vatReceivable: number;
    vatPayable: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
}

export interface FinancialFormat {
    displayCash: string;
    displayAr: string;
    displayAp: string;
    displayExpenses: string;
    displayNetIncome: string;
    isProfit: boolean;
    hasActivity: boolean;
}

const formatCurrency = (n: number) => '₩' + Math.round(Math.abs(n)).toLocaleString();

import { isArAccount, isApAccount } from '../constants/accounts';

export const calculateFinancials = (ledger: JournalEntry[]): FinancialMetrics & FinancialFormat => {
    let cash = 0, cashInflow = 0, cashOutflow = 0;
    let revenue = 0, expenses = 0, ar = 0, ap = 0;
    let vatReceivable = 0, vatPayable = 0;

    // Balance Sheet Balances
    const accountBalances: Record<string, number> = {};

    const approvedLedger = ledger.filter(e => e.status === 'Approved');

    approvedLedger.forEach(e => {
        const amount = e.amount || 0;
        const vat = e.vat || 0;
        const total = amount + vat;

        // 1. P/L Calculation (Metadata-Driven)
        const catD = getAccountCategory(e.debitAccount);
        const catC = getAccountCategory(e.creditAccount);

        if (catC === 'Revenue') revenue += amount;
        if (catD === 'Revenue') revenue -= amount;
        if (catD === 'Expense') expenses += amount;
        if (catC === 'Expense') expenses -= amount;

        // 2. Cash Calculation
        const lowD = (e.debitAccount || '').toLowerCase();
        const lowC = (e.creditAccount || '').toLowerCase();
        const isBankD = lowD.includes('예금') || lowD.includes('현금') || lowD.includes('cash') || lowD.includes('bank');
        const isBankC = lowC.includes('예금') || lowC.includes('현금') || lowC.includes('cash') || lowC.includes('bank');

        if (isBankD) {
            // Money In
            cashInflow += total;
            cash += total;
        }
        if (isBankC) {
            // Money Out
            cashOutflow += total;
            cash -= total;
        }

        // 3. AR/AP (Unsettled Tracking)
        if (isArAccount(e.debitAccount)) ar += total;
        if (isArAccount(e.creditAccount)) ar -= total;
        if (isApAccount(e.creditAccount)) ap += total;
        if (isApAccount(e.debitAccount)) ap -= total;

        // 4. VAT Accounting
        if (vat > 0) {
            if (e.type === 'Revenue') vatPayable += vat;   // 부가세예수금
            if (e.type === 'Expense' || e.type === 'Asset') vatReceivable += vat; // 부가세대급금
        }

        // 5. Balance Sheet Postings
        accountBalances[e.debitAccount] = (accountBalances[e.debitAccount] || 0) + total;
        accountBalances[e.creditAccount] = (accountBalances[e.creditAccount] || 0) - total;
    });

    const netIncome = revenue - expenses;
    const hasActivity = approvedLedger.length > 0;

    // Calculate Total Assets and Liabilities
    let totalAssets = 0;
    let totalLiabilities = 0;

    Object.entries(accountBalances).forEach(([acc, balance]) => {
        const cat = getAccountCategory(acc);
        if (cat === 'Asset' && balance > 0) totalAssets += balance;
        if (cat === 'Asset' && balance < 0) totalAssets += balance; // Contra-assets like depreciation
        if (cat === 'Liability' && balance < 0) totalLiabilities += Math.abs(balance);
        if (cat === 'Liability' && balance > 0) totalLiabilities -= balance; // Advance payments/overpayments
    });

    return {
        cash, cashInflow, cashOutflow, revenue, expenses, ar, ap, vatReceivable, vatPayable, netIncome, totalAssets, totalLiabilities,
        displayCash: formatCurrency(cash),
        displayAr: formatCurrency(ar),
        displayAp: formatCurrency(ap),
        displayExpenses: hasActivity ? formatCurrency(expenses) : '-',
        displayNetIncome: (netIncome >= 0 ? '+' : '-') + ' ' + formatCurrency(netIncome),
        isProfit: netIncome >= 0,
        hasActivity
    };
};

/**
 * --- Fixed Asset & Depreciation Logic ---
 */
import { Asset } from '../types';

export const DEPRECIATION_RATES: Record<number, number> = {
    3: 0.638,
    4: 0.528,
    5: 0.451,
    8: 0.313,
    10: 0.259,
    20: 0.140,
    40: 0.073
};

export const calculatePeriodDepreciation = (assets: Asset[], period: string): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const lastDayStr = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0).toISOString().split('T')[0];

    assets.filter(a => a.status === 'ACTIVE').forEach(asset => {
        // Skip if acquisition is in future months
        if (asset.acquisitionDate.substring(0, 7) > period) return;

        const bookValue = asset.cost - asset.accumulatedDepreciation;
        if (bookValue <= asset.residualValue) return;

        let monthlyDep = 0;
        if (asset.depreciationMethod === 'DecliningBalance') {
            const rate = DEPRECIATION_RATES[asset.usefulLife] || 0.451;
            monthlyDep = Math.floor((bookValue * rate) / 12);
        } else {
            monthlyDep = Math.floor((asset.cost - asset.residualValue) / asset.usefulLife / 12);
        }

        if (monthlyDep <= 0) return;
        const amount = Math.min(monthlyDep, bookValue - asset.residualValue);

        entries.push({
            id: `DEPR-${asset.id}-${period}`,
            date: lastDayStr,
            debitAccount: '감가상각비',
            creditAccount: '감가상각누계액',
            amount: amount,
            description: `[${period}] 자동 감가상각 (${asset.name})`,
            status: 'Approved',
            type: 'AUTO_DEPRECIATION',
            vat: 0
        });
    });

    return entries;
};

/**
 * --- Lease Accounting Engine (Phase 2) ---
 */
import { LeaseContract } from '../types';

export interface LeaseScheduleRow {
    period: string;
    openingLiability: number;
    interestExpense: number;
    principalPayment: number;
    closingLiability: number;
}

export const calculateLeaseSchedule = (lease: LeaseContract): LeaseScheduleRow[] => {
    const schedule: LeaseScheduleRow[] = [];
    let currentLiability = lease.initialLiability;

    // Simple helper to add months to date
    const start = new Date(lease.startDate);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1; // 1-based

    // Generate schedule until liability is cleared or reasonable limit (e.g. 120 months)
    for (let i = 0; i < 120; i++) {
        const d = new Date(startYear, startMonth - 1 + i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (currentLiability <= 0) break;
        if (lease.status === 'TERMINATED' && period > lease.endDate) break;

        const monthlyRate = (lease.interestRate / 100) / 12;
        const interestExpense = Math.floor(currentLiability * monthlyRate);
        const totalPayment = lease.monthlyPayment;
        const principalPayment = totalPayment - interestExpense;

        // If principal payment is more than remaining, cap it
        const actualPrincipal = Math.min(principalPayment, currentLiability);
        const closingLiability = currentLiability - actualPrincipal;

        schedule.push({
            period,
            openingLiability: currentLiability,
            interestExpense,
            principalPayment: actualPrincipal,
            closingLiability
        });

        currentLiability = closingLiability;
    }

    return schedule;
};

export const calculatePeriodLeaseEntries = (leases: LeaseContract[], period: string): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const lastDayStr = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0).toISOString().split('T')[0];

    leases.filter(l => l.status === 'ACTIVE').forEach(lease => {
        // 1. Get Scheduled Values
        const schedule = calculateLeaseSchedule(lease);
        const row = schedule.find(r => r.period === period);
        if (!row) return;

        // 2. Interest Recognition Entry (Dr Interest Expense / Cr Lease Liability)
        if (row.interestExpense > 0) {
            entries.push({
                id: `LEASE-INT-${lease.id}-${period}`,
                date: lastDayStr,
                debitAccount: '이자비용',
                creditAccount: '리스부채 (Lease Liab)',
                amount: row.interestExpense,
                description: `[${period}] 리스 이자비용 인식 (${lease.name})`,
                status: 'Approved',
                type: 'AUTO_LEASE',
                vat: 0
            });
        }

        // 3. Lease Payment Payment Entry (Dr Lease Liability / Cr Bank)
        // Note: This assumes payment is made. In a real system you might want to link this to actual bank tx.
        // For 'Auto Accounting', we assume payment according to schedule for book-keeping.
        const totalPayment = row.interestExpense + row.principalPayment;
        if (totalPayment > 0) {
            entries.push({
                id: `LEASE-PAY-${lease.id}-${period}`,
                date: lastDayStr,
                debitAccount: '리스부채 (Lease Liab)',
                creditAccount: '보통예금 (Bank)', // Assuming Bank payment
                amount: totalPayment,
                description: `[${period}] 리스료 지급 처리 (${lease.name})`,
                status: 'Approved',
                type: 'AUTO_LEASE',
                vat: 0
            });
        }
    });

    return entries;
};

/**
 * --- Closing Logic Engine ---
 */
import { ClosingPrecheckResult, ClosingRecord, MonthlyBudget } from '../types';
import { generateClosingBriefing } from './financialAnalyst';

export const runClosingPrecheck = (ledger: JournalEntry[], period: string): ClosingPrecheckResult => {
    const errors: string[] = [];
    const warnings: ClosingPrecheckResult['warnings'] = [];

    // Filter entries for the specific period
    const periodEntries = ledger.filter(e => e.date.startsWith(period));

    // 1. Hard Stops (Errors)
    // Check for Unconfirmed or Pending entries
    const pendingCount = periodEntries.filter(e => e.status !== 'Approved').length;
    if (pendingCount > 0) {
        errors.push(`[Hard Stop] 해당 기간에 승인되지 않은 전표가 ${pendingCount}건 존재합니다. 모든 전표를 승인 또는 삭제 후 결산을 진행하세요.`);
    }

    // Check for Negative Balances (Basic Integrity)
    // Simplified: we check if any individual entry has negative amount which is already caught by validateLedger
    const valRes = validateLedger(periodEntries);
    if (!valRes.isValid) {
        errors.push(...valRes.errors);
    }

    // 2. Soft Warnings (Unsettled Items)
    const unsettled = periodEntries.filter(e => !e.isSettled && e.status === 'Approved');

    const isSus = (n: string) => ['가지급금', '가수금', '전도금', 'suspense'].some(k => n.toLowerCase().includes(k));
    const isArAp = (n: string) => ['외상매출', '외상매입', '미수금', '미지급금', '매출채권', '매입채무'].some(k => n.toLowerCase().includes(k));
    const isMatch = (n: string) => ['선급금', '선수금', '선급비용', '선수수익', 'prepay', 'advance'].some(k => n.toLowerCase().includes(k));

    const compliance = unsettled.filter(e => isSus(e.debitAccount) || isSus(e.creditAccount));
    if (compliance.length > 0) {
        warnings.push({
            type: 'COMPLIANCE',
            amount: compliance.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0),
            message: `가계정(가지급/가수) 미결 항목이 ${compliance.length}건 존재합니다.`
        });
    }

    const operational = unsettled.filter(e => isArAp(e.debitAccount) || isArAp(e.creditAccount));
    if (operational.length > 0) {
        warnings.push({
            type: 'OPERATIONAL',
            amount: operational.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0),
            message: `상거래(채권/채무) 미결 항목이 ${operational.length}건 존재합니다.`
        });
    }

    const matching = unsettled.filter(e => isMatch(e.debitAccount) || isMatch(e.creditAccount));
    if (matching.length > 0) {
        warnings.push({
            type: 'MATCHING',
            amount: matching.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0),
            message: `결산/상각(선급/선수) 관리 항목이 ${matching.length}건 존재합니다.`
        });
    }

    // 3. Phase 2: Depreciation Check (Existing)
    const hasDepreciation = periodEntries.some(e => e.type === 'AUTO_DEPRECIATION' || e.description.includes('감가상각'));
    if (!hasDepreciation && ledger.filter(e => getAccountCategory(e.debitAccount) === 'Asset').length > 0) {
        warnings.push({
            type: 'MATCHING',
            amount: 0,
            message: `[Phase 2] 해당 기간에 감가상각 전표가 발견되지 않았습니다. 자동 상각 실행이 필요할 수 있습니다.`
        });
    }

    // 4. Phase 2: Lease Check
    // If we have active leases, we expect AUTO_LEASE entries or similar
    const hasLeaseEntries = periodEntries.some(e => e.type === 'AUTO_LEASE' || e.description.includes('리스'));
    // Ideally we pass leases into precheck, but for now we loosely check if '리스부채' exists in previous balances or entries
    // This is a loose check. In a perfect world, we pass 'leases' to runClosingPrecheck.
    // For MVP, if we see '리스부채' in the ledger at all, we warn if no lease entries this period.
    const hasLeaseLiability = ledger.some(e => e.creditAccount.includes('리스부채') || e.debitAccount.includes('리스부채'));
    if (hasLeaseLiability && !hasLeaseEntries) {
        warnings.push({
            type: 'MATCHING',
            amount: 0,
            message: `[Phase 2] 리스 부채가 존재하지만 금번 달 리스 관련 전표(이자/지급)가 없습니다.`
        });
    }

    return { errors, warnings };
};

export const generateClosingSnapshot = (
    ledger: JournalEntry[],
    assets: Asset[],
    leases: LeaseContract[], // Added leases
    period: string,
    note: string,
    userId: string,
    previousRecord?: ClosingRecord | null,
    budget?: MonthlyBudget // Added budget param for BvA Analysis
): ClosingRecord => {
    // We reuse calculateFinancials but filtered for the whole history up to this period end
    // For P/L we only take the specific period
    const allUpToDate = ledger.filter(e => e.date <= `${period}-31` && e.status === 'Approved');
    const periodOnly = ledger.filter(e => e.date.startsWith(period) && e.status === 'Approved');

    const fullFin = calculateFinancials(allUpToDate);
    const periodFin = calculateFinancials(periodOnly);

    // Unsettled Snapshot (Cumulative)
    const unsettled = allUpToDate.filter(e => !e.isSettled);
    const isSus = (n: string) => ['가지급금', '가수금', '전도금', 'suspense'].some(k => n.toLowerCase().includes(k));
    const isArAp = (n: string) => ['외상매출', '외상매입', '미수금', '미지급금', '매출채권', '매입채무'].some(k => n.toLowerCase().includes(k));
    const isMatch = (n: string) => ['선급금', '선수금', '선급비용', '선수수익', 'prepay', 'advance'].some(k => n.toLowerCase().includes(k));

    const complianceAmount = unsettled.filter(e => isSus(e.debitAccount) || isSus(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);
    const operationalAmount = unsettled.filter(e => isArAp(e.debitAccount) || isArAp(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);
    const matchingAmount = unsettled.filter(e => isMatch(e.debitAccount) || isMatch(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

    // Fixed Asset Calculation
    const activeAssets = assets.filter(a => a.status === 'ACTIVE' && a.acquisitionDate <= `${period}-31`);
    const fixedAssetsGross = activeAssets.reduce((s, a) => s + a.cost, 0);
    const fixedAssetsAccumDep = activeAssets.reduce((s, a) => s + a.accumulatedDepreciation, 0);

    // Lease Metrics Calculation
    // We calculate current liability based on the ledger balance of '리스부채'
    // And RoU Asset Value based on assets marked as RoU (implied by name '사용권' or tied to lease)
    // For simplicity in MVP, we calculate liability from ledger summation up to date
    const leaseLiability = (() => {
        let liab = 0;
        allUpToDate.forEach(e => {
            if (e.creditAccount.includes('리스부채')) liab += (e.amount + e.vat || 0);
            if (e.debitAccount.includes('리스부채')) liab -= (e.amount + e.vat || 0);
        });
        return Math.max(0, liab);
    })();

    const rouAsset = activeAssets
        .filter(a => a.name.includes('사용권') || a.name.includes('RoU'))
        .reduce((s, a) => s + (a.cost - a.accumulatedDepreciation), 0);

    const leaseInterestExp = periodOnly
        .filter(e => e.debitAccount === '이자비용' && e.type === 'AUTO_LEASE')
        .reduce((s, e) => s + e.amount, 0);

    const record: ClosingRecord = {
        period,
        closedAt: new Date().toISOString(),
        closedBy: userId,
        note,
        summary: {
            totalAssets: fullFin.totalAssets,
            totalLiabilities: fullFin.totalLiabilities,
            equity: fullFin.totalAssets - fullFin.totalLiabilities,
            revenue: periodFin.revenue,
            expense: periodFin.expenses,
            profit: periodFin.netIncome,
            fixedAssetsGross,
            fixedAssetsAccumDep,
            fixedAssetsNetBookValue: fixedAssetsGross - fixedAssetsAccumDep,
            leaseLiability,
            rouAsset,
            leaseInterestExp
        },
        unsettled: {
            complianceAmount,
            operationalAmount,
            matchingAmount,
            totalUnsettled: complianceAmount + operationalAmount + matchingAmount
        }
    };

    // Phase 3: AI Briefing Generation (Enhanced with BvA)
    record.aiBriefing = generateClosingBriefing(record, previousRecord || null, budget, periodOnly);

    return record;
};
