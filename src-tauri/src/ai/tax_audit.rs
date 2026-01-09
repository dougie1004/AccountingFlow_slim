use serde_json::json;

/**
 * AI Tax Audit Service
 * Analyzes tax filing data for potential legal/accounting risks using Gemini.
 */
pub async fn audit_tax_filing(data_summary: &str) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY 환경변수가 설정되지 않았습니다.".to_string())?;

    let prompt = format!(
        "당신은 대한민국 세무 전문가입니다. 다음 회계 데이터를 분석하여 세무 리스크(한도 초과, 증빙 불비, 중복 공제 등)를 요약 보고서 형태로 국문으로 작성하세요. 마크다운 형식을 사용하십시오.\n\n데이터 요약:\n{}",
        data_summary
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&json!({
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }))
        .send()
        .await
        .map_err(|e| format!("API 요청 실패: {}", e))?;

    let json: serde_json::Value = response.json().await.map_err(|e| format!("JSON 파싱 실패: {}", e))?;
    
    let report = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "AI 응답에서 텍스트를 찾을 수 없습니다.".to_string())?
        .to_string();

    Ok(report)
}
