use crate::core::models::{ParsedTransaction, SystemError, TransactionSource, AmountOrigin};
use calamine::{Reader, Xlsx, Data};
use std::io::Cursor;

#[derive(Debug)]
pub enum ExcelError {
    InvalidFormat(String),
    EmptyFile,
}

impl From<ExcelError> for SystemError {
    fn from(e: ExcelError) -> Self {
        match e {
            ExcelError::InvalidFormat(s) => SystemError::InvalidFormat(s),
            ExcelError::EmptyFile => SystemError::EmptyFile,
        }
    }
}

pub fn parse_excel_file(bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, ExcelError> {
    if bytes.is_empty() { return Err(ExcelError::EmptyFile); }

    let mut excel = calamine::open_workbook_auto_from_rs(Cursor::new(bytes))
        .map_err(|_| ExcelError::InvalidFormat("Excel Open Error".to_string()))?;
    
    let sheet_name = excel.sheet_names()
        .get(0)
        .ok_or(ExcelError::InvalidFormat("No sheets".to_string()))?
        .clone();
    
    let range = excel.worksheet_range(&sheet_name)
        .map_err(|_| ExcelError::InvalidFormat("Sheet Error".to_string()))?;
    
    let mut results = Vec::new();
    let mut col_map = std::collections::HashMap::new();
    let mut header_row_idx = 0;

    // Look for headers in the first 100 rows (Card statements often have long summaries at top)
    for (idx, row) in range.rows().take(100).enumerate() {
        if col_map.len() >= 3 { 
            header_row_idx = idx;
            break; 
        }
        col_map.clear();
        for (i, cell) in row.iter().enumerate() {
            let val = cell.to_string().to_lowercase().replace(" ", "").replace("_", "");
            if val.contains("합계") || val.contains("total") || val.contains("소계") { continue; } // Skip summary rows as headers

            if val.contains("날짜") || val.contains("date") || val.contains("일자") || val.contains("이용일") || val.contains("거래일") { col_map.insert("date", i); }
            else if val.contains("거래처") || val.contains("vendor") || val.contains("상호") || val.contains("가맹점") || val.contains("매장") { col_map.insert("vendor", i); }
            else if val.contains("적요") || val.contains("내용") || val.contains("description") || val.contains("항목") || val.contains("품명") { col_map.insert("desc", i); }
            // 1. Specific Flow Keywords (Priority)
            else if val.contains("출금") || val.contains("withdrawal") || val.contains("보낸금액") { col_map.insert("withdrawal", i); }
            else if val.contains("입금") || val.contains("deposit") || val.contains("받은금액") { col_map.insert("deposit", i); }
            // 2. Generic Amount (Fallback)
            else if (val.contains("amount") || val.contains("금액") || val.contains("거래금액") || val.contains("이용금액") || val.contains("승인금액") || val.contains("결제금액") || val.contains("합계") || val.contains("공급가액")) 
                     && !val.contains("부가세") && !val.contains("vat") && !val.contains("혜택") && !val.contains("할인") && !val.contains("포인트") {
                if !col_map.contains_key("withdrawal") && !col_map.contains_key("deposit") {
                    col_map.insert("amount", i);
                }
            }
            else if val.contains("비고") || val.contains("메모") || val.contains("참조") || val.contains("note") || val.contains("remark") { col_map.insert("note", i); }
        }
    }

    // [INTEGRITY CHECK] If no header found, return error rather than parsing garbage
    if col_map.is_empty() {
         return Err(ExcelError::InvalidFormat("Invalid Grid Structure".to_string()));
    }

    for row in range.rows().skip(header_row_idx + 1) {
        if row.is_empty() { continue; }

        let date_raw = col_map.get("date").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_default();
        if date_raw.is_empty() || date_raw.to_lowercase().contains("total") || date_raw.contains("합계") { continue; }

        let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_else(|| "Unknown".into());
        let mut description_base = col_map.get("desc").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_default();
        
        if description_base.is_empty() {
            description_base = vendor.clone();
        }

        let note = col_map.get("note").and_then(|&i| row.get(i)).map(|c| c.to_string()).filter(|s| !s.is_empty());
        
        let description = match note {
            Some(n) => format!("{} ({})", description_base, n),
            None => description_base
        };

        let parse_money = |val: &Data| -> f64 {
            match val {
                Data::Float(f) => *f,
                Data::Int(i) => *i as f64,
                Data::String(s) => {
                    // Clean currency format like "1,120,526 원"
                    let cleaned = s.replace(",", "").replace("원", "").replace("￦", "").trim().to_string();
                    cleaned.parse::<f64>().unwrap_or(0.0)
                },
                _ => 0.0,
            }
        };

        let withdrawal = col_map.get("withdrawal").and_then(|&i| row.get(i)).map(parse_money).unwrap_or(0.0);
        let deposit = col_map.get("deposit").and_then(|&i| row.get(i)).map(parse_money).unwrap_or(0.0);
        let mut amount = col_map.get("amount").and_then(|&i| row.get(i)).map(parse_money).unwrap_or(0.0);

        let mut entry_type = "Expense";
        let mut payment_method = "Card"; // Default

        let (mut amount, origin, source) = if deposit > 0.0 && withdrawal == 0.0 {
            (deposit, AmountOrigin::DepositColumn, TransactionSource::BankFile)
        } else if withdrawal > 0.0 {
            (withdrawal, AmountOrigin::WithdrawalColumn, TransactionSource::BankFile)
        } else {
            (amount, AmountOrigin::Generic, TransactionSource::CardFile)
        };

        if amount == 0.0 { continue; }

        let mut tx = ParsedTransaction {
            date: Some(date_raw.clone()),
            amount,
            vat: (amount / 11.0).round(),
            source_type: Some(source),
            amount_origin: Some(origin),
            description: Some(description),
            vendor: Some(vendor),
            reasoning: format!("Excel Import: {}", if deposit > 0.0 { "Revenue" } else { "Expense" }),
            needs_clarification: amount == 0.0,
            confidence: Some("High".to_string()),
            audit_trail: vec!["#1 Excel Multi-Col Import".to_string()],
            id: Some(crate::utils::id_generator::generate_id(&date_raw, crate::utils::id_generator::IdPrefix::AI)),
            ..Default::default()
        };

        let _ = crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
        results.push(tx);
    }

    if results.is_empty() {
        return Err(ExcelError::EmptyFile);
    }

    Ok(results)
}
