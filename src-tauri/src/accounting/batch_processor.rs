use crate::core::models::ParsedTransaction;
use crate::ai::robust_parser::parse_robust_csv;

/**
 * Batch Processor V3
 * Robust Parser를 활용하여 일관된 파싱 품질을 보장합니다.
 */
pub async fn process_csv_batch(csv_data: String) -> Result<Vec<ParsedTransaction>, String> {
    // 문자열을 바이트로 변환하여 Robust Parser에 전달
    let bytes = csv_data.as_bytes().to_vec();
    parse_robust_csv(bytes)
}
