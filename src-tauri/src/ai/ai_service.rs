use crate::core::models::ParsedTransaction;
use serde_json::json;
// use anyhow::{Result, anyhow};

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
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY missing".to_string())?;
    let api_key = api_key.trim().replace('"', ""); 
    let mut model_name = get_ai_model().trim().to_string();

    if !model_name.starts_with("models/") {
        model_name = format!("models/{}", model_name);
    }

    let client = reqwest::Client::new();
    
    // Construct Parts
    let mut parts = vec![json!({ "text": prompt })];
    
    if let Some((bytes, mime)) = media {
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        parts.push(json!({
            "inline_data": {
                "mime_type": mime,
                "data": b64
            }
        }));
    }

    // SKELETON PAYLOAD (GCP Integrity Mode)
    // We use system_instruction to pass the accounting policy/rules
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
    
    // DIAGNOSTIC LOGGING
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("🔎 [GCP Integrity Mode - Journal]");
    println!("→ URL      : https://generativelanguage.googleapis.com/v1beta/...");
    println!("→ Model    : {}", model_name);
    println!("→ API Key  : {}****{}", &api_key[..4], &api_key[api_key.len()-4..]);
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let response = client
        .post(url)
        .json(&body).send().await.map_err(|e| e.to_string())?;

    let status = response.status();
    let body_text = response.text().await.unwrap_or_else(|_| "No body".to_string());

    if !status.is_success() {
        eprintln!("🚨 [Gemini RAW ERROR]");
        eprintln!("Status : {}", status);
        eprintln!("Body   : {}", body_text);
        return Err(format!("AI_SERVER_ERROR_{}: {}", status, body_text));
    }

    let json_res: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| e.to_string())?;
    
    // Safety check for empty candidates
    let candidates = json_res["candidates"].as_array().ok_or("No candidates in AI response".to_string())?;
    if candidates.is_empty() {
        return Err("AI response candidates array is empty".to_string());
    }

    let text = candidates[0]["content"]["parts"][0]["text"]
        .as_str().ok_or("AI response text part missing".to_string())?.to_string();

    // Parse the JSON blocks out of the AI response
    let clean_json = text.trim_matches('`').trim_start_matches("json").trim();
    
    // Enhanced Parsing: Handle both Single Object and Array
    let parsed_json: serde_json::Value = serde_json::from_str(clean_json).map_err(|e| format!("JSON Parsing Error: {}. Raw was: {}", e, clean_json))?;

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
    You are an expert accounting AI. Analyze the attached document (receipt, invoice, or bank statement) and extract the transaction details.
    
    OUTPUT FORMAT INSTRUCTION:
    - If the document contains a SINGLE transaction (e.g. one receipt), output a SINGLE JSON object.
    - If the document contains MULTIPLE transactions (e.g. bank statement, credit card bill, invoice with line items), output a JSON LIST (Array) of objects.

    Expected JSON Schema for each object:
    {
        "date": "YYYY-MM-DD",
        "amount": number (transaction amount),
        "vat": number (tax amount, if 0 write 0),
        "description": "brief description of items/service",
        "vendor": "merchant or counterparty name",
        "accountName": "suggested K-IFRS account name (e.g., 복리후생비, 소모품비, 여비교통비)",
        "entryType": "Expense" (default) or "Revenue" or "Asset",
        "reasoning": "brief explanation of classification",
        "confidence": "High"
    }

    For Korean receipts, map standard Items to accounts:
    - Meals/Coffee -> 복리후생비
    - Taxi/Transport -> 여비교통비
    - Mart/Convenience Store -> 소모품비
    "#;
    
    call_journal_ai("", Some((bytes, mime.to_string())), system_instruction, "default", "Pro").await
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
    
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY missing".to_string())?;
    let api_key = api_key.trim().replace('"', ""); 
    let mut model_name = get_ai_model().trim().to_string();
    if !model_name.starts_with("models/") { model_name = format!("models/{}", model_name); }
    
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
         "system_instruction": {
            "parts": [{ "text": system_instruction }]
        }
    });

    let url = format!("https://generativelanguage.googleapis.com/v1beta/{}:generateContent?key={}", model_name, api_key);
    let res = client.post(url).json(&body).send().await.map_err(|e| e.to_string())?;
    
    let res_json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let text = res_json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("No response")
        .to_string();
        
    Ok(text)
}
