/**
 * AccountingFlow Shared Types (Slim MVP Version)
 */

export type EntryType = 'Expense' | 'Asset' | 'Revenue' | 'Liability' | 'Equity' | 'Payroll' | 'AUTO_DEPRECIATION' | 'AUTO_DISPOSAL' | 'AUTO_LEASE';

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
    controlTrail?: string[];
    suggestedDescription?: string;
    suggestedVat?: number;
    taxCode?: string;
    classificationStatus?: ClassificationStatus;
    confidence?: number;
    reasoning?: string[];
    documentType?: DocumentType;
    evidenceType?: 'TaxInvoice' | 'CreditCard' | 'CashReceipt' | 'None';
    // Cash Flow & AR/AP Tracking
    dueDate?: string;
    settledAmount?: number;
    isSettled?: boolean;
    settledDate?: string;
    attachments?: Evidence[];
    clearingRecord?: ClearingRecord; // For Internal Control Trail
}

export interface ClearingRecord {
    sourceEntryId: string;
    clearingEntryId?: string; // ID of the new entry generated for clearing
    reasonCode: string;
    reasonText?: string;
    evidenceType: 'RECEIPT' | 'EMAIL' | 'APPROVAL' | 'NONE';
    evidenceRef?: string;
    clearedBy?: string;
    clearedAt: string;
    status: 'CLEARED' | 'BLOCKED';
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
    usefulLife: number; // in years
    residualValue: number;
    accumulatedDepreciation: number;
    status: 'ACTIVE' | 'DISPOSED';
    disposedAt?: string;
    disposalValue?: number;
    linkedLeaseId?: string;
}

export interface LeaseContract {
    id: string;
    name: string; // e.g. "Gangnam Office 3F"
    vendor: string; // Lessor
    startDate: string;
    endDate: string;
    monthlyPayment: number; // Total monthly cash outflow
    deposit: number; // Security Deposit (Guarantee)
    interestRate: number; // Annual Interest Rate (%)
    status: 'ACTIVE' | 'TERMINATED';

    // Recognized at Inception
    initialAssetValue: number; // Right-of-Use Asset Value
    initialLiability: number;  // Present Value of Lease Payments
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
    controlTrail?: string[];
    parseStatus?: ParseStatus;
    bankName?: string;
    bankAccount?: string;
    merchantName?: string;
    originalAmount?: number;
    attachmentUrl?: string;
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

export type DocumentType = 'CARD_RECEIPT' | 'CASH_RECEIPT' | 'TAX_INVOICE' | 'BANK_STATEMENT' | 'OTHER';

export type ClassificationStatus = 'AUTO_CLASSIFIED' | 'CANDIDATE' | 'UNCLASSIFIED';

// --- Closing & Period Management ---

export interface AccountingPeriod {
    period: string; // YYYY-MM
    status: 'OPEN' | 'CLOSED';
    closedAt?: string;
    closedBy?: string;
}

export interface ClosingRecord {
    period: string;
    closedAt: string;
    closedBy: string;
    summary: {
        totalAssets: number;
        totalLiabilities: number;
        equity: number;
        revenue: number;
        expense: number;
        profit: number;
        // Fixed Asset Metrics
        fixedAssetsGross: number;
        fixedAssetsAccumDep: number;
        fixedAssetsNetBookValue: number;
        // Lease Metrics (Phase 2)
        leaseLiability: number;
        rouAsset: number;
        leaseInterestExp: number;
    };
    unsettled: {
        operationalAmount: number;
        matchingAmount: number;
        complianceAmount: number;
        totalUnsettled: number;
    };
    note: string;
    // AI Analysis (Phase 3)
    aiBriefing?: string;
}

export interface ClosingPrecheckResult {
    errors: string[];
    warnings: {
        type: 'OPERATIONAL' | 'MATCHING' | 'COMPLIANCE';
        amount: number;
        message: string;
    }[];
}

// --- Budgeting (Phase 3) ---
export interface BudgetItem {
    accountCategory: string; // e.g. '복리후생비', '소모품비' - matching exact Account Name for MVP
    budgetAmount: number; // Monthly limit
}

export interface MonthlyBudget {
    id: string; // BU_{period}
    period: string; // YYYY-MM
    items: BudgetItem[];
    updatedAt: string;
}

// --- Management Risk Report (Phase 4.5) ---

export type RiskType = 'Financial' | 'Compliance' | 'Reputation' | 'Operational' | 'InternalControl';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskStatus = 'Active' | 'Mitigated' | 'Accepted';

export interface DecisionCandidate {
    id: string;
    label: string;
    type: 'Interview' | 'Monitor' | 'Policy' | 'Restrict' | 'Approve';
    description: string;
}

export interface BusinessRisk {
    id: string;
    type: RiskType;
    level: RiskLevel;
    title: string;
    description: string;
    impact: string; // e.g. "Tax Penalty Risk", "Cash Leakage"
    detectedAt: string;
    relatedEntries?: string[]; // IDs of JournalEntries triggering this
    decisionCandidates: DecisionCandidate[];
    status: RiskStatus;
}

export interface RiskDecisionLog {
    id: string;
    riskId: string;
    decisionId: string;
    decisionLabel: string;
    decidedBy: string; // 'CEO', 'CFO', 'System'
    decidedAt: string;
    comment?: string;
}

export interface ManagementReport {
    generatedAt: string;
    period: string;
    summary: {
        totalRisks: number;
        criticalCount: number;
        highCount: number;
        topRisks: BusinessRisk[];
    };
    risks: BusinessRisk[];
    actionItems: {
        immediate: number;
        monitoring: number;
    };
}
