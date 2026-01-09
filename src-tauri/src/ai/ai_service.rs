use crate::core::models::ParsedTransaction;
use serde_json::json;

pub async fn call_journal_ai(
    input: &str, 
    image_data: Option<(Vec<u8>, &str)>, 
    policy: &str, 
    tenant_id: &str, 
    _tier: &str
) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| {
        "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE".to_string()
    });

    let mut parts = Vec::new();

    // 1. 프롬프트 구성
    let prompt = format!(
        r#"당신은 숙련된 공인회계사(KICPA)이자 SME 전문 세무 조력자입니다. 사용자의 텍스트 입력과 증빙을 분석하여 '세무 신고'가 가능한 수준의 정교한 전표를 생성하세요.

 핵심 계정과목 가이드라인 (accountName에 반드시 사용):
 [자산] 보통예금, 현금, 외상매출금, 미수금, 선급금, 가지급금, 상품, 비품, 차량운반구, 소프트웨어, 임차보증금
 [부채] 미지급금, 예수금, 외상매입금, 단기차입금, 미지급비용
 [자본] 자본금, 미처분이익잉여금
 [수익] 상품매출, 서비스매출, 이자수익
 [비용/판관비] 급여, 복리후생비(식대/경조사), 여비교통비(택시/출장), 통신비(인터넷/폰), 수도광열비(전기/가스), 세금과공과(협회비/과태료 제외공과금), 임차료, 수선비, 보험료, 접대비(거래처식대/선물), 광고선전비, 소모품비, 지급수수료(이체/세무대리), 운반비(퀵/택배), 차량유지비(주유/주차), 도서인쇄비, 교육훈련비, 연구개발비, 이자비용

 분석 규칙:
 1. **계정 세분화**: 1인 사업자도 이해할 수 있도록 description은 구체적으로 적되(예: '11월 사무실 임차료'), accountName은 위 가이드라인의 정식 명칭을 사용하세요.
 2. **금액 및 단위**: "10만원" -> 100000 처럼 한국어 단위를 숫자로 정확히 환산하세요.
 3. **결제 수단**: 텍스트나 증빙에서 영수증 형태면 "Card", 계좌이체 언급 시 "Transfer"를 paymentMethod에 지정하세요.
 4. **증빙 교차 검증**: 이미지 속 날짜, 금액, 사업자번호가 텍스트와 다르면 reasoning에 명시하고 needsClarification을 true로 설정하세요.

 사용자 입력: {}
 정책: {}
  
 응답 JSON 형식:
 {{
   "date": "YYYY-MM-DD",
   "amount": 100000,
   "vat": 0,
   "entryType": "Expense",
   "description": "구체적인 거래 요약 (예: 점심 식대 - 순희소반)",
   "vendor": "거래처명",
   "paymentMethod": "Card",
   "reasoning": "분석 근거",
   "accountName": "복리후생비",
   "needsClarification": false,
   "confidence": "High"
 }}
"#,
        input, policy
    );

    parts.push(json!({ "text": prompt }));

    // 2. 이미지 데이터가 있으면 파트에 추가
    if let Some((bytes, mime)) = image_data {
        let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, bytes);
        let mime_type = match mime {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            _ => "image/jpeg",
        };
        parts.push(json!({ "inline_data": { "mime_type": mime_type, "data": base64_data } }));
    }

    let client = reqwest::Client::new();
    let body = json!({
        "contents": [{ "parts": parts }],
        "generationConfig": { "response_mime_type": "application/json" }
    });

    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {}", e))?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("응답 파싱 오류: {}", e))?;
    
    if let Some(error) = json_res.get("error") {
        // API 에러 발생 시 Fallback
        let mut fallback_tx = ParsedTransaction::default();
        fallback_tx.description = Some(input.to_string());
        crate::ai::rule_based_classifier::classify_by_rules(&mut fallback_tx);
        fallback_tx.audit_trail.push(format!("[{}] AI API 에러 - 규칙 기반 분류 사용: {}", 
            chrono::Local::now().format("%H:%M:%S"), error["message"]));
        return Ok(fallback_tx);
    }

    let mut text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI 응답 데이터 오류")?
        .to_string();

    // JSON 추출 강화
    text = text.replace("```json", "").replace("```", "").trim().to_string();
    
    // JSON 시작/끝 찾기
    if let Some(start) = text.find('{') {
        if let Some(end) = text.rfind('}') {
            text = text[start..=end].to_string();
        }
    }

    let mut parsed: ParsedTransaction = match serde_json::from_str(&text) {
        Ok(p) => p,
        Err(e) => {
            // JSON 파싱 실패 시 Fallback
            let mut fallback_tx = ParsedTransaction::default();
            fallback_tx.description = Some(input.to_string());
            crate::ai::rule_based_classifier::classify_by_rules(&mut fallback_tx);
            fallback_tx.audit_trail.push(format!("[{}] JSON 파싱 실패 ({}) - 규칙 기반 분류 사용", 
                chrono::Local::now().format("%H:%M:%S"), e));
            return Ok(fallback_tx);
        }
    };

    parsed.audit_trail.push(format!("[{}] Gemini 2.0 Flash 분석 완료", chrono::Local::now().format("%H:%M:%S")));

    // STEP 3: 사용량 기록
    crate::core::quota_manager::QUOTA_MANAGER.record_usage(tenant_id, 0.00001);

    // STEP 4: 캐시 저장
    crate::ai::ai_cache::AI_CACHE.set(input, policy, parsed.clone());

    Ok(parsed)
}

pub async fn extract_transaction_from_media(bytes: Vec<u8>, mime: &str) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| {
        "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE".to_string()
    });

    // Base64 인코딩
    let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, bytes);
    let mime_type = match mime {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "pdf" => "application/pdf",
        _ => "image/png",
    };

    let prompt = r#"당신은 전문 회계 AI 분석가입니다. 제공된 이미지(영수증, 고지서, 인보이스)를 정밀 분석하여 JSON 형식으로 추출하세요.

특히 '아파트 관리비 고지서'와 같은 복잡한 표 구조인 경우 다음을 준수하세요:
1. **최종 납부 금액**: 표 하단의 '합계' 또는 '당월 부과액'을 찾아 amount로 설정하세요. (전월 금액이나 증감액과 혼동하지 마세요)
2. **날짜**: 고지서의 부과 년월 또는 납기일을 찾아 YYYY-MM-DD 형식으로 기록하세요.
3. **거래처**: 아파트 관리사무소 또는 관리비 수납처를 vendor로 설정하세요.
4. **계정과목**: 관리비 고지서라면 accountName을 "관리비" (또는 세부 항목에 따라 수도광열비 등)로 설정하세요.

JSON 응답 형식:
{
  "date": "YYYY-MM-DD",
  "amount": 0,
  "vat": 0,
  "entryType": "Expense",
  "description": "설명 (예: 2025년 11월분 관리비)",
  "vendor": "거래처명",
  "reasoning": "추출 근거 (어느 위치의 어떤 값을 읽었는지)",
  "accountName": "계정과목",
  "needsClarification": false,
  "isConsultation": false,
  "confidence": "High"
}"#;

    let client = reqwest::Client::new();
    let body = json!({
        "contents": [{
            "parts": [
                { "text": prompt },
                { "inline_data": { "mime_type": mime_type, "data": base64_data } }
            ]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    });

    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI 시각 분석 오류: {}", e))?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("응답 분석 실패: {}", e))?;
    
    let mut text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI가 이미지를 해석하지 못했습니다.")?
        .trim()
        .to_string();

    // JSON 추출 강화
    text = text.replace("```json", "").replace("```", "").trim().to_string();
    
    // JSON 시작/끝 찾기
    if let Some(start) = text.find('{') {
        if let Some(end) = text.rfind('}') {
            text = text[start..=end].to_string();
        }
    }

    let mut parsed: ParsedTransaction = serde_json::from_str(&text)
        .map_err(|e| format!("JSON 변환 실패: {} | 원문: {}", e, text))?;

    parsed.audit_trail.push(format!("[{}] Gemini 2.0 Flash 시각 분석 완료", chrono::Local::now().format("%H:%M:%S")));

    // 사용량 기록
    crate::core::quota_manager::QUOTA_MANAGER.record_usage("default", 0.00002);

    Ok(parsed)
}
