use crate::core::models::ParsedTransaction;
use crate::ai::ai_service;

pub async fn ingest_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
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
    } else {
        "application/octet-stream"
    };

    // 2. Special handling for Excel/CSV
    if lower_name.ends_with(".xlsx") || lower_name.ends_with(".xls") {
        return crate::ai::excel_parser::parse_excel_file(file_bytes);
    }

    if lower_name.ends_with(".csv") {
        // [Phase 11] CSV Inference Route
        return crate::ai::csv_inference::analyze_csv_to_transactions(file_bytes);
    }

    // 3. Process via Gemini Vision for Images/PDFs
    if mime.starts_with("image/") || mime == "application/pdf" {
        return ai_service::extract_transaction_from_media(file_bytes, mime).await;
    }

    Ok(vec![])
}

pub async fn extract_context_text(_file_bytes: Vec<u8>, _file_name: String) -> Result<String, String> {
    Ok("Context extracted".to_string())
}
