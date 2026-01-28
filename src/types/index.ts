/**
 * AccountingFlow Shared Types (Slim MVP Version)
 */

export type EntryType = 'Expense' | 'Asset' | 'Revenue' | 'Liability' | 'Equity' | 'Payroll';

export interface JournalEntry {
    id: string;
    slipNumber?: string; // Grouping Key (e.g. JE-20240101-001)
    date: string;
    description: string;
    costCenter?: string; // Dimension (e.g. Sales, R&D)
    vendor?: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    vat: number;
    type: string;
    status: string;
    auditTrail?: string[];
    suggestedDescription?: string;
    suggestedVat?: number;
    taxCode?: string;
    evidenceType?: 'TaxInvoice' | 'CreditCard' | 'CashReceipt' | 'None';
    // Cash Flow & AR/AP Tracking
    dueDate?: string;
    settledAmount?: number;
    isSettled?: boolean;
    settledDate?: string;
    attachments?: Evidence[];
}

export interface Evidence {
    id: string;
    fileName: string;
    fileUrl?: string; // Blob URL for local preview
    uploadedAt: string;
    aiConfidence?: number; // 0.0 ~ 1.0 (e.g. 0.98)
    description?: string;
}

export interface Asset {
    id: string;
    name: string;
    depreciationMethod: 'StraightLine' | 'DecliningBalance';
    acquisitionDate: string;
    cost: number;
    usefulLife: number;
    residualValue: number;
    accumulatedDepreciation: number;
}

export interface EntityMetadata {
    companyName: string;
    regId: string;
    repName: string;
    corpType: string;
    fiscalYearEnd: string;
    isStartupTaxBenefit?: boolean;
    numEmployees?: number;
}

export interface TaxPolicy {
    vatFilingCycle: 'Quarterly' | 'BiAnnual';
    depreciationMethod?: 'StraightLine' | 'DecliningBalance';
    entertainmentLimitBase?: number;
}

export interface InitialBalance {
    account: string;
    amount: number;
}

export interface TenantConfig {
    tenantId: string;
    entityMetadata?: EntityMetadata;
    taxPolicy?: TaxPolicy;
    initialBalances?: InitialBalance[];
    closingDate?: string; // Encircles the date up to which books are closed. No edits allowed on or before.
}

export type ParseStatus = 'ok' | 'warning' | 'needConfirm' | 'error';

export interface ParsedTransaction {
    date?: string | null;
    id?: string;
    amount: number;
    vat: number;
    entryType?: EntryType | null;
    description: string;
    vendor?: string;
    vendorRegNo?: string;
    reasoning: string;
    accountName?: string;
    needsClarification?: boolean;
    clarificationPrompt?: string;
    confidence?: string;
    paymentMethod?: string;
    debitAccount?: string;
    creditAccount?: string;
    auditTrail?: string[];
    parseStatus?: ParseStatus;
    bankName?: string;
    bankAccount?: string;
}

export interface Partner {
    name: string;
    regNo?: string;
}

export interface ComplianceReview {
    status: string;
    message: string;
    reviewLogs?: string[];
}

export interface AnalysisResponse {
    transaction?: ParsedTransaction;
    vendorStatus: string;
    suggestedVendor?: Partner;
    complianceReview?: ComplianceReview;
}

export interface TaxFilingPackage {
    xmlContent: string;
}

export interface InferenceResult {
    metadata: {
        totalAmount: number;
        count: number;
        detectedType?: string;
        summaryText?: string;
        numEmployees?: number;
        confidence: number;
    };
    suggestedEntries: ParsedTransaction[];
}

export interface MappingRule {
    id: string;
    keyword: string; // e.g. "스타벅스"
    targetAccount: string; // e.g. "복리후생비"
    type: 'Expense' | 'Revenue';
    isAutoApprove: boolean;
}
