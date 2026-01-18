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

    // 2. Dispatch based on extension
    match extension.as_str() {
        "csv" | "tsv" => {
            let mut results = crate::ai::robust_parser::parse_robust_csv(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            Ok(results)
        }
        "xlsx" | "xls" | "xlsm" => {
            let mut results = crate::ai::excel_parser::parse_excel_file(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            Ok(results)
        }
        "txt" => {
            // Unstructure Text -> PII Mask -> AI
            let raw_text = String::from_utf8_lossy(&file_bytes).to_string();
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&safe_text, None, "Unstructured Data Policy", "default", "Pro").await?;
            ai_res.audit_trail.push(source_info);
            Ok(vec![ai_res])
        }
        "hwp" => {
            // HWP Heuristic Extraction -> PII Mask -> AI
            let raw_text = crate::ai::hwp_parser::extract_text_from_hwp_binary(&file_bytes)?;
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            let prompt_context = format!("HWP Document Content:\n{}", safe_text);
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&prompt_context, None, "HWP Document Policy", "default", "Pro").await?;
            
            ai_res.audit_trail.push(source_info);
            ai_res.reasoning.push_str(" | HWP Text Analysis with PII Guard");
            Ok(vec![ai_res])
        }
        "docx" | "pptx" => {
            // Office XML Text Extraction -> PII Mask -> AI
            let raw_text = crate::ai::office_parser::extract_text_from_office(file_bytes, &extension)?;
            let safe_text = crate::utils::pii_guard::apply_deidentification(&raw_text);
            
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&safe_text, None, "Office Document Policy", "default", "Pro").await?;
            
            ai_res.audit_trail.push(source_info);
            ai_res.reasoning.push_str(&format!(" | {} Analysis with PII Guard", extension.to_uppercase()));
            Ok(vec![ai_res])
        }
        "pdf" | "jpg" | "jpeg" | "png" | "image" => {
            // Universal Media (Vision) -> AI
            // Note: For Vision, we send the binary directly. PII masking on the image pixel level is not performed here.
            // We rely on the AI's instruction to abstract sensitive data if needed, or the platform's security.
            // However, the prompt in ai_service usually asks for JSON data which inherently structured and less PII-prone than raw text dumps.
            let mut ai_res = crate::ai::ai_service::extract_transaction_from_media(file_bytes, &extension).await?;
            
            ai_res.audit_trail.push(source_info);
            ai_res.reasoning.push_str(" | Vision Analysis");
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
