use crate::core::models::{Order, JournalEntry};

pub fn generate_journal_from_scm(order: &Order, tenant_id: &str) -> Vec<JournalEntry> {
    let mut entries = Vec::new();
    let date = &order.date;

    // Simplified logic for simulation purposes
    if order.type_field == "PURCHASE" {
        entries.push(JournalEntry {
            id: format!("JE-SCM-PUR-{}", order.id),
            date: date.clone(),
            description: format!("[SCM] 원자재 입고 전표 - {}", order.id),
            vendor: Some(order.partner_id.clone()),
            debit_account: "상품".to_string(),
            credit_account: "외상매입금".to_string(),
            amount: order.total_amount,
            vat: order.vat,
            entry_type: "Asset".to_string(),
            status: "Staging".to_string(),
            tax_code: None,
            version: 1,
            last_modified_by: Some(tenant_id.to_string()),
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
    } else if order.type_field == "SALES" {
        entries.push(JournalEntry {
            id: format!("JE-SCM-SAL-{}", order.id),
            date: date.clone(),
            description: format!("[SCM] 제품 출하 전표 - {}", order.id),
            vendor: Some(order.partner_id.clone()),
            debit_account: "외상매출금".to_string(),
            credit_account: "매출".to_string(),
            amount: order.total_amount,
            vat: order.vat,
            entry_type: "Revenue".to_string(),
            status: "Staging".to_string(),
            tax_code: None,
            version: 1,
            last_modified_by: Some(tenant_id.to_string()),
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
    }

    entries
}

#[derive(serde::Serialize)]
pub struct ValuationSummary {
    pub total_cost: f64,
    pub total_nrv: f64,
    pub adjustment_needed: f64,
    pub alert: String,
}

pub fn evaluate_lcm(inventory: &[crate::core::models::InventoryItem]) -> ValuationSummary {
    let mut total_cost = 0.0;
    let mut total_nrv = 0.0;

    for item in inventory {
        for batch in &item.batches {
            total_cost += batch.quantity * batch.unit_cost;
        }
        if let Some(nrv) = item.last_nrv {
            total_nrv += nrv; // Simplified
        }
    }

    let loss = (total_cost - total_nrv).max(0.0);
    ValuationSummary {
        total_cost,
        total_nrv,
        adjustment_needed: loss,
        alert: if loss > 1000000.0 { "High Valuation Risk".to_string() } else { "Safe".to_string() },
    }
}
