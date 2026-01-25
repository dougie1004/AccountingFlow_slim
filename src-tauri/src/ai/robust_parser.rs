use crate::core::models::{ParsedTransaction, ParseStatus};
use csv::ReaderBuilder;
use encoding_rs::{EUC_KR, UTF_16LE};
use std::io::Cursor;
use crate::ai::rule_based_classifier; 

// ... (Rest of file header)

// Helper: Clean Amount with Status (Survival-mode Aggressive Extraction)
fn clean_amount_with_status(val: &str) -> (f64, ParseStatus, Option<String>) {
    let raw = val.trim();
    if raw.is_empty() { 
        return (0.0, ParseStatus::Warning, Some("Empty cell".to_string())); 
    }

    // 1. Aggressive Numeric Extraction (Filter everything except numbers, dots, and minus)
    // This handles "4,200,000 원", "KRW 1,000", "Price: 50.5"
    let clean: String = raw.chars()
        .filter(|c| c.is_numeric() || *c == '.' || *c == '-')
        .collect();
        
    if clean.is_empty() {
         return (0.0, ParseStatus::NeedConfirm, Some(format!("Non-numeric value: '{}'", raw)));
    }
    
    let val = clean.parse::<f64>().unwrap_or(0.0);
    
    // 2. Validation: If it was just simple currency/commas, it's Ok. 
    // If we stripped significant text, mark as Warning but keep the value.
    let simple_removals = raw.replace(",", "").replace("₩", "").replace("$", "").replace("원", "").replace(" ", "");
    let is_simple = simple_removals.chars().all(|c| c.is_numeric() || c == '.' || c == '-');

    if is_simple {
        return (val, ParseStatus::Ok, None);
    } else {
        return (val, ParseStatus::Warning, Some(format!("Extracting {} from '{}'", val, raw)));
    }
}

// ... (Inside parse_robust_csv loop) ...

/**
 * Robust CSV Parser V3
 * - Column Header Sniffing (Smart Mapping)
 * - Semantic Classification Integration
 * - Smart VAT logic validation
 */
pub fn parse_robust_csv(data: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let decoded_content = detect_and_decode(&data)?;
    let delimiter = detect_delimiter(&decoded_content);

    let mut rdr = ReaderBuilder::new()
        .has_headers(false) // We manually detect headers
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All) // [Antigravity] Handle messy whitespace
        .from_reader(Cursor::new(decoded_content));

    let mut all_records = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV Read Error: {}", e))?;
        all_records.push(record.iter().map(|s| {
            let mut val = s.trim().to_string();
            // [Antigravity] Strip surrounding double quotes if present
            if val.starts_with('"') && val.ends_with('"') && val.len() >= 2 {
                val = val[1..val.len()-1].to_string();
            }
            val
        }).collect::<Vec<String>>());
    }

    if all_records.is_empty() {
        return Ok(Vec::new());
    }

    // 1. Detect Global Metadata (Title, Document Date) from top lines
    let (global_title, global_date) = extract_global_metadata(&all_records);
    println!("[Robust Parser V3] Global Context - Title: '{}', Date: '{}'", global_title, global_date);

    // 2. Detect Header Row Index & Column Mapping
    let (header_row_idx, col_map) = detect_columns(&all_records);
    println!("[Robust Parser V3] Detected Header at Row {}: {:?}", header_row_idx, col_map);

    let mut results = Vec::new();
    let start_row = if header_row_idx == 0 && col_map.is_empty() { 0 } else { header_row_idx + 1 };

    println!("[Robust Parser V3] Parsing {} rows starting from row {}", all_records.len(), start_row);

    let mut current_annotations = Vec::new();

    for (i, fields) in all_records.iter().enumerate().skip(start_row) {
        // Skip empty rows
        if fields.iter().all(|s| s.trim().is_empty()) { continue; }
        
        let row_joined = fields.join(" ").trim().to_string();

        // [Antigravity] Annotation Collection Logic
        // Capture rows that look like comments (*, ※, (주), etc.)
        if row_joined.starts_with('*') || row_joined.starts_with('※') || (row_joined.contains("(") && row_joined.contains(")") && fields.len() < 3) {
             current_annotations.push(row_joined.clone());
             println!("[Robust Parser V3] Captured Annotation: {}", row_joined);
             continue; 
        }

        // Skip "Total" or "Sum" lines (often at bottom)
        if fields.iter().any(|f| f.contains("합계") || f.contains("Total") || f.contains("소계")) { continue; }
        
        // [Antigravity] Survival-mode Validation: Skip document titles or metadata rows
        let row_joined_lower = fields.join(" ").to_lowercase();
        if row_joined_lower.contains("[") && row_joined_lower.contains("]") && row_joined_lower.contains("내역서") { continue; }
        if row_joined_lower.contains("작성일자") || row_joined_lower.contains("관리번호") || row_joined_lower.contains("고객번호") { continue; }

        let raw_row_string = fields.join(", "); // Snapshot
        
        let mut date = String::new();
        let mut amount = 0.0;
        let mut tax_base = 0.0;
        let mut vendor = String::new();
        let mut description = String::new();
        
        let mut row_status = ParseStatus::Ok;
        let mut row_error = None;

        // 3. Extract Data
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
            
            if let Some(idx) = col_map.get("tax_base") { 
                let (val, _, _) = clean_amount_with_status(fields.get(*idx).unwrap_or(&"".to_string()));
                tax_base = val;
            }
            
            if let Some(idx) = col_map.get("vendor") { vendor = fields.get(*idx).cloned().unwrap_or_default(); }
            if let Some(idx) = col_map.get("desc") { description = fields.get(*idx).cloned().unwrap_or_default(); }
        } else {
             // Fallback
             date = fields.get(0).cloned().unwrap_or_default();
             vendor = fields.get(1).cloned().unwrap_or_default();
             
             // Try getting amount from any column
             let mut found_amount = false;
             for f in fields.iter().skip(2) { // Skip known non-amount cols
                 let (val, status, _) = clean_amount_with_status(f);
                 if val.abs() > 0.0 { 
                     amount = val;
                     found_amount = true;
                     break; 
                 }
                 // If we find something that looks like an error, track it? 
                 // Nah, fallback mode is fuzzy anyway.
             }
             if !found_amount {
                 row_status = ParseStatus::NeedConfirm;
                 row_error = Some("Could not identify amount column automatically".to_string());
             }
        }

        // 4. Context Injection
        if description.trim().is_empty() { 
            description = global_title.clone(); 
        } else {
            if description.len() < 5 && !global_title.is_empty() {
                description = format!("{} - {}", global_title, description);
            }
        }

        if date.trim().is_empty() && !global_date.is_empty() {
             date = global_date.clone();
        }

        // 5. Data Integrity Cleaning
        vendor = vendor.trim_matches('"').trim().to_string();
        description = description.trim_matches('"').trim().to_string();

        let mut tx = ParsedTransaction {
            date: Some(date.clone()),
            amount,
            vat: 0.0, 
            tax_base_amount: if tax_base > 0.0 { Some(tax_base) } else { None }, 
            entry_type: Some("Expense".to_string()),
            description: Some(description),
            vendor: Some(vendor),
            reasoning: format!("Robust Parser V3 + Global Context ({})", global_title),
            audit_trail: vec![format!("#1 Parsed from '{}'", global_title)],
            id: Some(crate::utils::id_generator::generate_id("TX", crate::utils::id_generator::IdPrefix::AI)),
            
            // [Antigravity] Safe-Parser Fields
            parse_status: Some(row_status.clone()),
            raw_data_snapshot: Some(raw_row_string),
            parse_error_msg: row_error,
            
            ..Default::default()
        };

        // [Antigravity] Inject Captured Annotations into individual context
        if !current_annotations.is_empty() {
            let annotations_str = current_annotations.join(" | ");
            tx.reasoning = format!("{} [Annotations: {}]", tx.reasoning, annotations_str);
            tx.audit_trail.push(format!("Context Evidence: {}", annotations_str));
            // Don't clear them? Or clear? 
            // Usually, annotations at the top or between rows apply to the records following them.
            // Let's clear them after applying to at least one record? 
            // Or keep them for the whole block? 
            // If they are specific like "* 위 인원은", they might apply to the row ABOVE.
            // This is tricky. For now, we apply them to the NEXT row and then keep a cumulative list for the global doc.
        }

        // 6. Connect to Brain (Classify)
        rule_based_classifier::classify_by_rules(&mut tx); 
        
        // 7. Validation Flag Logic Overrides
        if tx.amount == 0.0 && tx.parse_status != Some(ParseStatus::NeedConfirm) {
            tx.needs_clarification = true;
            tx.clarification_prompt = Some("금액이 0원이거나 식별 불가합니다. 확인이 필요합니다.".to_string());
            tx.parse_status = Some(ParseStatus::NeedConfirm);
        } else if tx.amount == 0.0 {
            // Already marked NeedsConfirm
            tx.needs_clarification = true;
        }

        // Filter out rows with no meaningful data (Amount 0 AND No Vendor)
        if tx.amount == 0.0 && tx.vendor.as_deref().unwrap_or("").is_empty() {
            continue;
        }
        
        // If status is NeedConfirm, mark for clarification
        if tx.parse_status == Some(ParseStatus::NeedConfirm) || tx.parse_status == Some(ParseStatus::Error) {
             tx.needs_clarification = true;
             tx.confidence = Some("Low".to_string());
        }

        results.push(tx);
    }

    // [Step 1] Post-processing: Payroll/Insurance Splitting
    let results = split_payroll_rows(results);

    Ok(results)
}

fn split_payroll_rows(entries: Vec<ParsedTransaction>) -> Vec<ParsedTransaction> {
    let mut expanded = Vec::new();
    
    for tx in entries {
        let desc = tx.description.as_deref().unwrap_or("").to_lowercase();
        let is_insurance = desc.contains("보험료") || desc.contains("고용보험") || desc.contains("국민연금") || desc.contains("건강보험");
        
        if is_insurance && tx.amount > 0.0 {
            let group_id = format!("GRP-{}", uuid::Uuid::new_v4().to_string()[..8].to_string());
            
            // 1. Employee Part (예수금) - Roughly 45% as default if not specific
            let emp_amt = (tx.amount * 0.45).round();
            let mut emp_tx = tx.clone();
            emp_tx.id = Some(format!("{}-EMP", tx.id.as_deref().unwrap_or("TX")));
            emp_tx.amount = emp_amt;
            emp_tx.debit_account = Some("급여".to_string()); // Or the salary account
            emp_tx.credit_account = Some("예수금".to_string());
            emp_tx.description = Some(format!("{} (종업원분/예수금)", tx.description.as_deref().unwrap_or("")));
            emp_tx.transaction_group_id = Some(group_id.clone());
            emp_tx.is_insurance_part = true;
            emp_tx.reasoning.push_str(" | AI Splitting: Employee Part (45%)");
            
            // 2. Employer Part (비용) - Remaining 55%
            let mng_amt = tx.amount - emp_amt;
            let mut mng_tx = tx.clone();
            mng_tx.id = Some(format!("{}-MNG", tx.id.as_deref().unwrap_or("TX")));
            mng_tx.amount = mng_amt;
            mng_tx.debit_account = Some("보험료".to_string());
            mng_tx.credit_account = Some("보통예금".to_string()); // Or the payment account
            mng_tx.description = Some(format!("{} (회사부담분/비용)", tx.description.as_deref().unwrap_or("")));
            mng_tx.transaction_group_id = Some(group_id);
            mng_tx.is_insurance_part = true;
            mng_tx.reasoning.push_str(" | AI Splitting: Employer Part (55%)");

            expanded.push(emp_tx);
            expanded.push(mng_tx);
        } else {
            expanded.push(tx);
        }
    }
    
    expanded
}

// --- Smart Column & Metadata Detection ---
use std::collections::HashMap;

fn extract_global_metadata(rows: &[Vec<String>]) -> (String, String) {
    let mut title = String::new();
    let mut date = String::new();

    // Scan first 5 rows for Title-like or Date-like patterns
    for row in rows.iter().take(5) {
        for cell in row {
            let val = cell.trim();
            if val.is_empty() { continue; }

            // Title Heuristic: Contains "Statement", "Invoice", "List", "내역서", "계산서"
            if title.is_empty() && (val.contains("내역서") || val.contains("계산서") || val.contains("청구서") || val.contains("Statement") || val.contains("Invoice")) {
                title = val.replace("[", "").replace("]", "").trim().to_string();
            }

            // Date Heuristic: "Date:", "일자:", or YYYY-MM-DD pattern
            if date.is_empty() {
                if val.contains("작성일자") || val.contains("Date") {
                    // Extract date part
                    let parts: Vec<&str> = val.split(':').collect();
                    if parts.len() > 1 {
                        date = parts[1].trim().to_string();
                    }
                }
            }
        }
    }
    
    // Default Title if not found
    if title.is_empty() { title = "Imported Document".to_string(); }
    
    (title, date)
}

fn detect_columns(rows: &[Vec<String>]) -> (usize, HashMap<String, usize>) {
    let mut best_header_idx = 0;
    let mut best_map = HashMap::new();
    let mut max_score = 0;

    for (i, row) in rows.iter().take(20).enumerate() {
        let mut map = HashMap::new();
        let mut score = 0;
        
        for (col_idx, cell) in row.iter().enumerate() {
            let val = cell.to_lowercase().replace(" ", "").replace("\"", "").replace("'", "");
            
            if val.contains("date") || val.contains("일자") || val.contains("날짜") || val.contains("취득") || val.contains("일시") {
                map.insert("date".to_string(), col_idx);
                score += 3;
            } else if (val.contains("amount") || val.contains("금액") || val.contains("합계") || val.contains("산출") || val.contains("보수") || val.contains("납부") || val.contains("원") || val.contains("수당") || val.contains("보험료")) && !val.contains("번호") {
                // [Antigravity] Multi-Amount / Survival Detection
                // 1. "산출" (Calculated), "납부" (Payment), "금액" (General Amount)
                if val.contains("산출") || val.contains("납부") || val.contains("금액") {
                     map.insert("amount".to_string(), col_idx);
                     score += 4;
                } 
                // 2. "보수" (Salary Base) -> Tax Base Amount
                else if val.contains("보수") || val.contains("월액") || val.contains("base") || val.contains("보급") {
                     map.insert("tax_base".to_string(), col_idx);
                     score += 3;
                }
                // 3. Fallback
                else if !map.contains_key("amount") {
                     map.insert("amount".to_string(), col_idx);
                     score += 2;
                }
            } else if val.contains("vendor") || val.contains("성명") || val.contains("이름") || val.contains("가입자") || val.contains("상호") || val.contains("순번") {
                map.insert("vendor".to_string(), col_idx);
                score += 3;
            } else if val.contains("desc") || val.contains("적요") || val.contains("비고") || val.contains("내용") {
                map.insert("desc".to_string(), col_idx);
                score += 2;
            }
        }

        if map.len() >= 2 { // At least 2 columns matched
            if score > max_score {
                max_score = score;
                best_header_idx = i;
                best_map = map;
            }
        }
    }
    
    (best_header_idx, best_map)
}

fn clean_amount(val: &str) -> f64 {
    let clean: String = val.chars()
        .filter(|c| c.is_numeric() || *c == '.' || *c == '-')
        .collect();
    clean.parse::<f64>().unwrap_or(0.0)
}

// Reuse existing helpers
pub fn detect_delimiter(content: &str) -> u8 {
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

    if tab_scores >= 1 && tab_scores > comma_scores {
        b'\t'
    } else if semi_scores >= 1 && semi_scores > comma_scores {
        b';'
    } else if comma_scores > 0 {
        b','
    } else {
        if content.contains('\t') { b'\t' }
        else if content.contains(';') { b';' }
        else { b',' }
    }
}

pub fn detect_and_decode(bytes: &[u8]) -> Result<String, String> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
         let content = String::from_utf8_lossy(&bytes[3..]).to_string();
         return Ok(content.replace("\r\n", "\n"));
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (res, _, _) = UTF_16LE.decode(&bytes[2..]);
        return Ok(res.to_string().replace("\r\n", "\n"));
    }
    if let Ok(res) = String::from_utf8(bytes.to_vec()) {
         return Ok(res.replace("\r\n", "\n"));
    }
    let (res, _, error) = EUC_KR.decode(bytes);
    if !error {
         return Ok(res.to_string().replace("\r\n", "\n"));
    }
    Ok(String::from_utf8_lossy(bytes).to_string().replace("\r\n", "\n"))
}
