use crate::core::models::{Asset, JournalEntry};

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
