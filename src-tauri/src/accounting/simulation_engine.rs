use crate::core::models::{JournalEntry, SimulationResult, TenantConfig, EntityMetadata, TaxPolicy};

pub fn run_simulation() -> SimulationResult {
    let mut ledger = Vec::new();
    
    let company_metadata = EntityMetadata {
        company_name: "(주)에이아이플로우".to_string(),
        reg_id: "123-45-67890".to_string(),
        rep_name: "임꺽정".to_string(),
        corp_type: "SME".to_string(),
        fiscal_year_end: "12-31".to_string(),
        is_startup_tax_benefit: true,
    };

    ledger.push(JournalEntry {
        id: "SIM-JE-001".to_string(),
        date: "2026-01-01".to_string(),
        description: "기초 데이터 시뮬레이션".to_string(),
        vendor: Some("시스템 내부".to_string()),
        debit_account: "현금".to_string(),
        credit_account: "자본금".to_string(),
        amount: 50_000_000.0,
        vat: 0.0,
        entry_type: "Equity".to_string(),
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("Antigravity".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
    });

    SimulationResult {
        ledger,
        assets: vec![],
        orders: vec![],
        adjustments: vec![],
        validation_results: vec![],
        company_config: TenantConfig {
            tenant_id: "demo-tenant".to_string(),
            closing_date: None,
            is_initialized: true,
            is_read_only: false,
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
