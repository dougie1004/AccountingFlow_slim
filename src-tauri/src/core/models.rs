use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ParseStatus {
    Ok,
    Warning,
    NeedConfirm,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(tag = "code", content = "message", rename_all = "camelCase")]
pub enum SystemError {
    EncodingUncertain(String),
    InvalidFormat(String),
    EmptyFile,
    AuthError,
    DatabaseError,
    ExternalDependency,
    Internal,
}

impl fmt::Display for SystemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for SystemError {}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum TransactionSource {
    BankFile,
    CardFile,
    Manual,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum AmountOrigin {
    WithdrawalColumn,
    DepositColumn,
    Generic,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParsedTransaction {
    pub date: Option<String>,
    pub id: Option<String>,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub vat: f64,
    pub entry_type: Option<String>,
    pub description: Option<String>,
    pub vendor: Option<String>,
    pub vendor_reg_no: Option<String>,
    pub reasoning: String,
    pub account_name: Option<String>,
    #[serde(default)]
    pub needs_clarification: bool,
    pub clarification_prompt: Option<String>,
    pub confidence: Option<String>,
    pub payment_method: Option<String>,
    pub source_type: Option<TransactionSource>,
    pub amount_origin: Option<AmountOrigin>,
    pub flow_direction: Option<String>, 
    pub settlement_type: Option<String>, 
    #[serde(default)]
    pub is_settlement_flow: bool,      // Whether this is a debt repayment (e.g., Card Settlement)
    pub settlement_target: Option<String>, // The target liability account (e.g., "미지급금")
    pub debit_account: Option<String>,
    pub credit_account: Option<String>,
    #[serde(default)]
    pub debit_legs: Vec<JournalLeg>,
    #[serde(default)]
    pub credit_legs: Vec<JournalLeg>,
    #[serde(default)]
    pub audit_trail: Vec<String>,
    pub parse_status: Option<ParseStatus>,
    #[serde(default)]
    pub is_intent: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JournalLeg {
    pub account: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub id: String,
    pub date: String,
    pub description: String,
    pub vendor: Option<String>,
    pub debit_account: String,  // Primary (Legacy support)
    pub credit_account: String, // Primary (Legacy support)
    #[serde(default)]
    pub debit_legs: Vec<JournalLeg>,
    #[serde(default)]
    pub credit_legs: Vec<JournalLeg>,
    pub amount: f64,
    pub vat: f64,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub status: String,
    #[serde(default)]
    pub audit_trail: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EntityMetadata {
    pub company_name: String,
    pub reg_id: String,
    pub rep_name: String,
    pub corp_type: String,
    pub fiscal_year_end: String,
    #[serde(default)]
    pub is_startup_tax_benefit: bool,
    #[serde(default)]
    pub num_employees: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaxPolicy {
    pub vat_filing_cycle: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InitialBalance {
    pub account: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TenantConfig {
    pub tenant_id: String,
    pub entity_metadata: Option<EntityMetadata>,
    pub tax_policy: Option<TaxPolicy>,
    #[serde(default)]
    pub initial_balances: Vec<InitialBalance>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub name: String,
    pub acquisition_date: String,
    pub cost: f64,
    pub useful_life: u32,
    pub residual_value: f64,
    pub accumulated_depreciation: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResponse {
    pub transaction: Option<ParsedTransaction>,
    pub vendor_status: String,
    pub suggested_vendor: Option<Partner>,
    pub compliance_review: Option<ComplianceReview>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Partner {
    pub name: String,
    pub reg_no: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ComplianceReview {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaxFilingPackage {
    pub xml_content: String,
}
