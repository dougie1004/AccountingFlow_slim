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
        let h_clean = deep_clean_value(&h);
        if h_clean.contains(',') && !h_clean.contains('\"') {
            for sub in h_clean.split(',') { actual_headers.push(sub.trim().to_string()); }
        } else {
            actual_headers.push(h_clean);
        }
    }

    for header in actual_headers {
        let h_norm = normalize_key(&header);
        
        // 1. Transaction Date (Extended)
        if h_norm.contains("일자") || h_norm.contains("날짜") || h_norm.contains("date") || h_norm.contains("일시") || h_norm.contains("time") || h_norm.contains("거래일") || h_norm.contains("사용일") || h_norm.contains("승인일") || h_norm.contains("취득") {
            mapping.insert(header.clone(), "tx_date".to_string());
        } 
        // 2. Amount (Prioritize '금액' over '결제')
        else if h_norm.contains("금액") || h_norm.contains("합계") || h_norm.contains("amount") || h_norm.contains("price") || h_norm.contains("총액") || h_norm.contains("비용") || h_norm.contains("지출") || h_norm.contains("공급") || h_norm.contains("가격") || h_norm.contains("보험료") || h_norm.contains("산출") || h_norm.contains("납부") {
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
        else if h_norm.contains("계좌") || h_norm.contains("번호") {
            mapping.insert(header.clone(), "bank_account".to_string());
        }
        // 8. Category (Explicit Classification: Equity, Expense, Revenue)
        // [Antigravity] Fix: Removed 'type' to avoid confusion with "Entry Type" (Debit/Credit) column.
        else if h_norm.contains("category") || h_norm.contains("분류") || h_norm.contains("구분") || h_norm.contains("class") {
            mapping.insert(header.clone(), "category".to_string());
        }
        // 9. Entry Type Reference (Debit/Credit - Optional Helper)
        else if h_norm.contains("entry type") || h_norm.contains("db/cr") || h_norm.contains("차대") {
             mapping.insert(header.clone(), "dr_cr".to_string());
        }
        // [Antigravity] Re-mapping: Account Name / Subject (Prioritize over Bank Account)
        // Check for 'account' separately as it usually means Subject in generic CSVs, unless it explicitly says 'bank' or 'number'
        else if h_norm == "account" || h_norm.contains("계정과목") || h_norm.contains("acct") || h_norm.contains("subject") {
            mapping.insert(header.clone(), "account_name".to_string());
        }
        // Fallback for Bank Account if it contains 'account' but wasn't caught above
        else if h_norm.contains("account") {
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
        
        // [Antigravity] Smart Header Search for Excel
        let rows: Vec<Vec<String>> = range.rows()
            .take(20) // Scan top 20 rows
            .map(|row| row.iter().map(|c| deep_clean_value(&c.to_string())).collect())
            .collect();

        if let Some((_, best_headers)) = find_best_header_row(&rows) {
             return Ok(best_headers);
        }
        
        // Fallback to first row
        if let Some(row) = range.rows().next() {
            return Ok(row.iter().map(|c| deep_clean_value(&c.to_string())).collect());
        }
    } else {
        let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
        let delimiter = detect_delimiter(&decoded);
        
        let mut rdr = ReaderBuilder::new()
            .has_headers(false)
            .flexible(true) // [Antigravity] CRITICAL: Handle inconsistent column counts in messy CSVs
            .delimiter(delimiter)
            .from_reader(decoded.as_bytes());
            
        let records: Vec<Vec<String>> = rdr.records()
            .take(30) // Scan more rows to find buried headers
            .filter_map(|r| r.ok())
            .map(|r| r.iter().map(|s| deep_clean_value(s)).collect())
            .collect();

        if let Some((_, best_headers)) = find_best_header_row(&records) {
             return Ok(best_headers);
        }
        
        // Fallback: If heuristic failed, return first non-empty
        if let Some(first) = records.first() {
            return Ok(first.clone());
        }
    }
    Err("데이터 헤더를 찾을 수 없거나 파일이 비어있습니다.".into())
}

// [Antigravity] Smart Header Detection Helper
fn find_best_header_row(rows: &[Vec<String>]) -> Option<(usize, Vec<String>)> {
    let mut best_score = 0;
    let mut best_idx = 0;
    let mut best_row = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let mut score = 0;
        let joined = row.join(" ").to_lowercase();
        let non_empty_count = row.iter().filter(|s| !s.trim().is_empty()).count();
        
        // 1. Column Search Logic (Cumulative Scoring)
        if joined.contains("일자") || joined.contains("날짜") || joined.contains("date") || joined.contains("일시") { score += 3; }
        if joined.contains("취득") { score += 3; }
        if joined.contains("금액") || joined.contains("합계") || joined.contains("amount") || joined.contains("원") || joined.contains("공급") { score += 3; }
        if joined.contains("산출") || joined.contains("보수") || joined.contains("보험료") || joined.contains("납부") || joined.contains("수당") || joined.contains("보수월액") { score += 3; }
        if joined.contains("거래처") || joined.contains("상호") || joined.contains("vendor") || joined.contains("성명") || joined.contains("가입자") || joined.contains("순번") { score += 3; }
        if joined.contains("내용") || joined.contains("적요") || joined.contains("description") || joined.contains("비고") || joined.contains("항목") { score += 2; }
        if joined.contains("잔액") || joined.contains("balance") { score += 1; }
        
        // 2. Structural Preference
        if non_empty_count >= 5 { score += 5; }
        else if non_empty_count >= 3 { score += 2; }
        
        // Penalize metadata rows (Title or Metadata like "Date: 123")
        let empty_count = row.iter().filter(|s| s.trim().is_empty()).count();
        if row.len() > 1 && empty_count > row.len() / 2 { score -= 6; }
        if joined.contains(":") || joined.contains("：") { score -= 4; }

        if score > best_score {
            best_score = score;
            best_idx = i;
            best_row = row.clone();
        }
    }

    if best_score > 0 {
        Some((best_idx, best_row))
    } else {
        None
    }
}

// [Antigravity] Extract Global Metadata (Title/Context) from top lines
fn extract_global_metadata(rows: &[Vec<String>]) -> String {
    for row in rows.iter().take(5) {
        let joined = row.join(" ").trim().to_string();
        if joined.is_empty() { continue; }
        
        // [Antigravity] Avoid picking up data rows as titles
        // If it contains a date-like pattern or too many columns with data, it's not a title.
        if joined.chars().filter(|c| *c == '-').count() >= 2 || (row.len() > 3 && row.iter().any(|s| s.chars().any(|c| c.is_numeric()))) {
            continue;
        }

        // Keywords that signal a document title/context
        if joined.contains("내역서") || joined.contains("고지서") || joined.contains("계산서") || joined.contains("청구서") || joined.contains("Statement") || joined.contains("Invoice") || joined.contains("명세") {
             // Return cleaned title
             return joined.replace("[", "").replace("]", "").trim().to_string();
        }
    }
    String::new()
}

// [Antigravity] Deep Clean: Trim spaces and remove wrapping quotes
fn deep_clean_value(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with('"') && trimmed.ends_with('"') && trimmed.len() >= 2 {
        trimmed[1..trimmed.len()-1].trim().to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn process_with_mapping(
    bytes: &[u8],
    file_name: &str,
    mapping: HashMap<String, String>
) -> Result<Vec<ParsedTransaction>, String> {
    // ... (existing code top part matches, skipping to loops)
    let ext = std::path::Path::new(file_name).extension().and_then(|s| s.to_str()).unwrap_or_default().to_lowercase();
    let mut results = Vec::new();
    println!("[Mapping Engine] Processing file: {} with {} mapping rules", file_name, mapping.len());

    let mapped_fields: Vec<&String> = mapping.values().collect();
    if !mapped_fields.contains(&&"tx_date".to_string()) || !mapped_fields.contains(&&"amount".to_string()) {
         return Err("필수 매핑 항목(날짜, 금액)이 지정되지 않았습니다.".to_string());
    }

    if ext == "xlsx" || ext == "xls" || ext == "xlsm" {
        let mut excel: Xlsx<_> = calamine::open_workbook_from_rs(Cursor::new(bytes)).map_err(|e: calamine::XlsxError| e.to_string())?;
        let sheet = excel.sheet_names().get(0).ok_or("No sheets")?.clone();
        let range = excel.worksheet_range(&sheet).map_err(|e: calamine::XlsxError| e.to_string())?;
        
        // Dynamic Data Start Search
        let rows: Vec<Vec<String>> = range.rows()
             .map(|row| row.iter().map(|c| c.to_string()).map(|s| deep_clean_value(&s)).collect())
             .collect();
        // ... (Header Search Logic - omitted for brevity because it relies on rows)
        
        let mut start_idx = 0;
        let mut col_map = HashMap::new();
        // Delay metadata extraction until we find headers

        for (i, row) in rows.iter().enumerate().take(20) {
             let current_col_map = build_index_map(row, &mapping);
             if current_col_map.contains_key("tx_date") && current_col_map.contains_key("amount") {
                 start_idx = i + 1; 
                 col_map = current_col_map;
                 println!("[Mapping Engine] Found Header at Excel Row {}: {:?}", i+1, row);
                 break;
             }
        }
        
        let global_desc = if start_idx > 0 { extract_global_metadata(&rows[..start_idx-1]) } else { String::new() };
        println!("[Mapping Engine] Detected Global Context (Above Header): '{}'", global_desc);
        
        if col_map.is_empty() { return Err("매핑된 헤더를 찾을 수 없습니다.".to_string()); }

        for row in rows.into_iter().skip(start_idx) {
            if let Some(tx) = row_to_tx(&row, &col_map, &global_desc) {
                results.push(tx);
            }
        }
    } else {
        let decoded = crate::ai::robust_parser::detect_and_decode(bytes)?;
        let delimiter = detect_delimiter(&decoded);
        
        let mut rdr = ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .delimiter(delimiter)
            .trim(csv::Trim::All) // [Antigravity] Handle trailing/leading spaces
            .from_reader(decoded.as_bytes());

        let all_records: Vec<Vec<String>> = rdr.records()
            .filter_map(|r| r.ok())
            .map(|r| r.iter().map(|s| deep_clean_value(s)).collect())
            .collect();
        
        let mut start_idx = 0;
        let mut col_map = HashMap::new();
        // Delay metadata extraction until we find headers

        for (i, row) in all_records.iter().enumerate().take(20) {
             // ... (Header Search Logic - simplified for replacement)
             let mut check_row = row.clone();
             if check_row.len() == 1 {
                 if check_row[0].contains('\t') { check_row = smart_split(&check_row[0], b'\t'); }
                 else if check_row[0].contains(',') { check_row = smart_split(&check_row[0], b','); }
                 else if check_row[0].contains(';') { check_row = smart_split(&check_row[0], b';'); }
             }
             let current_col_map = build_index_map(&check_row, &mapping);
             if current_col_map.contains_key("tx_date") && current_col_map.contains_key("amount") {
                 start_idx = i + 1;
                 col_map = current_col_map;
                 println!("[Mapping Engine] Found Header at CSV Row {}: {:?}", i+1, check_row);
                 break;
             }
        }

        let global_desc = if start_idx > 0 { extract_global_metadata(&all_records[..start_idx-1]) } else { String::new() };
        println!("[Mapping Engine] Detected Global Context (Above Header): '{}'", global_desc);

        if col_map.is_empty() { return Err("매핑된 헤더를 CSV 파일에서 찾을 수 없습니다.".to_string()); }

        for (idx, row) in all_records.into_iter().skip(start_idx).enumerate() {
             let mut process_row = row.clone();
             if process_row.len() == 1 && col_map.values().max().unwrap_or(&0) > &0 {
                 if process_row[0].contains('\t') { process_row = smart_split(&process_row[0], b'\t'); }
                 else if process_row[0].contains(',') { process_row = smart_split(&process_row[0], b','); }
                 else if process_row[0].contains(';') { process_row = smart_split(&process_row[0], b';'); }
             }

             if let Some(tx) = row_to_tx(&process_row, &col_map, &global_desc) {
                 results.push(tx);
             } else {
                 if !process_row.iter().all(|s| s.is_empty()) {
                     // [Antigravity] Hex Dump Check for failed rows
                     let raw_dump: Vec<String> = process_row.iter().map(|s| {
                         format!("{} (Hex: {:02X?})", s, s.as_bytes())
                     }).collect();
                     println!("[Mapping Engine] Failed to parse Row {}: {:?}", idx + start_idx + 1, raw_dump);
                 }
             }
        }
    }
    
    if results.is_empty() { println!("[Mapping Engine] WARNING: No valid transactions extracted."); }
    Ok(results)
}

// [Antigravity] Smart Splitter for Single-Column Dirty Rows
fn smart_split(s: &str, delimiter: u8) -> Vec<String> {
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .delimiter(delimiter)
        .trim(csv::Trim::All)
        .from_reader(s.as_bytes());
    
    if let Some(result) = rdr.records().next() {
        if let Ok(record) = result {
            return record.iter().map(|field| deep_clean_value(field)).collect();
        }
    }
    vec![deep_clean_value(s)]
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

fn row_to_tx(row: &[String], col_map: &HashMap<String, usize>, global_desc: &str) -> Option<ParsedTransaction> {
    let date_raw = col_map.get("tx_date").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let amount_raw = col_map.get("amount").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    let vendor = col_map.get("vendor").and_then(|&i| row.get(i)).cloned().unwrap_or_else(|| "기타".to_string());
    let mut desc = col_map.get("description").and_then(|&i| row.get(i)).cloned().unwrap_or_default();
    
    // [Antigravity] Context Injection: Only use global_desc if it's broad and valid
    if desc.trim().is_empty() && !global_desc.is_empty() {
        desc = global_desc.to_string();
    }

    let payment = col_map.get("payment_type").and_then(|&i| row.get(i)).cloned();
    let bank_name = col_map.get("bank_name").and_then(|&i| row.get(i)).cloned();
    let bank_account = col_map.get("bank_account").and_then(|&i| row.get(i)).cloned();
    let category = col_map.get("category").and_then(|&i| row.get(i)).cloned();
    let account_subject = col_map.get("account_name").and_then(|&i| row.get(i)).cloned(); // [Antigravity] Extract Subject

    let clean_date = sanitize_date(&date_raw);
    let clean_amount = sanitize_amount(&amount_raw);

    // [Antigravity] Survival-mode Validation
    // 1. Skip rows that look like document titles or summaries
    let lower_desc = desc.to_lowercase();
    if lower_desc.contains("[") && lower_desc.contains("]") && lower_desc.contains("내역서") { return None; }
    if lower_desc.contains("작성일자") || lower_desc.contains("관리번호") { return None; }
    if lower_desc.contains("합계") || lower_desc.contains("total") || lower_desc.contains("소계") { return None; }

    // 2. Date is mandatory
    if clean_date.is_empty() {
        return None;
    }

    let debit_account = "미확정 비용".to_string(); // Default for Expense
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
        entry_type: if let Some(cat) = &category {
            // [Antigravity] Context Injection: Use mapped category as authoritative reference
            Some(cat.clone())
        } else if clean_amount < 0.0 || desc.contains("매출") { 
            credit_account = "매출".to_string(); // Revenue logic override
            Some("Revenue".to_string())
        } else { 
            Some("Expense".to_string())
        },
        description: Some(desc.clone()),
        vendor: Some(vendor),
        // [Antigravity] Account Name Priority: 1. CSV Explicit (account_subject) 2. Mapped Category default 3. Unconfirmed
        account_name: if let Some(subj) = account_subject { 
            Some(subj) 
        } else { 
            Some(debit_account.clone()) 
        }, 
        reasoning: if let Some(cat) = &category {
            format!("DataConverter: Mapped from Category '{}'. (결제: {})", cat, credit_account)
        } else {
            format!("DataConverter 스마트 변환 엔진으로 처리됨 (결제: {})", credit_account)
        },
        confidence: Some("High".to_string()),
        payment_method: payment,
        bank_name,
        bank_account,
        audit_trail: vec!["#1 Data Mapping & Sanitization 완료".to_string()],
        id: Some(crate::utils::id_generator::generate_id(&clean_date, crate::utils::id_generator::IdPrefix::AI)),
        ..Default::default()
    };
    
    // [Antigravity] Auto-Pairing Logic: Enforce Double-Entry Integrity
    // If we have a single "account_name" (Subject), we must determine where the money came from/went to.
    if let Some(cat) = &category {
        let cat_lower = cat.to_lowercase();
        if cat_lower == "equity" || cat_lower == "revenue" || cat_lower.contains("매출") || cat_lower.contains("자본") {
            // Inflow -> Debit: Bank, Credit: Subject
            tx.entry_type = Some(if cat_lower.contains("자본") { "Equity".to_string() } else { "Revenue".to_string() });
            tx.debit_account = Some("보통예금".to_string());
            tx.credit_account = tx.account_name.clone().or(Some("매출".to_string())); // Fallback
        } else {
            // Outflow -> Debit: Subject, Credit: Bank (or AP)
            tx.entry_type = Some("Expense".to_string());
            tx.debit_account = tx.account_name.clone().or(Some("미확정 비용".to_string()));
            // If payment method allows, use Bank, otherwise AP
            if credit_account == "미지급금" && (desc.contains("이체") || desc.contains("출금")) {
                 tx.credit_account = Some("보통예금".to_string());
            } else {
                 tx.credit_account = Some(credit_account);
            }
        }
    } else {
        // Fallback if no category
        tx.debit_account = Some(debit_account);
        tx.credit_account = Some(credit_account);
    }
    
    // Attempt rule based
    crate::ai::rule_based_classifier::classify_by_rules(&mut tx);
    
    Some(tx)
}

pub fn sanitize_amount(s: &str) -> f64 {
    let raw = s.trim();
    if raw.is_empty() { return 0.0; }

    // [Antigravity] Survival-mode Aggressive Extraction
    // Handle: "₩ 1,200,000원", "1.5E+08", "(1,000)"
    let clean: String = raw.chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-' || *c == 'E' || *c == 'e' || *c == '+')
        .collect();
    
    if clean.is_empty() || clean == "." || clean == "-" || clean == "+" {
        return 0.0;
    }

    let mut val = clean.parse::<f64>().unwrap_or(0.0);
    
    // Check for negative accounting format "(123)"
    if raw.contains('(') && raw.contains(')') && val > 0.0 {
        val = -val;
    }

    val
}

pub fn sanitize_date(s: &str) -> String {
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
