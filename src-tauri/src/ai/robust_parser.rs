use crate::core::models::{ParsedTransaction, ParseStatus};
use csv::ReaderBuilder;
use std::io::Cursor;
// use crate::ai::rule_based_classifier;  
use uuid::Uuid; 

/**
 * Robust CSV Parser (Slim Version)
 * Stripped automatic payroll/insurance splitting.
 */
pub fn parse_robust_csv(data: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let decoded_content = detect_and_decode(&data)?;
    let delimiter = detect_delimiter(&decoded_content);

    let mut rdr = ReaderBuilder::new()
        .has_headers(false)
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(Cursor::new(decoded_content));

    let mut all_records: Vec<Vec<String>> = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV Read Error: {}", e))?;
        all_records.push(record.iter().map(|s: &str| {
            let mut val = s.trim().to_string();
            if val.starts_with('"') && val.ends_with('"') && val.len() >= 2 {
                val = val[1..val.len()-1].to_string();
            }
            val
        }).collect::<Vec<String>>());
    }

    if all_records.is_empty() {
        return Ok(Vec::new());
    }

    let (global_title, global_date) = extract_global_metadata(&all_records);
    let (header_row_idx, col_map) = detect_columns(&all_records);

    let mut results = Vec::new();
    let start_row = if header_row_idx == 0 && col_map.is_empty() { 0 } else { header_row_idx + 1 };

    for fields in all_records.iter().enumerate().skip(start_row).map(|(_, f)| f) {
        if fields.iter().all(|s: &String| s.trim().is_empty()) { continue; }
        if fields.iter().any(|f: &String| f.contains("합계") || f.contains("Total") || f.contains("소계")) { continue; }

        let raw_row_string = fields.join(", ");
        let mut date = String::new();
        let mut amount = 0.0;
        let mut vat = 0.0;
        let mut vendor = String::new();
        let mut description = String::new();
        let mut row_status = ParseStatus::Ok;
        let mut row_error = None;
        let mut entry_type = "Expense".to_string();

        if !col_map.is_empty() {
            if let Some(idx) = col_map.get("date") { date = fields.get(*idx).cloned().unwrap_or_default(); }
            
            // Smarter Amount Handling (Withdrawal/Deposit)
            let mut withdrawal = 0.0;
            let mut deposit = 0.0;
            
            if let Some(idx) = col_map.get("withdrawal") {
                let (val, status, _) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                withdrawal = val;
                if status != ParseStatus::Ok && withdrawal == 0.0 { row_status = status; }
            }
            if let Some(idx) = col_map.get("deposit") {
                let (val, status, _) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                deposit = val;
                if status != ParseStatus::Ok && deposit == 0.0 { row_status = status; }
            }
            
            if deposit > 0.0 {
                amount = deposit;
                entry_type = "Revenue".to_string();
            } else if withdrawal > 0.0 {
                amount = withdrawal;
                entry_type = "Expense".to_string();
            } else if let Some(idx) = col_map.get("amount") {
                let (val, status, msg) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                amount = val.abs();
                if status != ParseStatus::Ok { 
                    row_status = status; 
                    row_error = msg;
                }
            }

            if let Some(idx) = col_map.get("vat") {
                let (val, _, _) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                vat = val;
            } else if amount > 0.0 && (fields.iter().any(|f| f.contains("과세") || f.contains("부가가치세"))) {
                 vat = (amount / 11.0).round();
            }

            if let Some(idx) = col_map.get("vendor") { vendor = fields.get(*idx).cloned().unwrap_or_default(); }
            if let Some(idx) = col_map.get("desc") { description = fields.get(*idx).cloned().unwrap_or_default(); }
        } else {
             date = fields.get(0).cloned().unwrap_or_default();
             vendor = fields.get(1).cloned().unwrap_or_default();
             amount = fields.iter().skip(2).find_map(|f| {
                 let (val, _, _) = clean_amount_with_status(f);
                 if val.abs() > 0.0 { Some(val) } else { None }
             }).unwrap_or(0.0);
             entry_type = "Expense".to_string();
        }

        if description.trim().is_empty() { description = global_title.clone(); }
        if date.trim().is_empty() { date = global_date.clone(); }

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            vat,
            entry_type: Some(entry_type),
            description: Some(description),
            vendor: Some(vendor),
            reasoning: format!("Robust Parser (Slim) | Context: {}", global_title),
            id: Some(Uuid::new_v4().to_string()),
            parse_status: Some(row_status),
            ..Default::default()
        };

        // Use the dead stores
        tx.audit_trail.push(format!("Raw Row: {}", raw_row_string));
        
        if let Some(err_msg) = row_error {
            tx.reasoning.push_str(&format!(" | Error: {}", err_msg));
        }

        results.push(tx);
    }

    Ok(results)
}

fn extract_global_metadata(rows: &[Vec<String>]) -> (String, String) {
    let mut title = "Imported Document".to_string();
    let mut date = String::new();
    for row in rows.iter().take(5) {
        for cell in row {
            let val = cell.trim();
            if title == "Imported Document" && (val.contains("내역서") || val.contains("계산서") || val.contains("Statement")) {
                title = val.to_string();
            }
            if date.is_empty() && (val.contains("일자") || val.contains("Date")) {
                date = val.split(':').nth(1).unwrap_or("").trim().to_string();
            }
        }
    }
    (title, date)
}

fn detect_columns(rows: &[Vec<String>]) -> (usize, std::collections::HashMap<String, usize>) {
    let mut best_map = std::collections::HashMap::new();
    let mut best_idx = 0;
    let mut max_score = 0;

    for (i, row) in rows.iter().take(20).enumerate() {
        let mut map = std::collections::HashMap::new();
        let mut score = 0;
        for (col_idx, cell) in row.iter().enumerate() {
            let val = cell.to_lowercase();
            // Date
            if val.contains("date") || val.contains("일자") || val.contains("거래일") { map.insert("date".to_string(), col_idx); score += 3; }
            // Amount
            else if (val.contains("amount") || val.contains("금액") || val.contains("거래금액")) && !val.contains("vat") { map.insert("amount".to_string(), col_idx); score += 4; }
            // Bank specific: Withdrawal/Deposit
            else if val.contains("출금") || val.contains("withdrawal") || val.contains("맡기신") { map.insert("withdrawal".to_string(), col_idx); score += 4; }
            else if val.contains("입금") || val.contains("deposit") || val.contains("찾으신") { map.insert("deposit".to_string(), col_idx); score += 4; }
            // VAT
            else if val.contains("vat") || val.contains("부가세") || val.contains("세액") { map.insert("vat".to_string(), col_idx); score += 3; }
            // Vendor
            else if val.contains("vendor") || val.contains("상호") || val.contains("거래처") || val.contains("가맹점") { map.insert("vendor".to_string(), col_idx); score += 3; }
            // Description
            else if val.contains("desc") || val.contains("적요") || val.contains("품명") || val.contains("내용") { map.insert("desc".to_string(), col_idx); score += 2; }
        }
        if score > max_score { max_score = score; best_map = map; best_idx = i; }
    }
    (best_idx, best_map)
}

fn clean_amount_with_status(val: &str) -> (f64, ParseStatus, Option<String>) {
    let clean: String = val.chars().filter(|c| c.is_numeric() || *c == '.' || *c == '-').collect();
    let amt = clean.parse::<f64>().unwrap_or(0.0);
    (amt, if amt != 0.0 { ParseStatus::Ok } else { ParseStatus::Warning }, None)
}

pub fn detect_delimiter(content: &str) -> u8 {
    if content.contains('\t') { b'\t' } else { b',' }
}

pub fn detect_and_decode(bytes: &[u8]) -> Result<String, String> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        Ok(String::from_utf8_lossy(&bytes[3..]).to_string())
    } else {
        Ok(String::from_utf8_lossy(bytes).to_string())
    }
}
