use crate::core::models::ParsedTransaction;

pub async fn ingest_universal_file(
    _file_bytes: Vec<u8>,
    _file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
    // Skeleton implementation to debug build - Logic will be restored after verifying compilation
    Ok(vec![])
}

pub async fn extract_context_text(_file_bytes: Vec<u8>, _file_name: String) -> Result<String, String> {
    Ok("Context extracted".to_string())
}
