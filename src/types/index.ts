/**
 * AccountingFlow Shared Types (Slim MVP Version)
 */

export type EntryType = 'Expense' | 'Asset' | 'Revenue' | 'Liability' | 'Equity' | 'Payroll' | 'AUTO_DEPRECIATION' | 'AUTO_DISPOSAL' | 'AUTO_LEASE' | 'Grant';

export enum AccountNature {
    REVENUE = 'REVENUE',
    COGS = 'COGS',
    SG_AND_A = 'SG&A',
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    NON_OPERATING = 'NON_OPERATING'
}

export interface Account {
    id: string;
    name: string;
    nature: AccountNature;
}

export class ConstitutionViolationError extends Error {
    constructor(message: string) {
        super(`[CONSTITUTION VIOLATION] ${message}`);
        this.name = 'ConstitutionViolationError';
    }
}

export interface JournalEntry {
    id: string;
    journalNumber?: string; // Constitutional Identifier (e.g. JE-202602-0001). Assigned upon confirmation/approval. Immutable.
    sequenceNumber?: number; // Monthly sequence. Immutable, never reused. Permanent record index.
    createdAt?: string;
    date: string; // [Time Constitution Art.1] Effective Date (장부 반영일: 지급, 입금, 세금계산서 발행일)
    eventDate?: string; // [Time Constitution Art.1] Event Date (사건 발생일: 계약, 선정, 의사결정일)
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
    liabilityRecordId?: string; // [Phase 11] Link to Liability Responsibility Object
    notes?: string;   // [Internal Control] Rejection reasons or manual annotations
    comment?: string; // 시스템/관리자 코멘트 (LTV/CAC 등 전략 지표용)
}

// --- Phase 11: Liability Engine Types ---

export type LiabilityState = 'UNPLANNED' | 'PLANNED' | 'POTENTIAL_EQUITY' | 'SETTLED' | 'GREY_ZONE';

export interface LiabilityRecord {
    id: string;         // Unique ID for this responsibility object
    entryId: string;    // Link to the original deposit (Simultaneous creation)

    state: LiabilityState;

    // Responsibility Data
    lender: string;     // e.g. "CEO", "Shinhan Bank", "Unknown"
    amount: number;     // Principal amount
    remainingAmount: number; // Current outstanding balance

    // Terms (The "Plan")
    dueDate?: string;       // YYYY-MM-DD
    interestRate?: number;  // Annual % (e.g. 4.6)
    collateral?: string;    // e.g. "None", "Representative Guarantee"

    // Audit Trail
    decisionLog?: {
        decidedAt: string;
        decidedBy: string; // 'User' | 'System'
        intent: string;    // "Temporary bridge loan", "Pre-equity injection"
    }[];

    createdAt: string;
    updatedAt: string;
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


// --- Phase 6: SaaS & Migration Types ---

export type SubscriptionLevel = 'Free' | 'Basic' | 'Standard' | 'Professional';

export interface TenantInfo {
    id: string;
    name: string;
    plan: SubscriptionLevel;
    licenseKey?: string;
    aiUsageLimit: number;
    aiUsageCurrent: number;
    enforcedUntil: string; // ISO Date
}

export interface MigrationSource {
    systemName: 'Douzone' | 'E-Count' | 'Excel' | 'Other';
    importedAt: string;
    rowCount: number;
    status: 'Pending' | 'Analyzing' | 'Approved';
}

export type ParseStatus = 'ok' | 'warning' | 'error';

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
    lastJournalSequence: number; // CONSTITUTION: Atomic sequence counter (never decreases)
    accountNatures?: Record<string, AccountNature>; // [Phase 2] Snapshot of natures at closing
}

export type SimulationViewMode = 'ROSE' | 'REALITY';

export interface ClosingRecord {
    period: string;
    closedAt: string;
    closedBy: string;
    accountNatures: Record<string, AccountNature>; // [Time Integrity Art. 1] Sealed nature map
    summary: {
        totalAssets: number;
        totalLiabilities: number;
        equity: number;
        revenue: number;
        expense: number; // Total expense (COGS + SG&A + Non-Op)
        cogs: number;    // [Breakdown] Cost of Goods Sold
        sga: number;     // [Breakdown] Selling, General and Administrative
        nonOperatingExpense: number; // [Breakdown] Non-Operating
        profit: number;
        cash: number; // [Phase 11] Explicit cash position at closing
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
        mediumCount: number;
        lowCount: number;
        topRisks: BusinessRisk[];
    };
    risks: BusinessRisk[];
    actionItems: {
        immediate: number;
        monitoring: number;
    };
}

// --- Simulation & Scenario Types ---

export type BusinessScenario = 'SURVIVAL' | 'STANDARD' | 'GROWTH' | 'DEATH_VALLEY';

export interface ScenarioParams {
    grantSuccess: boolean;
    investmentAmount?: number;
    marketingAggression: number;
    teamSize: number;
    marketingDisabled?: boolean; // 'Marketing OFF' 스트레스 테스트용
}

export type ScenarioType = 'Baseline' | 'Optimistic' | 'Conservative';

export interface ProjectedCashFlow {
    period: string; // YYYY-MM (Next Month)
    scenario: ScenarioType;
    expectedInflow: number;
    expectedOutflow: number;
    netCashFlow: number;
    projectedBalance: number;
    confidenceLevel: 'High' | 'Medium' | 'Low';
    details: {
        recurringExpenses: { name: string; amount: number }[];
        variableExpensesEstimate: number;
        revenueEstimate: number;
        isBudgetBased?: boolean;
        unplannedLiabilityAmount?: number; // [Phase 11] Safety adjustment (Officer loans, etc.)
        simulationDisclaimer?: string; // [Phase 2]
    };
}

export interface RunwayAnalysis {
    currentBalance: number;
    burnRate: number; // Average monthly net cash outflow (positive implies burn)
    runwayMonths: number; // calculated months left
    scenario: ScenarioType;
    isBudgetBased?: boolean;
}

// --- AFRI (AccountingFlow Risk Index) V1.0 ---
export type RiskGrade = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiskBreakdown {
    unexplained_ratio: number;
    volatility_risk: number;
    concentration_risk: number;
    temporal_risk: number;
    budget_risk: number;
}

export interface AFRIProfile {
    totalScore: number;
    grade: RiskGrade;
    breakdown: RiskBreakdown;
}
