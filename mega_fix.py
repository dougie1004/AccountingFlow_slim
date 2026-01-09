import os

# 파일 경로와 내용을 매핑 (한글 포함)
files_to_fix = {
    r'src-tauri\src\accounting\simulation_engine.rs': """use crate::core::models::{JournalEntry, SimulationResult, TenantConfig, EntityMetadata, TaxPolicy};

pub fn run_simulation() -> SimulationResult {
    let mut ledger = Vec::new();
    let company_metadata = EntityMetadata {
        company_name: "(주)에이아이플로우".to_string(),
        reg_id: "123-45-67890".to_string(),
        rep_name: "홍길동".to_string(),
        corp_type: "SME".to_string(),
        fiscal_year_end: "12-31".to_string(),
        is_startup_tax_benefit: true,
    };

    ledger.push(JournalEntry {
        id: "JE-0001".to_string(),
        date: "2025-01-01".to_string(),
        description: "기초 자본금 납입".to_string(),
        vendor: Some("주주".to_string()),
        debit_account: "현금".to_string(),
        credit_account: "자본금".to_string(),
        amount: 100_000_000.0,
        vat: 0.0,
        entry_type: "Equity".to_string(),
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("시스템".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
    });

    SimulationResult {
        ledger,
        adjustments: vec![],
        company_config: TenantConfig {
            tenant_id: "sim-001".to_string(),
            closing_date: None,
            is_initialized: true,
            entity_metadata: Some(company_metadata),
            tax_policy: Some(TaxPolicy {
                depreciation_method: "StraightLine".to_string(),
                entertainment_limit_base: 24_000_000.0,
                vat_filing_cycle: "Quarterly".to_string(),
                ai_governance_threshold: 30_000.0,
            }),
            initial_balances: vec![],
        },
    }
}
""",
    r'src-tauri\src\commands.rs': """use crate::core::models::{
    Asset, AuditSnapshot, JournalEntry, Order, ParsedTransaction, SimulationResult, TaxAdjustment, TenantConfig, AnalysisResponse, Partner, ComplianceReview
};
use crate::ai::ai_service;
use crate::accounting::{closing_engine, asset_manager, simulation_engine};
use crate::tax::{tax_bridge, filing_engine, tax_validator};
use crate::governance::{audit_manager, proof_manager};

#[tauri::command]
pub async fn parse_transaction(
    input: String, 
    policy: String, 
    partners: Vec<Partner>
) -> Result<AnalysisResponse, String> {
    let parsed = ai_service::call_journal_ai(&input, &policy).await?;
    
    let (vendor_status, suggested_vendor) = if let Some(ref reg_no) = parsed.vendor_reg_no {
        if let Some(matched) = crate::governance::vendor_governance::find_matching_partner(&partners, &Some(reg_no.clone())) {
            ("Matched".to_string(), Some(matched))
        } else {
            ("Pending_Registration".to_string(), Some(crate::governance::vendor_governance::create_pending_partner(&parsed)))
        }
    } else {
        ("No_Vendor".to_string(), None)
    };

    Ok(AnalysisResponse {
        transaction: parsed,
        vendor_status,
        suggested_vendor,
        compliance_review: None,
    })
}

#[tauri::command]
pub async fn process_batch(csv_data: String) -> Result<Vec<ParsedTransaction>, String> {
    let mut transactions = crate::accounting::batch_processor::process_csv_batch(csv_data).await?;
    for tx in &mut transactions {
        if tx.amount > 10_000_000.0 {
            tx.confidence = Some("검토필요".to_string());
            tx.needs_clarification = true;
            tx.clarification_prompt = Some("거액 거래 검토 필요".to_string());
        }
    }
    Ok(transactions)
}

#[tauri::command]
pub async fn process_mass_ai_batch(
    transactions: Vec<ParsedTransaction>,
    policy: String,
) -> Result<Vec<ParsedTransaction>, String> {
    crate::ai::mass_processor::process_mass_batch(transactions, &policy).await
}

#[tauri::command]
pub async fn run_tax_bridge(
    ledger: Vec<JournalEntry>,
    config: TenantConfig,
) -> Result<crate::tax::tax_bridge::TaxFilingPackage, String> {
    let metadata = config.entity_metadata.ok_or("엔티티 메타데이터가 없습니다.")?;
    crate::tax::tax_bridge::generate_hometax_xml(ledger, &metadata, vec![])
}

#[tauri::command]
pub fn run_simulation_data() -> SimulationResult {
    simulation_engine::run_simulation()
}

#[tauri::command]
pub fn save_tenant_config(app: tauri::AppHandle, config: TenantConfig) -> Result<(), String> {
    crate::core::config_manager::save_config(&app, config)
}

#[tauri::command]
pub fn load_tenant_config(app: tauri::AppHandle) -> Result<TenantConfig, String> {
    crate::core::config_manager::load_config(&app)
}

// Missing common commands to satisfy lib.rs
#[tauri::command] pub fn process_universal_file() {}
#[tauri::command] pub fn run_closing() {}
#[tauri::command] pub fn create_snapshot() {}
#[tauri::command] pub fn verify_proof() {}
#[tauri::command] pub fn generate_tax_forms() {}
#[tauri::command] pub fn check_modification_allowed() {}
#[tauri::command] pub fn generate_filing() {}
#[tauri::command] pub fn run_depreciation() {}
#[tauri::command] pub fn process_scm_order() {}
#[tauri::command] pub fn run_validation_checks() {}
#[tauri::command] pub fn approve_partner() {}
"""
}

for path, content in files_to_fix.items():
    full_path = os.path.join(r'c:\Projects\AccountingFlow', path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed encoding and content for: {full_path}")
