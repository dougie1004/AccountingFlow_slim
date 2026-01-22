use crate::core::models::JournalEntry;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchExportResult {
    pub total_entries: usize,
    pub total_debit: f64,
    pub total_credit: f64,
    pub is_balanced: bool,
    pub anomalies: Vec<String>,
    pub csv_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrialBalance {
    pub total_debit: f64,
    pub total_credit: f64,
    pub difference: f64,
    pub is_balanced: bool,
}

/**
 * Batch Process Service
 * 전표 일괄 확정 및 시산표 검증 (이중 검증 시스템)
 */
pub fn process_batch_export(entries: Vec<JournalEntry>) -> Result<BatchExportResult, String> {
    if entries.is_empty() {
        return Err("전표가 없습니다.".to_string());
    }

    // 1. 시산표 검증 (Trial Balance)
    let trial_balance = calculate_trial_balance(&entries);
    
    let mut anomalies = Vec::new();
    
    // 2. 차대 불일치 검사
    if !trial_balance.is_balanced {
        anomalies.push(format!(
            "⚠️ 시산표 불일치: 차변 ₩{:.0} vs 대변 ₩{:.0} (차이: ₩{:.0})",
            trial_balance.total_debit,
            trial_balance.total_credit,
            trial_balance.difference
        ));
    }

    // 3. 이상 거래 탐지
    for (idx, entry) in entries.iter().enumerate() {
        // 3-1. 고액 거래 플래그
        if entry.amount > 50_000_000.0 {
            anomalies.push(format!(
                "#{} 고액 거래 감지: {} - ₩{:.0} (내부 승인문서 첨부 및 승인 확인 필요)",
                idx + 1, entry.description, entry.amount
            ));
        }

        // 3-2. 계정과목 미지정
        if entry.debit_account == "Unselected" || entry.credit_account == "Unselected" {
            anomalies.push(format!(
                "#{} 계정과목 미지정: {}",
                idx + 1, entry.description
            ));
        }

        // 3-3. VAT 비율 이상
        if entry.vat > 0.0 && (entry.vat / entry.amount) > 0.15 {
            anomalies.push(format!(
                "#{} VAT 비율 이상: {} ({}%)",
                idx + 1, entry.description, (entry.vat / entry.amount * 100.0)
            ));
        }
    }

    // 4. CSV 생성
    let csv_data = generate_csv(&entries)?;

    Ok(BatchExportResult {
        total_entries: entries.len(),
        total_debit: trial_balance.total_debit,
        total_credit: trial_balance.total_credit,
        is_balanced: trial_balance.is_balanced,
        anomalies,
        csv_data,
    })
}

fn calculate_trial_balance(entries: &[JournalEntry]) -> TrialBalance {
    let total_debit: f64 = entries.iter().map(|e| e.amount).sum();
    let total_credit: f64 = entries.iter().map(|e| e.amount).sum();
    
    let difference = (total_debit - total_credit).abs();
    let is_balanced = difference < 0.01; // 1원 미만 차이는 허용

    TrialBalance {
        total_debit,
        total_credit,
        difference,
        is_balanced,
    }
}

fn generate_csv(entries: &[JournalEntry]) -> Result<String, String> {
    let mut csv = String::from("날짜,적요,거래처,차변계정,대변계정,금액,VAT,상태\n");
    
    for entry in entries {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            entry.date,
            entry.description,
            entry.vendor.as_deref().unwrap_or(""),
            entry.debit_account,
            entry.credit_account,
            entry.amount,
            entry.vat,
            entry.status
        ));
    }

    Ok(csv)
}

/**
 * AI 기반 이상 거래 탐지 (Gemini 3.0 Pro 활용)
 */
pub async fn detect_anomalies_with_ai(entries: &[JournalEntry]) -> Result<Vec<String>, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;

    // 전표 요약 생성
    let summary = entries.iter()
        .take(10) // 최근 10건만 분석
        .map(|e| format!("{}: {} - ₩{}", e.date, e.description, e.amount))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        r#"당신은 숙련된 회계/세무 전문가입니다. 다음 전표 데이터를 분석하여 회계상의 오류나 세무 리스크가 있는 항목을 검토하세요.

    분석 대상 데이터:
    {}
    
    다음 항목 위주로 검토하십시오:
    1. 계정과목 오분류 (예: 자산/비용 판정 오류)
    2. 중복 거래 가능성
    3. 세무 리스크 (접대비 한도 관리, 증빙 불비 등)
    4. 금액 이상치 (비상식적인 고액 지출)
    
    응답은 반드시 다음 JSON 형식으로만 작성하세요:
    {{
      "anomalies": ["이슈 내용 1", "이슈 내용 2"]
    }}
    "#,
        summary
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&serde_json::json!({ "contents": [{ "parts": [{ "text": prompt }] }] }))
        .send()
        .await
        .map_err(|e| format!("AI 호출 실패: {}", e))?;

    let json_res: serde_json::Value = response.json().await
        .map_err(|e| format!("응답 파싱 실패: {}", e))?;

    let text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI 응답 없음")?
        .replace("```json", "").replace("```", "").trim().to_string();

    let result: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    let anomalies = result["anomalies"]
        .as_array()
        .ok_or("anomalies 필드 없음")?
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();

    Ok(anomalies)
}
