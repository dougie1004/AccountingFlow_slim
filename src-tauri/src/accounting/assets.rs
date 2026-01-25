use crate::core::models::{Asset, JournalEntry, DepreciationScheduleItem, AssetSchedule};

/**
 * 고정자산 관리 엔진 (Fixed Asset Engine)
 * 정액법(SL) 및 정률법(DB) 감가상각 로직 구현
 */

pub fn calculate_depreciation_amount(asset: &Asset, year_fraction: f64) -> f64 {
    match asset.depreciation_method.as_str() {
        "SL" | "정액법" => {
            let annual = (asset.cost - asset.residual_value) / (asset.useful_life as f64);
            annual * year_fraction
        }
        "DB" | "정률법" => {
            let rate = get_standard_db_rate(asset.useful_life);
            let book_value = asset.cost - asset.accumulated_depreciation;
            (book_value * rate) * year_fraction
        }
        _ => 0.0,
    }
}

pub fn get_standard_db_rate(useful_life: u32) -> f64 {
    match useful_life {
        3 => 0.628,
        4 => 0.528,
        5 => 0.451,
        6 => 0.394,
        7 => 0.350,
        8 => 0.313,
        9 => 0.284,
        10 => 0.259,
        12 => 0.221,
        15 => 0.181,
        20 => 0.140,
        _ => 1.0 - (0.05_f64 / 1.0).powf(1.0 / useful_life as f64), // Simple fallback
    }
}

pub fn generate_depreciation_schedule(asset: &Asset) -> AssetSchedule {
    let mut items = Vec::new();
    let mut current_accumulated = 0.0;
    let mut current_book_value = asset.cost;

    let db_rate = get_standard_db_rate(asset.useful_life);

    for year in 1..=asset.useful_life {
        let beginning_value = current_book_value;
        
        let annual_depreciation = match asset.depreciation_method.as_str() {
            "SL" | "정액법" | "STRAIGHT_LINE" => {
                (asset.cost - asset.residual_value) / (asset.useful_life as f64)
            }
            "DB" | "정률법" | "DECLINING_BALANCE" => {
                beginning_value * db_rate
            }
            _ => 0.0,
        };

        let actual_depreciation = if beginning_value - annual_depreciation < asset.residual_value {
            (beginning_value - asset.residual_value).max(0.0)
        } else {
            annual_depreciation
        };

        // [Tax Bridge] Calculate Tax Limit (세법상 상각범위액)
        // 정률법의 경우 세법상으로도 동일한 상각률을 적용하나, 
        // 회계상 상각비가 세법상 한도를 초과할 경우(Denial)를 시뮬레이션
        let tax_limit = annual_depreciation; // 간이 구현: 상각 범위는 현재 상각 로직과 동일하다고 가정
        let disallowed = if actual_depreciation > tax_limit {
            actual_depreciation - tax_limit
        } else {
            0.0
        };

        current_accumulated += actual_depreciation;
        current_book_value -= actual_depreciation;

        items.push(DepreciationScheduleItem {
            period: format!("Year {}", year),
            beginning_value,
            depreciation_expense: actual_depreciation,
            accumulated_depreciation: current_accumulated,
            ending_value: current_book_value,
            tax_limit: Some(tax_limit),
            disallowed_amount: Some(disallowed),
        });

        if current_book_value <= asset.residual_value {
            break;
        }
    }

    AssetSchedule {
        asset_id: asset.id.clone(),
        items,
    }
}

pub fn generate_closing_entries(
    assets: &mut [Asset],
    target_date: &str,
    tenant_id: &str,
    existing_entry_ids: &[String] // 중복 방지를 위한 기존 ID 리스트
) -> Vec<JournalEntry> {
    let mut entries = Vec::new();
    
    for asset in assets.iter_mut() {
        let raw_amount = calculate_depreciation_amount(asset, 1.0 / 12.0);
        
        // [안정화] 원 단위 절사 (Floor) 정책 적용
        let amount = raw_amount.floor(); 
        if amount <= 0.0 { continue; }

        // [안정화] 역등성(Idempotency) 보장을 위한 유니크 키 생성
        // 포맷: DEP-{상각연월}-{자산ID}
        let period_key = target_date[..7].replace("-", ""); // YYYYMM
        let entry_id = format!("DEP-{}-{}", period_key, asset.id);
        
        // 이미 생성된 전표가 있다면 건너뜀
        if existing_entry_ids.contains(&entry_id) {
            println!("[Asset Engine] Duplicate prevented for asset: {}", asset.id);
            continue;
        }

        entries.push(JournalEntry {
            id: entry_id,
            date: target_date.to_string(),
            description: format!("[결산] {} 감가상각비 계상", asset.name),
            vendor: Some("내부결산".to_string()),
            debit_account: "감가상각비".to_string(),
            credit_account: "감가상각누계액".to_string(),
            amount,
            vat: 0.0,
            entry_type: "Expense".to_string(),
            status: "Staging".to_string(),
            tax_code: Some("DEPRECIATION".to_string()),
            version: 1,
            last_modified_by: Some(format!("System ({})", tenant_id)),
            attachment_url: None,
            ocr_data: None,
            compliance_context: Some(format!("자동 결산 전표 (절사 오차: {:.4})", raw_amount - amount)),
            tax_base_amount: None,
            audit_trail: vec![],
            parse_status: None,
            raw_data_snapshot: None,
            transaction_group_id: None,
            employee_tags: vec![],
            is_insurance_part: false,
        });

        asset.accumulated_depreciation += amount;
    }
    
    entries
}
