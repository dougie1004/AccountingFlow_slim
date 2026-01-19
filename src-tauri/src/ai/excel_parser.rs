use crate::core::models::ParsedTransaction;
use calamine::{Reader, Xlsx, Data};
use std::io::Cursor;

pub fn parse_excel_file(bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let mut excel: Xlsx<_> = Reader::new(Cursor::new(bytes))
        .map_err(|e| format!("Excel 파일 열기 실패: {}", e))?;
    
    let sheet_name = excel.sheet_names()
        .get(0)
        .ok_or("시트를 찾을 수 없습니다.")?
        .clone();
    
    let range = excel.worksheet_range(&sheet_name)
        .map_err(|e| format!("시트 읽기 실패: {}", e))?;
    
    let mut results = Vec::new();
    let mut col_map = std::collections::HashMap::new();

    // 1. Smart Header Mapping
    println!("[Excel Parser] Starting extraction from sheet: {} (Total {} rows)", sheet_name, range.rows().count());
    if let Some(header_row) = range.rows().next() {
        for (i, cell) in header_row.iter().enumerate() {
            let val = cell.to_string().to_lowercase().replace(" ", "");
            if val.contains("날짜") || val.contains("date") || val.contains("일자") { col_map.insert("date", i); }
            else if val.contains("거래처") || val.contains("vendor") || val.contains("상호") || val.contains("가맹점") { col_map.insert("vendor", i); }
            else if val.contains("적요") || val.contains("내용") || val.contains("품명") || val.contains("description") { col_map.insert("desc", i); }
            else if val.contains("금액") || val.contains("amount") || val.contains("합계") || val.contains("price") { col_map.insert("amount", i); }
        }
    }

    // Fallback if no header matched: Assume standard 0,1,2,3
    if col_map.is_empty() {
        col_map.insert("date", 0);
        col_map.insert("vendor", 1);
        col_map.insert("desc", 2);
        col_map.insert("amount", 3);
    }

    for row in range.rows().skip(1) {
        if row.is_empty() { continue; }

        let date = col_map.get("date").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_default();
        let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_else(|| "내부거래".into());
        let description = col_map.get("desc").and_then(|&i| row.get(i)).map(|c| c.to_string()).unwrap_or_else(|| "상세내역 없음".into());
        
        let amount_cell = col_map.get("amount").and_then(|&i| row.get(i));
        let amount = match amount_cell {
            Some(Data::Float(f)) => *f,
            Some(Data::Int(i)) => *i as f64,
            Some(Data::String(s)) => s.replace(",", "").replace("₩", "").replace("원", "").trim().parse::<f64>().unwrap_or(0.0),
            _ => 0.0,
        };

        if date.is_empty() && amount == 0.0 { continue; }

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            vat: (amount / 11.0).round(),
            entry_type: Some("Expense".to_string()),
            description: Some(description),
            vendor: Some(vendor),
            vendor_reg_no: None,
            vendor_representative: None,
            vendor_address: None,
            reasoning: "Smart Excel Engine으로 추출됨".to_string(),
            account_name: None,
            needs_clarification: amount == 0.0,
            clarification_prompt: if amount == 0.0 { Some("금액 데이터를 찾을 수 없습니다.".to_string()) } else { None },
            clarification_options: None,
            is_consultation: false,
            confidence: Some(if amount > 0.0 && !date.is_empty() { "High".to_string() } else { "Normal".to_string() }),
            payment_method: None,
            audit_trail: vec!["#1 Excel 지능형 파싱 완료".to_string()],
            id: Some(crate::utils::id_generator::generate_id(&date, crate::utils::id_generator::IdPrefix::AI)),
            ..Default::default()
        };

        crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
        results.push(tx);
    }

    Ok(results)
}
