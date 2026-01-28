use crate::core::models::ParsedTransaction;
use crate::ai::ai_service;
use tokio::task::JoinSet;

/// Mass Data Ingestion Engine (Slim Version)
/// Focuses purely on AI enhancement for account mapping without complex tax/payroll splitting.
pub async fn process_mass_batch(
    transactions: Vec<ParsedTransaction>,
    policy: &str,
) -> Result<Vec<ParsedTransaction>, String> {
    let chunk_size = 20;
    let mut enhanced_transactions = Vec::new();
    
    for chunk in transactions.chunks(chunk_size) {
        let mut tasks = JoinSet::new();
        
        for tx in chunk {
            if tx.confidence.as_deref() != Some("High") || tx.account_name.is_none() {
                let tx_clone = tx.clone();
                let policy_clone = policy.to_string();
                tasks.spawn(async move {
                    enhance_transaction_with_ai(tx_clone, &policy_clone).await
                });
            } else {
                enhanced_transactions.push(tx.clone());
            }
        }
        
        while let Some(result) = tasks.join_next().await {
            match result {
                Ok(Ok(enhanced_tx)) => enhanced_transactions.push(enhanced_tx),
                Ok(Err(e)) => eprintln!("AI Enhancement Error: {}", e),
                Err(e) => eprintln!("Task Join Error: {}", e),
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }
    
    Ok(enhanced_transactions)
}

async fn enhance_transaction_with_ai(
    mut tx: ParsedTransaction,
    policy: &str,
) -> Result<ParsedTransaction, String> {
    let input = format!(
        "Date: {}, Description: {}, Amount: {}, Vendor: {}, VAT: {}",
        tx.date.as_deref().unwrap_or("Unknown"),
        tx.description.as_deref().unwrap_or(""),
        tx.amount,
        tx.vendor.as_deref().unwrap_or(""),
        tx.vat
    );
    
    match ai_service::call_journal_ai(&input, None, policy, "default", "Pro").await {
        Ok(ai_result) => {
            tx.account_name = tx.account_name.or(ai_result.account_name);
            tx.confidence = Some("High".to_string());
            tx.reasoning = format!("{} | AI Enhanced", tx.reasoning);
            tx.needs_clarification = ai_result.needs_clarification;
            tx.clarification_prompt = ai_result.clarification_prompt;
            
            tx.audit_trail.push(format!(
                "[{}] AI Enhanced (Slim Engine)",
                chrono::Local::now().format("%H:%M:%S")
            ));
            
            Ok(tx)
        }
        Err(e) => {
            tx.audit_trail.push(format!("AI Enhancement Failed: {}", e));
            tx.confidence = Some("Low".to_string());
            Ok(tx)
        }
    }
}
