use crate::core::models::{JournalEntry, SimulationResult, TenantConfig, EntityMetadata, TaxPolicy};

pub fn run_simulation() -> SimulationResult {
    let mut ledger = Vec::new();
    
    let company_metadata = EntityMetadata {
        company_name: "(주)엔터프라이즈테크".to_string(),
        reg_id: "220-81-12345".to_string(),
        rep_name: "김철수".to_string(),
        corp_type: "SME".to_string(),
        fiscal_year_end: "12-31".to_string(),
        is_startup_tax_benefit: true,
        num_employees: 12,
    };

    // 1. 기초 자본금 설정
    ledger.push(JournalEntry {
        id: "JE-REVENUE-001".to_string(),
        date: "2026-01-02".to_string(),
        description: "전략 SaaS 플랫폼 1월분 구독료 매출".to_string(),
        vendor: Some("B사 (주요고객)".to_string()),
        debit_account: "현금".to_string(),
        credit_account: "매출".to_string(),
        amount: 100_000_000.0,
        vat: 10_000_000.0,
        entry_type: "Revenue".to_string(),
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("System".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
        tax_base_amount: None,
        audit_trail: vec![],
        parse_status: None,
        raw_data_snapshot: None,
        transaction_group_id: None,
        employee_tags: vec![],
        is_insurance_part: false,
    });

    ledger.push(JournalEntry {
        id: "JE-0001".to_string(),
        date: "2026-01-01".to_string(),
        description: "기초 자본금 납입".to_string(),
        vendor: Some("대주주 김철수".to_string()),
        debit_account: "현금".to_string(),
        credit_account: "자본금".to_string(),
        amount: 100_000_000.0,
        vat: 0.0,
        entry_type: "Equity".to_string(),
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("System".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
        tax_base_amount: None,
        audit_trail: vec![],
        parse_status: None,
        raw_data_snapshot: None,
        transaction_group_id: None,
        employee_tags: vec![],
        is_insurance_part: false,
    });

    // 2. 고액 거래 예시
    ledger.push(JournalEntry {
        id: "JE-0002".to_string(),
        date: "2026-01-05".to_string(),
        description: "전략 수립을 위한 고액 경영 컨설팅 자문료".to_string(),
        vendor: Some("맥킨지코리아".to_string()),
        debit_account: "지급수수료".to_string(),
        credit_account: "현금".to_string(),
        amount: 55_000_000.0,
        vat: 5_500_000.0,
        entry_type: "Expense".to_string(),
        status: "Staging".to_string(),
        tax_code: Some("11".to_string()),
        version: 1,
        last_modified_by: Some("Antigravity".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: Some("대규모 용역 계약에 따른 지급".to_string()),
        tax_base_amount: None,
        audit_trail: vec![],
        parse_status: None,
        raw_data_snapshot: None,
        transaction_group_id: None,
        employee_tags: vec![],
        is_insurance_part: false,
    });

    let assets = vec![
        crate::core::models::Asset {
            id: "AST-2026-001".to_string(),
            name: "Apple MacBook Pro 16형 (M3 Max)".to_string(),
            acquisition_date: "2026-01-02".to_string(),
            cost: 3_200_000.0,
            depreciation_method: "DB".to_string(),
            useful_life: 5,
            residual_value: 320_000.0,
            accumulated_depreciation: 0.0,
            base_useful_life: None,
            is_sme_special_life: false,
        }
    ];

    let orders = vec![
        crate::core::models::Order {
            id: "SO-2026-101".to_string(),
            date: "2026-01-10".to_string(),
            partner_id: "글로벌 유통사".to_string(),
            type_field: "Sales".to_string(),
            status: "SHIPPED".to_string(),
            total_amount: 15_000_000.0,
            vat: 1_500_000.0,
            items: vec![],
        }
    ];

    SimulationResult {
        ledger,
        assets,
        orders,
        adjustments: vec![],
        validation_results: vec![],
        company_config: TenantConfig {
            tenant_id: "T-001-ENT-FLOW".to_string(),
            closing_date: None,
            is_initialized: true,
            is_read_only: false,
            entity_metadata: Some(company_metadata),
            tax_policy: Some(TaxPolicy {
                depreciation_method: "DB".to_string(),
                entertainment_limit_base: 36_000_000.0,
                vat_filing_cycle: "Quarterly".to_string(),
                ai_governance_threshold: 1_000_000.0,
                insurance_rates: None,
            }),
            initial_balances: vec![],
        },
    }
}
