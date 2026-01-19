use std::collections::HashMap;
use crate::core::models::ParsedTransaction;
use csv::ReaderBuilder;
use std::io::Cursor;
use calamine::{Reader, Xlsx};

fn normalize_key(s: &str) -> String {
    s.to_lowercase()
     .chars()
     .filter(|c| !c.is_whitespace() && *c != '\"' && *c != '\'' && *c != '\r' && *c != '\n' && *c != '\u{feff}' && *c != '(' && *c != ')')
     .collect()
}

pub fn suggest_mapping(headers: Vec<String>) -> HashMap<String, String> {
    let mut mapping = HashMap::new();
    
    // Flatten and split if headers are clumped (Frontend/Backend consistency)
    let mut actual_headers = Vec::new();
    for h in headers {
        if h.contains(',') && !h.contains('\"') {
            for sub in h.split(',') { actual_headers.push(sub.trim().to_string()); }
        } else {
            actual_headers.push(h);
        }
    }

    for header in actual_headers {
        let h_norm = normalize_key(&header);
        
        // 1. Transaction Date (Extended)
        if h_norm.contains("일자") || h_norm.contains("날짜") || h_norm.contains("date") || h_norm.contains("일시") || h_norm.contains("time") || h_norm.contains("거래일") || h_norm.contains("사용일") || h_norm.contains("승인일") {
            mapping.insert(header.clone(), "tx_date".to_string());
        } 
        // 2. Amount (Prioritize '금액' over '결제')
        else if h_norm.contains("금액") || h_norm.contains("합계") || h_norm.contains("amount") || h_norm.contains("price") || h_norm.contains("총액") || h_norm.contains("비용") || h_norm.contains("지출") || h_norm.contains("공급") || h_norm.contains("가격") {
            mapping.insert(header.clone(), "amount".to_string());
        }
        // 3. Vendor
        else if h_norm.contains("상호") || h_norm.contains("거래처") || h_norm.contains("vendor") || h_norm.contains("가맹점") || h_norm.contains("판매자") || h_norm.contains("이용처") || h_norm.contains("업소명") || h_norm.contains("사용처") {
            mapping.insert(header.clone(), "vendor".to_string());
        }
        // 4. Description / Remarks
        else if h_norm.contains("내용") || h_norm.contains("적요") || h_norm.contains("description") || h_norm.contains("memo") || h_norm.contains("품명") || h_norm.contains("상세") || h_norm.contains("비고") || h_norm.contains("항목") {
            mapping.insert(header.clone(), "description".to_string());
        }
        // 5. Payment Method
        else if h_norm.contains("결제") || h_norm.contains("수단") || h_norm.contains("payment") || h_norm.contains("구분") || h_norm.contains("방식") || h_norm.contains("카드") || h_norm.contains("계좌") || h_norm.contains("승인번호") {
             mapping.insert(header.clone(), "payment_type".to_string());
        }
        // 6. Bank Name
        else if h_norm.contains("은행") || h_norm.contains("기관") || h_norm.contains("bank") {
            mapping.insert(header.clone(), "bank_name".to_string());
        }
        // 7. Bank Account
        else if h_norm.contains("계좌") || h_norm.contains("번호") || h_norm.contains("account") {
            mapping.insert(header.clone(), "bank_account".to_string());
        }
    }
    mapping
}

/// Smartly detect delimiter with fallback logic
fn detect_delimiter(content: &str) -> u8 {
    let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).take(10).collect();
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

    if tab_scores >= 2 && tab_scores > comma_scores {
        b'\t'
    } else if semi_scores >= 2 && semi_scores > comma_scores {
        b';'
    } else if comma_scores > 0 {
        b','
    } else {
        // Absolute fallback: try to find any delimiter
        if content.contains('\t') { b'\t' }
        else if content.contains(';') { b';' }
        else { b',' }
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
                } else if raw.contains(',') {
                    return Ok(raw.split(',').map(|s| s.trim().to_string()).collect());
                } else if raw.contains(';') {
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
    println!("[Mapping Engine] Processing file: {} with {} mapping rules", file_name, mapping.len());

    // CRITICAL: Check for required fields
    let mapped_fields: Vec<&String> = mapping.values().collect();
    if !mapped_fields.contains(&&"tx_date".to_string()) || !mapped_fields.contains(&&"amount".to_string()) {
        let err_msg = "필수 매핑 항목(날짜, 금액)이 지정되지 않았습니다. 매핑 설정을 확인해주세요.".to_string();
        println!("[Mapping Engine] Error: {}", err_msg);
        return Err(err_msg);
    }

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
        let delimiter = detect_delimiter(&decoded);
        
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
                else if headers[0].contains(',') { manual_split_char = Some(','); }
                else if headers[0].contains(';') { manual_split_char = Some(';'); }
            }

            // Apply manual split to HEADER
            if let Some(split_char) = manual_split_char {
                headers = headers[0].split(split_char).map(|s| s.trim().replace("\u{feff}", "").to_string()).collect();
            }

            // Ensure mapping keys also have BOM stripped for comparison
            let mut stripped_mapping = HashMap::new();
            for (k, v) in &mapping {
                stripped_mapping.insert(k.replace("\u{feff}", ""), v.clone());
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
                } else if !row_strings.iter().all(|s| s.is_empty()) {
                    println!("[Mapping Engine] Verbose: Skipping row due to failed parsing or header-like pattern: {:?}", row_strings);
                }
            }
        }
    }
    
    if results.is_empty() {
        println!("[Mapping Engine] WARNING: No valid transactions were extracted from the file.");
    } else {
        println!("[Mapping Engine] Success: Extracted {} transactions", results.len());
    }

    Ok(results)
}

fn build_index_map(headers: &[String], mapping: &HashMap<String, String>) -> HashMap<String, usize> {
    let mut index_map = HashMap::new();
    
    // mapping is Header -> Standard. Maximize sensitivity by normalizing both.
    for (header, standard_field) in mapping {
        let m_norm = normalize_key(&header);
        for (i, h) in headers.iter().enumerate() {
            let h_norm = normalize_key(h);
            if h_norm == m_norm {
                index_map.insert(standard_field.clone(), i);
                break;
            }
        }
    }
    
    if index_map.is_empty() {
        println!("[Mapping Engine] FATAL: index_map is empty. No headers matched the mapping keys.");
        println!("  - Headers: {:?}", headers);
        println!("  - Mapping: {:?}", mapping);
    } else {
        println!("[Mapping Engine] Successfully mapped indices: {:?}", index_map);
    }
    
    index_map
}

fn row_to_tx(row: &[String], col_map: &HashMap<String, usize>) -> Option<ParsedTransaction> {
    let date_raw = col_map.get("tx_date").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let amount_raw = col_map.get("amount").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).cloned().unwrap_or_else(|| "기타".to_string());
    let desc = col_map.get("description").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let payment = col_map.get("payment_type").and_then(|&i| row.get(i)).cloned();
    let bank_name = col_map.get("bank_name").and_then(|&i| row.get(i)).cloned();
    let bank_account = col_map.get("bank_account").and_then(|&i| row.get(i)).cloned();

    let clean_date = sanitize_date(&date_raw);
    let clean_amount = sanitize_amount(&amount_raw);

    // Validation: Date and Amount are mandatory
    if clean_date.is_empty() || clean_amount == 0.0 {
        return None;
    }

    let mut debit_account = "미확정 비용".to_string(); // Default for Expense
    let mut credit_account = "미지급금".to_string(); // Default as Unpaid

    // 1. Determine Payment Status
    if let Some(ref method) = payment {
        let m = method.to_lowercase();
        if m.contains("현금") || m.contains("cash") {
            credit_account = "현금".to_string();
        } else if m.contains("이체") || m.contains("transfer") || m.contains("통장") {
            credit_account = "보통예금".to_string();
        } else if m.contains("카드") || m.contains("card") || m.contains("신용") {
            credit_account = "미지급금".to_string();
        } else if m.contains("승인") { 
            credit_account = "미지급금".to_string();
        }
    }

    let mut tx = ParsedTransaction {
        date: Some(clean_date.clone()),
        amount: clean_amount.abs(),
        vat: (clean_amount.abs() / 11.0).round(),
        entry_type: if clean_amount < 0.0 || desc.contains("매출") { 
            credit_account = "매출".to_string(); // Revenue logic override
            Some("Revenue".to_string())
        } else { 
            Some("Expense".to_string())
        },
        description: Some(desc),
        vendor: Some(vendor),
        account_name: Some(debit_account), // Initially unconfirmed
        reasoning: format!("DataConverter 스마트 변환 엔진으로 처리됨 (결제: {})", credit_account),
        confidence: Some("High".to_string()),
        payment_method: payment,
        bank_name,
        bank_account,
        audit_trail: vec!["#1 Data Mapping & Sanitization 완료".to_string()],
        id: Some(crate::utils::id_generator::generate_id(&clean_date, crate::utils::id_generator::IdPrefix::AI)),
        ..Default::default()
    };
    
    // Attempt rule based
    crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
    
    Some(tx)
}

fn sanitize_amount(s: &str) -> f64 {
    // Extract only numbers, dots, and minus sign
    let clean: String = s.chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    
    let mut val = clean.parse::<f64>().unwrap_or(0.0);
    
    // Special check for accounting format "(123)" if it didn't have a minus sign
    if s.contains('(') && s.contains(')') && val > 0.0 {
        val = -val;
    }

    val
}

fn sanitize_date(s: &str) -> String {
    // 1. Pre-process: Replace common separators and remove spaces for easier splitting
    let clean = s.replace("년", "-").replace("월", "-").replace("일", "")
                 .replace("\"", "").replace(".", "-").replace("/", "-");
    
    // 2. Extract parts by splitting on '-' and filtering for numeric content
    let parts: Vec<String> = clean.split('-')
        .map(|p| p.chars().filter(|c| c.is_ascii_digit()).collect::<String>())
        .filter(|p| !p.is_empty())
        .collect();
    
    if parts.len() >= 3 {
        let year = &parts[0];
        let month = &parts[1];
        let day = &parts[2];
        let final_year = if year.len() == 2 { format!("20{}", year) } else { year.to_string() };
        let final_month = if month.len() == 1 { format!("0{}", month) } else { month.to_string() };
        let final_day = if day.len() == 1 { format!("0{}", day) } else { day.to_string() };
        return format!("{}-{}-{}", final_year, final_month, final_day);
    }
    
    // 3. Handle YYYYMMDD format
    if s.len() == 8 && s.chars().all(|c| c.is_numeric()) {
        let year = &s[0..4];
        let month = &s[4..6];
        let day = &s[6..8];
        return format!("{}-{}-{}", year, month, day);
    }

    s.to_string()
}
