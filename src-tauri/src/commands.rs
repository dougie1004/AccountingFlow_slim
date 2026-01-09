use crate::core::models::{
    Asset, AuditSnapshot, JournalEntry, Order, ParsedTransaction, SimulationResult, 
    TaxAdjustment, TenantConfig, AnalysisResponse, Partner, ValidationResult
};
use crate::ai::ai_service;
use crate::accounting::{closing_engine, asset_manager, simulation_engine};
use crate::tax::{tax_bridge, filing_engine, tax_validator};
use crate::governance::{audit_manager, proof_manager};

#[tauri::command]
pub async fn parse_transaction(
    input: String, 
    image_bytes: Option<Vec<u8>>,
    image_mime: Option<String>,
    policy: String, 
    partners: Vec<Partner>,
    tenant_id: String,
    tier: String,
) -> Result<AnalysisResponse, String> {
    // Step 1: Journal AI가 전표 생성 (이미지 포함 멀티모달 호출)
    let image_data = match (image_bytes, image_mime) {
        (Some(bytes), Some(mime)) => Some((bytes, mime)),
        _ => None,
    };
    let image_mime_str = if let Some((_, ref m)) = image_data {
        m.as_str()
    } else {
        ""
    };
    let mut image_data_processed = None;
    if let Some((ref b, _)) = image_data {
        image_data_processed = Some((b.clone(), image_mime_str));
    }

    let parsed = ai_service::call_journal_ai(&input, image_data_processed, &policy, &tenant_id, &tier).await?;
    
    // Step 2: Vendor Governance (거래처 매칭 및 자동 등록 제안)
    let (vendor_status, suggested_vendor) = {
        if let Some(matched) = crate::governance::vendor_governance::find_matching_partner(&partners, &parsed.vendor_reg_no, &parsed.vendor) {
            ("Matched".to_string(), Some(matched))
        } else if parsed.vendor.is_some() {
            // 등록된 거래처는 없지만 AI가 거래처명을 파악한 경우
            ("Pending_Registration".to_string(), Some(crate::governance::vendor_governance::create_pending_partner(&parsed)))
        } else {
            ("No_Vendor".to_string(), None)
        }
    };

    // Step 3: Compliance AI가 규정 검토
    let compliance_review = run_compliance_check(&parsed, &policy).await;

    Ok(AnalysisResponse {
        transaction: Some(parsed),
        vendor_status,
        suggested_vendor,
        compliance_review: Some(compliance_review),
    })
}

/// Compliance AI 실제 구현
async fn run_compliance_check(tx: &ParsedTransaction, _policy: &str) -> crate::core::models::ComplianceReview {
    let mut status = "Safe".to_string();
    let mut review_logs = Vec::new();
    let mut issues = Vec::new();

    // 1. 고액 거래 검토 (3천만원 이상)
    if tx.amount > 30_000_000.0 {
        status = "Warning".to_string();
        issues.push("고액 거래(3천만원 초과)가 감지되어 이사회 승인이 필요합니다.");
        review_logs.push("고액 거래 플래그".to_string());
    }

    // 2. 접대비 한도 검토
    if tx.account_name.as_ref().map(|a| a.contains("접대비") || a.contains("Entertainment")).unwrap_or(false) {
        if tx.amount > 100_000.0 {
            status = "Warning".to_string();
            issues.push("접대비 1인당 한도(3만원) 및 증빙 요건을 확인하세요.");
            review_logs.push("접대비 한도 검토".to_string());
        }
    }

    // 3. 증빙 누락 검토
    if tx.amount > 30_000.0 && tx.description.as_ref().map(|d| !d.contains("영수증") && !d.contains("세금계산서")).unwrap_or(true) {
        status = "Warning".to_string();
        issues.push("3만원 초과 거래이나 적격증빙(세금계산서 등)이 명시되지 않았습니다.");
        review_logs.push("적격증빙 확인 필요".to_string());
    }

    // 5. 증빙-텍스트 교차 검증 (Cross-Check)
    if tx.reasoning.contains("불일치") || tx.reasoning.contains("다릅니다") || tx.reasoning.contains("마트") {
        status = "Warning".to_string();
        issues.push("⚠️ 증빙과 입력 내용이 일치하지 않습니다. (금액 또는 용도 확인 필요)");
        review_logs.push("교차 검증 불일치 감지".to_string());
    }

    let mut message = if issues.is_empty() {
        "규정 위반 사항이 발견되지 않은 안전한 거래입니다.".to_string()
    } else {
        issues.join("\n")
    };

    // 4. 정부지원금 특별 검토 (단순 키워드가 아닌 계정과목 기준으로 변경)
    if tx.account_name.as_ref().map(|a| a.contains("정부보조금") || a.contains("R&D")).unwrap_or(false) {
        review_logs.push("정부지원금 관련 거래 - 목적외 사용 여부 검토 필요".to_string());
        message = format!("{}\n\n국책과제 및 정부지원금 계정입니다. 해당 협약서의 규정에 따른 정산 증빙(연구노트 등)을 추가로 준비하시기 바랍니다.", message);
    }

    crate::core::models::ComplianceReview {
        status,
        message,
        review_logs: Some(review_logs),
    }
}

#[tauri::command]
pub async fn process_batch(csv_data: String) -> Result<Vec<ParsedTransaction>, String> {
    crate::accounting::batch_processor::process_csv_batch(csv_data).await
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
pub fn run_closing(assets: Vec<Asset>, date: String) -> Vec<JournalEntry> {
    closing_engine::calculate_depreciation(assets, date)
}

#[tauri::command]
pub async fn run_tax_bridge(
    ledger: Vec<JournalEntry>,
    config: Option<TenantConfig>,
) -> Result<crate::core::models::TaxFilingPackage, String> {
    let metadata = if let Some(c) = config {
        c.entity_metadata.ok_or("메타데이터 누락")?
    } else {
        crate::core::models::EntityMetadata {
            company_name: "임시 회사".to_string(),
            reg_id: "000-00-00000".to_string(),
            rep_name: "대표자".to_string(),
            corp_type: "SME".to_string(),
            fiscal_year_end: "12-31".to_string(),
            is_startup_tax_benefit: false,
        }
    };
    crate::tax::tax_bridge::generate_hometax_xml(ledger, &metadata, vec![])
}

#[tauri::command]
pub fn get_tax_adjustments(ledger: Vec<JournalEntry>) -> Vec<TaxAdjustment> {
    crate::tax::tax_bridge::calculate_tax_adjustments(ledger)
}

#[tauri::command]
pub fn estimate_corporate_tax(taxable_income: f64, is_sme: bool) -> crate::tax::tax_bridge::TaxEstimation {
    crate::tax::tax_bridge::calculate_estimated_tax(taxable_income, is_sme)
}

#[tauri::command]
pub fn create_snapshot(ledger: Vec<JournalEntry>, adjustments: Vec<TaxAdjustment>) -> AuditSnapshot {
    audit_manager::create_audit_snapshot(ledger, adjustments)
}

#[tauri::command]
pub fn verify_proof(entry: JournalEntry) -> crate::governance::proof_manager::VerificationStatus {
    proof_manager::verify_evidence(&entry)
}

#[tauri::command]
pub fn generate_tax_forms(ledger: Vec<JournalEntry>, adjustments: Vec<TaxAdjustment>) -> crate::tax::tax_bridge::StandardTaxForms {
    tax_bridge::generate_standard_forms(ledger, adjustments)
}

#[tauri::command]
pub fn check_modification_allowed(date: String, config: TenantConfig) -> bool {
    crate::core::saas_middleware::check_modifiable(&date, &config).is_ok()
}

#[tauri::command]
pub fn generate_filing(snapshot: AuditSnapshot, config: TenantConfig) -> Result<String, String> {
    filing_engine::generate_electronic_filing(&snapshot, config.entity_metadata)
}

#[tauri::command]
pub fn run_depreciation(mut assets: Vec<Asset>, date: String) -> Vec<JournalEntry> {
    let mut version = 1;
    asset_manager::calculate_monthly_depreciation(&mut assets, date, &mut version)
}

#[tauri::command]
pub fn process_scm_order(order: Order) -> Result<Vec<JournalEntry>, String> {
    let mut version = 1;
    crate::scm::scm_service::process_order_journaling(&order, &mut version)
}

#[tauri::command]
pub fn evaluate_inventory_assets(inventory: Vec<crate::core::models::InventoryItem>) -> crate::scm::scm_service::ValuationSummary {
    crate::scm::scm_service::evaluate_lcm(&inventory)
}

#[tauri::command]
pub fn run_validation_checks(snapshot: AuditSnapshot, config: TenantConfig) -> Vec<ValidationResult> {
    tax_validator::run_validation(&snapshot, config.entity_metadata.as_ref())
}

#[tauri::command]
pub fn run_simulation_data() -> SimulationResult {
    simulation_engine::run_simulation()
}

#[tauri::command]
pub fn approve_partner(mut partner: Partner, partners: Vec<Partner>) -> Partner {
    partner.status = "Approved".to_string();
    let count = partners.iter().filter(|p| p.status == "Approved").count();
    partner.partner_code = Some(format!("V{:05}", count + 1));
    partner
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
pub async fn detect_batch_anomalies(
    entries: Vec<JournalEntry>
) -> Result<Vec<String>, String> {
    crate::accounting::batch_export::detect_anomalies_with_ai(&entries).await
}

#[tauri::command]
pub async fn generate_cash_flow_forecast(
    ledger: Vec<JournalEntry>,
    current_balance: f64,
) -> Result<crate::accounting::forecast_engine::CashFlowForecast, String> {
    crate::accounting::forecast_engine::generate_cash_flow_forecast(ledger, current_balance).await
}

#[tauri::command]
pub async fn generate_management_report(
    ledger: Vec<JournalEntry>,
    inventory: Vec<crate::core::models::InventoryItem>,
    period_start: String,
    period_end: String,
) -> Result<crate::accounting::report_engine::ManagementReport, String> {
    crate::accounting::report_engine::generate_management_report(ledger, inventory, period_start, period_end).await
}

#[tauri::command]
pub async fn run_erp_migration(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<crate::ai::migration_engine::MigrationSummary, String> {
    crate::ai::migration_engine::run_smart_migration(file_bytes, file_name).await
}

#[tauri::command]
pub async fn verify_receipt_compliance(
    image_bytes: Vec<u8>,
    image_mime: String,
    transaction_json: String,
) -> Result<ParsedTransaction, String> {
    ai_service::verify_receipt_compliance(image_bytes, &image_mime, &transaction_json).await
}
#[tauri::command]
pub async fn chat_with_compliance(
    user_message: String,
    current_tx: Option<ParsedTransaction>,
    policy: String,
) -> Result<AnalysisResponse, String> {
    let mut response = ai_service::consult_compliance_ai(&user_message, current_tx, &policy).await?;
    
    // Consultation 성격을 표시하기 위해 임의로 transaction에 플래그 설정 (브릿지 역할)
    if response.transaction.is_none() {
        let mut mock_tx = ParsedTransaction::default();
        mock_tx.is_consultation = true; // 프론트엔드에서 상담 모드 UI를 띄우기 위함
        response.transaction = Some(mock_tx);
    }
    
    Ok(response)
}
