use crate::core::models::{ParsedTransaction, SystemError, TransactionSource, AmountOrigin};

/**
 * Rule-Based Classification Engine (Slim Version)
 * Fast keyword-based account mapping without complex risk detection.
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) -> Result<(), SystemError> {
    // 1. Structure Phase: Determine Flow (In/Out)
    crate::ai::normalizer::normalize_transaction(tx)?;
    
    let combined = format!("{} {}", tx.description.as_deref().unwrap_or(""), tx.vendor.as_deref().unwrap_or("")).to_lowercase();
    let flow = tx.flow_direction.as_deref().unwrap_or("Unknown");
    let source = tx.source_type.as_ref();

    // Special Case: Reverse Settlement (Already Deterministic)
    if tx.is_settlement_flow {
        let target_acc = tx.settlement_target.as_deref().unwrap_or("미지급금");
        tx.debit_account = Some(target_acc.to_string());
        tx.credit_account = Some("보통예금".to_string());
        tx.reasoning = format!("Reverse Settlement: Paying off {}", target_acc);
        return Ok(());
    }

    // 2. Nature Phase: Why did the money move? (Core Accounting Intent)
    let nature_account = if combined.contains("자본금") || combined.contains("투자") { Some("자본금") }
                        else if combined.contains("매출") || combined.contains("정산") { Some("매출") }
                        else if combined.contains("급여") || combined.contains("상여") || combined.contains("인건비") { Some("급여") }
                        else if combined.contains("임차료") || combined.contains("월세") || combined.contains("렌탈") || combined.contains("리스") { Some("지급임차료") }
                        else if combined.contains("aws") || combined.contains("인프라") || combined.contains("클라우드") { Some("매출원가") }
                        else if combined.contains("식대") || combined.contains("스타벅스") || combined.contains("배달의민족") { Some("복리후생비") }
                        else if combined.contains("광고") || combined.contains("마케팅") || combined.contains("google ads") { Some("광고선전비") }
                        else if combined.contains("접대") || combined.contains("선물") || combined.contains("상품권") || combined.contains("백화점") { Some("접대비") }
                        else if combined.contains("환급") || combined.contains("부가세") { Some("부가세예수금") }
                        else { None };

    if nature_account.is_none() {
        tx.needs_clarification = true;
        tx.account_name = Some("계정확인필요".to_string());
        tx.reasoning = "거래의 성격(Why)을 텍스트에서 확정할 수 없습니다. 직접 수정을 권장합니다.".into();
        return Ok(()); // Wait for user input
    }
    let core_acc = nature_account.unwrap().to_string();

    // 3. Source Phase: How was it moved? (Payment / Receipt channel)
    let channel_acc = match source {
        Some(TransactionSource::BankFile) => "보통예금".to_string(),
        Some(TransactionSource::CardFile) => {
            if flow == "Inflow" { "미수금".to_string() } else { "미지급금".to_string() }
        }
        _ => "현금".to_string(), // Default fallback
    };

    // 4. Assembly Phase: Double-Entry Construction
    if flow == "Inflow" {
        tx.debit_account = Some(channel_acc); 
        tx.credit_account = Some(core_acc.clone());
    } else {
        tx.debit_account = Some(core_acc.clone());
        tx.credit_account = Some(channel_acc);
    }
    tx.account_name = Some(core_acc);

    // 5. Final Integrity Check: Anti-Panic & VAT
    if tx.debit_account == tx.credit_account && tx.debit_account.is_some() {
        return Err(SystemError::InvalidFormat(format!("Recursive Entry Detected for {}", tx.debit_account.clone().unwrap())));
    }

    // Comprehensive VAT Logic
    let current_acc = tx.account_name.as_deref().unwrap_or("");
    if current_acc == "급여" || current_acc == "자본금" || current_acc == "부가세예수금" || combined.contains("면세") {
        tx.vat = 0.0;
    } else if tx.vat == 0.0 && tx.amount != 0.0 {
        tx.vat = (tx.amount / 11.0).round();
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::models::ParsedTransaction;

    #[test]
    fn test_e2e_bank_statement_scenario() {
        // [Stage 1: Ingestion metadata]
        let mut tx = ParsedTransaction {
            description: Some("서버 인프라 구축(AWS)".to_string()), // Nature: 매출원가
            amount: 250000.0,
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::WithdrawalColumn),
            ..Default::default()
        };
        
        // [Stage 2 & 3: Normalize & Classify]
        classify_by_rules(&mut tx).unwrap();
        
        // [Structural Validation]
        assert_eq!(tx.flow_direction.as_deref(), Some("Outflow"));
        assert_eq!(tx.credit_account.as_deref(), Some("보통예금")); // Source (How)
        assert_eq!(tx.debit_account.as_deref(), Some("매출원가")); // Nature (Why)
    }

    #[test]
    fn test_e2e_card_statement_scenario() {
        let mut tx = ParsedTransaction {
            description: Some("스타벅스 강남점".to_string()), // Nature: 복리후생비
            amount: -5500.0,
            source_type: Some(TransactionSource::CardFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };
        
        classify_by_rules(&mut tx).unwrap();
        
        // [Structural Validation]
        assert_eq!(tx.flow_direction.as_deref(), Some("Outflow"));
        assert_eq!(tx.credit_account.as_deref(), Some("미지급금")); // Source (How)
        assert_eq!(tx.debit_account.as_deref(), Some("복리후생비")); // Nature (Why)
    }

    #[test]
    fn test_rental_classification() {
        // [G-006 scenario]
        let mut tx = ParsedTransaction {
            description: Some("사무실 복합기 렌탈료 55,000원 이체완료".to_string()),
            amount: -55000.0,
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };
        classify_by_rules(&mut tx).unwrap();
        assert_eq!(tx.account_name.as_deref(), Some("지급임차료"));
        assert_eq!(tx.credit_account.as_deref(), Some("보통예금"));
    }

    #[test]
    fn test_gift_classification() {
        // [G-002 scenario]
        let mut tx = ParsedTransaction {
            description: Some("거래처 선물용으로 백화점 상품권 구매".to_string()),
            amount: -200000.0,
            source_type: Some(TransactionSource::CardFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };
        classify_by_rules(&mut tx).unwrap();
        assert_eq!(tx.account_name.as_deref(), Some("접대비"));
        assert_eq!(tx.credit_account.as_deref(), Some("미지급금"));
    }

    #[test]
    fn test_capital_increase_scenario() {
        // [Scenario from User Screenshot]
        let mut tx = ParsedTransaction {
            description: Some("초기 설립 자본금 (제너럴)".to_string()),
            amount: 50000000.0, // 50M
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };

        classify_by_rules(&mut tx).unwrap();

        // [Verification]
        assert_eq!(tx.flow_direction.as_deref(), Some("Inflow"));
        assert_eq!(tx.debit_account.as_deref(), Some("보통예금")); // Where the money went
        assert_eq!(tx.credit_account.as_deref(), Some("자본금")); // Source of the money (Equity)
        assert!(tx.needs_clarification == false);
    }

    #[test]
    fn test_repayment_reconcile_scenario() {
        let mut tx = ParsedTransaction {
            description: Some("신한카드결제대금".to_string()),
            amount: -1500000.0,
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };
        
        classify_by_rules(&mut tx).unwrap();
        
        assert!(tx.is_settlement_flow);
        assert_eq!(tx.debit_account.as_deref(), Some("미지급금")); 
        assert_eq!(tx.credit_account.as_deref(), Some("보통예금"));
    }
}
