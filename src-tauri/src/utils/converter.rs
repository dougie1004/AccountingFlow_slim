use std::collections::HashMap;
use crate::core::models::ParsedTransaction;
use csv::ReaderBuilder;
use std::io::Cursor;
use calamine::{Reader, Xlsx};

fn normalize_key(s: &str) -> String {
    s.to_lowercase()
     .replace("\u{feff}", "")
     .replace(" ", "")
     .replace("\"", "")
     .replace("\r", "")
     .replace("\n", "")
}

pub fn suggest_mapping(headers: Vec<String>) -> HashMap<String, String> {
    let mut mapping = HashMap::new();
    for header in headers {
        let h_norm = normalize_key(&header);
        
        if h_norm.contains("일자") || h_norm.contains("날짜") || h_norm.contains("date") || h_norm.contains("일시") {
            mapping.insert(header.clone(), "tx_date".to_string());
        }
        if h_norm.contains("금액") || h_norm.contains("합계") || h_norm.contains("amount") || h_norm.contains("price") || h_norm.contains("결제") || h_norm.contains("총액") || h_norm.contains("공급") || h_norm.contains("비용") {
            mapping.insert(header.clone(), "amount".to_string());
        }
        if h_norm.contains("상호") || h_norm.contains("거래처") || h_norm.contains("vendor") || h_norm.contains("name") || h_norm.contains("가맹점") || h_norm.contains("적요") {
            mapping.insert(header.clone(), "vendor".to_string());
        }
        if h_norm.contains("내용") || h_norm.contains("적요") || h_norm.contains("description") || h_norm.contains("memo") || h_norm.contains("품명") {
            // desc might overlap with vendor if it contains '적요', but usually description is more detailed
            mapping.insert(header.clone(), "description".to_string());
        }
        if h_norm.contains("결제") || h_norm.contains("수단") || h_norm.contains("payment") || h_norm.contains("구분") {
             mapping.insert(header.clone(), "payment_type".to_string());
        }
    }
    mapping
}

/// Smartly detect delimiter with fallback logic
fn detect_delimiter(content: &str) -> u8 {
    let lines: Vec<&str> = content.lines().take(5).collect();
    if lines.is_empty() { return b','; }

    let mut comma_scores = 0;
    let mut semi_scores = 0;
    let mut tab_scores = 0;

    for line in &lines {
        let line = line.replace("\u{feff}", "");
        comma_scores += line.matches(',').count();
        semi_scores += line.matches(';').count();
        tab_scores += line.matches('\t').count();
    }

    if semi_scores > comma_scores && semi_scores > tab_scores {
        b';'
    } else if tab_scores > comma_scores && tab_scores > semi_scores {
        b'\t'
    } else {
        b','
    }
}

pub fn get_headers(bytes: &[u8], file_name: &str) -> Result<Vec<String>, String> {
    let ext = std::path::Path::new(file_name).extension().and_then(|s| s.to_str()).unwrap_or_default().to_lowercase();
    if ext == "xlsx" || ext == "xls" || ext == "xlsm" {
        let mut excel: Xlsx<_> = calamine::open_workbook_from_rs(Cursor::new(bytes)).map_err(|e: calamine::XlsxError| e.to_string())?;
        let sheet = excel.sheet_names().get(0).ok_or("No sheets")?.clone();
        let range = excel.worksheet_range(&sheet).map_err(|e: calamine::XlsxError| e.to_string())?;
        if let Some(row) = range.rows().next() {
            return Ok(row.iter().map(|c: &calamine::Data| c.to_string().trim().to_string()).collect());
        }
    } else {
        let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
        let delimiter = detect_delimiter(&decoded);
        
        // Try parsing assuming standard CSV/TSV
        let mut rdr = ReaderBuilder::new()
            .has_headers(false)
            .delimiter(delimiter)
            .from_reader(decoded.as_bytes());
            
        if let Some(result) = rdr.records().next() {
            let record = result.map_err(|e| e.to_string())?;
            let headers: Vec<String> = record.iter().map(|s| s.trim().replace("\u{feff}", "").to_string()).collect();
            
            // EMERGENCY FALLBACK: If only 1 column, check for other delimiters in the raw line
            if headers.len() == 1 {
                let raw = &headers[0];
                if raw.contains('\t') {
                    return Ok(raw.split('\t').map(|s| s.trim().to_string()).collect());
                }
                if raw.contains(',') && delimiter != b',' {
                    return Ok(raw.split(',').map(|s| s.trim().to_string()).collect());
                }
                if raw.contains(';') && delimiter != b';' {
                    return Ok(raw.split(';').map(|s| s.trim().to_string()).collect());
                }
            }

            return Ok(headers);
        }
    }
    Err("데이터 헤더를 찾을 수 없거나 파일이 비어있습니다.".into())
}

pub fn process_with_mapping(
    bytes: &[u8],
    file_name: &str,
    mapping: HashMap<String, String>
) -> Result<Vec<ParsedTransaction>, String> {
    let ext = std::path::Path::new(file_name).extension().and_then(|s| s.to_str()).unwrap_or_default().to_lowercase();
    let mut results = Vec::new();

    if ext == "xlsx" || ext == "xls" || ext == "xlsm" {
        // ... (Excel logic same as before, omitted for brevity if unchanged, but included here for completeness)
        let mut excel: Xlsx<_> = calamine::open_workbook_from_rs(Cursor::new(bytes)).map_err(|e: calamine::XlsxError| e.to_string())?;
        let sheet = excel.sheet_names().get(0).ok_or("No sheets")?.clone();
        let range = excel.worksheet_range(&sheet).map_err(|e: calamine::XlsxError| e.to_string())?;
        
        let headers: Vec<String> = range.rows().next()
            .map(|row| row.iter().map(|c: &calamine::Data| c.to_string().trim().to_string()).collect::<Vec<String>>())
            .unwrap_or_else(Vec::new);
        let col_map = build_index_map(&headers, &mapping);

        for row in range.rows().skip(1) {
            let row_strings: Vec<String> = row.iter().map(|c: &calamine::Data| c.to_string().trim().to_string()).collect();
            if let Some(tx) = row_to_tx(&row_strings, &col_map) {
                results.push(tx);
            }
        }
    } else {
        let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
        let mut delimiter = detect_delimiter(&decoded);
        
        // Basic Reader
        let mut rdr = ReaderBuilder::new()
            .has_headers(false)
            .flexible(true) 
            .delimiter(delimiter)
            .from_reader(decoded.as_bytes());
            
        let mut records = rdr.records();
        
        if let Some(header_record) = records.next() {
            let mut headers: Vec<String> = header_record.map_err(|e| e.to_string())?
                .iter().map(|s| s.trim().replace("\u{feff}", "").to_string()).collect::<Vec<String>>();
        
            // CRITICAL: Determine fallback splitter
            let mut manual_split_char: Option<char> = None;

            if headers.len() == 1 {
                if headers[0].contains('\t') { manual_split_char = Some('\t'); }
                else if headers[0].contains(',') && delimiter != b',' { manual_split_char = Some(','); }
                else if headers[0].contains(';') && delimiter != b';' { manual_split_char = Some(';'); }
            }

            // Apply manual split to HEADER
            if let Some(split_char) = manual_split_char {
                headers = headers[0].split(split_char).map(|s| s.trim().replace("\u{feff}", "").to_string()).collect();
            }

            // Ensure mapping keys also have BOM stripped for comparison
            let mut stripped_mapping = HashMap::new();
            for (k, v) in mapping {
                stripped_mapping.insert(k.replace("\u{feff}", ""), v);
            }
            let col_map = build_index_map(&headers, &stripped_mapping);

            for result in records {
                let record = result.map_err(|e| e.to_string())?;
                let mut row_strings: Vec<String> = record.iter().map(|s| s.trim().to_string()).collect();
                
                // Apply manual split to DATA ROWS if needed
                if let Some(split_char) = manual_split_char {
                    if row_strings.len() == 1 {
                        row_strings = row_strings[0].split(split_char).map(|s| s.trim().to_string()).collect();
                    }
                }

                if let Some(tx) = row_to_tx(&row_strings, &col_map) {
                    results.push(tx);
                }
            }
        }
    }

    Ok(results)
}

fn build_index_map(headers: &[String], mapping: &HashMap<String, String>) -> HashMap<String, usize> {
    let mut index_map = HashMap::new();
    // Normalize mapping keys for robust lookup
    let normalized_mapping: HashMap<String, String> = mapping.iter()
        .map(|(k, v)| (normalize_key(k), v.clone()))
        .collect();

    for (i, header) in headers.iter().enumerate() {
        let h_norm = normalize_key(header);
        if let Some(standard_field) = normalized_mapping.get(&h_norm) {
            index_map.insert(standard_field.clone(), i);
        }
    }
    index_map
}

fn row_to_tx(row: &[String], col_map: &HashMap<String, usize>) -> Option<ParsedTransaction> {
    let date_raw = col_map.get("tx_date").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let amount_raw = col_map.get("amount").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).cloned().unwrap_or_else(|| "기타".to_string());
    let desc = col_map.get("description").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let payment = col_map.get("payment_type").and_then(|&i| row.get(i)).cloned();

    let clean_date = sanitize_date(&date_raw);
    let clean_amount = sanitize_amount(&amount_raw);

    // Validation: Date and Amount are mandatory
    if clean_date.is_empty() || clean_amount == 0.0 {
        return None;
    }

    let mut debit_account = "미확정 비용".to_string(); // Default for Expense
    let mut credit_account = "미지급금".to_string(); // Default as Unpaid

    // 1. Determine Payment Status
    if let Some(method) = &payment {
        let m = method.to_lowercase();
        if m.contains("현금") || m.contains("cash") {
            credit_account = "현금".to_string();
        } else if m.contains("이체") || m.contains("transfer") || m.contains("통장") {
            credit_account = "보통예금".to_string();
        } else if m.contains("카드") || m.contains("card") || m.contains("신용") {
            credit_account = "미지급금".to_string();
        } else {
             // If unknown ("일시불", "승인" etc), heuristic: 
             // "승인" usually implies card -> Payable
             if m.contains("승인") { 
                 credit_account = "미지급금".to_string();
             }
        }
    }

    let mut tx = ParsedTransaction {
        date: clean_date,
        amount: clean_amount.abs(),
        vat: (clean_amount.abs() / 11.0).round(),
        entry_type: if clean_amount < 0.0 || desc.contains("매출") { 
            credit_account = "매출".to_string(); // Revenue logic override
            "Revenue".to_string() 
        } else { 
            "Expense".to_string() 
        },
        description: Some(desc),
        vendor: Some(vendor),
        account_name: Some(debit_account), // Initially unconfirmed
        reasoning: "DataConverter 스마트 변환 엔진으로 처리됨".to_string(),
        confidence: Some("High".to_string()),
        payment_method: payment,
        audit_trail: vec!["#1 Data Mapping & Sanitization 완료".to_string()],
        // We might need to store the specific credit account if ParsedTransaction struct supports it, 
        // but currently it seems it relies on `account_name` (Debit) mostly.
        // Let's assume the Classifier will use `payment_method` to refine this later if needed.
        // But the user specifically asked for "Payment Type" handling.
        // If ParsedTransaction doesn't have credit_account field exposed directly here, 
        // we might need to assume the classifier handles it or `account_name` is the MAIN account (Debit for Exp, Credit for Rev).
        ..Default::default()
    };
    
    // Inject credit account info into reasoning so Classifier sees it
    tx.reasoning.push_str(&format!(" | 결제수단 분석: {} -> 대변계정: {}", tx.payment_method.clone().unwrap_or_default(), credit_account));
    
    // Attempt rule based
    crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
    
    Some(tx)
}

fn sanitize_amount(s: &str) -> f64 {
    // Remove "KRW", "USD", "₩", ",", etc.
    // Handle accounting negative format: (123) -> -123
    let mut clean = s.trim().replace(",", "").replace("₩", "").replace("$", "").replace(" ", "");
    
    let mut is_negative = false;
    if clean.starts_with('(') && clean.ends_with(')') {
        clean = clean[1..clean.len()-1].to_string();
        is_negative = true;
    }

    let val = clean.parse::<f64>().unwrap_or(0.0);
    if is_negative { -val } else { val }
}

fn sanitize_date(s: &str) -> String {
    let s = s.trim().replace("\"", "").replace(".", "-").replace("/", "-");
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() == 3 {
        let year = parts[0];
        let month = parts[1];
        let day = parts[2];
        let final_year = if year.len() == 2 { format!("20{}", year) } else { year.to_string() };
        let final_month = if month.len() == 1 { format!("0{}", month) } else { month.to_string() };
        let final_day = if day.len() == 1 { format!("0{}", day) } else { day.to_string() };
        return format!("{}-{}-{}", final_year, final_month, final_day);
    }
    s.to_string()
}
