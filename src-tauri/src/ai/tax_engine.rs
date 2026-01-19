use crate::core::models::ParsedTransaction;

/**
 * Tax Engine
 * 자동 세금 감지 및 분개 생성기
 * 한글 키워드 무결성 보장 (UTF-8)
 */
pub fn detect_and_apply_tax_logic(tx: &mut ParsedTransaction) {
    let desc = tx.description.clone().unwrap_or_default();
    
    // 1. 원천세 감지 (용역, 강사, 컨설팅 등)
    if desc.contains("용역") || desc.contains("강사") || desc.contains("컨설팅") || desc.contains("프리랜서") {
        tx.reasoning.push_str(" [원천세 3.3% 감지]");
        // AI가 추가 분석하도록 유도
    }
    
    // 2. 임대료 감지
    if desc.contains("임대료") || desc.contains("월세") {
        tx.reasoning.push_str(" [임대료 원천징수 대상 여부 확인 필요]");
    }

    // 3. 정부지원금 특별 처리
    if desc.contains("정부지원금") || desc.contains("국고보조금") || desc.contains("창업지원") {
        tx.needs_clarification = true;
        tx.clarification_prompt = Some("정부지원금이 감지되었습니다. 상환 의무가 있나요?".to_string());
        tx.clarification_options = Some(vec!["상환 의무 있음".to_string(), "상환 의무 없음(수익)".to_string()]);
    }

    // 4. 부가세 자동 계산 (10%)
    if tx.vat == 0.0 && tx.amount > 0.0 {
        if tx.entry_type.as_deref() == Some("Expense") || tx.entry_type.as_deref() == Some("Asset") {
            tx.vat = (tx.amount / 11.0).round(); // 공급가액의 10% 가정 (합계금액 기준)
        }
    }
}
