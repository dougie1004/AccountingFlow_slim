use crate::core::models::{
    Asset, JournalEntry, ParsedTransaction, TenantConfig, AnalysisResponse, Partner, SystemError
};
use crate::models::{Account, ManagementProject, ReviewAnalysisResult, ReviewFinding, ManagementIssue, ManagementScenario};
use crate::ai::ai_service;
use crate::ai::review_engine;
use crate::ai::csv_inference;
use crate::accounting::assets;
use serde_json::json;
use serde_json;

#[tauri::command]
pub async fn parse_transaction(
    input: String, 
    image_bytes: Option<Vec<u8>>,
    image_mime: Option<String>,
    policy: String, 
    _partners: Vec<Partner>,
    tenant_id: String,
    tier: String,
    custom_api_key: Option<String>,
) -> Result<AnalysisResponse, SystemError> {
    // Slimmed: Minimal journal extraction
    let parsed_list = match (image_bytes, image_mime) {
        (Some(bytes), Some(mime)) => {
            ai_service::call_journal_ai(&input, Some((bytes, mime)), &policy, &tenant_id, &tier, custom_api_key).await.map_err(|e| { eprintln!("[AI Error] {}", e); SystemError::Internal })?
        },
        _ => {
            ai_service::call_journal_ai(&input, None, &policy, &tenant_id, &tier, custom_api_key).await.map_err(|e| { eprintln!("[AI Error] {}", e); SystemError::Internal })?
        }
    };

    let parsed = parsed_list.into_iter().next().ok_or_else(|| { eprintln!("[AI Error] AI returned no entries"); SystemError::Internal })?;
    
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
) -> Result<Vec<ParsedTransaction>, SystemError> {
    crate::ai::mass_processor::process_mass_batch(transactions, &policy).await.map_err(|e| { eprintln!("[Mass AI Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub async fn process_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, SystemError> {
    crate::ai::universal_ingestor::ingest_universal_file(file_bytes, file_name).await
}

#[tauri::command]
pub async fn get_management_projects() -> Vec<ManagementProject> {
    vec![
        ManagementProject {
            id: "M-CARE-MAJOR".to_string(),
            title: "M-Care 서비스 스케일업 무결성 검증 (2026-2028)".to_string(),
            status: "Execution".to_string(),
            progress_pct: 45,
            start_date: "2026-01-01".to_string(),
            end_date: "2028-12-31".to_string(),
            lead_reviewer: "CFO 김철수".to_string(),
            planning_start: Some("2026-01-01".to_string()),
            planning_end: Some("2026-02-15".to_string()),
            fieldwork_start: Some("2026-02-16".to_string()),
            fieldwork_end: Some("2028-11-30".to_string()),
            reporting_start: Some("2028-12-01".to_string()),
            reporting_end: Some("2028-12-31".to_string()),
            audit_scope: Some("3개년 고성장 구간 전체 전표 정밀 검토".to_string()),
            findings_count: 12,
            risk_score: 24,
            created_at: Some("2026-01-01".to_string()),
            valuation_tier: Some("Series-B-Candidate".to_string()),
        },
        ManagementProject {
            id: "DEMOCO-DEMO".to_string(),
            title: "DemoCo 2026 시뮬레이션용 (체험판)".to_string(),
            status: "Execution".to_string(),
            progress_pct: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            lead_reviewer: "Demo Reviewer".to_string(),
            planning_start: Some("2026-01-01".to_string()),
            planning_end: Some("2026-01-15".to_string()),
            fieldwork_start: Some("2026-01-16".to_string()),
            fieldwork_end: Some("2026-11-30".to_string()),
            reporting_start: Some("2026-12-01".to_string()),
            reporting_end: Some("2026-12-31".to_string()),
            audit_scope: Some("1개년 요약 데이터 무결성 검증".to_string()),
            findings_count: 2,
            risk_score: 8,
            created_at: Some("2026-01-01".to_string()),
            valuation_tier: Some("Startup-Seed".to_string()),
        },
    ]
}

#[tauri::command]
pub async fn get_management_tasks() -> Vec<serde_json::Value> {
    vec![
        json!({ "id": 1, "phase": "Planning", "title": "2026년 설립 자본금 등기 대조", "assignee": "김철수", "due_date": "2026-05-15", "status": "Completed" }),
        json!({ "id": 2, "phase": "Execution", "title": "2026년 하반기 마케팅 지출 적정성 조사", "assignee": "이영희", "due_date": "2026-09-15", "status": "InProgress" }),
    ]
}

#[tauri::command]
pub fn run_closing(mut assets: Vec<Asset>, date: String, tenant_id: String) -> Vec<JournalEntry> {
    assets::generate_closing_entries(&mut assets, &date, &tenant_id, &vec![])
}

#[tauri::command]
pub fn run_depreciation(mut assets: Vec<Asset>, date: String, tenant_id: String) -> Result<Vec<JournalEntry>, SystemError> {
    Ok(assets::generate_closing_entries(&mut assets, &date, &tenant_id, &vec![]))
}

#[tauri::command]
pub async fn run_tax_bridge(
    ledger: Vec<JournalEntry>,
    _config: Option<TenantConfig>,
) -> Result<crate::core::models::TaxFilingPackage, SystemError> {
    let meta = crate::core::models::EntityMetadata {
        company_name: "Startup MVP".to_string(),
        reg_id: "000-00-00000".to_string(),
        rep_name: "Founder".to_string(),
        corp_type: "SME".to_string(),
        fiscal_year_end: "12-31".to_string(),
        is_startup_tax_benefit: false,
        num_employees: 0,
    };
    crate::tax::tax_bridge::generate_hometax_xml(ledger, &meta, vec![]).map_err(|e| { eprintln!("[Tax Bridge Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub fn check_modification_allowed(_date: String, _config: TenantConfig) -> bool {
    true
}

#[tauri::command]
pub fn generate_filing(snapshot_ledger: Vec<JournalEntry>, config: TenantConfig) -> Result<String, SystemError> {
    let meta = config.entity_metadata.clone().ok_or(SystemError::InvalidFormat("엔티티 메타데이터가 없습니다.".into()))?;
    let path = crate::tax::hometax::HometaxEngine::generate_vat_xml(&snapshot_ledger, &meta, &config.tenant_id).map_err(|e| { eprintln!("[Filing Error] {}", e); SystemError::Internal })?;
    let content = std::fs::read_to_string(&path).map_err(|e| { eprintln!("[File Error] {}", e); SystemError::Internal })?;
    Ok(content)
}

#[tauri::command]
pub fn save_tenant_config(app: tauri::AppHandle, config: TenantConfig) -> Result<(), SystemError> {
    crate::core::config_manager::save_config(&app, config).map_err(|e| { eprintln!("[Config Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub fn load_tenant_config(app: tauri::AppHandle) -> Result<TenantConfig, SystemError> {
    crate::core::config_manager::load_config(&app).map_err(|e| { eprintln!("[Config Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub fn batch_export_with_validation(
    entries: Vec<JournalEntry>
) -> Result<crate::accounting::batch_export::BatchExportResult, SystemError> {
    crate::accounting::batch_export::process_batch_export(entries).map_err(|e| { eprintln!("[Export Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub fn generate_journal_id(date: String, entry_type: String) -> String {
    let prefix = crate::utils::id_generator::determine_prefix(&entry_type);
    crate::utils::id_generator::generate_id(&date, prefix)
}

#[tauri::command]
pub async fn parse_excel_file(file_bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, SystemError> {
    Ok(crate::ai::excel_parser::parse_excel_file(file_bytes)?)
}

#[tauri::command]
pub async fn generic_ai_chat(
    prompt: String,
    system_context: Option<String>,
    custom_api_key: Option<String>,
) -> Result<String, SystemError> {
    ai_service::generic_ai_chat(&prompt, system_context, custom_api_key).await.map_err(|e| { eprintln!("[AI Chat Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub async fn process_review_context(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<String, SystemError> {
    crate::ai::universal_ingestor::extract_context_text(file_bytes, file_name).await.map_err(|e| { eprintln!("[Review Engine] {}", e); SystemError::Internal })
}

#[tauri::command]
pub async fn perform_review_check(
    transactions: Vec<ParsedTransaction>,
    context: String,
) -> Result<Vec<ParsedTransaction>, SystemError> {
    crate::ai::ai_service::perform_ai_audit(transactions, context).await.map_err(|e| { eprintln!("[AI Audit Error] {}", e); SystemError::Internal })
}

#[tauri::command]
pub async fn generate_management_report(
    ledger: Vec<JournalEntry>,
    period_start: String,
    period_end: String,
    report_mode: String,
) -> Result<crate::accounting::report_engine::ManagementReport, SystemError> {
    crate::accounting::report_engine::generate_management_report(
        ledger, 
        Vec::<crate::inventory::InventoryItem>::new(),
        Vec::<crate::core::models::Asset>::new(),
        period_start, 
        period_end,
        report_mode
    ).await.map_err(|e| { eprintln!("[Report Engine] {}", e); SystemError::Internal })
}

#[tauri::command]
pub async fn calculate_account_afri(
    account_name: String,
    target_year: i32,
    sub_ledger: Vec<JournalEntry>
) -> Result<crate::models::RiskIndex, SystemError> {
    let account_entries: Vec<&JournalEntry> = sub_ledger.iter()
        .filter(|e| e.debit_account == account_name || e.credit_account == account_name)
        .collect();

    let (ur, cv, hhi_current, hhi_expected, spike, budget_excess, budget) = 
        crate::accounting::flow_analysis::extract_structural_metrics(&account_entries, target_year);

    let afri_result = crate::accounting::flow_analysis::calculate_afri(ur, cv, hhi_current, hhi_expected, spike, budget_excess, budget);
    
    // In later phases, record this result asynchronously into account_risk_profile
    Ok(afri_result)
}

#[tauri::command]
pub async fn perform_pii_masking(
    transactions: Vec<serde_json::Value>
) -> Result<Vec<serde_json::Value>, SystemError> {
    Ok(review_engine::mask_pii(transactions))
}

#[tauri::command]
pub async fn execute_review_run(
    transactions: Vec<serde_json::Value>,
    is_judgment_run: bool,
    custom_api_key: Option<String>,
) -> Result<serde_json::Value, SystemError> {
    review_engine::execute_review_run(transactions, is_judgment_run, custom_api_key).await.map_err(|e| { eprintln!("[AI Review Error] {}", e); SystemError::Internal })
}

// --- PHASE 3: AI Process Mining & Simulation ---

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct ProcessViolation {
    pub id: String,
    pub description: String,
    pub severity: String,
    pub timestamp: String,
    pub affected_nodes: Vec<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MiningResult {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub violation_count: usize,
    pub throughput_avg: String,
    pub violations: Vec<ProcessViolation>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MockLogFile {
    pub name: String,
    #[serde(rename = "type")]
    pub file_type: String,
    pub size: String,
    pub path: String,
}

#[tauri::command]
pub async fn analyze_process_mining(_project_type: String) -> Result<MiningResult, SystemError> {
    // [Phase 3] Digital Trace Simulation
    // In a real environment, this would ingest CaseID/Activity/Timestamp CSVs.
    Ok(MiningResult {
        total_nodes: 124,
        total_edges: 412,
        violation_count: 3,
        throughput_avg: "4.2 Days".to_string(),
        violations: vec![]
    })
}

#[tauri::command]
pub async fn generate_mining_mock_data() -> Result<Vec<MockLogFile>, SystemError> {
    Ok(vec![
        MockLogFile {
            name: "ERP_P2P_EventLog_2025.csv".to_string(),
            file_type: "Event Log (Raw)".to_string(),
            size: "128 MB".to_string(),
            path: "/logs/erp/p2p_2025.csv".to_string(),
        },
        MockLogFile {
            name: "SCM_WMS_Tracing_Jan.json".to_string(),
            file_type: "Log Chain".to_string(),
            size: "42 MB".to_string(),
            path: "/logs/scm/wms_jan.json".to_string(),
        },
        MockLogFile {
            name: "Bank_Statement_Tracing_V2.xlsx".to_string(),
            file_type: "Payment Log".to_string(),
            size: "15 MB".to_string(),
            path: "/logs/finance/bank_tracing.xlsx".to_string(),
        }
    ])
}

// --- PHASE 7: Business Memory Layer (Local Pattern Recognition) ---

#[tauri::command]
pub async fn record_business_patterns(
    app: tauri::AppHandle,
    entries: Vec<JournalEntry>,
    tenant_id: String,
) -> Result<(), SystemError> {
    let conn = crate::database::get_connection(&app).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })?;
    
    for entry in entries {
        // [Pattern Recognition] Record with high-precision signals
        if let Some(ref vendor) = entry.vendor {
            if !vendor.is_empty() {
                // In a real scenario, we'd detect source from metadata.
                // For now, we use defaults but captured at recording time.
                let source = "Universal"; 
                let flow = if entry.entry_type == "Revenue" { "IN" } else { "OUT" };

                crate::core::memory_service::update_business_pattern_v2(
                    &conn,
                    &tenant_id,
                    source,
                    flow,
                    vendor,
                    entry.amount,
                    &entry.date,
                    entry.debit_legs,
                    entry.credit_legs
                ).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_business_suggestions(
    app: tauri::AppHandle,
    source: String,
    flow: String,
    vendor_name: String,
    amount: f64,
    date: String,
    tenant_id: String,
) -> Result<Vec<crate::core::memory_service::AccountSuggestion>, SystemError> {
    let conn = crate::database::get_connection(&app).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })?;
    crate::core::memory_service::get_business_suggestions_v2(
        &conn, 
        &tenant_id, 
        &source, 
        &flow, 
        &vendor_name, 
        amount, 
        &date
    ).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })
}

#[tauri::command]
pub async fn reset_business_memory(
    app: tauri::AppHandle,
    tenant_id: String,
) -> Result<(), SystemError> {
    let conn = crate::database::get_connection(&app).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })?;
    crate::core::memory_service::reset_business_memory(&conn, &tenant_id).map_err(|e| { eprintln!("[Database Error] {}", e); SystemError::DatabaseError })
}
