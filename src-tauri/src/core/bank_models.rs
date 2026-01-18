use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BankMapping {
    pub name: String,
    pub mapping: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRequest {
    pub id: String,
    pub transaction_id: String,
    pub vendor_name: String,
    pub amount: f64,
    pub bank_name: String,
    pub account_number: String,
    pub due_date: String,
    pub description: String,
    pub status: String, // Pending, Approved, Paid
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BankVault {
    pub encrypted_accounts: HashMap<String, String>, // VendorName -> EncryptedData
}
