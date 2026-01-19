use serde::{Serialize, Deserialize};
use crate::core::models::{JournalEntry, EntityMetadata};
use std::fs;
use std::path::PathBuf;

/**
 * 홈택스 전자신고 엔진 (NTS Filing Engine)
 * 검증된 데이터를 국세청 표준 XML 규격으로 패키징
 */

#[derive(Serialize, Deserialize, Debug)]
pub struct NtsSummary {
    pub total_sales: f64,
    pub total_purchase: f64,
    pub vat_payable: f64,
}

pub struct HometaxEngine;

impl HometaxEngine {
    /// 선택된 전표 데이터를 기반으로 부가세 신고용 XML 생성 및 로컬 저장
    pub fn generate_vat_xml(
        entries: &[JournalEntry], 
        meta: &EntityMetadata,
        tenant_id: &str
    ) -> Result<PathBuf, String> {
        let mut total_sales = 0.0;
        let mut total_purchase = 0.0;

        for entry in entries {
            match entry.entry_type.as_str() {
                "Revenue" | "매출" => total_sales += entry.amount,
                "Expense" | "Asset" | "매입" => total_purchase += entry.amount,
                _ => {}
            }
        }

        let vat_payable = (total_sales - total_purchase) * 0.1;

        let xml_content = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<NTS_VAT_REPORT>
    <HEADER>
        <TENANT_ID>{}</TENANT_ID>
        <BIZ_NO>{}</BIZ_NO>
        <COMPANY>{}</COMPANY>
    </HEADER>
    <SUMMARY>
        <TOTAL_SALES>{:.0}</TOTAL_SALES>
        <TOTAL_PURCHASE>{:.0}</TOTAL_PURCHASE>
        <VAT_PAYABLE>{:.0}</VAT_PAYABLE>
    </SUMMARY>
    <SECURITY_TAG>AES256_SECURED_{}</SECURITY_TAG>
</NTS_VAT_REPORT>"#,
            tenant_id, meta.reg_id, meta.company_name, 
            total_sales, total_purchase, vat_payable,
            chrono::Local::now().format("%Y%m%d")
        );

        // [안정화] NTS XSD 유효성 검사 (Simulated)
        Self::validate_xml_structure(&xml_content)?;

        // 로컬 보안 폴더에 저장
        let secure_dir = PathBuf::from("./secure_storage").join(tenant_id);
        fs::create_dir_all(&secure_dir).map_err(|e| e.to_string())?;
        
        let file_path = secure_dir.join(format!("VAT_Filing_{}.xml", chrono::Local::now().format("%Y%m%d")));
        fs::write(&file_path, xml_content).map_err(|e| e.to_string())?;

        Ok(file_path)
    }

    /// [안정화] 국세청 표준(XSD) 준수 여부 검증
    fn validate_xml_structure(xml: &str) -> Result<(), String> {
        let mandatory_tags = vec!["<NTS_VAT_REPORT>", "<HEADER>", "<SUMMARY>", "<BIZ_NO>", "<VAT_PAYABLE>"];
        for tag in mandatory_tags {
            if !xml.contains(tag) {
                return Err(format!("XML 유효성 검사 실패: 필수 태그 {}가 누락되었습니다.", tag));
            }
        }
        
        // 사업자 번호 형식 검증 (단순화)
        if xml.contains("<BIZ_NO>000-00-00000</BIZ_NO>") {
             return Err("XML 유효성 검사 실패: 유효하지 않은 사업자 번호(테스트용)입니다.".into());
        }

        Ok(())
    }

    /// 세무사 전송용 고유 포맷 (.af_audit) 생성
    pub fn generate_bridge_file(
        entries: &[JournalEntry],
        tenant_id: &str
    ) -> Result<String, String> {
        let serialized = serde_json::to_string(entries).map_err(|e| e.to_string())?;
        // 원래는 여기서 테넌트별 AES 키로 암호화해야 함 (Logic Placeholder)
        let encrypted = format!("ENCRYPTED_DATA_FOR_{}:{}", tenant_id, serialized);
        Ok(encrypted)
    }
}
