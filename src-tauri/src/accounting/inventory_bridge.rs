use crate::core::models::{Order, JournalEntry};
use crate::utils::id_generator;

/**
 * 입출고-회계 브릿지 (Inventory-Accounting Bridge)
 * 비즈니스 이벤트(수주/발주)를 회계 전표로 자동 번역
 */

pub fn convert_order_to_journal(order: &Order, tenant_id: &str) -> Vec<JournalEntry> {
    let mut entries = Vec::new();
    let date = &order.date;
    let net_amount = order.total_amount;
    let vat_amount = order.vat;

    match order.type_field.as_str() {
        "Sales" | "판매" | "RETURN_SALES" => {
            let is_reversal = order.type_field.contains("RETURN") || order.status == "CANCELLED";
            let multiplier = if is_reversal { -1.0 } else { 1.0 };
            
            entries.push(JournalEntry {
                id: id_generator::generate_id(date, id_generator::IdPrefix::AI),
                date: date.clone(),
                description: format!("[{}] 주문번호 {}", if is_reversal { "반품/취소" } else { "매출" }, order.id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "외상매출금".to_string(),
                credit_account: "매출".to_string(),
                amount: net_amount * multiplier,
                vat: vat_amount * multiplier,
                entry_type: "Revenue".to_string(),
                status: "Staging".to_string(),
                tax_code: Some("11".to_string()),
                version: 1,
                last_modified_by: Some(tenant_id.to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: Some(format!("ERP 판매 모듈 {}", if is_reversal { "역분개 생성" } else { "자동생성" })),
                tax_base_amount: None,
                audit_trail: vec![],
                parse_status: None,
                raw_data_snapshot: None,
                transaction_group_id: None,
                employee_tags: vec![],
                is_insurance_part: false,
            });
        }
        "Purchase" | "구매" | "RETURN_PURCHASE" => {
            let is_reversal = order.type_field.contains("RETURN") || order.status == "CANCELLED";
            let multiplier = if is_reversal { -1.0 } else { 1.0 };

            entries.push(JournalEntry {
                id: id_generator::generate_id(date, id_generator::IdPrefix::AI),
                date: date.clone(),
                description: format!("[{}] 발주번호 {}", if is_reversal { "반입/취소" } else { "매입" }, order.id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "상품".to_string(),
                credit_account: "외상매입금".to_string(),
                amount: net_amount * multiplier,
                vat: vat_amount * multiplier,
                entry_type: "Asset".to_string(),
                status: "Staging".to_string(),
                tax_code: Some("51".to_string()),
                version: 1,
                last_modified_by: Some(tenant_id.to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: Some(format!("ERP 구매 모듈 {}", if is_reversal { "역분개 생성" } else { "자동생성" })),
                tax_base_amount: None,
                audit_trail: vec![],
                parse_status: None,
                raw_data_snapshot: None,
                transaction_group_id: None,
                employee_tags: vec![],
                is_insurance_part: false,
            });
        }
        _ => {}
    }

    entries
}

pub fn handle_inventory_event(event_type: &str, order: &Order, tenant_id: &str) -> Option<Vec<JournalEntry>> {
    println!("[Event Bus] Inventory Event: {} for Order {}", event_type, order.id);
    
    match event_type {
        "SHIPPED" | "RECEIVED" | "RETURNED" | "CANCELLED" => Some(convert_order_to_journal(order, tenant_id)),
        _ => None
    }
}
