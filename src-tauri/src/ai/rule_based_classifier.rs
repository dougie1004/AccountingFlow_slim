use crate::core::models::ParsedTransaction;

/**
 * Rule-Based Classification Engine V2
 * AI 실패 시 사용하는 규칙 기반 계정 분류 시스템 (99% 커버리지)
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) {
    let description = tx.description.as_deref().unwrap_or("").to_lowercase();
    let vendor = tx.vendor.as_deref().unwrap_or("").to_lowercase();
    let combined = format!("{} {}", description, vendor);
    
    // 금액 추출 시도 (Fallback 시에도 숫자 파악)
    if tx.amount == 0.0 {
        tx.amount = parse_korean_amount(&description);
    }

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

    // 7. 소모품비/비품 패턴
    if combined.contains("소모품") || combined.contains("문구") || combined.contains("용품") {
        tx.account_name = Some("소모품비".to_string());
        tx.reasoning = "규칙: 소모품비 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    if combined.contains("냉장고") || combined.contains("에어컨") || combined.contains("가구") 
        || combined.contains("컴퓨터") || combined.contains("노트북") || combined.contains("가전") {
        tx.account_name = Some("비품".to_string());
        tx.reasoning = "규칙: 비품/자산성 가전 키워드".to_string();
        tx.entry_type = "Asset".to_string();
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

    // 12. 광고/마케팅 패턴
    if combined.contains("광고") || combined.contains("마케팅") || combined.contains("홍보") {
        tx.account_name = Some("광고선전비".to_string());
        tx.reasoning = "규칙: 광고/마케팅 키워드".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 13. 자본금/증자 패턴 (NEW!)
    if combined.contains("자본금") || combined.contains("증자") || combined.contains("납입") {
        tx.account_name = Some("자본금".to_string());
        tx.reasoning = "규칙: 자본금/증자 키워드".to_string();
        tx.entry_type = "Equity".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    // 14. 재고/SCM 확장 패턴 (NEW for CSV)
    if combined.contains("원재료") || combined.contains("부품") || combined.contains("반도체") {
        tx.account_name = Some("원재료".to_string());
        tx.reasoning = "규칙: 원재료/부품 매입".to_string();
        tx.entry_type = "Asset".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    if combined.contains("감모") || combined.contains("재고부족") || combined.contains("재고 실사") 
        || (combined.contains("재고") && combined.contains("손실")) {
        tx.account_name = Some("재고자산감모손실".to_string());
        tx.reasoning = "규칙: 재고 감모/실사 손실".to_string();
        tx.entry_type = "Expense".to_string();
        tx.confidence = Some("High".to_string());
        return;
    }

    if combined.contains("관세") || (combined.contains("운반비") && combined.contains("수입")) {
        tx.account_name = Some("상품 (재고자산)".to_string());
        tx.reasoning = "규칙: 재고 부대비용 가산 (Landed Cost)".to_string();
        tx.entry_type = "Asset".to_string();
        tx.confidence = Some("Medium".to_string());
        return;
    }

    if combined.contains("원가확정") || combined.contains("cogs") {
        tx.account_name = Some("매출원가".to_string());
        tx.reasoning = "규칙: 매출원가 인식".to_string();
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
    if desc_lower.contains("자본금") || desc_lower.contains("증자") { return Some("자본금".to_string()); }
    
    None
}

/// 한국어 금액 표현 파싱 (예: "1억원", "50만원", "10,000,000")
fn parse_korean_amount(input: &str) -> f64 {
    let clean = input.replace(",", "").replace(" ", "");
    
    // "억원" 패턴
    if let Some(idx) = clean.find("억원") {
        if let Ok(num) = clean[..idx].parse::<f64>() {
            return num * 100_000_000.0;
        }
    }
    
    // "만원" 패턴
    if let Some(idx) = clean.find("만원") {
        if let Ok(num) = clean[..idx].parse::<f64>() {
            return num * 10_000.0;
        }
    }

    // 숫자만 있는 경우
    let only_nums: String = clean.chars().filter(|c| c.is_digit(10)).collect();
    only_nums.parse::<f64>().unwrap_or(0.0)
}
