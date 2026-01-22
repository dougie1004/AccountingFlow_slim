use crate::core::models::{ParsedTransaction, JournalEntry};
use crate::ai::robust_parser::detect_and_decode;
use csv::ReaderBuilder;
use std::io::Cursor;
use calamine::{Reader, Xlsx, Data};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DouzoneRecord {
    pub date: String,
    pub description: String,
    pub vendor: String,
    pub amount: f64,
    pub account_name: String,
    pub entry_type: String,
}

/// 더존(Douzone) 전표 데이터 특화 파서
pub fn parse_douzone_data(bytes: Vec<u8>, file_name: &str) -> Result<Vec<ParsedTransaction>, String> {
    let ext = std::path::Path::new(file_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext == "xlsx" || ext == "xls" {
        parse_douzone_excel(bytes)
    } else {
        parse_douzone_csv(bytes)
    }
}

struct RawRow {
    date: String,
    doc_num: String,
    description: String,
    vendor: String,
    debit: f64,
    credit: f64,
    account: String,
}

fn parse_douzone_csv(bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let content = detect_and_decode(&bytes)?.replace("\u{feff}", "");
    
    // 1. Delimiter Detection
    let mut comma_count = 0;
    let mut tab_count = 0;
    let mut semi_count = 0;
    for line in content.lines().take(10) {
        comma_count += line.matches(',').count();
        tab_count += line.matches('\t').count();
        semi_count += line.matches(';').count();
    }
    
    let delimiter = if tab_count > comma_count && tab_count > semi_count {
        b'\t'
    } else if semi_count > comma_count && semi_count > tab_count {
        b';'
    } else {
        b','
    };

    println!("[Parser] Detected Delimiter: {}", delimiter as char);

    let mut rdr = ReaderBuilder::new()
        .has_headers(true)
        .delimiter(delimiter)
        .flexible(true)
        .from_reader(Cursor::new(content.clone()));

    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    println!("[Parser] Raw CSV Headers (len={}): {:?}", headers.len(), headers);
    
    let mut header_map = std::collections::HashMap::new();
    if headers.len() == 1 && (headers[0].contains(',') || headers[0].contains('\t')) {
        let split_char = if headers[0].contains('\t') { '\t' } else { ',' };
        let split_fields: Vec<String> = headers[0].split(split_char).map(|s| s.trim().to_string()).collect();
        header_map = map_headers_raw(&split_fields);
    } else {
        header_map = map_headers(&headers);
    }
    
    if header_map.is_empty() {
        return Err("헤더 매핑에 실패했습니다. (일자, 금액/차변/대변, 적요 등 필수 필드 누락)".to_string());
    }

    let mut raw_rows = Vec::new();
    
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        
        let fields: Vec<String> = if record.len() == 1 && (record[0].contains(',') || record[0].contains('\t')) {
            let split_char = if record[0].contains('\t') { '\t' } else { ',' };
            record[0].split(split_char).map(|s| s.trim().to_string()).collect()
        } else {
            record.iter().map(|s| s.to_string()).collect()
        };

        let get_field = |key: &str| -> String {
            header_map.get(key).and_then(|&i| fields.get(i)).cloned().unwrap_or_default()
        };

        let date_raw = get_field("date");
        let date = crate::utils::converter::sanitize_date(&date_raw);
        if date.is_empty() { continue; }

        let debit = crate::utils::converter::sanitize_amount(&get_field("debit"));
        let credit = crate::utils::converter::sanitize_amount(&get_field("credit"));
        
        raw_rows.push(RawRow {
            date,
            doc_num: get_field("doc_num"),
            description: get_field("description"),
            vendor: get_field("vendor"),
            debit,
            credit,
            account: get_field("account"),
        });
    }

    Ok(group_and_merge_rows(raw_rows))
}

fn group_and_merge_rows(rows: Vec<RawRow>) -> Vec<ParsedTransaction> {
    use std::collections::HashMap;
    let mut groups: HashMap<String, Vec<RawRow>> = HashMap::new();
    
    for row in rows {
        // DocNum이 있으면 Date + DocNum으로 그룹화, 없으면 독립 유지
        let key = if !row.doc_num.is_empty() {
            format!("{}_{}", row.date, row.doc_num)
        } else {
            format!("{}_standalone_{}", row.date, uuid::Uuid::new_v4())
        };
        groups.entry(key).or_insert(vec![]).push(row);
    }

    let mut results = Vec::new();

    for (key, group) in groups {
        if group.len() == 1 {
            let row = &group[0];
            let amount = if row.debit != 0.0 { row.debit } else { row.credit };
            let mut tx = map_to_parsed_tx(row.date.clone(), row.description.clone(), row.vendor.clone(), amount, row.account.clone());
            if row.debit != 0.0 {
                tx.debit_account = Some(row.account.clone());
            } else {
                tx.credit_account = Some(row.account.clone());
            }
            results.push(tx);
        } else {
            // Merge multi-line transaction
            let date = group[0].date.clone();
            let doc_num = group[0].doc_num.clone();
            let desc = group[0].description.clone();
            let vendor = group.iter().find(|r| !r.vendor.is_empty()).map(|r| r.vendor.clone()).unwrap_or_default();
            
            let total_debit: f64 = group.iter().map(|r| r.debit).sum();
            let total_credit: f64 = group.iter().map(|r| r.credit).sum();
            
            // Balanced check
            let is_balanced = (total_debit - total_credit).abs() < 1.0;
            
            // Extract accounts
            let debits: Vec<String> = group.iter().filter(|r| r.debit > 0.0).map(|r| r.account.clone()).collect();
            let credits: Vec<String> = group.iter().filter(|r| r.credit > 0.0).map(|r| r.account.clone()).collect();
            
            let mut tx = map_to_parsed_tx(date, desc, vendor, total_debit.max(total_credit), "".to_string());
            tx.reasoning = format!("전표번호 {} 그룹화 완료 ({}개 항목)", doc_num, group.len());
            tx.debit_account = Some(debits.join(", "));
            tx.credit_account = Some(credits.join(", "));
            
            if !is_balanced {
                tx.needs_clarification = true;
                tx.clarification_prompt = Some(format!("차평 불일치 발견: 차변 ₩{:.0} / 대변 ₩{:.0}", total_debit, total_credit));
                tx.confidence = Some("Critical".to_string());
            }

            results.push(tx);
        }
    }

    results.sort_by(|a, b| b.date.cmp(&a.date));
    results
}

fn parse_douzone_excel(bytes: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let mut excel: Xlsx<_> = calamine::open_workbook_from_rs(Cursor::new(bytes))
        .map_err(|e| format!("Excel open failed: {}", e))?;
    
    let sheet_name = excel.sheet_names().get(0).ok_or("No sheets found")?.clone();
    let range = excel.worksheet_range(&sheet_name).map_err(|e| e.to_string())?;
    
    let headers = range.rows().next().ok_or("Empty excel sheet")?;
    let header_strs: Vec<String> = headers.iter().map(|h| h.to_string()).collect();
    let header_map = map_headers_raw(&header_strs);

    let mut raw_rows = Vec::new();
    
    for row in range.rows().skip(1) {
        let date_raw = header_map.get("date").and_then(|&i| row.get(i)).map(|d| d.to_string()).unwrap_or_default();
        let date = crate::utils::converter::sanitize_date(&date_raw);
        if date.is_empty() { continue; }

        let debit = header_map.get("debit").and_then(|&i| row.get(i)).map(|d| crate::utils::converter::sanitize_amount(&d.to_string())).unwrap_or(0.0);
        let credit = header_map.get("credit").and_then(|&i| row.get(i)).map(|d| crate::utils::converter::sanitize_amount(&d.to_string())).unwrap_or(0.0);
        let doc_num = header_map.get("doc_num").and_then(|&i| row.get(i)).map(|d| d.to_string()).unwrap_or_default();

        raw_rows.push(RawRow {
            date,
            doc_num,
            description: header_map.get("description").and_then(|&i| row.get(i)).map(|d| d.to_string()).unwrap_or_default(),
            vendor: header_map.get("vendor").and_then(|&i| row.get(i)).map(|d| d.to_string()).unwrap_or_default(),
            debit,
            credit,
            account: header_map.get("account").and_then(|&i| row.get(i)).map(|d| d.to_string()).unwrap_or_default(),
        });
    }
    
    Ok(group_and_merge_rows(raw_rows))
}

fn map_headers(headers: &csv::StringRecord) -> std::collections::HashMap<&'static str, usize> {
    let mut map = std::collections::HashMap::new();
    for (i, h) in headers.iter().enumerate() {
        let h_lower = h.trim().to_lowercase();
        
        if h_lower.contains("일자") || h_lower.contains("date") { map.insert("date", i); }
        else if h_lower.contains("전표번호") || h_lower.contains("docnum") || h_lower.contains("doc_num") || h_lower.contains("docno") { map.insert("doc_num", i); }
        else if h_lower.contains("적요") || h_lower.contains("text") || h_lower.contains("description") || h_lower.contains("remarks") { map.insert("description", i); }
        else if h_lower.contains("거래처") || h_lower.contains("vendor") || h_lower.contains("customer") || h_lower.contains("partner") { map.insert("vendor", i); }
        else if h_lower.contains("차변") || h_lower.contains("debit") { map.insert("debit", i); }
        else if h_lower.contains("대변") || h_lower.contains("credit") { map.insert("credit", i); }
        else if h_lower.contains("금액") || h_lower.contains("가액") || h_lower.contains("합계") || h_lower.contains("amount") { 
            if !map.contains_key("debit") { map.insert("debit", i); }
        }
        else if h_lower.contains("계정") || h_lower.contains("account") || h_lower.contains("code") { map.insert("account", i); }
    }
    println!("[Parser] Final Header Mapping (CSV): {:?}", map);
    map
}

fn map_headers_raw(headers: &[String]) -> std::collections::HashMap<&'static str, usize> {
    let mut map = std::collections::HashMap::new();
    for (i, h) in headers.iter().enumerate() {
        let h_lower = h.trim().to_lowercase();

        if h_lower.contains("일자") || h_lower.contains("date") { map.insert("date", i); }
        else if h_lower.contains("전표번호") || h_lower.contains("docnum") || h_lower.contains("doc_num") || h_lower.contains("docno") { map.insert("doc_num", i); }
        else if h_lower.contains("적요") || h_lower.contains("text") || h_lower.contains("description") || h_lower.contains("remarks") { map.insert("description", i); }
        else if h_lower.contains("거래처") || h_lower.contains("vendor") || h_lower.contains("customer") || h_lower.contains("partner") { map.insert("vendor", i); }
        else if h_lower.contains("차변") || h_lower.contains("debit") { map.insert("debit", i); }
        else if h_lower.contains("대변") || h_lower.contains("credit") { map.insert("credit", i); }
        else if h_lower.contains("금액") || h_lower.contains("가액") || h_lower.contains("합계") || h_lower.contains("amount") { 
            if !map.contains_key("debit") { map.insert("debit", i); }
        }
        else if h_lower.contains("계정") || h_lower.contains("account") || h_lower.contains("code") { map.insert("account", i); }
    }
    println!("[Parser] Final Header Mapping (Excel): {:?}", map);
    map
}

fn map_to_parsed_tx(date: String, desc: String, vendor: String, amount: f64, account: String) -> ParsedTransaction {
    let mut tx = ParsedTransaction {
        date: Some(date.clone()),
        amount,
        vat: (amount / 11.0).round(),
        entry_type: Some("Expense".to_string()),
        description: Some(desc),
        vendor: Some(vendor),
        account_name: Some(account),
        reasoning: "더존(Douzone) 데이터 파서에 의해 구조화됨".to_string(),
        confidence: Some("High".to_string()),
        audit_trail: vec!["Douzone Legacy Data Ingested".to_string()],
        id: Some(crate::utils::id_generator::generate_id(&date, crate::utils::id_generator::IdPrefix::AI)),
        ..Default::default()
    };
    
    // 간단한 계정 성격 분류
    if let Some(ref acc) = tx.account_name {
        if acc.contains("매출") || acc.contains("수익") {
            tx.entry_type = Some("Revenue".to_string());
        } else if acc.contains("자산") || acc.contains("비품") || acc.contains("예금") {
            tx.entry_type = Some("Asset".to_string());
        }
    }
    
    tx
}
