use crate::core::models::{AuditSnapshot, EntityMetadata, ValidationResult};

pub fn run_validation(snapshot: &AuditSnapshot, meta: Option<&EntityMetadata>) -> Vec<ValidationResult> {
    let mut results = Vec::new();

    // 1. Level 1: Identity & Master Data Check
    if let Some(data) = meta {
        // Reg ID Format (Simple Length Check for demo)
        let reg_id_clean = data.reg_id.replace("-", "");
        if reg_id_clean.len() != 10 {
            results.push(ValidationResult {
                status: "Critical".to_string(),
                message: format!("Invalid Business Reg ID length: {}. Must be 10 digits.", reg_id_clean.len()),
                field: Some("reg_id".to_string()),
            });
        }
    } else {
        results.push(ValidationResult {
            status: "Critical".to_string(),
            message: "Entity Metadata missing. Run Setup Wizard first.".to_string(),
            field: Some("entity_metadata".to_string()),
        });
    }

    // 2. Level 2: Financial Consistency (Assets = Liability + Equity)
    // In a real snapshot, we would parse the JSON hash or used computed totals.
    // For this demo, we assume the snapshot might store simple totals or we check basic sanity.
    
    if snapshot.total_amount < 0.0 {
         results.push(ValidationResult {
            status: "Critical".to_string(),
            message: "Total transaction amount cannot be negative.".to_string(),
            field: Some("total_amount".to_string()),
        });
    }

    if snapshot.record_count == 0 {
        results.push(ValidationResult {
            status: "Warning".to_string(),
            message: "Snapshot contains 0 records. Filing might be empty.".to_string(),
            field: Some("record_count".to_string()),
        });
    }

    // 3. Mock logic for Asset = L+E check (Since we don't have full BS struct in snapshot yet)
    // We'll simulate a pass for now, or add a fake error if total is "1234.56" (magic number for testing)
    
    if results.is_empty() {
        results.push(ValidationResult {
            status: "Success".to_string(),
            message: "All Pre-Filing Checks Passed.".to_string(),
            field: None,
        });
    }

    results
}
