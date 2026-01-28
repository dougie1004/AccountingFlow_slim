use std::collections::HashMap;
use crate::core::models::ParsedTransaction;
use csv::ReaderBuilder;
use std::io::Cursor;
use calamine::{Reader, Xlsx, XlsxError};

pub fn suggest_mapping(headers: Vec<String>) -> HashMap<String, String> {
    let mut mapping = HashMap::new();
    for header in headers {
        let h_norm = header.to_lowercase().replace(" ", "");
        if h_norm.contains("일자") || h_norm.contains("date") {
            mapping.insert(header.clone(), "tx_date".to_string());
        } else if h_norm.contains("금액") || h_norm.contains("amount") {
            mapping.insert(header.clone(), "amount".to_string());
        } else if h_norm.contains("거래처") || h_norm.contains("vendor") {
            mapping.insert(header.clone(), "vendor".to_string());
        } else if h_norm.contains("내용") || h_norm.contains("desc") {
            mapping.insert(header.clone(), "description".to_string());
        }
    }
    mapping
}

pub fn get_headers(bytes: &[u8], file_name: &str) -> Result<Vec<String>, String> {
    let ext = std::path::Path::new(file_name).extension().and_then(|s| s.to_str()).unwrap_or_default().to_lowercase();
    if ext == "xlsx" || ext == "xls" {
        let mut excel: Xlsx<Cursor<&[u8]>> = calamine::open_workbook_from_rs(Cursor::new(bytes)).map_err(|e: XlsxError| e.to_string())?;
        let sheet = excel.sheet_names().get(0).ok_or("No sheets")?.clone();
        let range = excel.worksheet_range(&sheet).map_err(|e: XlsxError| e.to_string())?;
        if let Some(row) = range.rows().next() {
            return Ok(row.iter().map(|c| c.to_string()).collect());
        }
    } else {
        let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
        let mut rdr = ReaderBuilder::new().has_headers(false).from_reader(decoded.as_bytes());
        if let Some(result) = rdr.records().next() {
            let record = result.map_err(|e| e.to_string())?;
            return Ok(record.iter().map(|s| s.to_string()).collect());
        }
    }
    Err("Headers not found".into())
}

pub fn process_with_mapping(
    bytes: &[u8],
    file_name: &str,
    mapping: HashMap<String, String>
) -> Result<Vec<ParsedTransaction>, String> {
    let headers = get_headers(bytes, file_name)?;
    let mut col_map = HashMap::new();
    for (i, h) in headers.iter().enumerate() {
        if let Some(standard) = mapping.get(h) {
            col_map.insert(standard.clone(), i);
        }
    }

    if !col_map.contains_key("tx_date") || !col_map.contains_key("amount") {
        return Err("Missing required mappings (Date, Amount)".into());
    }

    let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(decoded.as_bytes());
    let mut results = Vec::new();

    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        let date = col_map.get("tx_date").and_then(|&i| record.get(i)).unwrap_or("").to_string();
        let amount_str = col_map.get("amount").and_then(|&i| record.get(i)).unwrap_or("0");
        let amount = amount_str.replace(",", "").parse::<f64>().unwrap_or(0.0);
        let vendor = col_map.get("vendor").and_then(|&i| record.get(i)).unwrap_or("Unknown").to_string();
        let desc = col_map.get("description").and_then(|&i| record.get(i)).unwrap_or("").to_string();

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            vat: (amount / 11.0).round(),
            entry_type: Some("Expense".to_string()),
            description: Some(desc),
            vendor: Some(vendor),
            reasoning: "Manual Mapping Import".to_string(),
            id: Some(crate::utils::id_generator::generate_id(&date, crate::utils::id_generator::IdPrefix::AI)),
            ..Default::default()
        };
        crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
        results.push(tx);
    }

    Ok(results)
}
