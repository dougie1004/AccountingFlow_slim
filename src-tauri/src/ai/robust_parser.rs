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

        // 스크린샷 구조: 0:Date, 1:Vendor, 2:Description, 3:Amount
        let date = fields.get(0).cloned().unwrap_or_default();
        let vendor = fields.get(1).cloned().unwrap_or_default();
        let description = fields.get(2).cloned().unwrap_or_default();
        
        // 금액 필드 유추 (3번 인덱스가 숫자면 3번, 아니면 2번 시도)
        let amount_raw = fields.get(3).or(fields.get(2)).cloned().unwrap_or_default();
        let amount_clean = amount_raw.replace(",", "").replace("원", "").replace("\"", "");
        let amount = amount_clean.parse::<f64>().unwrap_or(0.0);

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

fn detect_and_decode(bytes: &[u8]) -> Result<String, String> {
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (res, _, _) = UTF_16LE.decode(bytes);
        return Ok(res.to_string());
    }
    if let Ok(res) = String::from_utf8(bytes.to_vec()) {
        return Ok(res);
    }
    let (res, _, error) = EUC_KR.decode(bytes);
    if !error {
        let result_str: String = res.to_string();
        return Ok(result_str);
    }
    Err("인코딩 인지 실패".to_string())
}
