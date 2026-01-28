use crate::core::models::ParsedTransaction;

/**
 * Rule-Based Classification Engine (Slim Version)
 * Fast keyword-based account mapping without complex risk detection.
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) {
    let description = tx.description.as_deref().unwrap_or("").to_lowercase();
    let vendor = tx.vendor.as_deref().unwrap_or("").to_lowercase();
    let combined = format!("{} {}", description, vendor);
    
    // 1. Payment Method & Credit Account
    if combined.contains("현금") || combined.contains("cash") {
        tx.payment_method = Some("Cash".to_string());
        tx.credit_account = Some("현금".to_string());
    } else {
        tx.payment_method = Some("Card".to_string());
        tx.credit_account = Some("미지급금".to_string());
    }

    // 2. Keyword Mapping
    let (account, reasoning) = if combined.contains("급여") || combined.contains("월급") {
        ("급여", "Keyword: Salary")
    } else if combined.contains("식비") || combined.contains("커피") || combined.contains("카페") || combined.contains("마트") {
        ("복리후생비", "Keyword: Meals/Welfare")
    } else if combined.contains("택시") || combined.contains("버스") || combined.contains("교통") {
        ("여비교통비", "Keyword: Transport")
    } else if combined.contains("광고") || combined.contains("홍보") || combined.contains("마케팅") {
        ("광고선전비", "Keyword: Marketing")
    } else if combined.contains("임대") || combined.contains("월세") || combined.contains("관리비") {
        ("임차료", "Keyword: Rent/Facility")
    } else if combined.contains("택배") || combined.contains("운송") {
        ("운반비", "Keyword: Logistics")
    } else if combined.contains("보험") || combined.contains("연금") {
        ("보험료", "Keyword: Insurance")
    } else {
        ("소모품비", "Default: Office Supplies/General")
    };

    tx.account_name = Some(account.to_string());
    tx.reasoning = format!("RuleEngine: {}", reasoning);
    tx.confidence = Some("Medium".to_string());
    
    // Simple 10% VAT logic for MVP
    tx.vat = (tx.amount / 11.0).round();
}
