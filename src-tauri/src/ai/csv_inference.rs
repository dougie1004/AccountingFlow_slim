use serde::{Serialize, Deserialize};
use crate::core::models::{ParsedTransaction, JournalEntry};
use crate::ai::robust_parser;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum FileType {
    Payroll,
    Insurance,
    BankTransaction,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedMetadata {
    pub num_employees: Option<u32>,
    pub total_amount: f64,
    pub period_guess: Option<String>, // e.g., "2024-03"
    pub detected_type: FileType,
    pub summary_text: String,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InferenceResult {
    pub metadata: ExtractedMetadata,
    pub suggested_entries: Vec<ParsedTransaction>,
}

pub fn analyze_csv(data: Vec<u8>) -> Result<InferenceResult, String> {
    // 1. Decode & Detect Delimiter (Reuse robust parser logic)
    let decoded_content = robust_parser::detect_and_decode(&data)?;
    let delimiter = robust_parser::detect_delimiter(&decoded_content);
    
    // 2. Simple Line/Header Analysis
    let lines: Vec<&str> = decoded_content.lines()
        .filter(|l| !l.trim().is_empty())
        .collect();

    if lines.is_empty() {
        return Err("Empty file".to_string());
    }

    // Heuristics
    let header_line = lines[0].to_lowercase();
    let header_tokens: Vec<&str> = header_line.split(|c| c == ',' || c == '\t' || c == ';').collect();
    
    let is_payroll = header_line.contains("급여") || header_line.contains("사원") || header_line.contains("지급") || header_line.contains("salary") || header_line.contains("employee");
    let is_insurance = header_line.contains("고지서") || header_line.contains("보험") || header_line.contains("연금") || header_line.contains("insurance") || header_line.contains("pension");
    
    // Determine Type
    let file_type = if is_payroll {
        FileType::Payroll
    } else if is_insurance {
        FileType::Insurance
    } else {
        FileType::BankTransaction // Default fallback for now
    };

    match file_type {
        FileType::Payroll => parse_payroll(&lines, delimiter),
        FileType::Insurance => parse_insurance(&lines, delimiter),
        FileType::BankTransaction => {
            // Revert to robust transaction parsing
            let txs = robust_parser::parse_robust_csv(data)?;
            Ok(InferenceResult {
                metadata: ExtractedMetadata {
                    num_employees: None,
                    total_amount: txs.iter().map(|t| t.amount).sum(),
                    period_guess: None,
                    detected_type: FileType::BankTransaction,
                    summary_text: format!("Detected Bank Statement. Found {} transactions.", txs.len()),
                    confidence: 0.9,
                },
                suggested_entries: txs,
            })
        },
        _ => Err("Unknown format".to_string())
    }
}

fn parse_payroll(lines: &[&str], delimiter: u8) -> Result<InferenceResult, String> {
    // Payroll Structure: 1 row per employee usually
    // Header is line 0
    let data_rows = &lines[1..];
    let num_employees = data_rows.len() as u32;

    // Try to find "Total Payment" column index
    // Simplified: Look for biggest number column or specific keywords
    // For MVP: Let's assume we sum valid numbers found in the row, or finding a specific column is hard without mapping.
    // Let's grab the last column as 'Total' often? Or sum all numbers.
    // Let's try to sum the largest numeric value in each row (Total Pay usually largest)
    
    let mut total_salary_expense = 0.0;
    
    for row in data_rows {
        // Clean and split
        let parts: Vec<&str> = row.split(delimiter as char).collect();
        let mut max_val = 0.0;
        for p in parts {
             let cleaned: String = p.chars().filter(|c| c.is_numeric() || *c == '.').collect();
             if let Ok(val) = cleaned.parse::<f64>() {
                 if val > max_val && val < 1_000_000_000.0 { // Sanity check < 1B KRW salary
                     max_val = val;
                 }
             }
        }
        total_salary_expense += max_val;
    }
    
    // Construct single consolidated entry for Accounting
    let entry = ParsedTransaction {
        date: Some(Local::now().format("%Y-%m-%d").to_string()), // Should ideally extract period from filename or header
        amount: total_salary_expense,
        entry_type: Some("Expense".to_string()),
        description: Some(format!("Payroll Expense ({} Employees)", num_employees)),
        vendor: Some("Payroll Run".to_string()),
        confidence: Some("High".to_string()),
        reasoning: "Universal Parser V3: Payroll Detected".to_string(),
        ..Default::default()
    };

    Ok(InferenceResult {
        metadata: ExtractedMetadata {
            num_employees: Some(num_employees),
            total_amount: total_salary_expense,
            period_guess: None,
            detected_type: FileType::Payroll,
            summary_text: format!("급여대장 파싱 완료: 총 {}명, 급여총액 {:.0}원 감지됨.", num_employees, total_salary_expense),
            confidence: 0.95,
        },
        suggested_entries: vec![entry],
    })
}

fn parse_insurance(lines: &[&str], delimiter: u8) -> Result<InferenceResult, String> {
    // Insurance bills often have one total line or broken down by employee.
    // Let's assume detail list -> Sum it up.
    let data_rows = &lines[1..];
    
    let mut total_expense = 0.0;
    for row in data_rows {
        let parts: Vec<&str> = row.split(delimiter as char).collect();
        for p in parts {
             let cleaned: String = p.chars().filter(|c| c.is_numeric() || *c == '.').collect();
             if let Ok(val) = cleaned.parse::<f64>() {
                 // Heuristic: Insurance premiums usually < 10M per person
                 if val > 0.0 && val < 50_000_000.0 { 
                     // Summing specific column is safer, but for now sum 'valid looking' numbers? 
                     // Risk: Summing Employee share + Employer share + Total.
                     // Better strategy: Use the Largest number in row as "Total" for that person/line.
                 }
             }
        }
        // Let's assume the largest number in the row is the total for that row
        let row_max = row.split(delimiter as char)
            .filter_map(|s| s.chars().filter(|c| c.is_numeric() || *c == '.').collect::<String>().parse::<f64>().ok())
            .fold(0.0/0.0, |x, y| y.max(x)); // max logic
        
        if row_max.is_finite() {
            total_expense += row_max;
        }
    }

    let entry = ParsedTransaction {
        date: Some(Local::now().format("%Y-%m-%d").to_string()),
        amount: total_expense,
        entry_type: Some("Expense".to_string()),
        description: Some("4 Major Insurance Premiums".to_string()),
        vendor: Some("Social Security".to_string()),
        confidence: Some("Medium".to_string()),
        reasoning: "Universal Parser V3: Insurance Detected".to_string(),
        ..Default::default()
    };

    Ok(InferenceResult {
        metadata: ExtractedMetadata {
            num_employees: None, // Can calculate if we assume 1 row per person
            total_amount: total_expense,
            period_guess: None,
            detected_type: FileType::Insurance,
            summary_text: format!("4대보험 고지서 파싱: 총액 {:.0}원 추정.", total_expense),
            confidence: 0.85,
        },
        suggested_entries: vec![entry],
    })
}
