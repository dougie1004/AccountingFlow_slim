use async_trait::async_trait;
use crate::core::bank_models::PaymentRequest;

#[async_trait]
pub trait BankConnector {
    /// Future API connection implementation
    async fn transfer(&self, request: &PaymentRequest) -> Result<String, String>;
    
    /// Export as SAM (Standardized Adjustment Method) or Fixed-length text file
    fn generate_firm_banking_sam(&self, requests: &[PaymentRequest]) -> String;

    /// Specific KB Kookmin Batch Transfer CSV format
    fn generate_kb_batch_csv(&self, requests: &[PaymentRequest]) -> String;
}

pub struct ExcelAdapter;

#[async_trait]
impl BankConnector for ExcelAdapter {
    async fn transfer(&self, _request: &PaymentRequest) -> Result<String, String> {
        Err("API 연동이 활성화되지 않았습니다. 현재는 엑셀 내보내기만 가능합니다.".to_string())
    }

    fn generate_firm_banking_sam(&self, requests: &[PaymentRequest]) -> String {
        let mut sam = String::new();
        for req in requests {
            // Dummy SAM format: [Date(8)][BankCode(3)][Account(14)][Amount(12)][Vendor(20)]
            let line = format!(
                "{:8}{:3}{:14}{:012}{:20}\n",
                req.due_date.replace("-", ""),
                "001", // Bank Code
                req.account_number,
                req.amount as i64,
                req.vendor_name
            );
            sam.push_str(&line);
        }
        sam
    }

    fn generate_kb_batch_csv(&self, requests: &[PaymentRequest]) -> String {
        let mut csv = String::from("출금계좌번호,입금은행,입금계좌번호,예금주명,이체금액,입금계좌인자내용,CMS코드\n");
        for req in requests {
            let line = format!(
                "{},{},{},{},{},{},\n",
                "123-456-789012", // My KB Account (should come from config eventually)
                req.bank_name,
                req.account_number,
                req.vendor_name,
                req.amount as i64,
                req.description.get(..20).unwrap_or(&req.description)
            );
            csv.push_str(&line);
        }
        csv
    }
}
