use crate::core::models::{ParsedTransaction, SystemError};
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
) -> Result<Vec<ParsedTransaction>, SystemError> {
    let (api_key, source) = match custom_api_key {
        Some(key) if !key.trim().is_empty() => (key, "Custom (Settings)"),
        _ => {
            let key = env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("VITE_GEMINI_API_KEY"))
                .map_err(|_| { eprintln!("[AI] API Key missing in environment."); SystemError::AuthError })?;
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

        let response = client.post(&url).json(&body).send().await.map_err(|_| SystemError::ExternalDependency)?;
        let status = response.status();
        let body_text = response.text().await.unwrap_or_else(|_| "No body".to_string());

        if status.is_success() {
            let json_res: Value = serde_json::from_str(&body_text).map_err(|_| SystemError::ExternalDependency)?;
            let candidates = json_res["candidates"].as_array().ok_or(SystemError::ExternalDependency)?;
            if candidates.is_empty() {
                return Err(SystemError::ExternalDependency);
            }
            
            let text = candidates[0]["content"]["parts"][0]["text"]
                .as_str().ok_or(SystemError::ExternalDependency)?.to_string();

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

            let parsed_json: Value = serde_json::from_str(clean_json).map_err(|_| SystemError::ExternalDependency)?;

            if parsed_json.is_array() {
                let list: Vec<ParsedTransaction> = serde_json::from_value(parsed_json).map_err(|_| SystemError::ExternalDependency)?;
                return Ok(list);
            } else {
                let single: ParsedTransaction = serde_json::from_value(parsed_json).map_err(|_| SystemError::ExternalDependency)?;
                return Ok(vec![single]);
            }
        }

        last_error = format!("Status: {}, Body: {}", status, body_text);
        
        if status.as_u16() == 429 {
            retry_count += 1;
            if retry_count == 2 && model_name.contains("2.0") {
                println!("[AI Engine] ⚠️ Model {} hit limit. Retrying with baseline model for reliability.", model_name);
                model_name = "gemini-2.0-flash".to_string();
                url = config.get_url(&model_name, &api_key);
            }
            continue;
        }

        if body_text.contains("API_KEY_INVALID") || body_text.contains("API key expired") {
            eprintln!("[AI] API Key Invalid or Expired: {}", body_text);
            return Err(SystemError::AuthError);
        }
        return Err({ eprintln!("[AI Service Error] {} - Body: {}", status, body_text); SystemError::ExternalDependency });
    }

    Err({ eprintln!("[AI Retry Exhausted] {}", last_error); SystemError::ExternalDependency })
}

pub async fn extract_transaction_from_media(bytes: Vec<u8>, mime: &str) -> Result<Vec<ParsedTransaction>, SystemError> {
    let system_instruction = r#"
    You are an Expert Accounting Auditor with Vision capabilities.
    
    TASK: Analyze the attached image/PDF and extract transaction data.
    
    COMPLIANCE & VALIDITY RULES:
    1. INTENT-BASED EXTRACTION: If the document is a draft (기안문), email, or contract (계약서), check if it contains specific financial intent (e.g., "Amount: 1,000,000 won to be paid on 2026-02-27"). If such details exist, extract them as a transaction.
       - Set "parseStatus": "needConfirm"
       - In "reasoning", clearly state that this is extracted from a draft/contract intent.
    2. STRICT REJECTION: ONLY return "description": "NOT_A_FINANCIAL_DOCUMENT" if the file is a generic policy manual, a blank template, or a document with absolutely NO mention of specific currency amounts or transaction dates.
    3. SUMMARY MODE (IMPORTANT): For documents containing a list of many small items (e.g., Apartment Management Bills, detailed material lists), return a SINGLE transaction for the TOTAL amount.
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

pub async fn perform_ai_audit(transactions: Vec<ParsedTransaction>, context: String) -> Result<Vec<ParsedTransaction>, SystemError> {
    let tx_json = serde_json::to_string_pretty(&transactions).map_err(|e| { eprintln!("JSON Serialization Error: {}", e); SystemError::Internal })?;
    
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
    You are the 'Financial Integrity Master Bridge'. Your mission is to reconcile TRANSACTION DATA with CORPORATE GUIDELINES and BUSINESS INTENT (Contracts/Drafts).
    
    CRITICAL RECONCILIATION LOGIC (KOREA TAX CONTEXT):
    1. PERFORM A 'TAX-AWARE 3-WAY MATCH':
       - If a Contract/Draft says "VAT 별도" (VAT Separate/Excluded), the ACTUAL transaction amount SHOULD be [Contract Amount * 1.1].
       - Example: 50,000,000 (Contract) + "VAT 별도" == 55,000,000 (Actual CSV) -> This is a PERFECT MATCH.
       - Do NOT flag this as a discrepancy. Label it as [INTEGRITY_VERIFIED].
    
    2. LABEL EACH TRANSACTION IN 'reasoning' (KOREAN):
       - [INTEGRITY_VERIFIED]: Plan and Actual match (including tax logic). Reason: '계약 금액(VAT 별도)과 실제 집행액이 무결하게 일치함'.
       - [PLAN_VS_ACTUAL_DISCREPANCY]: Truly different amounts after tax adjustment.
       - [POLICY_VIOLATION]: Spent amount exceeds Corporate Rules limit.
       - [CONTEXT_MISSING]: Actual expense found without any matching Contract/Plan.
    
    3. STATUS UPDATES:
       - Set 'needsClarification': true ONLY for true discrepancies or violations.
       - Set 'parseStatus': 'ok' if [INTEGRITY_VERIFIED].
    
    Tone: Sophisticated Financial Auditor. Accuracy over Suspicion.
    
    OUTPUT:
    JSON list of updated transactions.
    "#;

    call_journal_ai(&prompt, None, system_instruction, "default", "Pro", None).await
}

pub async fn generic_ai_chat(
    prompt: &str, 
    system_context: Option<String>,
    custom_api_key: Option<String>,
) -> Result<String, SystemError> {
    let mut system_instruction = system_context.unwrap_or_else(|| "You are a helpful AI assistant.".to_string());
    if system_instruction.trim().is_empty() {
        system_instruction = "You are a helpful AI assistant.".to_string();
    }
    
    let (api_key, source) = match custom_api_key {
        Some(key) if !key.trim().is_empty() => (key, "Custom (Settings)"),
        _ => {
            let key = env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("VITE_GEMINI_API_KEY"))
                .map_err(|_| SystemError::AuthError)?;
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

        let res = client.post(&url).json(&body).send().await.map_err(|_| SystemError::ExternalDependency)?;
        let status = res.status();
        let res_text = res.text().await.unwrap_or_else(|_| "No body".to_string());

        if status.is_success() {
            let res_json: Value = serde_json::from_str(&res_text).map_err(|_| SystemError::ExternalDependency)?;
            
            if let Some(candidates) = res_json["candidates"].as_array() {
                if candidates.is_empty() {
                     return Err(SystemError::ExternalDependency);
                }

                let text = candidates[0]["content"]["parts"][0]["text"]
                    .as_str()
                    .ok_or(SystemError::ExternalDependency)?
                    .to_string();
                    
                return Ok(text);
            }
            return Err(SystemError::ExternalDependency);
        }

        last_error = format!("Status: {}, Body: {}", status, res_text);
        
        if status.as_u16() == 429 {
            retry_count += 1;
            if retry_count == 2 && model_name.contains("2.0") {
                println!("[AI Chat] ⚠️ Falling back to stable 2.0-flash due to rate limits.");
                model_name = "gemini-2.0-flash".to_string();
                url = config.get_url(&model_name, &api_key);
            }
            continue;
        }

        if res_text.contains("API_KEY_INVALID") || res_text.contains("API key expired") {
            eprintln!("[AI Chat] API Key Authentication Failed.");
            return Err(SystemError::AuthError);
        }
        return Err({ eprintln!("[AI Chat Server Error] {} - Body: {}", status, res_text); SystemError::ExternalDependency });
    }

    Err({ eprintln!("[AI Chat Retry Exhausted] {}", last_error); SystemError::ExternalDependency })
}
pub async fn call_summarizer_ai(
    prompt: &str,
    media: Option<(Vec<u8>, String)>,
    custom_api_key: Option<String>,
) -> Result<String, SystemError> {
    let api_key = match custom_api_key {
        Some(key) if !key.trim().is_empty() => key,
        _ => {
            env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("VITE_GEMINI_API_KEY"))
                .map_err(|_| { eprintln!("[AI Summarizer] API Key missing."); SystemError::AuthError })?
        }
    };
    let api_key = api_key.trim().replace('"', ""); 
    
    let config = super::config::AiConfig::load();
    let url = config.get_url(&config.model_flash, &api_key);
    
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
        "contents": [{
            "role": "user",
            "parts": parts
        }]
    });

    let client = &*CLIENT;
    let response = client.post(&url).json(&body).send().await.map_err(|e| { eprintln!("AI Network Error: {}", e); SystemError::ExternalDependency })?;
    let status = response.status();
    let body_text = response.text().await.unwrap_or_default();
    
    if !status.is_success() {
        return Err({ eprintln!("AI Server Error ({}): {}", status, body_text); SystemError::ExternalDependency });
    }

    let json_res: Value = serde_json::from_str(&body_text).map_err(|e| { eprintln!("JSON Parse Error: {}", e); SystemError::ExternalDependency })?;
    let candidates = json_res["candidates"].as_array().ok_or_else(|| { eprintln!("AI returned no candidates"); SystemError::ExternalDependency })?;
    
    if candidates.is_empty() {
        return Err({ eprintln!("AI returned empty candidates list"); SystemError::ExternalDependency });
    }

    let text = candidates[0]["content"]["parts"][0]["text"]
        .as_str().ok_or_else(|| { eprintln!("AI response text part is missing"); SystemError::ExternalDependency })?;

    Ok(text.to_string())
}
