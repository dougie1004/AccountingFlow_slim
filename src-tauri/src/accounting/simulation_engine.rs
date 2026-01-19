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
    });

    // 2. 고액 거래 예시 (내부 승인 필요 메시지 테스트용)
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
    });

    // 3. 테스트용 자산 데이터 (상각 엔진 테스트)
    let assets = vec![
        crate::core::models::Asset {
            id: "AST-2026-001".to_string(),
            name: "Apple MacBook Pro 16형 (M3 Max)".to_string(),
            acquisition_date: "2026-01-02".to_string(),
            cost: 3_200_000.0,
            depreciation_method: "DB".to_string(), // 정률법
            useful_life: 5,
            residual_value: 320_000.0,
            accumulated_depreciation: 0.0,
        }
    ];

    // 4. 테스트용 주문 데이터 (SCM-Accounting Bridge 테스트)
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
        },
        // [SCENARIO 4] 대규모 반품 (RETURNED) -> Accounting Bridge가 역분개 생성
        crate::core::models::Order {
            id: "SO-2026-105-RET".to_string(), // 반품 건
            date: "2026-01-20".to_string(),
            partner_id: "불만족 고객사".to_string(),
            type_field: "Sales".to_string(),
            status: "CANCELLED".to_string(), // 취소/반품 상태
            total_amount: 10_000_000.0,
            vat: 1_000_000.0,
            items: vec![],
        }
    ];

    // [SCENARIO 1] Burn-rate 가속 시나리오 (최근 3개월 지출 급증)
    // 10월: 10M, 11월: 15M, 12월: 22M -> Insight Engine이 "지출 가속" 감지 기대
    let burn_scenarios = vec![
        ("2025-10-15", "10월 클라우드 비용", 10_000_000.0),
        ("2025-11-15", "11월 클라우드 비용 (증설)", 15_000_000.0),
        ("2025-12-15", "12월 클라우드 비용 (대규모 트래픽)", 22_000_000.0),
    ];
    
    for (date, desc, amt) in burn_scenarios {
        ledger.push(JournalEntry {
            id: format!("JE-BURN-{}", date),
            date: date.to_string(),
            description: desc.to_string(),
            vendor: Some("AWS Korea".to_string()),
            debit_account: "지급수수료".to_string(),
            credit_account: "현금".to_string(),
            amount: amt,
            vat: amt * 0.1,
            entry_type: "Expense".to_string(),
            status: "Approved".to_string(), // 과거 데이터는 승인됨 처리
            tax_code: None,
            version: 1,
            last_modified_by: Some("System".to_string()),
            attachment_url: None,
            ocr_data: None,
            compliance_context: None,
        });
    }

    // [SCENARIO 2] 정부지원금 혼합 (구분 경리 테스트)
    ledger.push(JournalEntry {
        id: "JE-GRANT-IN".to_string(),
        date: "2026-01-02".to_string(),
        description: "예비창업패키지 1차 지원금".to_string(),
        vendor: Some("중소벤처기업진흥공단".to_string()),
        debit_account: "보통예금(정부지원)".to_string(),
        credit_account: "국고보조금(자본조정)".to_string(),
        amount: 50_000_000.0,
        vat: 0.0,
        entry_type: "Revenue".to_string(), // 편의상 Revenue로 태깅하지만 회계적으론 자본조정/부채
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("System".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
    });
    
    // 지원금 집행 (개발비)
    ledger.push(JournalEntry {
        id: "JE-GRANT-OUT".to_string(),
        date: "2026-01-15".to_string(),
        description: "MVP 외주 개발비 (정부지원과제)".to_string(),
        vendor: Some("프리랜서 개발팀".to_string()),
        debit_account: "경상연구개발비".to_string(),
        credit_account: "보통예금(정부지원)".to_string(),
        amount: 11_000_000.0, // 부가세 포함 가정 or 면세
        vat: 0.0,
        entry_type: "Expense".to_string(),
        status: "Approved".to_string(),
        tax_code: None,
        version: 1,
        last_modified_by: Some("System".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: None,
    });

    // [SCENARIO 3] AI 분류 및 세무 감사 (Compliance Risk)
    // 주말 마트 결제 -> 업무 무관 의심
    ledger.push(JournalEntry {
        id: "JE-RISK-1".to_string(),
        date: "2026-01-11".to_string(), // 일요일
        description: "이마트 역삼점 (식료품)".to_string(),
        vendor: Some("이마트".to_string()),
        debit_account: "복리후생비".to_string(), // AI가 일단 이렇게 분류했다고 가정
        credit_account: "미지급금(카드)".to_string(),
        amount: 158_000.0,
        vat: 15_800.0,
        entry_type: "Expense".to_string(),
        status: "Pending Review".to_string(), // AI가 Confidence Low로 판단
        tax_code: None,
        version: 1,
        last_modified_by: Some("AI_Agent".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: Some("[Warning] 휴일 마트 결제는 업무 관련성 소명이 필요합니다.".to_string()),
    });

    ledger.push(JournalEntry {
        id: "JE-RISK-2".to_string(),
        date: "2026-01-14".to_string(),
        description: "남서울CC (골프장)".to_string(),
        vendor: Some("남서울CC".to_string()),
        debit_account: "접대비".to_string(),
        credit_account: "미지급금(카드)".to_string(),
        amount: 350_000.0,
        vat: 35_000.0,
        entry_type: "Expense".to_string(),
        status: "Pending Review".to_string(),
        tax_code: Some("ENTERTAINMENT_LIMIT".to_string()),
        version: 1,
        last_modified_by: Some("AI_Agent".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: Some("[Check] 1인당 3만원 초과 접대비는 증빙 필수입니다.".to_string()),
    });

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
            }),
            initial_balances: vec![],
        },
    }
}
