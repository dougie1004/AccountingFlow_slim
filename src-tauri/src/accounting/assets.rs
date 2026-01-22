use crate::core::models::{Asset, JournalEntry};

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
            // 정률법 상각률 추정 (실무적으로는 상각률표 사용하나 여기서는 간이 계산)
            // 상각률 = 1 - (잔존가액/취득원가)^(1/내용연수)
            let rate = if asset.residual_value > 0.0 {
                1.0 - (asset.residual_value / asset.cost).powf(1.0 / (asset.useful_life as f64))
            } else {
                // 내용연수 5년 기준 약 0.451 (사용자 예시 반영)
                0.451 
            };
            let book_value = asset.cost - asset.accumulated_depreciation;
            (book_value * rate) * year_fraction
        }
        _ => 0.0,
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
        });

        asset.accumulated_depreciation += amount;
    }
    
    entries
}
