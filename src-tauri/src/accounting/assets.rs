use serde::{Deserialize, Serialize};
use crate::core::models::{Asset, JournalEntry};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DepreciationSchedule {
    pub items: Vec<DepreciationItem>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DepreciationItem {
    pub year: u32,
    pub depreciation_expense: f64,
    pub accumulated_depreciation: f64,
    pub book_value: f64,
}

pub fn generate_depreciation_schedule(asset: &Asset) -> DepreciationSchedule {
    let mut items = Vec::new();
    let mut accumulated = asset.accumulated_depreciation;
    let yearly_depreciation = if asset.useful_life > 0 {
        (asset.cost - asset.residual_value) / asset.useful_life as f64
    } else {
        0.0
    };

    // Generate simplified schedule for 20 years max or useful life
    let limit = asset.useful_life.min(20);

    for i in 1..=limit {
        accumulated += yearly_depreciation;
        if accumulated > asset.cost {
            accumulated = asset.cost;
        }
        
        let book_value = (asset.cost - accumulated).max(0.0);
        let expense = if book_value == 0.0 && i > 1 { 0.0 } else { yearly_depreciation };

        items.push(DepreciationItem {
            year: i,
            depreciation_expense: expense,
            accumulated_depreciation: accumulated,
            book_value,
        });
    }

    DepreciationSchedule { items }
}

pub fn generate_closing_entries(
    assets: &mut Vec<Asset>,
    date: &str,
    tenant_id: &str,
    _existing_entries: &[JournalEntry]
) -> Vec<JournalEntry> {
    let mut entries = Vec::new();
    
    for asset in assets {
        // Slimmed: Simple linear depreciation logic
        let raw_amount = asset.cost / (asset.useful_life as f64).max(1.0);
        let amount = raw_amount.round();
        
        if amount > 0.0 {
            entries.push(JournalEntry {
                id: format!("DEP-{}", asset.id),
                date: date.to_string(),
                description: format!("Asset Depreciation: {}", asset.name),
                vendor: None,
                debit_account: "감가상각비".to_string(),
                credit_account: "감가상각누계액".to_string(),
                amount,
                vat: 0.0,
                entry_type: "Expense".to_string(),
                status: "Closed".to_string(),
                audit_trail: vec![format!("Automatic Depreciation (Slim Engine) - Tenant: {}", tenant_id)],
            });
            
            asset.accumulated_depreciation += amount;
        }
    }
    
    entries
}
