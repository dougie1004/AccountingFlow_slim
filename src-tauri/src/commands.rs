use crate::core::models::{
    Asset, JournalEntry, ParsedTransaction, TenantConfig, AnalysisResponse, Partner
};
use crate::ai::ai_service;
use crate::ai::csv_inference;
use crate::accounting::assets;

#[tauri::command]
pub async fn parse_transaction(
    input: String, 
    image_bytes: Option<Vec<u8>>,
    image_mime: Option<String>,
    policy: String, 
    _partners: Vec<Partner>,
    tenant_id: String,
    tier: String,
) -> Result<AnalysisResponse, String> {
    // Slimmed: Minimal journal extraction
    let parsed_list = match (image_bytes, image_mime) {
        (Some(bytes), Some(mime)) => {
            ai_service::call_journal_ai(&input, Some((bytes, mime)), &policy, &tenant_id, &tier).await?
        },
        _ => {
            ai_service::call_journal_ai(&input, None, &policy, &tenant_id, &tier).await?
        }
    };

    let parsed = parsed_list.into_iter().next().ok_or("AI returned no transactions")?;
    
    // 2. Compliance Logic (Restoring Compliance AI)
    let is_non_financial = parsed.description.as_deref() == Some("NOT_A_FINANCIAL_DOCUMENT");
    let status = if is_non_financial {
        "Violation"
    } else if parsed.confidence.as_deref() == Some("High") {
        "Safe"
    } else {
        "Warning"
    };

    let compliance_msg = if is_non_financial {
        format!("⚠️ 규정 준수 위반: {}", parsed.reasoning)
    } else {
        format!("✅ 검토 의견: {}", parsed.reasoning)
    };
    
    Ok(AnalysisResponse {
        transaction: Some(parsed),
        vendor_status: "Bypassed".to_string(),
        suggested_vendor: None,
        compliance_review: Some(crate::core::models::ComplianceReview {
            status: status.to_string(),
            message: compliance_msg,
        }),
    })
}

#[tauri::command]
pub async fn process_mass_ai_batch(
    transactions: Vec<ParsedTransaction>,
    policy: String,
) -> Result<Vec<ParsedTransaction>, String> {
    crate::ai::mass_processor::process_mass_batch(transactions, &policy).await
}

#[tauri::command]
pub async fn process_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
    crate::ai::universal_ingestor::ingest_universal_file(file_bytes, file_name).await
}

#[tauri::command]
pub fn run_closing(mut assets: Vec<Asset>, date: String, tenant_id: String) -> Vec<JournalEntry> {
    assets::generate_closing_entries(&mut assets, &date, &tenant_id, &vec![])
}

#[tauri::command]
pub fn run_depreciation(mut assets: Vec<Asset>, date: String, tenant_id: String) -> Result<Vec<JournalEntry>, String> {
    Ok(assets::generate_closing_entries(&mut assets, &date, &tenant_id, &vec![]))
}

#[tauri::command]
pub async fn run_tax_bridge(
    ledger: Vec<JournalEntry>,
    _config: Option<TenantConfig>,
) -> Result<crate::core::models::TaxFilingPackage, String> {
    let meta = crate::core::models::EntityMetadata {
        company_name: "Startup MVP".to_string(),
        reg_id: "000-00-00000".to_string(),
        rep_name: "Founder".to_string(),
        corp_type: "SME".to_string(),
        fiscal_year_end: "12-31".to_string(),
        is_startup_tax_benefit: false,
        num_employees: 0,
    };
    crate::tax::tax_bridge::generate_hometax_xml(ledger, &meta, vec![])
}

#[tauri::command]
pub fn check_modification_allowed(_date: String, _config: TenantConfig) -> bool {
    true
}

#[tauri::command]
pub fn generate_filing(snapshot_ledger: Vec<JournalEntry>, config: TenantConfig) -> Result<String, String> {
    let meta = config.entity_metadata.clone().ok_or("엔티티 메타데이터가 없습니다.")?;
    let path = crate::tax::hometax::HometaxEngine::generate_vat_xml(&snapshot_ledger, &meta, &config.tenant_id)?;
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
pub fn save_tenant_config(app: tauri::AppHandle, config: TenantConfig) -> Result<(), String> {
    crate::core::config_manager::save_config(&app, config)
}

#[tauri::command]
pub fn load_tenant_config(app: tauri::AppHandle) -> Result<TenantConfig, String> {
    crate::core::config_manager::load_config(&app)
}

#[tauri::command]
pub fn batch_export_with_validation(
    entries: Vec<JournalEntry>
) -> Result<crate::accounting::batch_export::BatchExportResult, String> {
    crate::accounting::batch_export::process_batch_export(entries)
}

#[tauri::command]
pub fn generate_journal_id(date: String, entry_type: String) -> String {
    let prefix = crate::utils::id_generator::determine_prefix(&entry_type);
    crate::utils::id_generator::generate_id(&date, prefix)
}

#[tauri::command]
pub fn parse_universal_file(file_bytes: Vec<u8>) -> Result<csv_inference::InferenceResult, String> {
    crate::ai::csv_inference::analyze_csv(file_bytes)
}
#[tauri::command]
pub async fn generic_ai_chat(
    prompt: String,
    system_context: Option<String>
) -> Result<String, String> {
    ai_service::generic_ai_chat(&prompt, system_context).await
}

#[tauri::command]
pub async fn process_audit_context(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    crate::ai::universal_ingestor::extract_context_text(file_bytes, file_name).await
}

#[tauri::command]
pub async fn perform_audit_check(
    transactions: Vec<ParsedTransaction>,
    context: String,
) -> Result<Vec<ParsedTransaction>, String> {
    crate::ai::ai_service::perform_ai_audit(transactions, context).await
}

#[tauri::command]
pub async fn generate_management_report(
    ledger: Vec<JournalEntry>,
    period_start: String,
    period_end: String,
    report_mode: String,
) -> Result<crate::accounting::report_engine::ManagementReport, String> {
    crate::accounting::report_engine::generate_management_report(
        ledger, 
        Vec::<crate::inventory::InventoryItem>::new(),
        Vec::<crate::core::models::Asset>::new(),
        period_start, 
        period_end,
        report_mode
    ).await
}
