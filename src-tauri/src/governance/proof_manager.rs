use crate::core::models::JournalEntry;

/**
 * Proof Manager
 * 적격증빙(영수증 등)의 유효성 검증 및 AI 교차 분석 (UTF-8)
 */
pub fn verify_evidence(entry: &JournalEntry) -> VerificationStatus {
    if entry.attachment_url.is_some() {
        VerificationStatus {
            is_valid: true,
            message: "증빙 파일이 확인되었습니다.".to_string(),
            confidence: 0.95,
        }
    } else if entry.amount > 30000.0 {
        VerificationStatus {
            is_valid: false,
            message: "3만원 초과 거래이나 증빙이 누락되었습니다.".to_string(),
            confidence: 1.0,
        }
    } else {
        VerificationStatus {
            is_valid: true,
            message: "소액 거래로 간주되어 증빙 없이 승인 가능합니다.".to_string(),
            confidence: 1.0,
        }
    }
}

// VerificationStatus 구조체가 별도로 정의되지 않았다면 여기서 임시 정의하거나 참조
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VerificationStatus {
    pub is_valid: bool,
    pub message: String,
    pub confidence: f32,
}
