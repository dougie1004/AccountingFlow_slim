use crate::core::models::*;
use crate::core::file_utils;
use chrono::Local;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValuationSummary {
    pub total_cost: f64,
    pub total_nrv: f64,
    pub adjustment_needed: f64,
    pub valuation_logs: Vec<String>,
}

pub fn process_order_journaling(order: &Order, version_counter: &mut u32) -> Result<Vec<JournalEntry>, String> {
    let mut entries = Vec::new();
    let date = order.date.clone();
    let version = *version_counter;
    
    // 1. AI Compliance Layer: Price Variance Check (& Monitoring)
    let mut compliance_logs = Vec::new();
    let mut is_flagged = false;
    
    for item in &order.items {
        // Mock: 20% 이상 가격 변동 감지 (현업에서는 DB의 과거 단가와 비교)
        let market_price = item.unit_price * 0.85; // 가상의 시장가/과거가
        if item.unit_price > market_price * 1.2 {
            is_flagged = true;
            compliance_logs.push(format!("⚠️ [가격 이상] {} 품목의 단가(₩{})가 시장 평균 대비 20% 이상 높습니다.", item.sku, item.unit_price));
        }
    }

    let compliance_context = if is_flagged {
        Some(compliance_logs.join("\n"))
    } else {
        Some("✅ 정상 거래 범위 내 확인됨".to_string())
    };

    // 2. ERP AUTO-JOURNAL LOGIC
    match (order.type_field.as_str(), order.status.as_str()) {
        ("PURCHASE", "FULFILLED") => {
            // GR (Goods Receipt): Dr Inventory / Cr AP
            let mut entry = JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("Goods Receipt - PO #{} (Vendor: {})", order.id, order.partner_id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "상품 (재고자산)".to_string(),
                credit_account: "외상매입금".to_string(),
                amount: order.total_amount,
                vat: order.vat,
                entry_type: "Asset".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("PURCHASE_GR".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: compliance_context.clone(),
            };
            
            // PII 마스킹 (구매자 실명이나 이메일 등이 포함될 수 있는 필드 보호)
            if file_utils::is_high_density_pii(&entry.description) {
                entry.description = "[PROTECTED] 주문 기반 전표 생성".to_string();
            }
            
            entries.push(entry);
        },
        ("SALES", "INVOICED") => {
            // 1. Revenue: Dr AR / Cr Sales
            entries.push(JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("Sales Invoice - SO #{}", order.id),
                vendor: Some(order.partner_id.clone()),
                debit_account: "외상매출금".to_string(),
                credit_account: "상품매출".to_string(),
                amount: order.total_amount,
                vat: order.vat,
                entry_type: "Revenue".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("SALES_INV".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: compliance_context.clone(),
            });

            // 2. COGS (70% 자동 계산)
            let cogs_amount = order.total_amount * 0.7; 
            entries.push(JournalEntry {
                id: uuid::Uuid::new_v4().to_string(),
                date: date.clone(),
                description: format!("COGS Recognition - SO #{}", order.id),
                vendor: Some("Internal".to_string()),
                debit_account: "매출원가".to_string(),
                credit_account: "상품 (재고자산)".to_string(),
                amount: cogs_amount,
                vat: 0.0,
                entry_type: "Expense".to_string(),
                status: "Approved".to_string(),
                tax_code: Some("COGS_AUTO".to_string()),
                version,
                last_modified_by: Some("System (SCM Engine)".to_string()),
                attachment_url: None,
                ocr_data: None,
                compliance_context: Some("AI 원가 배분 로직 적용됨".to_string()),
            });
        },
        _ => return Err("전표 생성이 불가능한 주문 상태입니다.".to_string())
    }

    *version_counter += 1;
    Ok(entries)
}

/// 재고 감모 손실(Shrinkage) 처리 전표 생성
pub fn process_inventory_shrinkage(item_name: &str, sku: &str, lost_qty: f64, unit_cost: f64, version_counter: &mut u32) -> JournalEntry {
    let amount = lost_qty * unit_cost;
    JournalEntry {
        id: uuid::Uuid::new_v4().to_string(),
        date: Local::now().format("%Y-%m-%d").to_string(),
        description: format!("[재정비] 재고 실사 결과 감모 손실 반영 ({} / {})", item_name, sku),
        vendor: Some("재무실사".to_string()),
        debit_account: "재고자산감모손실".to_string(),
        credit_account: "상품 (재고자산)".to_string(),
        amount,
        vat: 0.0,
        entry_type: "Expense".to_string(),
        status: "Unconfirmed".to_string(),
        tax_code: Some("INV_SHRINKAGE".to_string()),
        version: *version_counter,
        last_modified_by: Some("System (Auditor)".to_string()),
        attachment_url: None,
        ocr_data: None,
        compliance_context: Some(format!("실사 차이 {}개에 대한 손실 처리. AI 분석 대상.", lost_qty)),
    }
}

/// FIFO 기반 매출원가(COGS) 계산 로직
pub fn calculate_fifo_cogs(
    sku: &str,
    quantity_to_sell: f64,
    inventory: &mut Vec<InventoryItem>
) -> Result<f64, String> {
    let item = inventory.iter_mut()
        .find(|i| i.sku == sku)
        .ok_or(format!("재고 품목을 찾을 수 없습니다: {}", sku))?;

    let mut remaining_to_sell = quantity_to_sell;
    let mut total_cogs = 0.0;

    // FIFO: 선입선출 (오래된 배치부터 소진)
    item.batches.sort_by(|a, b| a.acquisition_date.cmp(&b.acquisition_date));

    for batch in item.batches.iter_mut() {
        if remaining_to_sell <= 0.0 { break; }

        let sell_from_this_batch = batch.quantity.min(remaining_to_sell);
        total_cogs += sell_from_this_batch * batch.unit_cost;
        batch.quantity -= sell_from_this_batch;
        remaining_to_sell -= sell_from_this_batch;
    }

    if remaining_to_sell > 0.0 {
        return Err(format!("{} 품목의 재고가 부족합니다. (부족분: {})", sku, remaining_to_sell));
    }

    // 수량이 0인 배치 제거
    item.batches.retain(|b| b.quantity > 0.0);

    Ok(total_cogs)
}

/// 저가법(LCM: Lower of Cost or Market) 평가 로직
pub fn evaluate_lcm(inventory: &[InventoryItem]) -> ValuationSummary {
    let mut total_cost = 0.0;
    let mut total_nrv = 0.0;
    let mut valuation_logs = Vec::new();

    for item in inventory {
        let item_cost: f64 = item.batches.iter().map(|b| b.quantity * b.unit_cost).sum();
        let total_qty: f64 = item.batches.iter().map(|b| b.quantity).sum();
        
        total_cost += item_cost;

        if let Some(nrv_unit) = item.last_nrv {
            let item_nrv = total_qty * nrv_unit;
            total_nrv += item_nrv;

            if item_nrv < item_cost {
                valuation_logs.push(format!(
                    "📉 [저가법 평가] {} (SKU: {}): 원가 ₩{:.0} > 순실현가능가치 ₩{:.0}. 감액 필요.",
                    item.name, item.sku, item_cost, item_nrv
                ));
            } else {
                valuation_logs.push(format!(
                    "✅ [정상] {} (SKU: {}): 가치 유지 중.",
                    item.name, item.sku
                ));
            }
        } else {
            total_nrv += item_cost; // NRV 정보 없으면 원가와 동일하게 간주
        }
    }

    let adjustment_needed = (total_cost - total_nrv).max(0.0);

    ValuationSummary {
        total_cost,
        total_nrv,
        adjustment_needed,
        valuation_logs,
    }
}
