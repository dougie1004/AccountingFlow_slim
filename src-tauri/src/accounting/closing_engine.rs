use crate::core::models::{Asset, JournalEntry};
use chrono::NaiveDate;

pub fn calculate_depreciation(assets: Vec<Asset>, date_str: String) -> Vec<JournalEntry> {
    let mut entries = Vec::new();
    let _current_date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").unwrap_or_default();

    for asset in assets {
        // Simple Straight-Line Calculation (Monthly)
        // (Cost - Residual) / Usefule Life (Years) / 12
        let annual_dep = (asset.cost - asset.residual_value) / asset.useful_life as f64;
        let monthly_dep = annual_dep / 12.0;
        
        // Ensure we don't depreciate more than accumulated
        let remaining_value = asset.cost - asset.accumulated_depreciation - asset.residual_value;
        let amount = if remaining_value < monthly_dep { remaining_value } else { monthly_dep };

        if amount <= 0.0 { continue; }

        entries.push(JournalEntry {
            id: uuid::Uuid::new_v4().to_string(),
            date: date_str.clone(),
            description: format!("Depreciation: {}", asset.name),
            vendor: Some("Internal".to_string()),
            debit_account: "Depreciation Expense".to_string(),
            credit_account: "Accumulated Depreciation".to_string(),
            amount,
            vat: 0.0,
            entry_type: "Expense".to_string(),
            status: "Approved".to_string(),
            tax_code: Some("DEPRECIATION".to_string()),
            version: 1,
            last_modified_by: Some("System".to_string()),
            attachment_url: None,
            ocr_data: None,
            compliance_context: None,
            tax_base_amount: None,
            audit_trail: vec![],
            parse_status: None,
            raw_data_snapshot: None,
        });
    }

    entries
}
