use crate::core::models::ParsedTransaction;
use std::path::Path;
use uuid::Uuid;

pub async fn ingest_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
    let path = Path::new(&file_name);
    let extension = path.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // 1. Generate Source Traceability ID
    let source_id = Uuid::new_v4().to_string();
    let source_info = format!("Source: {} (ID: {})", file_name, source_id);

    println!("[Universal Ingestor] Processing file: {} (Extension: {}, ID: {})", file_name, extension, source_id);

    // 2. Dispatch based on extension
    match extension.as_str() {
        "csv" | "tsv" => {
            println!("[Universal Ingestor] Parsing Robust CSV...");
            let mut results = crate::ai::robust_parser::parse_robust_csv(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            println!("[Universal Ingestor] Completed CSV parsing. Found {} transactions.", results.len());
            Ok(results)
        }
        "xlsx" | "xls" | "xlsm" => {
            println!("[Universal Ingestor] Parsing Excel file...");
            let mut results = crate::ai::excel_parser::parse_excel_file(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            println!("[Universal Ingestor] Completed Excel parsing. Found {} transactions.", results.len());
            Ok(results)
        }
        "txt" => {
            // Unstructure Text -> PII Mask -> AI
            let raw_text = String::from_utf8_lossy(&file_bytes).to_string();
            println!("[Universal Ingestor] Applying PII Guard to Text file (Size: {} bytes)", raw_text.len());
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            println!("[Universal Ingestor] Calling Journal AI for Unstructured Text...");
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&safe_text, None, "Unstructured Data Policy", "default", "Pro").await?;
            ai_res.audit_trail.push(source_info.clone());
            println!("[Universal Ingestor] Completed AI analysis for Text file.");
            Ok(vec![ai_res])
        }
        "hwp" => {
            // HWP Heuristic Extraction -> PII Mask -> AI
            println!("[Universal Ingestor] Extracting text from HWP binary...");
            let raw_text = crate::ai::hwp_parser::extract_text_from_hwp_binary(&file_bytes)?;
            println!("[Universal Ingestor] Applying PII Guard to HWP text (Size: {} chars)", raw_text.len());
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            let prompt_context = format!("HWP Document Content:\n{}", safe_text);
            println!("[Universal Ingestor] Calling Journal AI for HWP content...");
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&prompt_context, None, "HWP Document Policy", "default", "Pro").await?;
            
            ai_res.audit_trail.push(source_info.clone());
            ai_res.reasoning.push_str(" | HWP Text Analysis with PII Guard");
            println!("[Universal Ingestor] Completed AI analysis for HWP file.");
            Ok(vec![ai_res])
        }
        "docx" | "pptx" => {
            // Office XML Text Extraction -> PII Mask -> AI
            println!("[Universal Ingestor] Extracting text from Office file ({})", extension);
            let raw_text = crate::ai::office_parser::extract_text_from_office(file_bytes, &extension)?;
            println!("[Universal Ingestor] Applying PII Guard (Size: {} chars)", raw_text.len());
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            println!("[Universal Ingestor] Calling Journal AI for Office content...");
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&safe_text, None, "Office Document Policy", "default", "Pro").await?;
            
            ai_res.audit_trail.push(source_info.clone());
            ai_res.reasoning.push_str(&format!(" | {} Analysis with PII Guard", extension.to_uppercase()));
            println!("[Universal Ingestor] Completed AI analysis for Office file.");
            Ok(vec![ai_res])
        }
        "pdf" | "jpg" | "jpeg" | "png" | "image" => {
            // Universal Media (Vision) -> AI
            println!("[Universal Ingestor] Sending Media file to Vision AI (Extension: {})", extension);
            let mut ai_res = crate::ai::ai_service::extract_transaction_from_media(file_bytes, &extension).await?;
            
            // Apply Local Rule Engine (Overrides AI if necessary)
            crate::ai::rule_based_classifier::classify_by_rules(&mut ai_res);
            
            ai_res.audit_trail.push(source_info.clone());
            ai_res.reasoning.push_str(" | Vision Analysis + Local Rules");
            println!("[Universal Ingestor] Completed Vision AI analysis with local rule enforcement.");
            Ok(vec![ai_res])
        }
        _ => Err(format!("Unsupported file format: .{}", extension)),
    }
}

fn attach_source_info(transactions: &mut Vec<ParsedTransaction>, source_info: &str) {
    for tx in transactions {
        tx.audit_trail.push(source_info.to_string());
    }
}
