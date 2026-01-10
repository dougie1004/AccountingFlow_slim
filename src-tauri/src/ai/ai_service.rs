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
 [자산] 보통예금, 현금, 외상매출금, 미수금, 선급금, 가지급금, 상품, 원재료, 재고자산, 비품, 차량운반구, 소프트웨어, 임차보증금
 [부채] 미지급금, 예수금, 외상매입금, 단기차입금, 미지급비용
 [자본] 자본금, 미처분이익잉여금
 [수익/매출] 상품매출, 서비스매출, 이자수익
 [비용/판관비] 급여, 복리후생비(식대/경조사), 여비교통비(택시/출장), 통신비(인터넷/폰), 수도광열비(전기/가스), 세금과공과(협회비/과태료 제외공과금), 임차료, 수선비, 보험료, 접대비(거래처식대/선물), 광고선전비, 소모품비, 지급수수료(이체/세무대리), 운반비(퀵/택배), 차량유지비(주유/주차), 도서인쇄비, 교육훈련비, 연구개발비, 이자비용, 재고자산감모손실, 재고자산평가손실(부인)

 분석 규칙:
 1. **수익(매출) vs 비용**: '판매', '수주', '입금', '수익', '매출' 등 돈이 들어오거나 제품을 판 맥락이면 반드시 'Revenue'로 분류하고 '상품매출' 또는 '서비스매출'을 선택하세요. 절대 '지급수수료'와 혼동하지 마세요.
 2. **계정 세분화**: 1인 사업자도 이해할 수 있도록 description은 구체적으로 적되(예: '11월 사무실 임차료'), accountName은 위 가이드라인의 정식 명칭을 사용하세요.
 3. **금액 및 단위**: "1억원" -> 100000000, "10만원" -> 100000 처럼 한국어 단위를 숫자로 정확히 환산하세요. (매우 중요!)
 4. **결제 수단**: 텍스트나 증빙에서 영수증 형태면 "Card", 계좌이체 언급 시 "Transfer"를 paymentMethod에 지정하세요.
 5. **증반적 계정**: 자본금 납입은 'Equity', 비용은 'Expense', 매출은 'Revenue'로 entryType을 구분하세요.

 예시 1 (자본금 납입):
 입력: "자본금 1억원 납입" -> {{"date": "오늘", "amount": 100000000, "entryType": "Equity", "accountName": "자본금", "description": "설립 자본금 납입"}}

 예시 2 (재고 감모):
 입력: "정기 재고 실사 결과 150만원 손실분 처리" -> {{"date": "오늘", "amount": 1500000, "entryType": "Expense", "accountName": "재고자산감모손실", "description": "재고 실사 차이분 손실 반영"}}

 사용자 입력: {}
 정책: {}
  
 응답 JSON 형식:
 {{
   "date": "YYYY-MM-DD",
   "amount": 100000000,
   "vat": 0,
   "entryType": "Equity",
   "description": "구체적인 거래 요약",
   "vendor": "거래처명",
   "paymentMethod": "Transfer",
   "reasoning": "분석 근거",
   "accountName": "자본금",
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

pub async fn verify_receipt_compliance(
    image_bytes: Vec<u8>,
    image_mime: &str,
    transaction_json: &str,
) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| {
        "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE".to_string()
    });

    let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, image_bytes);
    let mime_type = match image_mime {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        _ => "image/jpeg",
    };

    let prompt = format!(
        r#"당신은 기업 내부 감사관(Internal Auditor)입니다. 
제공된 '법인카드 결제 내역(JSON)'과 '영수증 사진'이 서로 일치하는지, 그리고 '업무 관련성'이 있는지 정밀하게 교차 검증하세요.

[검증 대상 데이터]:
{}

[검증 규칙]:
1. **금액 일치 확인**: 카드 내역의 금액과 영수증의 합계 금액이 1원이라도 다르면 경고하세요.
2. **품목 분석**: 영수증에 '기저귀', '장난감', '주류(지나친 양)', '사치품' 등 업무와 무관해 보이는 품목이 있는지 확인하세요.
3. **시간/장소**: 업무 시간 외(예: 주말, 심야) 거래이거나 유흥업소인 경우 리스크를 높게 책정하세요.

반드시 JSON 형식으로만 응답하세요:
{{
  "confidence": "High/Medium/Low",
  "needsClarification": true/false (업정 부적합 의심 시 true),
  "reasoning": "합계 금액은 일치하나, 영수증 내 'ABC마트 운동화' 품목이 포함되어 있어 사적 사용이 의심됩니다.",
  "clarificationPrompt": "해당 물품의 업무상 필요성을 소명해 주세요."
}}
"#,
        transaction_json
    );

    let client = reqwest::Client::new();
    let body = json!({
        "contents": [{
            "parts": [
                { "text": prompt },
                { "inline_data": { "mime_type": mime_type, "data": base64_data } }
            ]
        }],
        "generationConfig": { "response_mime_type": "application/json" }
    });

    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI 검증 오류: {}", e))?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("응답 분석 실패: {}", e))?;
    let text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI가 검증 결과를 생성하지 못했습니다.")?
        .trim()
        .to_string();

    let compliance_res: serde_json::Value = serde_json::from_str(&text.replace("```json", "").replace("```", ""))
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    // 기존 transaction_json을 기반으로 업데이트된 객체 반환 (실제로는 ParsedTransaction의 일부 필드만 업데이트)
    let mut updated_tx: ParsedTransaction = serde_json::from_str(transaction_json).map_err(|e| e.to_string())?;
    updated_tx.confidence = compliance_res["confidence"].as_str().map(|s| s.to_string());
    updated_tx.needs_clarification = compliance_res["needsClarification"].as_bool().unwrap_or(false);
    updated_tx.reasoning = compliance_res["reasoning"].as_str().unwrap_or("").to_string();
    updated_tx.clarification_prompt = compliance_res["clarificationPrompt"].as_str().map(|s| s.to_string());
    updated_tx.audit_trail.push(format!("[{}] AI AI Inspector 교차 검증 완료", chrono::Local::now().format("%H:%M:%S")));

    Ok(updated_tx)
}
pub async fn consult_compliance_ai(
    user_message: &str,
    current_tx: Option<ParsedTransaction>,
    policy: &str,
) -> Result<crate::core::models::AnalysisResponse, String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| {
        "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE".to_string()
    });

    let tx_context = if let Some(tx) = current_tx {
        format!(
            "현재 전표 상태: [날짜: {:?}, 설명: {:?}, 금액: {:?}, 계정: {:?}, 증빙: {:?}]",
            tx.date, tx.description, tx.amount, tx.account_name, tx.reasoning
        )
    } else {
        "진행 중인 전표 없음".to_string()
    };

    let prompt = format!(
        r#"당신은 회계 법인의 시니어 매니저이자 규정 준수(Compliance) 전문가입니다. 사용자의 질문에 답변하고 최선의 회계 처리를 권고하세요. 
답변은 전문적이며 친절한 한글로 작성하세요.

[사용자 상황]: {}
[회사의 회계 정책]: {}

[질문]: {}

반드시 다음 JSON 형식으로 응답하세요:
{{
  "transaction": null,
  "vendorStatus": "No_Vendor",
  "suggestedVendor": null,
  "complianceReview": {{
    "status": "Safe",
    "message": "사용자 질문에 대한 전문가의 분석 결과 및 권고안을 여기에 작성하세요.",
    "reviewLogs": ["Advisory Mode", "Consultation"]
  }}
}}
"#,
        tx_context, policy, user_message
    );

    let client = reqwest::Client::new();
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "response_mime_type": "application/json" }
    });

    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("상담 API 오류: {}", e))?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("응답 분석 실패: {}", e))?;
    let text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI가 상담 답변을 생성하지 못했습니다.")?
        .replace("```json", "").replace("```", "")
        .trim()
        .to_string();

    let mut res: crate::core::models::AnalysisResponse = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    
    // 이 상담이 consultation 모드임을 표시하기 위해 가상의 필드를 사용하거나, 
    // 기존 transaction을 유지하면서 message만 풍부하게 만듦
    if let Some(rev) = res.compliance_review.as_mut() {
        rev.review_logs.get_or_insert(vec![]).push("Advisory Session".to_string());
    }
    
    Ok(res)
}
