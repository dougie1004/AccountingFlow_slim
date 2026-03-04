use crate::core::models::{ParsedTransaction, ParseStatus, SystemError};
use csv::ReaderBuilder;
use std::io::Cursor;
use uuid::Uuid; 

#[derive(Debug, Clone, PartialEq)]
pub enum ParseError {
    EncodingUncertain(String),
    InvalidFormat(String),
}

impl From<ParseError> for SystemError {
    fn from(e: ParseError) -> Self {
        match e {
            ParseError::EncodingUncertain(s) => SystemError::EncodingUncertain(s),
            ParseError::InvalidFormat(s) => SystemError::InvalidFormat(s),
        }
    }
}

/**
 * Robust CSV Parser (Slim Version)
 * Stripped automatic payroll/insurance splitting.
 */
pub fn parse_robust_csv(data: Vec<u8>, context_hint: Option<String>) -> Result<Vec<ParsedTransaction>, ParseError> {
    let decoded_content = detect_and_decode(&data)?;
    let delimiter = detect_delimiter(&decoded_content);
    let hint = context_hint.as_deref().unwrap_or("CSV Import");
    
    let mut rdr = ReaderBuilder::new()
        .has_headers(false)
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All) // Keep this line
        .from_reader(Cursor::new(decoded_content));
    
    let mut all_records: Vec<Vec<String>> = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| ParseError::InvalidFormat(format!("CSV Read Error: {}", e)))?;
        let mut fields: Vec<String> = record.iter().map(|s: &str| {
            let mut val = s.trim().to_string();
            if val.starts_with('"') && val.ends_with('"') && val.len() >= 2 {
                val = val[1..val.len()-1].to_string();
            }
            val
        }).collect();

        // [Intelligence] Fallback for CSVs where the reader failed to split but commas exist
        if fields.len() == 1 && fields[0].contains(',') && delimiter == b',' {
             fields = fields[0].split(',').map(|s| s.trim().to_string()).collect();
        }
        
        all_records.push(fields);
    }

    println!("[Robust Parser] Parsing '{}' - Total Rows: {}", hint, all_records.len());

    if all_records.is_empty() {
        return Ok(Vec::new());
    }

    let (global_title, global_date) = extract_global_metadata(&all_records);
    let (header_row_idx, col_map, max_score) = detect_columns(&all_records);
    println!("[Robust Parser] Header Score: {}, Header Row: {}, Col Map: {:?}", max_score, header_row_idx, col_map);

    let mut results = Vec::new();
    let start_row = if max_score >= 10 { header_row_idx + 1 } else { 0 };
    println!("[Robust Parser] Start Row: {}", start_row);

    for (row_idx, fields) in all_records.iter().enumerate().skip(start_row) {
        if fields.iter().all(|s: &String| s.trim().is_empty()) { continue; }
        if fields.iter().any(|f: &String| f.contains("합계") || f.contains("Total") || f.contains("소계")) { continue; }

        let raw_row_string = fields.join(", ");
        println!("[Robust Parser] Processing Row {}: {:?}", row_idx, fields);
        
        let mut date = String::new();
        let mut amount = 0.0;
        let mut vat = 0.0;
        let mut vendor = String::new();
        let mut description = String::new();
        let mut row_status = ParseStatus::Ok;
        let mut row_error = None;
        let mut entry_type = "Expense".to_string();

        if !col_map.is_empty() {
            if let Some(idx) = col_map.get("date") { 
                date = fields.get(*idx).cloned().unwrap_or_default(); 
            }
            
            // Smarter Amount Handling (Withdrawal/Deposit)
            let mut withdrawal = 0.0;
            let mut deposit = 0.0;
            let mut is_discount = false;

            if let Some(idx) = col_map.get("withdrawal") {
                if let Some(field_val) = fields.get(*idx) {
                    let (val, status, _) = clean_amount_with_status(field_val);
                    if val < 0.0 {
                        is_discount = true;
                        withdrawal = val.abs();
                    } else {
                        withdrawal = val;
                    }
                    if status != ParseStatus::Ok && withdrawal == 0.0 { row_status = status; }
                }
            }
            if let Some(idx) = col_map.get("deposit") {
                if let Some(field_val) = fields.get(*idx) {
                    let (val, status, _) = clean_amount_with_status(field_val);
                    if val < 0.0 {
                        deposit = val.abs();
                    } else {
                        deposit = val;
                    }
                    if status != ParseStatus::Ok && deposit == 0.0 { row_status = status; }
                }
            }
            
            if is_discount {
                amount = -withdrawal; // Preserve negativity
                entry_type = "Discount".to_string();
            } else if deposit > 0.0 {
                amount = deposit;
                entry_type = "Revenue".to_string();
            } else if withdrawal > 0.0 {
                amount = withdrawal;
                entry_type = "Expense".to_string();
            } else if let Some(idx) = col_map.get("amount") {
                if let Some(field_val) = fields.get(*idx) {
                    let (val, status, msg) = clean_amount_with_status(field_val);
                    amount = val;
                    println!("[Robust Parser] Row {}: Amount detected from 'amount' col: {}", row_idx, amount);
                    if val < 0.0 {
                        entry_type = "Discount".to_string();
                    }
                    if status != ParseStatus::Ok { 
                        row_status = status; 
                        row_error = msg;
                    }
                }
            }

            if let Some(idx) = col_map.get("vat") {
                if let Some(field_val) = fields.get(*idx) {
                    let (val, _, _) = clean_amount_with_status(field_val);
                    vat = val;
                }
            } else if amount.abs() > 0.0 && (fields.iter().any(|f| f.contains("과세") || f.contains("부가가치세"))) {
                 vat = (amount.abs() / 11.0).round() * (if amount < 0.0 { -1.0 } else { 1.0 });
            }

            if let Some(idx) = col_map.get("vendor") { vendor = fields.get(*idx).cloned().unwrap_or_default(); }
            if let Some(idx) = col_map.get("desc") { description = fields.get(*idx).cloned().unwrap_or_default(); }
            
            if vendor.is_empty() && !description.is_empty() {
                vendor = description.clone();
            }
        } else {
             date = fields.get(0).cloned().unwrap_or_default();
             vendor = fields.get(1).cloned().unwrap_or_default();
             amount = fields.iter().skip(2).find_map(|f| {
                 let (val, _, _) = clean_amount_with_status(f);
                 if val.abs() > 0.0 { Some(val) } else { None }
             }).unwrap_or(0.0);
             entry_type = "Expense".to_string();
        }

        if description.trim().is_empty() { 
            description = if global_title == "Imported Document" { hint.to_string() } else { global_title.clone() }; 
        }
        if date.trim().is_empty() { date = global_date.clone(); }

        println!("[Robust Parser] Row {}: Resulting Amount: {}", row_idx, amount);
        if amount.abs() <= 0.0 { 
            println!("[Robust Parser] Row {}: Skipping zero amount", row_idx);
            continue; 
        }

        let mut tx = ParsedTransaction {
            date: Some(normalize_date(&date)),
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
    let mut date = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    for row in rows.iter().take(10) {
        for cell in row {
            let val = cell.trim();
            if val.len() < 2 { continue; }

            // Title detection
            if title == "Imported Document" && (val.contains("내역") || val.contains("계산서") || val.contains("Statement") || val.contains("현황") || val.contains("명세") || val.contains("거래") || val.contains("승인")) {
                title = val.to_string();
            }

            // Date detection (e.g., 2024-01-01, 2024.01.01, 2024/01/01)
            if (val.contains('-') || val.contains('.') || val.contains('/')) && val.len() >= 8 && val.len() <= 12 {
                let clean_date = val.replace('.', "-").replace('/', "-");
                // Check if it's mostly numeric
                if clean_date.chars().filter(|c| c.is_numeric()).count() >= 6 {
                    date = clean_date;
                }
            }
        }
    }
    (title, date)
}

fn detect_columns(rows: &[Vec<String>]) -> (usize, std::collections::HashMap<String, usize>, i32) {
    let mut best_map = std::collections::HashMap::new();
    let mut best_idx = 0;
    let mut max_score = 0;

    // Phase 1: Keyword-based Header Detection (Existing but weighted)
    for (i, row) in rows.iter().take(30).enumerate() {
        let mut map = std::collections::HashMap::new();
        let mut score = 0;
        for (col_idx, cell) in row.iter().enumerate() {
            let val = cell.to_lowercase().replace(' ', "").replace('-', "").replace('_', "");
            
            // ACL-style Keyword Matching
            if val.contains("일자") || val.contains("일시") || val.contains("date") || val.contains("거래일") { map.insert("date".to_string(), col_idx); score += 10; }
            
            if (val.contains("출금") || val.contains("지출") || val.contains("withdrawal")) && !val.contains("번호") {
                map.insert("withdrawal".to_string(), col_idx);
                score += 10;
            }
            if (val.contains("입금") || val.contains("수입") || val.contains("deposit")) && !val.contains("번호") {
                map.insert("deposit".to_string(), col_idx);
                score += 10;
            }
            if val.contains("금액") || val.contains("amount") || val.contains("승인") || val.contains("결제") { 
                if !val.contains("번호") && !map.contains_key("amount") && !map.contains_key("withdrawal") && !map.contains_key("deposit") { 
                    map.insert("amount".to_string(), col_idx); 
                    score += 10; 
                }
            }
            if val.contains("가맹점") || val.contains("vendor") || val.contains("거래처") || val.contains("상호") { map.insert("vendor".to_string(), col_idx); score += 8; }
            if val.contains("적요") || val.contains("내용") || val.contains("desc") || val.contains("항목") { map.insert("desc".to_string(), col_idx); score += 7; }
        }
        
        if score > max_score {
            max_score = score;
            best_map = map;
            best_idx = i;
        }
    }

    // Phase 2: Professional Fuzzy Structural Analysis (Schema-less fallback)
    // If headers are missing or obfuscated, identify columns by data pattern
    if (max_score < 20 || best_map.is_empty()) && rows.len() > 0 {
        let mut date_col = None;
        let mut amount_col = None;
        let mut text_col = None;

        // Sample data rows (skip metadata) - Use saturating logic
        let sample_start = if max_score > 0 { (best_idx + 1).min(rows.len()) } else { 0 };
        for row in rows.iter().skip(sample_start).take(10) {
            for (col_idx, cell) in row.iter().enumerate() {
                let cell = cell.trim();
                if cell.is_empty() { continue; }

                // 1. Detect Date (YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD)
                let normalized_cell = cell.replace('.', "-").replace('/', "-");
                if date_col.is_none() && normalized_cell.contains('-') && normalized_cell.chars().filter(|c| c.is_numeric()).count() >= 6 {
                    date_col = Some(col_idx);
                }
                // 2. Detect Amount (Large numeric density)
                let numeric_only: String = cell.chars().filter(|c| c.is_numeric()).collect();
                if amount_col.is_none() && numeric_only.len() >= 3 && numeric_only.len() < 12 {
                    // Avoid picking the date column as amount
                    if Some(col_idx) != date_col {
                        amount_col = Some(col_idx);
                    }
                }
                // 3. Detect Text (Higher entropy/Non-numeric)
                if text_col.is_none() && cell.chars().any(|c| c.is_alphabetic()) && numeric_only.len() < cell.len() / 2 {
                    if Some(col_idx) != date_col {
                        text_col = Some(col_idx);
                    }
                }
            }
        }

        if let Some(idx) = date_col { best_map.insert("date".to_string(), idx); }
        if let Some(idx) = amount_col { best_map.insert("amount".to_string(), idx); }
        if let Some(idx) = text_col { best_map.insert("vendor".to_string(), idx); }
    }

    (best_idx, best_map, max_score)
}

fn clean_amount_with_status(val: &str) -> (f64, ParseStatus, Option<String>) {
    let clean: String = val.chars().filter(|c| c.is_numeric() || *c == '.' || *c == '-').collect();
    let amt = clean.parse::<f64>().unwrap_or(0.0);
    (amt, if amt != 0.0 { ParseStatus::Ok } else { ParseStatus::Warning }, None)
}

pub fn detect_delimiter(content: &str) -> u8 {
    let delimiters = [b',', b'\t', b';', b'|'];
    let mut best_delim = b',';
    let mut max_count = 0;

    for &delim in &delimiters {
        let count = content.chars().filter(|&c| c == delim as char).count();
        if count > max_count {
            max_count = count;
            best_delim = delim;
        }
    }
    best_delim
}


pub fn detect_and_decode(bytes: &[u8]) -> Result<String, ParseError> {
    if bytes.is_empty() { return Ok(String::new()); }

    // 1. Check for Electronic Signature or BOM
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) { // UTF-8 BOM
        return Ok(String::from_utf8_lossy(&bytes[3..]).into_owned());
    }
    if bytes.starts_with(&[0xFF, 0xFE]) { // UTF-16 LE
        let u16_data: Vec<u16> = bytes[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        return Ok(String::from_utf16_lossy(&u16_data));
    }

    // 2. Conservative Encoding Policy
    // If it's valid UTF-8, we trust it 100%
    if let Ok(utf8_str) = String::from_utf8(bytes.to_vec()) {
        return Ok(utf8_str);
    }

    // 3. Statistical Detection (chardetng)
    // Constraint: Statistical detection is unreliable for very short data (The "Coin Flip" problem)
    // We reject detection if data is too short (< 100 bytes) and not UTF-8.
    if bytes.len() < 100 {
        return Err(ParseError::EncodingUncertain("Too short".to_string()));
    }

    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(bytes, true);
    let encoding = detector.guess(None, true);
    
    let (res, _, errors) = encoding.decode(bytes);
    if errors {
        return Err(ParseError::EncodingUncertain("Malformed".to_string()));
    } else {
        Ok(res.into_owned())
    }
}

fn normalize_date(val: &str) -> String {
    let val = val.trim();
    if val.is_empty() { return String::new(); }
    
    // Replace . or / with -
    let cleaned = val.replace('.', "-").replace('/', "-");
    
    // Handle YYYYMMDD (8 digits)
    if cleaned.len() == 8 && cleaned.chars().all(|c| c.is_numeric()) {
        return format!("{}-{}-{}", &cleaned[0..4], &cleaned[4..6], &cleaned[6..8]);
    }
    
    // Attempt to pad YYYY-M-D to YYYY-MM-DD
    let parts: Vec<&str> = cleaned.split('-').collect();
    if parts.len() == 3 {
        let y = parts[0];
        let m = parts[1];
        let d = parts[2];
        if y.len() == 4 && m.len() <= 2 && d.len() <= 2 {
            return format!("{}-{:0>2}-{:0>2}", y, m, d);
        }
    }
    
    cleaned
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_acl_level_parsing_of_messy_bank_csv() {
        let csv_data = r#"우리은행 기업뱅킹 거래내역 서식 v2.0
계좌번호: 100-200-300400
조회로그: 20241016_1200
거래처명: (주)어카운팅플로우

거래일자,시간,적요,출금액,입금액,거래점소,비고
2024-10-14,09:15,스타벅스 강남,15000,0,강남점,커피 구매
2024-10-15,14:30,(주)마케팅에이비씨,11000000,0,(주)마케팅에이비씨,홍보 컨설팅 선금
2024-10-15,18:00,맛있는 고기집,240000,0,강남역점,팀 회식
"#;
        let results = parse_robust_csv(csv_data.as_bytes().to_vec(), Some("Test".to_string())).unwrap();
        
        assert_eq!(results.len(), 3);
        assert_eq!(results[1].vendor.as_deref(), Some("(주)마케팅에이비씨"));
        assert_eq!(results[1].amount, 11000000.0);
    }

    #[test]
    fn test_sign_integrity() {
        // [헌법 준수] 파서는 음수 수치를 절댓값화 하지 않고 그대로 유지한다.
        let csv_data = "날짜,금액\n2024-01-01,\"-50,000\"";
        let results = parse_robust_csv(csv_data.as_bytes().to_vec(), None).unwrap();
        assert_eq!(results[0].amount, -50000.0);
    }

    #[test]
    fn test_date_normalization() {
        let cases = vec![
            ("2024.12.31", "2024-12-31"),
            ("2024/12/31", "2024-12-31"),
            ("20241231", "2024-12-31"),
            ("2024-1-1", "2024-01-01"),
        ];
        
        for (input, expected) in cases {
            assert_eq!(normalize_date(input), expected);
        }
    }

    #[test]
    fn test_euc_kr_detection_with_sufficient_sample() {
        // Build a sufficient EUC-KR sample (approx. 150 bytes) to ensure statistical confidence.
        let header = "거래일자,시간,적요,출금액,입금액,잔액\n";
        let mut body = String::new();
        for i in 1..10 {
            body.push_str(&format!("2024-01-{:02},09:00,테스트거래_{},{},0,100000\n", i, i, 1000 * i));
        }
        let full_str = format!("{}{}", header, body);
        
        use encoding_rs::EUC_KR;
        let (bytes, _, _) = EUC_KR.encode(&full_str);
        
        let decoded = detect_and_decode(&bytes).unwrap();
        assert!(decoded.contains("거래일자"));
        assert!(decoded.contains("테스트거래"));
    }

    #[test]
    fn test_encoding_uncertain_should_fail() {
        // Very short EUC-KR sample (< 100 bytes) should fail under conservative policy.
        let short_str = "거래일자,출금액\n2024-01-01,5000\n";
        use encoding_rs::EUC_KR;
        let (bytes, _, _) = EUC_KR.encode(short_str);
        
        let result = detect_and_decode(&bytes);
        assert!(result.is_err());
        if let Err(ParseError::EncodingUncertain(msg)) = result {
            assert!(msg.contains("too short"));
        } else {
            panic!("Expected EncodingUncertain error");
        }
    }

    #[test]
    fn test_simple_schemaless_parsing() {
        let csv_data = "2024-10-14,스타벅스,15000";
        let results = parse_robust_csv(csv_data.as_bytes().to_vec(), None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].amount, 15000.0);
        assert_eq!(results[0].vendor.as_deref(), Some("스타벅스"));
    }
}
