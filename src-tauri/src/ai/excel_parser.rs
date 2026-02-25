use crate::core::models::ParsedTransaction;
use calamine::{Reader, Xlsx, Data};
use std::io::Cursor;

pub fn parse_excel_file(bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let mut excel = calamine::open_workbook_auto_from_rs(Cursor::new(bytes))
        .map_err(|e| format!("Excel 파일 열기 실패 (형식 미지원): {}", e))?;
    
    let sheet_name = excel.sheet_names()
        .get(0)
        .ok_or("시트를 찾을 수 없습니다.")?
        .clone();
    
    let range = excel.worksheet_range(&sheet_name)
        .map_err(|e| format!("시트 읽기 실패: {}", e))?;
    
    let mut results = Vec::new();
    let mut col_map = std::collections::HashMap::new();
    let mut header_row_idx = 0;

    // Look for headers in the first 10 rows
    for (idx, row) in range.rows().take(10).enumerate() {
        if col_map.len() >= 3 { 
            header_row_idx = idx;
            break; 
        }
        col_map.clear();
        for (i, cell) in row.iter().enumerate() {
            let val = cell.to_string().to_lowercase().replace(" ", "");
            if val.contains("날짜") || val.contains("date") || val.contains("일자") || val.contains("이용일") { col_map.insert("date", i); }
            else if val.contains("거래처") || val.contains("vendor") || val.contains("상호") || val.contains("가맹점") { col_map.insert("vendor", i); }
            else if val.contains("적요") || val.contains("내용") || val.contains("description") || val.contains("항목") { col_map.insert("desc", i); }
            else if val.contains("출금") || val.contains("withdrawal") { col_map.insert("withdrawal", i); }
            else if val.contains("입금") || val.contains("deposit") { col_map.insert("deposit", i); }
            else if val.contains("금액") || val.contains("amount") || val.contains("결제금액") || val.contains("이용금액") { col_map.insert("amount", i); }
            else if val.contains("비고") || val.contains("메모") || val.contains("참조") || val.contains("note") || val.contains("remark") { col_map.insert("note", i); }
        }
    }

    for row in range.rows().skip(header_row_idx + 1) {
        if row.is_empty() { continue; }

        let date = col_map.get("date").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_default();
        let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_else(|| "Unknown".into());
        let description_base = col_map.get("desc").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_else(|| "No Description".into());
        let note = col_map.get("note").and_then(|&i| row.get(i)).map(|c| c.to_string()).filter(|s| !s.is_empty());
        
        let description = match note {
            Some(n) => format!("{} ({})", description_base, n),
            None => description_base
        };
        let withdrawal = col_map.get("withdrawal").and_then(|&i| row.get(i)).and_then(|c| match c {
            Data::Float(f) => Some(*f),
            Data::Int(i) => Some(*i as f64),
            Data::String(s) => s.replace(",", "").trim().parse::<f64>().ok(),
            _ => None,
        }).unwrap_or(0.0);

        let deposit = col_map.get("deposit").and_then(|&i| row.get(i)).and_then(|c| match c {
            Data::Float(f) => Some(*f),
            Data::Int(i) => Some(*i as f64),
            Data::String(s) => s.replace(",", "").trim().parse::<f64>().ok(),
            _ => None,
        }).unwrap_or(0.0);

        let (amount, entry_type) = if withdrawal > 0.0 {
            (withdrawal, "Expense")
        } else if deposit > 0.0 {
            (deposit, "Revenue")
        } else {
            let amt = col_map.get("amount").and_then(|&i| row.get(i)).and_then(|c| match c {
                Data::Float(f) => Some(*f),
                Data::Int(i) => Some(*i as f64),
                _ => None,
            }).unwrap_or(0.0);
            (amt, "Expense")
        };

        if date.is_empty() && amount == 0.0 { continue; }

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            vat: (amount / 11.0).round(),
            entry_type: Some(entry_type.to_string()),
            description: Some(description),
            vendor: Some(vendor),
            reasoning: format!("Excel Import: {}", entry_type),
            needs_clarification: amount == 0.0,
            confidence: Some("High".to_string()),
            audit_trail: vec!["#1 Excel Multi-Col Import".to_string()],
            id: Some(crate::utils::id_generator::generate_id(&date, crate::utils::id_generator::IdPrefix::AI)),
            ..Default::default()
        };

        crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
        results.push(tx);
    }

    Ok(results)
}
