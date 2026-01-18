use crate::core::models::ParsedTransaction;
use crate::ai::robust_parser::parse_robust_csv;
use std::path::Path;

pub async fn ingest_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
    let path = Path::new(&file_name);
    let extension = path.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        "csv" | "tsv" => {
            crate::ai::robust_parser::parse_robust_csv(file_bytes)
        }
        "xlsx" | "xls" => {
            crate::ai::excel_parser::parse_excel_file(file_bytes)
        }
        "txt" => {
            // First try structured, if no records found or low confidence, try AI.
            let structured = crate::ai::robust_parser::parse_robust_csv(file_bytes.clone());
            if let Ok(ref res) = structured {
                if !res.is_empty() && res[0].confidence.as_deref() == Some("High") {
                    return structured;
                }
            }
            
            // Fallback for unstructured text (Email, Drafts, etc.)
            let text = String::from_utf8_lossy(&file_bytes).to_string();
            let ai_res = crate::ai::ai_service::call_journal_ai(&text, None, "Unstructured Data Policy", "default", "Pro").await?;
            Ok(vec![ai_res])
        }
        "pdf" | "jpg" | "jpeg" | "png" | "image" => {
            // Multi-modal AI Extraction
            crate::ai::ai_service::extract_transaction_from_media(file_bytes, &extension).await
                .map(|tx| vec![tx])
        }
        "docx" | "pptx" => {
            // Office Document Text Extraction -> AI
            let text_content = crate::ai::office_parser::extract_text_from_office(file_bytes, &extension)?;
            let ai_res = crate::ai::ai_service::call_journal_ai(&text_content, None, "Office Document Policy", "default", "Pro").await?;
            Ok(vec![ai_res])
        }
        _ => Err(format!("Unsupported file format: .{}", extension)),
    }
}
