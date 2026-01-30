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
    revenue: number;
    expenses: number;
    ar: number;
    ap: number;
    vatReceivable: number;
    vatPayable: number;
    netIncome: number;
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

const formatCurrency = (n: number) => '₩' + Math.abs(n).toLocaleString();

import { isArAccount, isApAccount } from '../constants/accounts';

export const calculateFinancials = (ledger: JournalEntry[]): FinancialMetrics & FinancialFormat => {
    let cash = 0, revenue = 0, expenses = 0, ar = 0, ap = 0;
    let vatReceivable = 0, vatPayable = 0;

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
            // Money In. If it's revenue, the total inflow usually includes VAT.
            if (e.type === 'Revenue' || e.type === 'Asset') cash += total;
            else cash += amount;
        }
        if (isBankC) {
            if (e.type === 'Expense' || e.type === 'Asset' || e.type === 'Payroll') cash -= total;
            else cash -= amount;
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
    });

    const netIncome = revenue - expenses;
    const hasActivity = approvedLedger.length > 0;

    return {
        cash, revenue, expenses, ar, ap, vatReceivable, vatPayable, netIncome,
        displayCash: formatCurrency(cash),
        displayAr: formatCurrency(ar),
        displayAp: formatCurrency(ap),
        displayExpenses: hasActivity ? formatCurrency(expenses) : '-',
        displayNetIncome: (netIncome >= 0 ? '+' : '-') + ' ' + formatCurrency(netIncome),
        isProfit: netIncome >= 0,
        hasActivity
    };
};
