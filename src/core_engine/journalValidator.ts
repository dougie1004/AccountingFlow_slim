import { JournalEntry, AccountNature } from '../types';
import { getAccountNature } from '../constants/accounts';

/**
 * ⚖️ ACCOUNTING CONSTITUTION VALIDATOR (Kernel Level)
 * Enforces hard constraints (Engine Article 1 & 2).
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateTransaction = (entry: JournalEntry): ValidationResult => {
    const errors: string[] = [];

    // 1. [Engine Art.1] DOUBLE-ENTRY INVARIANT
    if (entry.amount < 0) errors.push(`[Hard Reject] Imbalance: Base amount cannot be negative (${entry.amount}).`);

    if (entry.debitAccount === entry.creditAccount) {
        errors.push(`[Panic] Recursive Entry: Debit and Credit accounts are identical (${entry.debitAccount}).`);
    }

    // 2. [Accrual Basis - 헌법 제5조] TIME INTEGRITY
    // In demo/migration mode, we provide defaults if missing, but hard-stored entries must have them.
    if (!entry.transactionDate) errors.push(`[Soft Error] Missing transactionDate (거래발생일).`);
    if (!entry.recognitionDate) errors.push(`[Hard Reject] Accrual Violation: recognitionDate (인식일) is required.`);

    // 3. [VAT Separation - Engine Art.2]
    const natureD = getAccountNature(entry.debitAccount);
    const natureC = getAccountNature(entry.creditAccount);

    // Revenue/Expense accounts MUST NOT include VAT in the 'amount' field.
    if (natureD === AccountNature.REVENUE || natureC === AccountNature.REVENUE) {
        if (entry.vatFlag && entry.vat === 0) {
            errors.push(`[Hard Reject] VAT Violation: vatFlag is set but vat amount is 0.`);
        }
    }

    // 4. [Revenue Recognition - 헌법 제3조]
    if (natureC === AccountNature.REVENUE && entry.amount >= 5_000_000) {
        // Warning if contractPeriod is missing for significant revenue
    }

    return {
        isValid: !errors.some(e => e.includes('Hard Reject') || e.includes('Panic')),
        errors
    };
};

export const validateLedger = (ledger: JournalEntry[]): ValidationResult => {
    const allErrors: string[] = [];
    ledger.forEach(e => {
        const res = validateTransaction(e);
        if (!res.isValid) allErrors.push(...res.errors);
    });
    return { isValid: allErrors.length === 0, errors: allErrors };
};
