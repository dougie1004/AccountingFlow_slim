use crate::core::models::{ParsedTransaction, ParseStatus};
use csv::ReaderBuilder;
use encoding_rs::{EUC_KR, UTF_16LE};
use std::io::Cursor;
use crate::ai::rule_based_classifier; 

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

    let mut all_records = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV Read Error: {}", e))?;
        all_records.push(record.iter().map(|s| {
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
        if fields.iter().all(|s| s.trim().is_empty()) { continue; }
        if fields.iter().any(|f| f.contains("합계") || f.contains("Total") || f.contains("소계")) { continue; }

        let raw_row_string = fields.join(", ");
        let mut date = String::new();
        let mut amount = 0.0;
        let mut vendor = String::new();
        let mut description = String::new();
        let mut row_status = ParseStatus::Ok;
        let mut row_error = None;

        if !col_map.is_empty() {
            if let Some(idx) = col_map.get("date") { date = fields.get(*idx).cloned().unwrap_or_default(); }
            if let Some(idx) = col_map.get("amount") { 
                let (val, status, msg) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                amount = val;
                if status != ParseStatus::Ok { 
                    row_status = status; 
                    row_error = msg;
                }
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
        }

        if description.trim().is_empty() { description = global_title.clone(); }
        if date.trim().is_empty() { date = global_date.clone(); }

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            entry_type: Some("Expense".to_string()),
            description: Some(description),
            vendor: Some(vendor),
            reasoning: format!("Robust Parser (Slim) | Context: {}", global_title),
            id: Some(crate::utils::id_generator::generate_id("TX", crate::utils::id_generator::IdPrefix::AI)),
            parse_status: Some(row_status),
            vat: 0.0,
            ..Default::default()
        };

        rule_based_classifier::classify_by_rules(&mut tx); 
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
            if val.contains("date") || val.contains("일자") { map.insert("date".to_string(), col_idx); score += 3; }
            else if val.contains("amount") || val.contains("금액") { map.insert("amount".to_string(), col_idx); score += 4; }
            else if val.contains("vendor") || val.contains("상호") { map.insert("vendor".to_string(), col_idx); score += 3; }
            else if val.contains("desc") || val.contains("적요") { map.insert("desc".to_string(), col_idx); score += 2; }
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
