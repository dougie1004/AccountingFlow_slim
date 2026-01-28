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
    // ... rest of file
    cash: number;
    revenue: number;
    expenses: number;
    ar: number;
    ap: number;
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

export const calculateFinancials = (ledger: JournalEntry[]): FinancialMetrics & FinancialFormat => {
    let cash = 0, revenue = 0, expenses = 0, ar = 0, ap = 0;

    ledger.forEach(e => {
        const amount = e.amount;
        const vat = e.vat || 0;
        const total = amount + vat;

        // 1. P/L Calculation (Metadata-Driven)
        const catD = getAccountCategory(e.debitAccount);
        const catC = getAccountCategory(e.creditAccount);

        if (catC === 'Revenue') revenue += amount;
        if (catD === 'Revenue') revenue -= amount; // Sales Returns
        if (catD === 'Expense') expenses += amount;
        if (catC === 'Expense') expenses -= amount; // Expense Reduction

        // 2. Cash Calculation (Simplified Bank Check)
        // TODO: Move 'isBank' check to Metadata (e.g. account.isCashEquivalent)
        const lowD = e.debitAccount.toLowerCase();
        const lowC = e.creditAccount.toLowerCase();
        const isBankD = lowD.includes('예금') || lowD.includes('현금') || lowD.includes('cash') || lowD.includes('bank');
        const isBankC = lowC.includes('예금') || lowC.includes('현금') || lowC.includes('cash') || lowC.includes('bank');

        if (isBankD) {
            // If Cash In -> If Revenue involved, likely Gross. Else Amount.
            // This logic mimics SPL splitting.
            // But accurately: Cash is Debited. Amount?
            // If Journal is: Dr Cash 110, Cr Sales 100, Cr VAT 10.
            // 'amount' is 100. 'vat' is 10. 'total' 110.
            if (e.type === 'Revenue') cash += total;
            else cash += amount;
        }
        if (isBankC) {
            // Cash Out
            if (e.type === 'Expense' || e.type === 'Asset') cash -= total;
            else if (e.type === 'Payroll') cash -= (amount - vat);
            else cash -= amount;
        }

        // 3. AR/AP (Receivables & Payables)
        // TODO: Move to Metadata (account.isReceivable, account.isPayable)
        const isArD = lowD.includes('외상매출') || lowD.includes('미수');
        const isArC = lowC.includes('외상매출') || lowC.includes('미수');
        if (isArD) {
            if (e.type === 'Revenue') ar += total; else ar += amount;
        }
        if (isArC) {
            ar -= (e.type === 'Revenue' ? total : amount);
        }

        const isApC = lowC.includes('외상매입') || lowC.includes('미지급');
        const isApD = lowD.includes('외상매입') || lowD.includes('미지급');
        if (isApC) {
            if (e.type === 'Expense' || e.type === 'Asset') ap += total; else ap += amount;
        }
        if (isApD) {
            ap -= (e.type === 'Expense' || e.type === 'Asset' ? total : amount);
        }
    });

    const netIncome = revenue - expenses;
    const hasActivity = ledger.length > 0;

    return {
        cash, revenue, expenses, ar, ap, netIncome,
        displayCash: formatCurrency(cash),
        displayAr: formatCurrency(ar),
        displayAp: formatCurrency(ap),
        displayExpenses: hasActivity ? formatCurrency(expenses) : '-',
        displayNetIncome: (netIncome >= 0 ? '+' : '-') + ' ' + formatCurrency(netIncome),
        isProfit: netIncome >= 0,
        hasActivity
    };
};
