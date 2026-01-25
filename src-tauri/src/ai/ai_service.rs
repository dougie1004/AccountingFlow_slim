use crate::core::models::ParsedTransaction;
use serde_json::json;

// [Antigravity] Centralized Model Configuration
fn get_ai_model() -> String {
    std::env::var("AI_MODEL_NAME").unwrap_or_else(|_| "gemini-2.0-flash-exp".to_string())
}

pub async fn call_journal_ai(
    input: &str, 
    image_data: Option<(Vec<u8>, &str)>, 
    policy: &str, 
    tenant_id: &str, 
    _tier: &str
) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;
    let model_name = get_ai_model();

    let mut parts = Vec::new();

    // 1. 프롬프트 구성 (Senior AI CFO Engine)
    let prompt = format!(
        r#"[Role: Senior AI CFO & Internal Auditor]

1. 핵심 임무 (Core Mission): 너는 단순한 텍스트 분류기가 아니다. 너는 한국 내수 기업의 회계 처리를 담당하는 전문 AI CFO다. 모든 데이터는 반드시 '한국어'로 요약하고 분류하라.

2. 한국어 지원 원칙 (Korean Language Policy):
   - **모든 description(설명)과 vendor(거래처) 정보는 반드시 한국어로 출력하라.**
   - 원문이 영어더라도 한국 기업 실무에 맞게 번역하여 요약하라. (예: "Purchased groceries" -> "식재료 및 생필품 구매")

3. 고지서 및 내역서 처리 특약 (Billing & Invoice Policy):
   - **표 형태의 고지서(관리비, 유합전화 등)가 들어오면 개별 항목(예: 일반관리비, 세대전기료)에 현혹되지 마라.**
   - 반드시 표 최하단의 **'합계', '계', 'Grand Total', '납기내 금액'** 등 최종 청구 금액을 'amount'로 추출하라.

4. 계정과목 필터링 룰 (Strict Category Policy):
   - **'일반관리비' 라는 계정명을 절대 사용하지 마라.** 대신 실무 정책에 따라 '임차료'로 통합하라.
   - **'하나로마트', '노브랜드', '이마트' 등 마트 거래는 '소모품비'로 분류하라.**

5. 다각도 분석 프레임워크 (Analytical Framework):
   - [Economic Substance] -> [Double-Entry Connection] -> [Risk Detection]

[응답 형식]
반드시 다음 JSON 형식으로만 응답해야 합니다 (Markdown 없이 JSON만 출력):
{{
  "date": "YYYY-MM-DD",
  "amount": 0.0,
  "vat": 0.0,
  "entryType": "Revenue | Expense | Asset | Liability | Equity",
  "description": "거래 요약 (반드시 한국어로 작성)",
  "vendor": "거래처명 (한국어 권장)",
  "accountName": "최종 계정과목 (예: 소모품비, 임차료, 보통예금)",
  "reasoning": "[CoT] 분석 근거",
  "needsClarification": false,
  "confidence": "High | Medium | Low"
}}

분석 대상 Raw Data: {}
회계 정책 컨텍스트: {}
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

    println!("[AI Service] Sending request to {} (Input length: {})", model_name, input.len());
    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model_name, api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            println!("[AI Service] Network error: {}", e);
            format!("네트워크 오류: {}", e)
        })?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("응답 파싱 오류: {}", e))?;
    
    if let Some(error) = json_res.get("error") {
        println!("[AI Service] API Error received: {}", error["message"]);
        return Err(format!("AI 모델 설정 확인 필요 ({}): {}", model_name, error["message"]));
    }

    let mut text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI 응답 데이터 오류")?
        .to_string();

    // JSON 추출 강화 (Brace Counting Method)
    text = text.replace("```json", "").replace("```", "").trim().to_string();
    
    // Find the confirmed JSON block by counting braces
    if let Some(start) = text.find('{') {
        let mut balance = 0;
        let mut end_idx = start;
        let chars: Vec<char> = text.chars().collect();
        
        for i in start..chars.len() {
            if chars[i] == '{' {
                balance += 1;
            } else if chars[i] == '}' {
                balance -= 1;
            }
            
            if balance == 0 {
                end_idx = i;
                break;
            }
        }
        
        if end_idx > start {
            text = chars[start..=end_idx].iter().collect();
        }
    }

    let mut parsed: ParsedTransaction = match serde_json::from_str(&text) {
        Ok(p) => p,
        Err(e) => {
            // JSON 파싱 실패 시 Strict Error
            return Err(format!("AI 응답 형식 오류 (모델: {}): {}", model_name, e));
        }
    };

    parsed.audit_trail.push(format!("[{}] {} (Advanced) 분석 완료", chrono::Local::now().format("%H:%M:%S"), model_name));
    println!("[AI Service] Successfully parsed AI response for: {}", parsed.description.as_deref().unwrap_or("Unknown"));

    // STEP 3: 사용량 기록
    crate::core::quota_manager::QUOTA_MANAGER.record_usage(tenant_id, 0.00001);

    // STEP 4: 캐시 저장
    crate::ai::ai_cache::AI_CACHE.set(input, policy, parsed.clone());

    Ok(parsed)
}

pub async fn extract_transaction_from_media(bytes: Vec<u8>, mime: &str) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;
    let model_name = get_ai_model();

    // Base64 인코딩
    let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, bytes);
    let mime_type = match mime {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "pdf" => "application/pdf",
        _ => "image/png",
    };

    let prompt = r#"[Role: Senior AI CFO & Vision Expert]
당신은 대한민국 기업의 회계 처리를 담당하는 전문 AI CFO입니다. 제공된 이미지를 분석하여 회계 데이터를 JSON으로 추출하세요.

1. 한국어 지원 원칙 (Strict Korean Policy):
   - **모든 description(거래 요약)과 vendor(거래처) 정보는 반드시 한국어로 작성하십시오.**
   - 영문 영수증이더라도 한국 기업 실무에 맞게 번역하여 요약하십시오. (예: "Groceries" -> "탕비실 물품 구매")

2. 고지서 합계 금액 식별 (Billing Summary Rule):
   - 표 형태의 고지서(관리비 등)에서 개별 항목이 아닌, 최하단의 '합계', '납기내 금액' 등 최종 지불액을 추출하십시오.
   - 계정과목은 개별 내역과 상관없이 '임차료'(관리비의 경우)로 통합하십시오.
   - **'일반관리비' 라는 계정명을 절대 사용하지 마십시오.**

3. 날짜 형식 (Date Format):
   - 반드시 'YYYY-MM-DD' 형식을 지키십시오. 연도가 없으면 2026년을 사용하십시오.

JSON 응답 형식:
{
  "date": "YYYY-MM-DD",
  "amount": 0,
  "vat": 0,
  "entryType": "Expense | Revenue | Asset",
  "description": "한국어로 요약된 거래 내용",
  "vendor": "한국어로 작성된 거래처명",
  "reasoning": "[Vision Analysis] 분석 근거",
  "accountName": "최종 확정된 계정과목",
  "confidence": "High | Medium | Low"
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

    println!("[AI Service] Sending Media (Vision) request to {} (Mime: {})", model_name, mime_type);
    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model_name, api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            println!("[AI Service] Vision AI error: {}", e);
            format!("AI 시각 분석 오류 (네트워크): {}", e)
        })?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| format!("AI 응답 분석 실패 (JSON): {}", e))?;
    
    // 에러 상세 메시지 확인
    if let Some(err) = json_res.get("error") {
        return Err(format!("Gemini API Error ({}): {}", model_name, err["message"].as_str().unwrap_or("Unknown")));
    }

    let candidates = json_res.get("candidates").and_then(|c| c.as_array());
    if candidates.is_none() || candidates.unwrap().is_empty() {
        return Err(format!("AI가 파일로부터 데이터를 추출하지 못했습니다. (Response: {:?})", json_res));
    }

    let mut text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or(format!("AI 응답 데이터에 텍스트가 없습니다. (Raw: {:?})", json_res))?
        .trim()
        .to_string();

    // JSON 추출 강화 (Brace Counting Method)
    text = text.replace("```json", "").replace("```", "").trim().to_string();
    
    // Find the confirmed JSON block by counting braces
    if let Some(start) = text.find('{') {
        let mut balance = 0;
        let mut end_idx = start;
        let chars: Vec<char> = text.chars().collect();
        
        for i in start..chars.len() {
            if chars[i] == '{' {
                balance += 1;
            } else if chars[i] == '}' {
                balance -= 1;
            }
            
            if balance == 0 {
                end_idx = i;
                // Double check if this is the outermost closing brace by checking if we are back to 0 from 1
                // Wait, logic: start with 0. 
                // i=start ('{') -> balance=1.
                // ...
                // i=end ('}') -> balance=0.
                // We stop here.
                break;
            }
        }
        
        if end_idx > start {
            text = chars[start..=end_idx].iter().collect();
        }
    }

    let mut parsed: ParsedTransaction = serde_json::from_str(&text)
        .map_err(|e| format!("JSON 변환 실패: {} | 원문: {}", e, text))?;

    parsed.audit_trail.push(format!("[{}] {} (Vision) 시각 분석 완료", chrono::Local::now().format("%H:%M:%S"), model_name));

    // 사용량 기록
    crate::core::quota_manager::QUOTA_MANAGER.record_usage("default", 0.00002);

    Ok(parsed)
}

pub async fn verify_receipt_compliance(
    image_bytes: Vec<u8>,
    image_mime: &str,
    transaction_json: &str,
) -> Result<ParsedTransaction, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;
    let model_name = get_ai_model();

    let base64_data = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, image_bytes);
    let mime_type = match image_mime {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        _ => "image/jpeg",
    };

    let prompt = format!(
        r#"당신은 지능형 회계 데이터 검증 AI입니다. 
제공된 '결제 내역(JSON)'과 '영수증 사진'이 서로 일치하는지, 그리고 회계 원칙에 부합하는지 정밀하게 교차 검증하세요.

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
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model_name, api_key))
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
    updated_tx.audit_trail.push(format!("[{}] AI 회계사 영수증 교차 검증 완료 ({})", chrono::Local::now().format("%H:%M:%S"), model_name));

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
    let model_name = get_ai_model();

    let tx_context = if let Some(tx) = current_tx {
        format!(
            "현재 전표 상태: [날짜: {}, 설명: {}, 금액: {}, 계정: {}, 증빙: {}]",
            tx.date.as_deref().unwrap_or("N/A"),
            tx.description.as_deref().unwrap_or("N/A"),
            tx.amount,
            tx.account_name.as_deref().unwrap_or("미지정"),
            tx.reasoning
        )
    } else {
        "진행 중인 전표 없음".to_string()
    };

    let prompt = format!(
        r#"당신은 숙련된 회계 전문가이자 기업 경영 컨설턴트입니다. 사용자의 회계/세무 관련 질문에 답변하고 최선의 회계 처리를 제안하세요. 
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
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model_name, api_key))
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
