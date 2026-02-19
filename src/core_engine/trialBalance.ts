import { JournalEntry, AccountNature, ConstitutionViolationError } from '../types';
import { getAccountCategory, getAccountNature, isArAccount, isApAccount, CashPolicy } from '../constants/accounts';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRIAL BALANCE ENGINE (Deterministic Kernel)
 * ═══════════════════════════════════════════════════════════════════════════
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

const formatCurrency = (n: number, withSign: boolean = false) => {
    const absVal = Math.round(Math.abs(n)).toLocaleString();
    if (n === 0) return '₩0';
    const sign = n < 0 ? '-' : (withSign ? '+' : '');
    return `${sign}₩${absVal}`;
};

interface CashCalculationResult {
    netCash: number;
    inflow: number;
    outflow: number;
}

export function calculateNetCashChange(entries: JournalEntry[], asOfDate?: string, openingBalance: number = 0): CashCalculationResult {
    let netCash = openingBalance;
    let inflow = 0;
    let outflow = 0;

    const approvedEntries = entries.filter(e =>
        e.status === 'Approved' &&
        (asOfDate ? e.date <= asOfDate : true)
    );

    approvedEntries.forEach(entry => {
        const amount = entry.amount || 0;
        const vat = entry.vat || 0;
        const total = amount + vat;

        const flowType = CashPolicy.isExternalFlow(entry.debitAccount, entry.creditAccount);

        if (flowType === 'INFLOW') {
            inflow += total;
            netCash += total;
        } else if (flowType === 'OUTFLOW') {
            outflow += total;
            netCash -= total;
        }
    });

    netCash = Math.round(netCash);
    inflow = Math.round(inflow);
    outflow = Math.round(outflow);

    if (!Number.isSafeInteger(netCash)) {
        throw new Error(`[CONSTITUTION VIOLATION] Cash must be safe integer (KRW). Got: ${netCash}`);
    }

    const REALISTIC_UPPER_BOUND = 500_000_000_000;
    if (Math.abs(netCash) > REALISTIC_UPPER_BOUND) {
        throw new Error(`[CONSTITUTION VIOLATION] Cash calculation exploded: ₩${netCash.toLocaleString()}`);
    }

    return { netCash, inflow, outflow };
}

export const calculateFinancials = (
    ledger: JournalEntry[],
    asOfDate?: string,
    openingCash: number = 0,
    sealedNatures?: Record<string, AccountNature>
): FinancialMetrics & FinancialFormat => {
    let revenue = 0;
    let expenses = 0;
    let ar = 0;
    let ap = 0;
    let vatReceivable = 0;
    let vatPayable = 0;

    const accountBalances: Record<string, number> = {};

    const resolveNature = (name: string) => {
        const current = getAccountNature(name);
        if (sealedNatures && sealedNatures[name] && sealedNatures[name] !== current) {
            throw new ConstitutionViolationError(`Time Integrity Violation: Account "${name}" nature changed since closing.`);
        }
        return current;
    };

    const approvedLedger = ledger.filter(e =>
        e.status === 'Approved' &&
        (asOfDate ? e.date <= asOfDate : true)
    );

    const cashResult = calculateNetCashChange(approvedLedger, asOfDate, openingCash);
    const cash = cashResult.netCash;
    const cashInflow = cashResult.inflow;
    const cashOutflow = cashResult.outflow;

    const accountSectionMap = new Map<string, AccountNature>();

    const trackAndCheck = (acc: string, nature: AccountNature) => {
        const existingNature = accountSectionMap.get(acc);
        if (existingNature && existingNature !== nature) {
            throw new ConstitutionViolationError(`Account "${acc}" attempted to be counted as ${nature} but was already counted as ${existingNature}.`);
        }
        accountSectionMap.set(acc, nature);
    };

    approvedLedger.forEach(e => {
        const amount = e.amount || 0;
        const vat = e.vat || 0;
        const total = amount + vat;

        const natureD = resolveNature(e.debitAccount);
        const natureC = resolveNature(e.creditAccount);

        processNature(natureD, amount, true, e.debitAccount);
        processNature(natureC, amount, false, e.creditAccount);

        function processNature(nature: AccountNature, amt: number, isDebitSide: boolean, accName: string) {
            switch (nature) {
                case AccountNature.REVENUE:
                    trackAndCheck(accName, nature);
                    revenue += isDebitSide ? -amt : amt;
                    break;
                case AccountNature.COGS:
                case AccountNature.SG_AND_A:
                case AccountNature.NON_OPERATING:
                    trackAndCheck(accName, nature);
                    expenses += isDebitSide ? amt : -amt;
                    break;
                case AccountNature.ASSET:
                case AccountNature.LIABILITY:
                case AccountNature.EQUITY:
                    trackAndCheck(accName, nature);
                    break;
                default:
                    throw new ConstitutionViolationError(`Account "${accName}" has undefined or invalid Nature: ${nature}.`);
            }
        }

        accountBalances[e.debitAccount] = (accountBalances[e.debitAccount] || 0) + amount;
        accountBalances[e.creditAccount] = (accountBalances[e.creditAccount] || 0) - amount;

        if (vat > 0) {
            if (e.type === 'Revenue') {
                vatPayable += vat;
                accountBalances['부가가치세예수금'] = (accountBalances['부가가치세예수금'] || 0) - vat;
                accountBalances[e.debitAccount] = (accountBalances[e.debitAccount] || 0) + vat;
            } else if (e.type === 'Expense' || e.type === 'Asset' || e.type === 'Payroll') {
                const vatAcc = e.type === 'Payroll' ? '예수금(원천세)' : '부가가치세대급금';
                if (e.type === 'Payroll') vatPayable += vat; else vatReceivable += vat;
                accountBalances[vatAcc] = (accountBalances[vatAcc] || 0) + (e.type === 'Payroll' ? -vat : vat);
                accountBalances[e.creditAccount] = (accountBalances[e.creditAccount] || 0) - vat;
            }
        }

        if (isArAccount(e.debitAccount)) ar += total;
        if (isArAccount(e.creditAccount)) ar -= total;
        if (isApAccount(e.creditAccount)) ap += total;
        if (isApAccount(e.debitAccount)) ap -= total;
    });

    const netIncome = revenue - expenses;
    const hasActivity = approvedLedger.length > 0;

    let totalAssets = 0;
    let totalLiabilities = 0;

    Object.entries(accountBalances).forEach(([acc, balance]) => {
        const nature = accountSectionMap.get(acc) || getAccountNature(acc);
        const cat = getAccountCategory(acc, nature);
        if (cat === 'Asset') totalAssets += balance;
        if (cat === 'Liability') totalLiabilities -= balance;
    });

    return {
        cash, cashInflow, cashOutflow, revenue, expenses, ar, ap, vatReceivable, vatPayable, netIncome, totalAssets, totalLiabilities,
        displayCash: formatCurrency(cash),
        displayAr: formatCurrency(ar),
        displayAp: formatCurrency(ap),
        displayExpenses: hasActivity ? formatCurrency(expenses) : '-',
        displayNetIncome: formatCurrency(netIncome, true),
        isProfit: netIncome >= 0,
        hasActivity
    };
};
