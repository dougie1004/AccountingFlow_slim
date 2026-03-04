use crate::core::models::{ParsedTransaction, SystemError, TransactionSource, AmountOrigin};

/**
 * Stage 2: Transaction Normalizer (Strict Deterministic Layer)
 * 팩트(Fact)를 기반으로 입금/출금 및 정산 방식을 결정합니다.
 * 텍스트 기반 추론은 절대 하지 않으며, 구조가 불분명하면 정직하게 실패(Err)를 반환합니다.
 */
pub fn normalize_transaction(tx: &mut ParsedTransaction) -> Result<(), SystemError> {
    // 1. Settlement Type Determination (Source Metadata Only)
    // 텍스트 설명(description)이나 부호는 절대 보지 않습니다.
    tx.settlement_type = match tx.source_type {
        Some(TransactionSource::BankFile) => Some("Immediate".to_string()),
        Some(TransactionSource::CardFile) => Some("Deferred".to_string()),
        Some(TransactionSource::Manual) => {
            // Manual 거래는 UI에서 정산 방식을 명시적으로 선택해야 함. 
            // 여기서 추측하지 않고 실패를 던집니다.
            return Err(SystemError::InvalidFormat("수기 거래의 정산 방식이 결정되지 않았습니다.".into()));
        }
        None => return Err(SystemError::InvalidFormat("거래 소스 세부 정보(SourceType)가 누락되었습니다.".into())),
    };

    // 2. Flow Direction Determination (Column Metadata Only)
    tx.flow_direction = match tx.amount_origin {
        Some(AmountOrigin::WithdrawalColumn) => Some("Outflow".to_string()),
        Some(AmountOrigin::DepositColumn) => Some("Inflow".to_string()),
        Some(AmountOrigin::Generic) => {
            // 단일 컬럼 포맷에서는 부호가 유일한 구조적 지표입니다. (Data-driven logic)
            if tx.amount > 0.0 {
                Some("Inflow".to_string())
            } else if tx.amount < 0.0 {
                Some("Outflow".to_string())
            } else {
                return Err(SystemError::InvalidFormat("금액이 0원 혹은 부호가 불분명하여 방향을 결정할 수 없습니다.".into()));
            }
        }
        None => return Err(SystemError::InvalidFormat("금액 출처 정보(AmountOrigin)가 누락되었습니다.".into())),
    };

    // 3. Liability Repayment Detection (Structural Switch)
    // 은행 출금 거래 중 부채(카드대금 등) 상환 패턴을 감지합니다.
    if tx.source_type == Some(TransactionSource::BankFile) && tx.flow_direction.as_deref() == Some("Outflow") {
        let desc = tx.description.as_deref().unwrap_or("").to_lowercase();
        
        // 범용 패턴: (카드/은행사 명칭) + (상환 관련 키워드)
        let entities = vec!["현대카드", "삼성카드", "신한카드", "국민카드", "비씨카드", "롯데카드", "하나카드", "우리카드", "외환카드"];
        let actions = vec!["결제", "상환", "대금", "납부"];
        
        let mut matched_entity = None;
        for &e in entities.iter() {
            if desc.contains(&e.replace("카드", "")) || desc.contains(e) {
                matched_entity = Some(e);
                break;
            }
        }
        
        let matches_action = actions.iter().any(|&a| desc.contains(a));

        if let Some(entity) = matched_entity {
            if matches_action {
                tx.is_settlement_flow = true;
                tx.vendor = Some(entity.to_string());
                tx.settlement_target = Some("미지급금".to_string()); 
                // Note: The ledger will group by (Account: 미지급금 + Vendor: 신한카드)
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::models::{ParsedTransaction, TransactionSource, AmountOrigin};

    #[test]
    fn test_normalizer_detects_card_settlement() {
        let mut tx = ParsedTransaction {
            description: Some("신한카드결제대금".into()),
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::WithdrawalColumn),
            ..Default::default()
        };
        
        normalize_transaction(&mut tx).unwrap();
        
        assert!(tx.is_settlement_flow);
        assert_eq!(tx.settlement_target.as_deref(), Some("미지급금"));
    }

    #[test]
    fn test_normalizer_bank_with_noise() {
        let mut tx = ParsedTransaction {
            description: Some("카드대금 납부 (신한카드)".into()),
            source_type: Some(TransactionSource::BankFile),
            amount_origin: Some(AmountOrigin::WithdrawalColumn),
            ..Default::default()
        };
        
        normalize_transaction(&mut tx).unwrap();
        
        // Even with "Card" in description, it MUST stay Immediate (Bank)
        assert_eq!(tx.settlement_type.as_deref(), Some("Immediate"));
        assert_eq!(tx.flow_direction.as_deref(), Some("Outflow"));
    }

    #[test]
    fn test_normalizer_card_with_noise() {
        let mut tx = ParsedTransaction {
            description: Some("송금 완료".into()),
            source_type: Some(TransactionSource::CardFile),
            amount_origin: Some(AmountOrigin::Generic),
            ..Default::default()
        };
        
        normalize_transaction(&mut tx).unwrap();
        
        // Even with "Transfer/Song-guem" in description, it MUST stay Deferred (Card)
        assert_eq!(tx.settlement_type.as_deref(), Some("Deferred"));
    }

    #[test]
    fn test_normalizer_fails_on_manual() {
        let mut tx = ParsedTransaction {
            source_type: Some(TransactionSource::Manual),
            ..Default::default()
        };
        
        let result = normalize_transaction(&mut tx);
        assert!(result.is_err());
    }

    #[test]
    fn test_normalizer_fails_on_missing_origin() {
        let mut tx = ParsedTransaction {
            source_type: Some(TransactionSource::BankFile),
            amount_origin: None,
            ..Default::default()
        };
        
        let result = normalize_transaction(&mut tx);
        assert!(result.is_err());
    }
}
