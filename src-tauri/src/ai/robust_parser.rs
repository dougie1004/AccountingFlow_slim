use crate::core::models::ParsedTransaction;
use csv::ReaderBuilder;
use encoding_rs::{EUC_KR, UTF_16LE};
use std::io::Cursor;

/**
 * Robust CSV Parser V2
 * 스크린샷 기반 컬럼 인덱스 교정 및 데이터 유추 기능 강화
 */
pub fn parse_robust_csv(data: Vec<u8>) -> Result<Vec<ParsedTransaction>, String> {
    let decoded_content = detect_and_decode(&data)?;
    let mut rdr = ReaderBuilder::new()
        .has_headers(false) // 헤더 유무와 관계없이 유연하게 처리
        .flexible(true)
        .from_reader(Cursor::new(decoded_content));

    let mut results = Vec::new();

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV 레코드 읽기 실패: {}", e))?;
        
        // 데이터가 한 줄로 뭉쳐있을 경우 수동 분할
        let fields: Vec<String> = if record.len() == 1 {
            record.get(0).unwrap_or("").split(',').map(|s| s.trim().to_string()).collect()
        } else {
            record.iter().map(|s| s.to_string()).collect()
        };

        if fields.len() < 2 { continue; }

        // Multi-column heuristic search
        let mut date = String::new();
        let mut vendor = String::new();
        let mut description = String::new();
        let mut amount = 0.0;

        for (i, field) in fields.iter().enumerate() {
            let val = field.trim();
            if val.is_empty() { continue; }

            // Date Detection (YYYY-MM-DD or similar)
            if date.is_empty() && (val.contains('-') || val.contains('.') || val.contains('/')) && val.chars().filter(|c| c.is_numeric()).count() >= 4 {
                date = val.to_string();
            }
            // Amount Detection
            else {
                let clean = val.replace(",", "").replace("원", "").replace("₩", "").replace("\"", "").replace(" ", "");
                if let Ok(num) = clean.parse::<f64>() {
                    if num > 10.0 { // Small numbers might be counts/ids
                        amount = num;
                    }
                }
            }
        }

        // Fallback for vendor/description if not detected
        vendor = fields.get(1).or(fields.get(0)).cloned().unwrap_or_default();
        description = fields.get(2).or(fields.get(1)).cloned().unwrap_or_default();

        if date.is_empty() { date = fields.get(0).cloned().unwrap_or_default(); }

        let mut tx = ParsedTransaction {
            date: date.clone(),
            amount,
            vat: (amount / 11.0).round(),
            entry_type: "Expense".to_string(),
            description: Some(description.clone()),
            vendor: Some(vendor.clone()),
            vendor_reg_no: None,
            vendor_representative: None,
            vendor_address: None,
            reasoning: "Robust Parser로 파싱됨".to_string(),
            account_name: None,
            needs_clarification: false,
            clarification_prompt: None,
            clarification_options: None,
            is_consultation: false,
            confidence: Some("Normal".to_string()),
            payment_method: None,
            audit_trail: vec!["#1 CSV 임포트 완료".to_string()],
            id: Some(crate::utils::id_generator::generate_id(&date, crate::utils::id_generator::IdPrefix::AI)),
            ..Default::default()
        };

        // 헤더 행인지 체크 (키워드 매칭)
        let is_header = date.to_lowercase() == "date" || 
                        date == "날짜" || 
                        description.to_lowercase() == "description" ||
                        description == "적요" ||
                        vendor.to_lowercase() == "vendor";

        if is_header {
            continue; // 헤더는 데이터 목록에 넣지 않고 건너뜁니다.
        }

        // 데이터 무결성 체크
        if tx.amount == 0.0 || tx.date.len() < 8 {
            tx.needs_clarification = true;
            tx.clarification_prompt = Some("필수 데이터 누락 또는 금액 인식 실패. 수동 검토가 필요합니다.".to_string());
            tx.confidence = Some("Low".to_string());
        }

        results.push(tx);
    }

    Ok(results)
}

pub fn detect_and_decode(bytes: &[u8]) -> Result<String, String> {
    // 1. Check for UTF-16LE BOM
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (res, _, _) = UTF_16LE.decode(bytes);
        return Ok(res.to_string());
    }

    // 2. Try UTF-8
    if let Ok(res) = String::from_utf8(bytes.to_vec()) {
        return Ok(res);
    }

    // 3. Try EUC-KR (Common in Korea)
    let (res, _, error) = EUC_KR.decode(bytes);
    if !error {
        return Ok(res.to_string());
    }

    // 4. Fallback: Lossy Decoding (UTF-8) - better to show mangled text than nothing
    Ok(String::from_utf8_lossy(bytes).to_string())
}
