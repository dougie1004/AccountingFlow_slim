/**
 * AccountingFlow Shared Types
 * Mirror these in src-tauri/src/models.rs
 */

export type EntryType = 'Expense' | 'Asset' | 'Revenue' | 'Liability' | 'Equity' | 'Payroll';
export type PartnerType = 'Vendor' | 'Customer' | 'Employee';

export interface JournalEntry {
    id: string;
    date: string; // ISO 8601
    description: string;
    vendor?: string; // Optional - 거래처가 없을 수 있음
    debitAccount: string;
    creditAccount: string;
    amount: number;
    vat: number;
    type: EntryType;
    status: 'Approved' | 'Unconfirmed' | 'Hold' | 'Pending Review';
    taxCode?: TaxCode;

    // [Integrity Engine V2] 
    postedBy?: string;      // UserID who performed the 'POST' action
    postedAt?: string;      // Timestamp of the finalization
    ledgerType?: 'Candidate' | 'Official'; // Physical isolation indicator
    integrityHash?: string; // Checksum for tamper-proof records

    // Audit Readiness
    version?: number;
    lastModifiedBy?: string;
    attachmentUrl?: string; // Digital Evidence
    ocrData?: string;       // JSON string
    complianceContext?: string; // Knowledge sync from Compliance AI
    clarificationPrompt?: string; // AI Inspector question
    clarificationOptions?: string[]; // AI Inspector suggestions
    confidence?: string;    // AI confidence level
    suggestedVat?: number;   // AI suggested VAT amount
    suggestedDescription?: string; // AI suggestion reasoning
    auditTrail?: string[]; // Log of automated actions (Required for Immutable Audit Log)
    taxBaseAmount?: number; // AI-extracted Tax Base (e.g. Salary for R&D tax credit)

    // [Antigravity] Safe-Parser Fields
    parseStatus?: ParseStatus;
    rawDataSnapshot?: string;

    // [Step 1] Payroll/Insurance Splitting
    transactionGroupId?: string;
    employeeTags?: string[];
    isInsurancePart?: boolean;
}

export type TaxCode =
    | 'ENTERTAINMENT_LIMIT'    // 접대비 (한도 내)
    | 'ENTERTAINMENT_NO_PROOF' // 접대비 (증빙불비) - 전액 부인
    | 'PENALTY'                // 벌과금 - 전액 부인
    | 'DEPRECIATION'           // 감가상각비
    | 'NON_DEDUCTIBLE'         // 기타 손금불산입
    | 'NONE';

export interface Asset {
    id: string;
    name: string;
    acquisitionDate: string;
    cost: number;
    depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
    usefulLife: number; // Years
    residualValue: number;
    accumulatedDepreciation: number;
    currentValue: number; // Book Value
    quantity?: number;    // NEW - 수량 관리
    accumulatedDepreciationAccount?: string;
    expenseAccount?: string;
}

export interface ValidationResult {
    status: 'Success' | 'Warning' | 'Critical';
    message: string;
    field?: string;
}

export interface InventoryBatch {
    id: string;
    acquisitionDate: string;
    quantity: number;
    unitCost: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    category: string;
    batches: InventoryBatch[];
    valuationMethod: 'FIFO' | 'WeightedAverage';
    lastNrv?: number; // Net Realizable Value
}

export interface FinancialSummary {
    cash: number;
    revenue: number;
    expenses: number;
    ar: number;
    ap: number;
    netIncome: number;
    capital: number;
    retainedEarnings: number;
    fixedAssets: number;
    vatNet: number;
    totalEquity: number;
    inventoryValue: number;
    totalAssets: number;
    totalLiabilities: number;
    realAvailableCash: number;
    totalGrantCash: number;
}

export interface OrderItem {
    sku: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface Order {
    id: string;
    date: string;
    partnerId: string;
    typeField: 'PURCHASE' | 'SALES';
    status: 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'INVOICED';
    items: OrderItem[];
    totalAmount: number;
    vat: number;
}

export interface EntityMetadata {
    companyName: string;
    regId: string;
    repName: string;
    corpType: 'SME' | 'Large' | 'Startup';
    fiscalYearEnd: string;
    isStartupTaxBenefit?: boolean;
    hasRDDept?: boolean;
    hasRDLab?: boolean;
    numEmployees?: number;
}

export interface TaxPolicy {
    depreciationMethod: 'StraightLine' | 'DecliningBalance';
    entertainmentLimitBase: number;
    vatFilingCycle: 'Quarterly' | 'BiAnnual';
    aiGovernanceThreshold?: number; // 신규 - AI 증빙 요청 임계값
    insuranceRates?: InsuranceRates;
    defaultLeaseRate?: number; // 신규 - 기본 리스 할인율 (e.g. 0.048)
}

export interface InsuranceRates {
    nationalPension: number;    // e.g. 0.045
    healthInsurance: number;
    longTermCare: number;       // Rate within health insurance
    employmentInsuranceEmployee: number;
    employmentInsuranceEmployer: number;
}

export interface InitialBalance {
    account: string;
    amount: number;
}

export interface TenantConfig {
    tenantId: string;
    closingDate?: string;
    isReadOnly: boolean;
    entityMetadata?: EntityMetadata;
    taxPolicy?: TaxPolicy;
    initialBalances?: InitialBalance[]; // 신규 - 기초 잔액
}

export interface TaxAdjustment {
    category: string;
    bookAmount: number;
    taxAmount: number;
    difference: number;
    adjustmentType: string;
    disposal: string;
}

export interface AuditSnapshot {
    totalAmount: number;
    recordCount: number;
    timestamp: string;
    integrityHash: string;
    ledger: JournalEntry[];
    adjustments: TaxAdjustment[];
}

export interface SimulationResult {
    ledger: JournalEntry[];
    assets: Asset[];
    orders: Order[];
    inventory: InventoryItem[];
    partners: Partner[];
    adjustments: TaxAdjustment[];
    validationResults: ValidationResult[];
    companyConfig: TenantConfig;
}

export interface Partner {
    id: string;
    name: string;
    partnerType: PartnerType;
    partnerCode?: string;
    regNo?: string;
    representative?: string;
    address?: string;
    phone?: string;
    email?: string;
    bankAccount?: string;
    bankName?: string;
    status: 'Approved' | 'Pending';
    tags?: string[];
}

export type ParseStatus = 'ok' | 'warning' | 'needConfirm' | 'error';

/**
 * AI 분석 결과 (Rust에서 넘어오는 데이터)
 */
export interface ParsedTransaction {
    date?: string | null;
    id?: string;
    amount: number;
    vat: number;
    taxBaseAmount?: number; // AI-extracted Tax Base (e.g. Salary for R&D tax credit)
    entryType?: EntryType | null;
    description: string;
    vendor?: string; // Optional
    vendorRegNo?: string;
    vendorRepresentative?: string;
    vendorAddress?: string;
    reasoning: string;
    accountName?: string;
    needsClarification?: boolean;
    clarificationPrompt?: string;
    clarificationOptions?: string[];
    isConsultation?: boolean;
    confidence?: string;
    paymentMethod?: 'Card' | 'Cash' | 'Transfer';
    bankName?: string;      // NEW - 지급 요청용
    bankAccount?: string;   // NEW - 지급 요청용
    debitAccount?: string; // NEW - 명확한 차변 계정
    creditAccount?: string; // NEW - 명확한 대변 계정
    quantity?: number;      // NEW - 수량 추출
    unitPrice?: number;     // NEW - 단가 추출
    auditTrail?: string[];
    transactionId?: string; // NEW - 복합 전표 그룹핑 ID (없으면 개별 건으로 처리)
    position?: 'Debit' | 'Credit'; // NEW - 전표 내 위치 (차변/대변 명시)

    // [Antigravity] Safe-Parser Fields
    parseStatus?: ParseStatus;
    rawDataSnapshot?: string;
    parseErrorMsg?: string;

    // [Step 1] Payroll/Insurance Splitting
    transactionGroupId?: string;
    employeeTags?: string[];
    isInsurancePart?: boolean;

    // [Step 2] K-IFRS 1116 Lease Fields
    leaseInterestRate?: number;
    leaseTerm?: number;
    residualValue?: number;
    leaseAssetType?: 'Vehicle' | 'Machinery';
    payrollSplit?: { pension: number; health: number; tax: number; net: number };
}

export interface ComplianceReview {
    status: 'Safe' | 'Warning' | 'Critical';
    message: string;
    suggestedAction?: string;
    reviewLogs?: string[];
}

export interface AnalysisResponse {
    transaction?: ParsedTransaction;
    vendorStatus: 'Matched' | 'Pending_Registration' | 'No_Vendor';
    suggestedVendor?: Partner;
    complianceReview?: ComplianceReview;
}

export interface ManagementReport {
    reportTitle: string;
    reportDate: string;
    executiveSummary: string;
    financialOverview: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        profitMargin: number;
        topExpenseCategories: {
            category: string;
            amount: number;
            percentage: number;
            trend: string;
        }[];
    };
    scmInsights: {
        inventoryCost: number;
        inventoryNrv: number;
        valuationLoss: number;
        alert: string;
    };
    taxCompliance: {
        taxableIncome: number;
        estimatedTax: number;
        effectiveRate: number;
        majorAdjustment: string;
    };
    trendAnalysis: {
        category: string;
        insight: string;
        severity: string;
    }[];
    riskAssessment: {
        overallRisk: string;
        cashFlowRisk: string;
        complianceRisk: string;
        operationalRisk: string;
        mitigationStrategies: string[];
    };
    recommendations: string[];
    detailedAnalysis: string;
    disclaimer?: string;
    checklist?: string[];
    bpsInsight?: string;
    assetInsights: AssetInsights;
}

export interface TaxEstimation {
    bookIncome: number;
    taxableIncome: number;
    baseTax: number;
    deductions: number;
    rndCredit: number;
    employmentCredit: number;
    finalTax: number;
    effectiveRate: number;
    minTax: number;
    carryoverAmount: number;
}

export type FileType = 'Payroll' | 'Insurance' | 'BankTransaction' | 'Unknown';

export interface ExtractedMetadata {
    numEmployees?: number; // Optional in Rust => number | undefined
    totalAmount: number;
    periodGuess?: string;
    detectedType: FileType;
    summaryText: string;
    confidence: number;
}

export interface InferenceResult {
    metadata: ExtractedMetadata;
    suggestedEntries: ParsedTransaction[];
}

export interface AssetInsights {
    totalFixedAssets: number;
    annualDepreciation: number;
    next5YearForecast: number[];
}

export interface DepreciationScheduleItem {
    period: string;
    beginningValue: number;
    depreciationExpense: number;
    accumulatedDepreciation: number;
    endingValue: number;
    taxLimit?: number;
    disallowedAmount?: number;
}

export interface AssetSchedule {
    assetId: string;
    items: DepreciationScheduleItem[];
}
