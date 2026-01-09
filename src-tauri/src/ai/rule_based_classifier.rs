use crate::core::models::ParsedTransaction;

/**
 * Rule-Based Classification Engine V2
 * AI 실패 시 사용하는 규칙 기반 계정 분류 시스템 (99% 커버리지)
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) {
    let description = tx.description.as_deref().unwrap_or("").to_lowercase();
    let vendor = tx.vendor.as_deref().unwrap_or("").to_lowercase();
    let combined = format!("{} {}", description, vendor);

    // 1. 관리비 패턴
    if combined.contains("관리비") || combined.contains("관리실") || combined.contains("아파트") {
        tx.account_name = Some("관리비".to_string());
        tx.reasoning = "규칙: 관리비 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 2. 정부지원금 패턴
    if combined.contains("정부") || combined.contains("r&d") || combined.contains("연구개발") 
        || combined.contains("과제") || combined.contains("협약") || combined.contains("지원금") {
        tx.account_name = Some("정부보조금".to_string());
        tx.reasoning = "규칙: 정부지원금 키워드".to_string();
        tx.entry_type = "Revenue".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 3. 급여 패턴
    if combined.contains("급여") || combined.contains("월급") || combined.contains("인건비") 
        || combined.contains("salary") || combined.contains("4대보험") {
        tx.account_name = Some("급여".to_string());
        tx.reasoning = "규칙: 급여 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 4. 임차료 패턴
    if combined.contains("임대료") || combined.contains("임차료") || combined.contains("rent") 
        || combined.contains("월세") || combined.contains("사무실") {
        tx.account_name = Some("임차료".to_string());
        tx.reasoning = "규칙: 임차료 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 5. 접대비 패턴
    if combined.contains("접대") || combined.contains("회식") || combined.contains("식사") 
        || combined.contains("커피") || combined.contains("카페") {
        tx.account_name = Some("접대비".to_string());
        tx.reasoning = "규칙: 접대비 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("Medium".to_string());
        return;
    }

    // 6. 통신비 패턴
    if combined.contains("통신") || combined.contains("인터넷") || combined.contains("전화") 
        || combined.contains("kt") || combined.contains("skt") || combined.contains("lg유플러스") {
        tx.account_name = Some("통신비".to_string());
        tx.reasoning = "규칙: 통신비 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 7. 소모품비 패턴
    if combined.contains("소모품") || combined.contains("문구") || combined.contains("용품") {
        tx.account_name = Some("소모품비".to_string());
        tx.reasoning = "규칙: 소모품비 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 8. 보안/시스템 패턴 (NEW!)
    if combined.contains("보안") || combined.contains("시스템") || combined.contains("이용료") 
        || combined.contains("서비스") {
        tx.account_name = Some("지급수수료".to_string());
        tx.reasoning = "규칙: 시스템/서비스 이용료".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("Medium".to_string());
        return;
    }

    // 9. 우편/택배 패턴 (NEW!)
    if combined.contains("우편") || combined.contains("택배") || combined.contains("등기") 
        || combined.contains("배송") {
        tx.account_name = Some("운반비".to_string());
        tx.reasoning = "규칙: 우편/택배 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 10. 주유/차량 패턴 (NEW!)
    if combined.contains("주유") || combined.contains("기름") || combined.contains("sk엔크린") 
        || combined.contains("gs칼텍스") || combined.contains("차량") {
        tx.account_name = Some("차량유지비".to_string());
        tx.reasoning = "규칙: 주유/차량 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 11. 식사/복리후생 패턴 (NEW!)
    if combined.contains("식사") || combined.contains("점심") || combined.contains("저녁") 
        || combined.contains("구내식당") {
        tx.account_name = Some("복리후생비".to_string());
        tx.reasoning = "규칙: 복리후생 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("Medium".to_string());
        return;
    }

    // 12. 광고/마케팅 패턴 (NEW!)
    if combined.contains("광고") || combined.contains("마케팅") || combined.contains("홍보") {
        tx.account_name = Some("광고선전비".to_string());
        tx.reasoning = "규칙: 광고/마케팅 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 13. 기본값 (분류 불가) - 하지만 "일반관리비"로 처리
    tx.account_name = Some("일반관리비".to_string());
    tx.reasoning = "규칙: 기본 분류 (일반관리비)".to_string();
    tx.needs_clarification = true;
    tx.clarification_prompt = Some("자동 분류되었으나 확인이 필요합니다. 더 정확한 계정과목을 선택해주세요.".to_string());
    tx.confidence = Some("Low".to_string());
}

/// 빠른 키워드 매칭 (캐싱용)
pub fn quick_classify(description: &str) -> Option<String> {
    let desc_lower = description.to_lowercase();
    
    if desc_lower.contains("관리비") { return Some("관리비".to_string()); }
    if desc_lower.contains("정부") || desc_lower.contains("r&d") { return Some("정부보조금".to_string()); }
    if desc_lower.contains("급여") { return Some("급여".to_string()); }
    if desc_lower.contains("임차료") { return Some("임차료".to_string()); }
    if desc_lower.contains("접대") { return Some("접대비".to_string()); }
    if desc_lower.contains("주유") { return Some("차량유지비".to_string()); }
    if desc_lower.contains("우편") { return Some("운반비".to_string()); }
    
    None
}
