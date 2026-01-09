use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParsedTransaction {
    pub date: String,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub vat: f64,
    pub entry_type: String, 
    pub description: Option<String>,
    pub vendor: Option<String>,
    pub vendor_reg_no: Option<String>,
    pub vendor_representative: Option<String>,
    pub vendor_address: Option<String>,
    pub reasoning: String,
    pub account_name: Option<String>,
    #[serde(default)]
    pub needs_clarification: bool,
    pub clarification_prompt: Option<String>,
    pub clarification_options: Option<Vec<String>>,
    #[serde(default)]
    pub is_consultation: bool,
    pub confidence: Option<String>,
    pub payment_method: Option<String>,
    #[serde(default)]
    pub audit_trail: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub id: String,
    pub date: String,
    pub description: String,
    pub vendor: Option<String>,
    pub debit_account: String,
    pub credit_account: String,
    pub amount: f64,
    pub vat: f64,
    #[serde(rename = "type")]
    pub entry_type: String, 
    pub status: String,
    pub tax_code: Option<String>,
    #[serde(default)]
    pub version: u32,
    pub last_modified_by: Option<String>,
    pub attachment_url: Option<String>,
    pub ocr_data: Option<String>,
    pub compliance_context: Option<String>,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaxPolicy {
    pub depreciation_method: String,
    pub entertainment_limit_base: f64,
    pub vat_filing_cycle: String,
    pub ai_governance_threshold: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InitialBalance {
    pub account: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TenantConfig {
    pub tenant_id: String,
    pub closing_date: Option<String>,
    #[serde(default)]
    pub is_initialized: bool,
    #[serde(default)]
    pub is_read_only: bool,
    pub entity_metadata: Option<EntityMetadata>,
    pub tax_policy: Option<TaxPolicy>,
    #[serde(default)]
    pub initial_balances: Vec<InitialBalance>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    pub ledger: Vec<JournalEntry>,
    pub assets: Vec<Asset>,
    pub orders: Vec<Order>,
    pub adjustments: Vec<TaxAdjustment>,
    pub validation_results: Vec<ValidationResult>,
    pub company_config: TenantConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaxAdjustment {
    pub category: String,
    pub book_amount: f64,
    pub tax_amount: f64,
    pub difference: f64,
    pub adjustment_type: String,
    pub disposal: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResponse {
    pub transaction: ParsedTransaction,
    pub vendor_status: String,
    pub suggested_vendor: Option<Partner>,
    pub compliance_review: Option<ComplianceReview>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Partner {
    pub id: String,
    pub name: String,
    pub status: String,
    pub partner_type: String,
    pub partner_code: Option<String>,
    pub reg_no: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderItem {
    pub sku: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: String,
    pub date: String,
    pub partner_id: String,
    pub type_field: String,
    pub status: String,
    pub items: Vec<OrderItem>,
    pub total_amount: f64,
    pub vat: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub name: String,
    pub acquisition_date: String,
    pub cost: f64,
    pub depreciation_method: String,
    pub useful_life: u32,
    pub residual_value: f64,
    pub accumulated_depreciation: f64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ComplianceReview { 
    pub status: String, 
    pub message: String,
    pub review_logs: Option<Vec<String>>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditSnapshot { 
    pub total_amount: f64, 
    pub record_count: usize,
    pub timestamp: String,
    pub integrity_hash: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult { 
    pub status: String, 
    pub message: String,
    pub field: Option<String>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaxFilingPackage { pub xml_content: String, pub pii_density: f32, pub risk_summary: String, pub requires_audit: bool }
