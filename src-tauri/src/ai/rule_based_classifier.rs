use crate::core::models::ParsedTransaction;

/**
 * Rule-Based Classification Engine (Slim Version)
 * Fast keyword-based account mapping without complex risk detection.
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) {
    let description = tx.description.as_deref().unwrap_or("").to_lowercase();
    let vendor = tx.vendor.as_deref().unwrap_or("").to_lowercase();
    let combined = format!("{} {}", description, vendor);
    let entry_type = tx.entry_type.as_deref().unwrap_or("Expense");

    // 1. Inflow Handling (Deposits)
    if entry_type == "Revenue" {
        tx.debit_account = Some("보통예금".to_string());
        
        if combined.contains("투자") || combined.contains("investment") || combined.contains("capital") {
            // Equity Injection
            let acc = if combined.contains("잉여금") || combined.contains("series-a") { "자본잉여금" } else { "자본금" };
            tx.credit_account = Some(acc.to_string());
            tx.account_name = Some(acc.to_string());
            tx.reasoning = "RuleEngine: Equity Investment Detected".to_string();
        } else {
            // Standard Revenue
            let rev_acc = if combined.contains("애플") || combined.contains("apple") || combined.contains("구글") || combined.contains("google") || combined.contains("카카오") || combined.contains("kakao") || combined.contains("매출") {
                "SaaS 매출"
            } else {
                "매출"
            };
            tx.credit_account = Some(rev_acc.to_string());
            tx.account_name = Some(rev_acc.to_string());
            tx.reasoning = "RuleEngine: Detected Revenue/Deposit".to_string();
        }
    } else {
        // 2. Outflow Handling (Withdrawals)
        if combined.contains("현금") || combined.contains("cash") {
            tx.payment_method = Some("Cash".to_string());
            tx.credit_account = Some("현금".to_string());
        } else {
            tx.payment_method = Some("Card".to_string());
            tx.credit_account = Some("미지급금".to_string());
        }

        // 3. Keyword Mapping for Expenses & COGS
        let (account, reasoning) = if combined.contains("급여") || combined.contains("월급") {
            ("급여", "Keyword: Salary")
        } else if combined.contains("인프라") || combined.contains("클라우드") || combined.contains("aws") || combined.contains("api") || combined.contains("원가") {
            ("매출원가", "Keyword: COGS/Infrastructure")
        } else if combined.contains("식비") || combined.contains("커피") || combined.contains("카페") || combined.contains("마트") {
            ("복리후생비", "Keyword: Meals/Welfare")
        } else if combined.contains("택시") || combined.contains("버스") || combined.contains("교통") {
            ("여비교통비", "Keyword: Transport")
        } else if combined.contains("광고") || combined.contains("홍보") || combined.contains("마케팅") {
            ("광고선전비", "Keyword: Marketing")
        } else if combined.contains("임대") || combined.contains("월세") || combined.contains("관리비") || combined.contains("패스트파이브") {
            ("임차료", "Keyword: Rent/Facility")
        } else if combined.contains("택배") || combined.contains("운송") {
            ("운반비", "Keyword: Logistics")
        } else if combined.contains("보험") || combined.contains("연금") {
            ("보험료", "Keyword: Insurance")
        } else {
            ("소모품비", "Default: Office Supplies/General")
        };

        tx.account_name = Some(account.to_string());
        tx.debit_account = Some(account.to_string());
        tx.reasoning = format!("RuleEngine: {}", reasoning);
    }

    tx.confidence = Some("Medium".to_string());
    
    // 4. Intelligent VAT Logic
    // If VAT is already provided (not 0.0), respect it.
    if tx.vat > 0.0 {
        return;
    }

    let acc = tx.account_name.as_deref().unwrap_or("");
    
    // Exempt accounts from VAT
    let is_exempt = acc == "급여" || 
                    acc == "보험료" || 
                    acc == "자본금" || 
                    acc == "자본잉여금" || 
                    acc == "예수금" ||
                    acc == "세금과공과" ||
                    combined.contains("면세") ||
                    combined.contains("보험");

    if is_exempt {
        tx.vat = 0.0;
    } else {
        // Standard 10% VAT (re-calculate from total amount if missing)
        tx.vat = (tx.amount / 11.0).round();
    }
}
