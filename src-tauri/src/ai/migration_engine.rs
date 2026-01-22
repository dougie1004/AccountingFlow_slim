use crate::core::models::ParsedTransaction;
use crate::ai::robust_parser::parse_robust_csv;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MigrationSummary {
    pub total_records: usize,
    pub mapped_records: usize,
    pub suggested_accounts: Vec<String>,
    pub erp_type: String,
    pub data: Vec<ParsedTransaction>,
}

/**
 * Smart ERP Migration Engine
 * 기존 시스템의 불규칙한 데이터를 AI가 분석하여 표준 규격으로 변환
 */
pub async fn run_smart_migration(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<MigrationSummary, String> {
    // 1. 더존(Douzone) 특화 파싱 엔진 가동
    let raw_data = crate::accounting::parser::parse_douzone_data(file_bytes, &file_name)?;
    
    // 2. ERP 유형 추론 및 계정 맵핑 (PoC용 가상 로직)
    // 실제로는 여기서 AI를 호출하여 컬럼 구조를 재해석할 수 있습니다.
    let total = raw_data.len();
    let mapped = raw_data.iter().filter(|tx| tx.confidence.as_deref() != Some("Low")).count();
    
    let erp_type = if total > 0 {
        "Detected: Generic Legacy ERP".to_string()
    } else {
        "Unknown".to_string()
    };

    Ok(MigrationSummary {
        total_records: total,
        mapped_records: mapped,
        suggested_accounts: vec!["복리후생비".to_string(), "지급수수료".to_string()],
        erp_type,
        data: raw_data,
    })
}
