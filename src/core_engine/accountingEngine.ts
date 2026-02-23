import { JournalEntry, Asset, LeaseContract, ClosingPrecheckResult, ClosingRecord, MonthlyBudget, AccountNature } from '../types';
import { calculateFinancials, calculateNetCashChange } from './trialBalance';
import { validateLedger } from './journalValidator';
import { CashPolicy } from '../constants/accounts';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE ACCOUNTING ENGINE (Deterministic Kernel)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles non-TB deterministic logic:
 * - Depreciation calculation
 * - Lease scheduling
 * - Closing snapshots (data only)
 * - Daily cash flows
 */

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
    const dateObj = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0);
    const lastDayStr = dateObj.toISOString().split('T')[0];

    assets.filter(a => a.status === 'ACTIVE').forEach(asset => {
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
            vat: 0,
            createdAt: lastDayStr,
            journalNumber: `JE-${period.replace('-', '')}-AUTO`,
            sequenceNumber: 9000 + entries.length
        });
    });
    return entries;
};

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
    const start = new Date(lease.startDate);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1;
    for (let i = 0; i < 120; i++) {
        const d = new Date(startYear, startMonth - 1 + i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (currentLiability <= 0) break;
        if (lease.status === 'TERMINATED' && period > lease.endDate) break;
        const monthlyRate = (lease.interestRate / 100) / 12;
        const interestExpense = Math.floor(currentLiability * monthlyRate);
        const totalPayment = lease.monthlyPayment;
        const principalPayment = totalPayment - interestExpense;
        const actualPrincipal = Math.min(principalPayment, currentLiability);
        const closingLiability = currentLiability - actualPrincipal;
        schedule.push({ period, openingLiability: currentLiability, interestExpense, principalPayment: actualPrincipal, closingLiability });
        currentLiability = closingLiability;
    }
    return schedule;
};

export const calculatePeriodLeaseEntries = (leases: LeaseContract[], period: string): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const dateObj = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0);
    const lastDayStr = dateObj.toISOString().split('T')[0];
    leases.filter(l => l.status === 'ACTIVE').forEach(lease => {
        const schedule = calculateLeaseSchedule(lease);
        const row = schedule.find(r => r.period === period);
        if (!row) return;
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
                vat: 0,
                createdAt: lastDayStr,
                journalNumber: `JE-${period.replace('-', '')}-LINT`,
                sequenceNumber: 8000 + entries.length
            });
        }
        const totalPayment = row.interestExpense + row.principalPayment;
        if (totalPayment > 0) {
            entries.push({
                id: `LEASE-PAY-${lease.id}-${period}`,
                date: lastDayStr,
                debitAccount: '리스부채 (Lease Liab)',
                creditAccount: '보통예금 (Bank)',
                amount: totalPayment,
                description: `[${period}] 리스료 지급 처리 (${lease.name})`,
                status: 'Approved',
                type: 'AUTO_LEASE',
                vat: 0,
                createdAt: lastDayStr,
                journalNumber: `JE-${period.replace('-', '')}-LPAY`,
                sequenceNumber: 8500 + entries.length
            });
        }
    });
    return entries;
};

export const runClosingPrecheck = (ledger: JournalEntry[], period: string): ClosingPrecheckResult => {
    const errors: string[] = [];
    const warnings: ClosingPrecheckResult['warnings'] = [];
    const periodEntries = ledger.filter(e => e.date.startsWith(period));
    const pendingCount = periodEntries.filter(e => e.status !== 'Approved').length;
    if (pendingCount > 0) {
        errors.push(`[Hard Stop] 해당 기간에 승인되지 않은 전표가 ${pendingCount}건 존재합니다.`);
    }
    const valRes = validateLedger(periodEntries);
    if (!valRes.isValid) errors.push(...valRes.errors);

    const unsettled = periodEntries.filter(e => !e.isSettled && e.status === 'Approved');
    const isSus = (n: string) => ['가지급금', '가수금', '전도금', 'suspense'].some(k => n.toLowerCase().includes(k));
    const compliance = unsettled.filter(e => isSus(e.debitAccount) || isSus(e.creditAccount));
    if (compliance.length > 0) {
        warnings.push({ type: 'COMPLIANCE', amount: compliance.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0), message: `가계정 미결 항목이 ${compliance.length}건 존재합니다.` });
    }
    return { errors, warnings };
};

/**
 * Generates the raw data snapshot for a closing record.
 * Does NOT include AI briefing (to maintain core purity).
 */
export const generateClosingSnapshotData = (
    ledger: JournalEntry[],
    assets: Asset[],
    leases: LeaseContract[],
    period: string,
    userId: string,
    accountNatures: Record<string, AccountNature>,
    note: string
): Omit<ClosingRecord, 'aiBriefing'> => {
    const periodOnly = ledger.filter(e => e.status === 'Approved' && e.date.startsWith(period));
    const fullOnly = ledger.filter(e => e.status === 'Approved' && e.date <= `${period}-31`);

    const fullFin = calculateFinancials(fullOnly);
    // [BugFix] isDeltaMode = true is required for periodOnly because cash flow can naturally be negative within a single month's delta
    const periodFin = calculateFinancials(periodOnly, undefined, 0, undefined, true);

    const unsettled = periodOnly.filter((e: JournalEntry) => !e.isSettled);
    const isSus = (n: string) => ['가지급금', '가수금', '전도금', 'suspense'].some(k => n.toLowerCase().includes(k));
    const complianceAmount = unsettled.filter(e => isSus(e.debitAccount) || isSus(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

    const activeAssets = assets.filter(a => a.status === 'ACTIVE' && a.acquisitionDate <= `${period}-31`);
    const fixedAssetsGross = activeAssets.reduce((s, a) => s + a.cost, 0);
    const fixedAssetsAccumDep = activeAssets.reduce((s, a) => s + a.accumulatedDepreciation, 0);

    return {
        period,
        closedAt: new Date().toISOString(),
        closedBy: userId,
        accountNatures,
        note,
        summary: {
            totalAssets: fullFin.totalAssets,
            totalLiabilities: fullFin.totalLiabilities,
            equity: fullFin.totalAssets - fullFin.totalLiabilities,
            revenue: periodFin.revenue,
            expense: periodFin.expenses,
            cogs: periodFin.cogs,
            sga: periodFin.sga,
            nonOperatingExpense: periodFin.nonOperatingExpense,
            profit: periodFin.netIncome,
            cash: fullFin.cash,
            fixedAssetsGross,
            fixedAssetsAccumDep,
            fixedAssetsNetBookValue: fixedAssetsGross - fixedAssetsAccumDep,
            leaseLiability: 0,
            rouAsset: 0,
            leaseInterestExp: 0
        },
        unsettled: { complianceAmount, operationalAmount: 0, matchingAmount: 0, totalUnsettled: complianceAmount }
    };
};

export interface DailyCashSummary {
    prevBalance: number;
    todayIn: number;
    todayOut: number;
    endBalance: number;
    inflows: JournalEntry[];
    outflows: JournalEntry[];
}

export function calculateDailyCashFlow(ledger: JournalEntry[], targetDate: string, openingBalance: number = 0): DailyCashSummary {
    const approvedEntries = ledger.filter(e => e.status === 'Approved');
    let prevBalance = openingBalance;
    let todayIn = 0;
    let todayOut = 0;
    const inflows: JournalEntry[] = [];
    const outflows: JournalEntry[] = [];

    approvedEntries.forEach(entry => {
        const amount = entry.amount || 0;
        const vat = entry.vat || 0;
        const total = entry.type === 'Payroll' ? amount - vat : amount + vat;

        const flowType = CashPolicy.isExternalFlow(entry.debitAccount, entry.creditAccount);
        let flow = 0;
        if (flowType === 'INFLOW') flow = total;
        else if (flowType === 'OUTFLOW') flow = -total;

        if (entry.date < targetDate) {
            prevBalance += flow;
        } else if (entry.date === targetDate) {
            if (flow > 0) {
                todayIn += flow;
                inflows.push(entry);
            } else if (flow < 0) {
                todayOut += Math.abs(flow);
                outflows.push(entry);
            }
        }
    });

    return {
        prevBalance,
        todayIn,
        todayOut,
        endBalance: prevBalance + todayIn - todayOut,
        inflows,
        outflows
    };
}
