use once_cell::sync::Lazy;
use crate::core::bank_models::BankMapping;

pub static DEFAULT_PRESETS: Lazy<Vec<BankMapping>> = Lazy::new(|| {
    vec![
        BankMapping {
            name: "국민은행 (KB Kookmin)".to_string(),
            mapping: [
                ("거래일시", "tx_date"),
                ("출금금액", "amount"),
                ("입금금액", "amount"),
                ("받는분", "vendor"),
                ("내용", "description"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        },
        BankMapping {
            name: "신한은행 (Shinhan Bank)".to_string(),
            mapping: [
                ("거래일자", "tx_date"),
                ("출금금액", "amount"),
                ("내용", "vendor"),
                ("거래메모", "description"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        },
        BankMapping {
            name: "신한카드 (Shinhan Card)".to_string(),
            mapping: [
                ("이용일자", "tx_date"),
                ("이용금액", "amount"),
                ("가맹점명", "vendor"),
                ("이용업종", "description"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        },
        BankMapping {
            name: "현대카드 (Hyundai Card)".to_string(),
            mapping: [
                ("이용일시", "tx_date"),
                ("결제금액", "amount"),
                ("가맹점명", "vendor"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        },
        BankMapping {
            name: "기업은행 (IBK)".to_string(),
            mapping: [
                ("거래일", "tx_date"),
                ("찾으신금액", "amount"),
                ("거래처명", "vendor"),
                ("적요", "description"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        },
        BankMapping {
            name: "국세청 홈택스 (Hometax)".to_string(),
            mapping: [
                ("작성일자", "tx_date"),
                ("공급가액", "amount"),
                ("공급자명", "vendor"),
                ("품목", "description"),
            ].iter().cloned().map(|(k, v)| (k.to_string(), v.to_string())).collect(),
        }
    ]
});

pub fn get_preset_by_name(name: &str) -> Option<BankMapping> {
    DEFAULT_PRESETS.iter().find(|p| p.name == name).cloned()
}
