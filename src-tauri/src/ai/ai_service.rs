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

fn get_ai_model() -> String {
    // Try GEMINI_MODEL first (latest recommendation), fallback to AI_MODEL_NAME
    std::env::var("GEMINI_MODEL")
        .or_else(|_| std::env::var("AI_MODEL_NAME"))
        .unwrap_or_else(|_| "gemini-2.0-flash".to_string())
}

/// GCP INTEGRITY MODE: Skeleton Request for Journal AI
pub async fn call_journal_ai(
    prompt: &str,
    media: Option<(Vec<u8>, String)>,
    policy: &str,
    _tenant_id: &str,
    _tier: &str,
) -> Result<Vec<ParsedTransaction>, String> {
    let api_key = env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY missing".to_string())?;
    let api_key = api_key.trim().replace('"', ""); 
    let mut model_name = get_ai_model().trim().to_string();

    if !model_name.starts_with("models/") {
        model_name = format!("models/{}", model_name);
    }

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

    // SKELETON PAYLOAD (GCP Integrity Mode)
    let body = json!({
        "system_instruction": {
            "parts": [{ "text": policy }]
        },
        "contents": [{
            "role": "user",
            "parts": parts
        }]
    });

    let url = format!("https://generativelanguage.googleapis.com/v1beta/{}:generateContent?key={}", model_name, api_key);
    
    let response = client
        .post(url)
        .json(&body).send().await.map_err(|e| e.to_string())?;

    let status = response.status();
    let body_text = response.text().await.unwrap_or_else(|_| "No body".to_string());

    if !status.is_success() {
        eprintln!("🚨 [Gemini RAW ERROR] Status: {}, Body: {}", status, body_text);
        return Err(format!("AI_SERVER_ERROR_{}: {}", status, body_text));
    }

    let json_res: Value = serde_json::from_str(&body_text).map_err(|e| {
        eprintln!("🚨 [Gemini JSON Error] {}", e);
        format!("AI_RESPONSE_PARSE_ERROR: {}", e)
    })?;
    
    let candidates = json_res["candidates"].as_array().ok_or("No candidates in AI response".to_string())?;
    if candidates.is_empty() {
        return Err("AI_BLOCKED_OR_EMPTY: Gemini returned no candidates (check Safety Filters)".to_string());
    }

    let text = candidates[0]["content"]["parts"][0]["text"]
        .as_str().ok_or("AI_TEXT_PART_MISSING".to_string())?.to_string();

    // Robust JSON Extraction: Find the content between ```json and ``` or just the first { and last }
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
    
    println!("🔎 [AI Response Content] length: {}", clean_json.len());

    let parsed_json: Value = serde_json::from_str(clean_json).map_err(|e| {
        eprintln!("🚨 [JSON Clean Error] Original: {}", text);
        format!("JSON Parsing Error: {}. Raw snippet: {}", e, if clean_json.len() > 100 { &clean_json[..100] } else { clean_json })
    })?;

    if parsed_json.is_array() {
        let list: Vec<ParsedTransaction> = serde_json::from_value(parsed_json).map_err(|e| format!("Array Mapping Error: {}", e))?;
        Ok(list)
    } else {
        let single: ParsedTransaction = serde_json::from_value(parsed_json).map_err(|e| format!("Object Mapping Error: {}", e))?;
        Ok(vec![single])
    }
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
    
    call_journal_ai("Analyze this document and extract transaction data.", Some((bytes, mime.to_string())), system_instruction, "default", "Pro").await
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

    call_journal_ai(&prompt, None, system_instruction, "default", "Pro").await
}

pub async fn generic_ai_chat(prompt: &str, system_context: Option<String>) -> Result<String, String> {
    let system_instruction = system_context.unwrap_or_else(|| "You are a helpful AI assistant.".to_string());
    
    let api_key = env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY missing".to_string())?;
    let api_key = api_key.trim().replace('"', ""); 
    let mut model_name = get_ai_model().trim().to_string();
    if !model_name.starts_with("models/") { model_name = format!("models/{}", model_name); }
    
    let client = &*CLIENT;
    let body = json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
         "system_instruction": {
            "parts": [{ "text": system_instruction }]
        }
    });

    let url = format!("https://generativelanguage.googleapis.com/v1beta/{}:generateContent?key={}", model_name, api_key);
    let res = client.post(url).json(&body).send().await.map_err(|e| e.to_string())?;
    
    let res_json: Value = res.json().await.map_err(|e| e.to_string())?;
    let text = res_json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("No response")
        .to_string();
        
    Ok(text)
}
