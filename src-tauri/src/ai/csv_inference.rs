use serde::{Serialize, Deserialize};
use crate::core::models::{ParsedTransaction, SystemError};
use crate::ai::robust_parser;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InferenceResult {
    pub metadata: ExtractedMetadata,
    pub suggested_entries: Vec<ParsedTransaction>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedMetadata {
    pub total_amount: f64,
    pub count: usize,
}

pub fn analyze_csv(data: Vec<u8>, hint: Option<String>) -> Result<InferenceResult, SystemError> {
    let txs = robust_parser::parse_robust_csv(data, hint)?;
    Ok(InferenceResult {
        metadata: ExtractedMetadata {
            total_amount: txs.iter().map(|t| t.amount).sum(),
            count: txs.len(),
        },
        suggested_entries: txs,
    })
}

pub fn analyze_csv_to_transactions(data: Vec<u8>, hint: Option<String>) -> Result<Vec<ParsedTransaction>, SystemError> {
    Ok(robust_parser::parse_robust_csv(data, hint)?)
}
