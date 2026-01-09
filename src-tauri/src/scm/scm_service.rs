use crate::core::models::{JournalEntry, Order};

pub fn process_order_journaling(order: &Order, version_counter: &mut u32) -> Result<Vec<JournalEntry>, String> {
    let mut entries = Vec::new();
    let date = order.date.clone();
    let version = *version_counter;

    // ERP AUTO-JOURNAL LOGIC
    match (order.type_field.as_str(), order.status.as_str()) {
        ("PURCHASE", "FULFILLED") => {
            // GR (Goods Receipt): Dr Inventory / Cr AP
            entries.push(JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("Goods Receipt - PO #{}", order.id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "Inventory (Asset)".to_string(),
                credit_account: "Accounts Payable".to_string(),
                amount: order.total_amount, // Assuming VAT excluded for simplistic mock, or adjust logic
                vat: order.vat,
                entry_type: "Asset".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("PURCHASE_GR".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: None,
            });
        },
        ("SALES", "INVOICED") => {
            // 1. Revenue: Dr AR / Cr Sales
            entries.push(JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("Sales Invoice - SO #{}", order.id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "Accounts Receivable".to_string(),
                credit_account: "Sales Revenue".to_string(),
                amount: order.total_amount,
                vat: order.vat,
                entry_type: "Revenue".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("SALES_INV".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: None,
            });

            // 2. COGS (Simplified - assuming flat 70% cost for demo if unit cost not tracked perfectly in this context)
            // In real ERP, this would sum(item.unit_cost * qty)
            let cogs_amount = order.total_amount * 0.7; 
            entries.push(JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("COGS Recognition - SO #{}", order.id),
                vendor: Some("Internal".to_string()),
                debit_account: "Cost of Goods Sold".to_string(),
                credit_account: "Inventory (Asset)".to_string(),
                amount: cogs_amount,
                vat: 0.0,
                entry_type: "Expense".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("COGS_AUTO".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: None,
            });
        },
        _ => return Err("No auto-journaling rule for this status change.".to_string())
    }

    *version_counter += 1;
    Ok(entries)
}
