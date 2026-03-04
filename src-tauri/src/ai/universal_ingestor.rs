use crate::core::models::{ParsedTransaction, SystemError};
use crate::ai::ai_service;

pub async fn ingest_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, SystemError> {
    let lower_name = file_name.to_lowercase();
    
    // 1. Detect Media Type
    let mime = if lower_name.ends_with(".jpg") || lower_name.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower_name.ends_with(".png") {
        "image/png"
    } else if lower_name.ends_with(".webp") {
        "image/webp"
    } else if lower_name.ends_with(".pdf") {
        "application/pdf"
    } else if lower_name.ends_with(".csv") {
        "text/plain" // Plain text is safer for AI to read than application/csv
    } else if lower_name.ends_with(".xlsx") || lower_name.ends_with(".xls") {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    } else {
        "application/octet-stream"
    };

    // 2. Special handling for Excel/CSV
    if lower_name.ends_with(".xlsx") || lower_name.ends_with(".xls") {
        match crate::ai::excel_parser::parse_excel_file(file_bytes.clone()) {
            Ok(results) if !results.is_empty() => return Ok(results),
            other => {
                println!("[Universal Ingestor] Excel native parsing yielded nothing or failed: {:?}. Trying AI fallback...", other);
                // Fall through to AI media analysis
            }
        }
    }

    if lower_name.ends_with(".csv") {
        match crate::ai::csv_inference::analyze_csv_to_transactions(file_bytes.clone(), Some(file_name.clone())) {
            Ok(txs) if !txs.is_empty() => return Ok(txs),
            Err(e) if matches!(e, SystemError::EncodingUncertain(_)) => return Err(e),
            other => {
                println!("[Universal Ingestor] CSV native parsing yielded nothing or failed: {:?}. Trying AI fallback...", other);
                // Fall through to AI media analysis
            }
        }
    }

    // Default AI Fallback for everything else or failed native
    if mime.starts_with("image/") || mime == "application/pdf" || lower_name.ends_with(".csv") || lower_name.ends_with(".xlsx") || lower_name.ends_with(".xls") {
        // If it's a text-based format like CSV but native failed, try to pass as text prompt if small enough
        if lower_name.ends_with(".csv") && file_bytes.len() < 100_000 {
            if let Ok(text) = String::from_utf8(file_bytes.clone()) {
                println!("[Universal Ingestor] Passing raw CSV text to AI for analysis...");
                return ai_service::call_journal_ai(
                    &text, 
                    None, 
                    "Extract transaction data from this CSV content. Return JSON list.", 
                    "default", 
                    "Flash", 
                    None
                ).await.map_err(|_| SystemError::Internal);
            }
        }
        return ai_service::extract_transaction_from_media(file_bytes, mime).await.map_err(|_| SystemError::Internal);
    }

    // [New] Support for documents as evidence sources (Drafts, Emails, etc.)
    if lower_name.ends_with(".docx") || lower_name.ends_with(".doc") || lower_name.ends_with(".txt") {
        println!("[Universal Ingestor] Extracting transactional info from document: {}", file_name);
        let text = extract_context_text(file_bytes.clone(), file_name.clone()).await.map_err(|_| SystemError::Internal)?;
        
        // ... (extraction_policy unchanged) ...
        let extraction_policy = r#"
            You are an Expert Accountant. Analyze the document text and extract specific transaction intents, payments, or commitments.
            
            RULES:
            1. Extract Date, Amount, Vendor, and Description.
            2. If it's a draft/plan/contract, set parseStatus to "needConfirm" and isIntent to true.
            3. reasoning should be "기안서/이메일/계약서에서 추출된 비즈니스 의도".
            
            OUTPUT SCHEMA (Must match EXACTLY):
            [{
                "date": "YYYY-MM-DD",
                "amount": number,
                "vat": number,
                "description": "string",
                "vendor": "string",
                "accountName": "string",
                "entryType": "Expense" | "Revenue" | "Capital",
                "reasoning": "string",
                "confidence": "High",
                "parseStatus": "ok" | "needConfirm",
                "isIntent": true
            }]
        "#;

        let mut results = ai_service::call_journal_ai(
            &format!("DOCUMENT CONTENT:\n\n{}", text),
            None,
            extraction_policy,
            "default",
            "Flash",
            None
        ).await.map_err(|_| SystemError::Internal)?;

        // Double enforce isIntent for all results from documents
        for res in &mut results {
            res.is_intent = true;
        }
        return Ok(results);
    }

    Ok(vec![])
}

pub async fn extract_context_text(file_bytes: Vec<u8>, file_name: String) -> Result<String, SystemError> {
    let lower_name = file_name.to_lowercase();
    
    if lower_name.ends_with(".txt") {
        // Use smarter decoding for Korean text files
        let (res, _, errors) = encoding_rs::UTF_8.decode(&file_bytes);
        if errors {
            // Probably EUC-KR
            let (res_euc, _, _) = encoding_rs::EUC_KR.decode(&file_bytes);
            return Ok(res_euc.into_owned());
        }
        return Ok(res.into_owned());
    }

    if lower_name.ends_with(".pdf") || lower_name.ends_with(".docx") || lower_name.ends_with(".doc") {
        // Use AI to extract/summarize text from complex documents
        let mime = if lower_name.ends_with(".pdf") { "application/pdf" } else { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
        
        let prompt = "Extract and summarize all the key text from this document for an accounting audit context. Focus on names, dates, amounts, and rules/policies if present.";
        
        // Treat as media and call AI
        let result = ai_service::call_summarizer_ai(prompt, Some((file_bytes, mime.to_string())), None).await;
        match result {
            Ok(res) => return Ok(format!("[Context from {}]\n{}", file_name, res)),
            Err(e) => {
                eprintln!("[Universal Ingestor] Summarizer failed: {:?}", e);
                return Err(SystemError::ExternalDependency);
            }
        }
    }

    Ok(format!("[File: {}] (지원되지 않는 텍스트 추출 형식입니다)", file_name))
}
