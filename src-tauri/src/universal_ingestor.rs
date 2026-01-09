use crate::core::models::ParsedTransaction;
use crate::robust_parser::parse_robust_csv;
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
        "csv" | "txt" | "tsv" | "xlsx" => {
            // High-performance structured parsing
            parse_robust_csv(file_bytes)
        }
        "pdf" | "jpg" | "jpeg" | "png" | "image" | "docx" | "pptx" => {
            // Multi-modal AI Extraction
            crate::ai_service::extract_transaction_from_media(file_bytes, extension).await
        }
        _ => Err(format!("Unsupported file format: .{}", extension)),
    }
}
