use crate::core::models::ParsedTransaction;
use serde_json::{json, Value};
use once_cell::sync::Lazy;
use std::env;
use std::time::Duration;
use base64::Engine;

static CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .tcp_keepalive(Some(std::time::Duration::from_secs(60)))
        .pool_idle_timeout(Some(std::time::Duration::from_secs(90)))
        .build()
        .unwrap_or_default()
});

fn get_ai_model(tier: &str) -> String {
    let config = super::config::AiConfig::load();
    if tier.eq_ignore_ascii_case("Pro") || tier.eq_ignore_ascii_case("Deep Analysis") {
        return config.model_pro;
    }
    config.model_flash
}

pub async fn call_journal_ai(
    prompt: &str,
    media: Option<(Vec<u8>, String)>,
    policy: &str,
    _tenant_id: &str,
    tier: &str,
    custom_api_key: Option<String>,
) -> Result<Vec<ParsedTransaction>, String> {
    let (api_key, source) = match custom_api_key {
        Some(key) if !key.trim().is_empty() => (key, "Custom (Settings)"),
        _ => {
            let key = env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("VITE_GEMINI_API_KEY"))
                .map_err(|_| "AI API Key missing. Please set it in Settings or .env file.".to_string())?;
            (key, "System (.env)")
        }
    };
    let api_key = api_key.trim().replace('"', ""); 
    
    let mut model_name = get_ai_model(tier).trim().to_string();
    let config = super::config::AiConfig::load();
    let mut url = config.get_url(&model_name, &api_key);
    
    println!("[AI Engine] Calling {} using {} API Key (Len: {})", model_name, source, api_key.len());

    let client = &*CLIENT;
    
    // Construct Parts
    let mut parts = vec![json!({ "text": prompt })];
    
    if let Some((bytes, mime)) = media {
        let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        parts.push(json!({
            "inline_data": {
                "mime_type": mime,
                "data": b64
            }
        }));
    }

    let body = json!({
        "system_instruction": {
            "parts": [{ "text": policy }]
        },
        "contents": [{
            "role": "user",
            "parts": parts
        }]
    });

    let mut last_error = String::new();
    let mut retry_count = 0;
    const MAX_RETRIES: u32 = 2;

    while retry_count <= MAX_RETRIES {
        if retry_count > 0 {
            let wait_time = 2u64.pow(retry_count) * 500;
            println!("[AI Engine] ⏳ Retry {}/{} after {}ms (Status: {})", retry_count, MAX_RETRIES, wait_time, last_error);
            tokio::time::sleep(tokio::time::Duration::from_millis(wait_time)).await;
        }

        let response = client.post(&url).json(&body).send().await.map_err(|e| e.to_string())?;
        let status = response.status();
        let body_text = response.text().await.unwrap_or_else(|_| "No body".to_string());

        if status.is_success() {
            let json_res: Value = serde_json::from_str(&body_text).map_err(|e| format!("JSON Parse Error: {}", e))?;
            let candidates = json_res["candidates"].as_array().ok_or("No candidates in AI response".to_string())?;
            if candidates.is_empty() {
                return Err("AI_BLOCKED_OR_EMPTY: Gemini returned no candidates (check Safety Filters)".to_string());
            }
            
            let text = candidates[0]["content"]["parts"][0]["text"]
                .as_str().ok_or("AI_TEXT_PART_MISSING".to_string())?.to_string();

            // Robust JSON Extraction
            let clean_json = if let Some(start) = text.find("```json") {
                let after_start = &text[start + 7..];
                if let Some(end) = after_start.find("```") {
                    after_start[..end].trim()
                } else {
                    after_start.trim()
                }
            } else if let Some(start) = text.find("```") {
                let after_start = &text[start + 3..];
                if let Some(end) = after_start.find("```") {
                    after_start[..end].trim()
                } else {
                    after_start.trim()
                }
            } else if let Some(start) = text.find('{') {
                let last_end = text.rfind('}').unwrap_or(text.len() - 1);
                &text[start..=last_end]
            } else {
                text.trim()
            };

            let parsed_json: Value = serde_json::from_str(clean_json).map_err(|e| {
                format!("JSON Parsing Error: {}. Raw snippet: {}", e, if clean_json.len() > 100 { &clean_json[..100] } else { clean_json })
            })?;

            if parsed_json.is_array() {
                let list: Vec<ParsedTransaction> = serde_json::from_value(parsed_json).map_err(|e| format!("Array Mapping Error: {}", e))?;
                return Ok(list);
            } else {
                let single: ParsedTransaction = serde_json::from_value(parsed_json).map_err(|e| format!("Object Mapping Error: {}", e))?;
                return Ok(vec![single]);
            }
        }

        last_error = format!("Status: {}, Body: {}", status, body_text);
        
        if status.as_u16() == 429 {
            retry_count += 1;
            if retry_count == 2 && model_name.contains("2.0") {
                println!("[AI Engine] ⚠️ Model {} hit limit. Falling back to gemini-1.5-flash for reliability.", model_name);
                model_name = "gemini-1.5-flash".to_string();
                url = config.get_url(&model_name, &api_key);
            }
            continue;
        }

        eprintln!("🚨 [Gemini RAW ERROR] {}", last_error);
        if body_text.contains("API_KEY_INVALID") || body_text.contains("API key expired") {
            return Err("🔑 [치명적 오류] 구글 정책에 의해 Gemini API 키가 거부되었습니다. 설정에서 결제 상태나 API 키 유효성을 확인해 주세요.".to_string());
        }
        return Err(format!("AI_SERVER_ERROR_{}: {}", status, body_text));
    }

    Err(format!("AI_SERVER_RETRY_EXHAUSTED: {}", last_error))
}

pub async fn extract_transaction_from_media(bytes: Vec<u8>, mime: &str) -> Result<Vec<ParsedTransaction>, String> {
    let system_instruction = r#"
    You are an Expert Accounting Auditor with Vision capabilities.
    
    TASK: Analyze the attached image/PDF and extract transaction data.
    
    COMPLIANCE & VALIDITY RULES:
    1. STRICT IDENTIFICATION: If the image does NOT contain a receipt, tax invoice, bank statement, or similar financial record, return:
       - "description": "NOT_A_FINANCIAL_DOCUMENT"
       - "reasoning": "이 파일은 유효한 회계 증빙(영수증, 세금계산서 등)이 아니며, [무엇인지 설명]으로 파악됩니다."
       - "confidence": "Low"
       - "amount": 0
       - "parseStatus": "error"
    2. SUMMARY MODE (IMPORTANT): For documents containing a list of many small items (e.g., Apartment Management Bills/아파트 관리비, Utility Bills, detailed material lists), do NOT create multiple transaction objects. Instead, return a SINGLE transaction for the TOTAL amount. List the breakdown of categories briefly in the 'reasoning'.
    3. LANGUAGE: Support Korean and English.
    4. MERCHANT: Extract legal name + Business ID (사업자번호: 000-00-00000).
    5. DATE: YYYY-MM-DD.
    6. ACCOUNT: Map to standard Korean accounts.
    
    OUTPUT SCHEMA (Must match EXACTLY):
    {
        "date": "YYYY-MM-DD",
        "amount": number,
        "vat": number,
        "description": "item details",
        "vendor": "merchant name",
        "vendorRegNo": "business id",
        "accountName": "suggested account",
        "entryType": "Expense",
        "reasoning": "detailed reasoning in Korean",
        "confidence": "High" | "Low",
        "parseStatus": "ok" | "warning" | "error"
    }

    Return a JSON List if multiple items detected.
    "#;
    
    call_journal_ai("Analyze this document and extract transaction data.", Some((bytes, mime.to_string())), system_instruction, "default", "Flash", None).await
}

pub async fn perform_ai_audit(transactions: Vec<ParsedTransaction>, context: String) -> Result<Vec<ParsedTransaction>, String> {
    let tx_json = serde_json::to_string_pretty(&transactions).map_err(|e| e.to_string())?;
    
    let prompt = format!(
        r#"
        TRANSACTION DATA:
        {}

        REFERENCE CONTEXT (Guidelines, Drafts, Emails):
        {}
        "#,
        tx_json, context
    );

    let system_instruction = r#"
    You are an Expert Accounting Assistant. Your job is to verify the 'TRANSACTION DATA' against the 'REFERENCE CONTEXT' to ensure accuracy.

    INSTRUCTIONS:
    1. Cross-reference each transaction with the provided context documents.
    2. If a transaction matches an approved Draft/Plan, mark it as "Approved" and mention the matching document in 'reasoning'.
    3. If a transaction does not align with Guidelines (e.g. amount limits, category mismatch), mark 'needsClarification': true and politely note the discrepancy in 'reasoning'.
    4. If there are relevant notes from Emails, append them to 'reasoning' for the user's information.
    5. Return the EXACT SAME JSON list of transactions, updating only 'reasoning', 'needsClarification', and 'parseStatus'.
    
    Maintain a helpful, professional tone. Avoid using the word "Audit" or "Violation".
    
    OUTPUT:
    A single JSON List of the updated transaction objects.
    "#;

    call_journal_ai(&prompt, None, system_instruction, "default", "Pro", None).await
}

pub async fn generic_ai_chat(
    prompt: &str, 
    system_context: Option<String>,
    custom_api_key: Option<String>,
) -> Result<String, String> {
    let mut system_instruction = system_context.unwrap_or_else(|| "You are a helpful AI assistant.".to_string());
    if system_instruction.trim().is_empty() {
        system_instruction = "You are a helpful AI assistant.".to_string();
    }
    
    let (api_key, source) = match custom_api_key {
        Some(key) if !key.trim().is_empty() => (key, "Custom (Settings)"),
        _ => {
            let key = env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("VITE_GEMINI_API_KEY"))
                .map_err(|_| "AI API Key missing. Please set it in Settings or .env file.".to_string())?;
            (key, "System (.env)")
        }
    };
    let api_key = api_key.trim().replace('"', ""); 
    
    let config = super::config::AiConfig::load();
    let mut model_name = config.model_flash.clone();
    let mut url = config.get_url(&model_name, &api_key);

    let client = &*CLIENT;
    let body = json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
         "system_instruction": {
            "parts": [{ "text": system_instruction }]
        }
    });

    let mut last_error = String::new();
    let mut retry_count = 0;
    const MAX_RETRIES: u32 = 2;

    while retry_count <= MAX_RETRIES {
        if retry_count > 0 {
            let wait_time = 2u64.pow(retry_count) * 500;
            println!("[AI Chat] ⏳ Retry {}/{} after {}ms", retry_count, MAX_RETRIES, wait_time);
            tokio::time::sleep(tokio::time::Duration::from_millis(wait_time)).await;
        }

        let res = client.post(&url).json(&body).send().await.map_err(|e| e.to_string())?;
        let status = res.status();
        let res_text = res.text().await.unwrap_or_else(|_| "No body".to_string());

        if status.is_success() {
            let res_json: Value = serde_json::from_str(&res_text).map_err(|e| format!("JSON Parse Error: {}", e))?;
            
            if let Some(candidates) = res_json["candidates"].as_array() {
                if candidates.is_empty() {
                     return Err("Gemini returned no candidates. This usually happens when safety filters block the response.".to_string());
                }

                let text = candidates[0]["content"]["parts"][0]["text"]
                    .as_str()
                    .ok_or_else(|| "AI response text part is missing.".to_string())?
                    .to_string();
                    
                return Ok(text);
            }
            return Err(format!("Malformed Gemini response: {}", res_text));
        }

        last_error = format!("Status: {}, Body: {}", status, res_text);
        
        if status.as_u16() == 429 {
            retry_count += 1;
            if retry_count == 2 && model_name.contains("2.0") {
                println!("[AI Chat] ⚠️ Falling back to stable 1.5-flash due to rate limits.");
                model_name = "gemini-1.5-flash".to_string();
                url = config.get_url(&model_name, &api_key);
            }
            continue;
        }

        eprintln!("🚨 [Gemini Chat RAW ERROR] {}", last_error);
        if res_text.contains("API_KEY_INVALID") || res_text.contains("API key expired") {
            return Err("🔑 API 키가 유효하지 않거나 거부되었습니다. 설정에서 확인해 주세요.".to_string());
        }
        return Err(format!("AI_SERVER_ERROR_{}: {}", status, res_text));
    }

    Err(format!("AI_SERVER_RETRY_EXHAUSTED: {}", last_error))
}
