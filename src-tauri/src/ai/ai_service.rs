use crate::core::models::ParsedTransaction;
use serde_json::json;

fn get_ai_model() -> String {
    std::env::var("AI_MODEL_NAME").unwrap_or_else(|_| "gemini-2.0-flash-exp".to_string())
}

/// Simplified Journal AI (Slim Version)
/// Focuses purely on extracting data into a standard journal structure.
pub async fn call_journal_ai(
    input: &str, 
    image_data: Option<(Vec<u8>, &str)>, 
    policy: &str, 
    _tenant_id: &str, 
    _tier: &str
) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY missing".to_string())?;
    let model_name = get_ai_model();

    let mut parts = Vec::new();

    let prompt = format!(
        r#"[Role: Accounting Automation AI]
Extract financial data from the provided raw data/image.
All descriptions and vendor names must be in KOREAN.

[Rules]:
1. Select the best account from the [Standard Chart of Accounts].
2. Output strictly JSON.

[Standard Chart of Accounts]:
- Assets: 현금, 보통예금, 외상매출금, 미수금, 상품, 비품, 차량운반구, 부가가치세대급금, 선급금, 소모품
- Liabilities: 외상매입금, 미지급금, 미지급비용, 부가가치세예수금, 단기차입금, 예수금(급여)
- Equity: 자본금, 이익잉여금
- Revenue: 상품매출, 제품매출, 이자수익, 잡이익
- Expenses: 급여, 퇴직급여, 복리후생비, 임차료, 통신비, 수도광열비, 세금과공과, 감가상각비, 여비교통비, 접대비, 광고선전비, 이자비용, 잡손실, 소모품비, 수선비, 보험료, 지급수수료, 운반비

[Response Format]:
{{
  "date": "YYYY-MM-DD",
  "amount": 0.0,
  "vat": 0.0,
  "entryType": "Revenue | Expense | Asset",
  "description": "Summary in Korean",
  "vendor": "Vendor Name in Korean",
  "accountName": "Chosen Account Name",
  "reasoning": "Brief logic",
  "confidence": "High | Medium | Low"
}}

Raw Data: {}
Policy: {}
"#,
        input, policy
    );

    parts.push(json!({ "text": prompt }));

    if let Some((bytes, mime)) = image_data {
        let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, bytes);
        parts.push(json!({ "inline_data": { "mime_type": mime, "data": base64_data } }));
    }

    let client = reqwest::Client::new();
    let body = json!({
        "contents": [{ "parts": parts }],
        "generationConfig": { "response_mime_type": "application/json" }
    });

    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model_name, api_key))
        .json(&body).send().await.map_err(|e| e.to_string())?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str().ok_or("AI response error")?.to_string();

    let parsed: ParsedTransaction = serde_json::from_str(text.trim_matches('`').trim_start_matches("json")).map_err(|e| e.to_string())?;
    Ok(parsed)
}

pub async fn extract_transaction_from_media(bytes: Vec<u8>, mime: &str) -> Result<ParsedTransaction, String> {
    call_journal_ai("", Some((bytes, mime)), "Receipt Processing", "default", "Pro").await
}
