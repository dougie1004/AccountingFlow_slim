import { JournalEntry } from '../types';

/**
 * INVARIANT LAYER
 * Enforces strict accounting rules for individual transactions and ledgers.
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateTransaction = (entry: JournalEntry): ValidationResult => {
    const errors: string[] = [];
    if (entry.amount < 0) errors.push(`[Invariant Violation] Transaction ${entry.id}: Amount (${entry.amount}) cannot be negative.`);
    if (entry.vat < 0) errors.push(`[Invariant Violation] Transaction ${entry.id}: VAT (${entry.vat}) cannot be negative.`);

    if (entry.debitAccount === entry.creditAccount) {
        errors.push(`[Invariant Violation] Transaction ${entry.id}: Debit and Credit accounts cannot be the same (${entry.debitAccount}).`);
    }

    if (entry.journalNumber) {
        const datePart = entry.date.substring(0, 7).replace('-', '');
        const jPart = entry.journalNumber.split('-')[1];
        if (datePart !== jPart) {
            errors.push(`[CONSTITUTION VIOLATION] Period Mismatch: Date (${entry.date}) does not match Journal Number (${entry.journalNumber}).`);
        }
    } else if (entry.status === 'Approved') {
        errors.push(`[CONSTITUTION VIOLATION] Missing Journal Number: Approved transaction ${entry.id} must have a constitutional journal number.`);
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
