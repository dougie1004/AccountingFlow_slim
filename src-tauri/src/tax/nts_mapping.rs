use serde::{Serialize, Deserialize};

/// 국세청(NTS) 전산신고 표준 규격에 따른 매핑 메타데이터
/// 정부 심사 및 기술 실체 증명용 레코드 레이아웃
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NtsFieldMapping {
    pub internal_field: String,    // AccountingFlow 내부 필드명
    pub nts_xml_tag: String,       // 국세청 표준 XML 태그명
    pub nts_field_code: String,    // 국세청 전산 레코드 코드 (예: A01, B05)
    pub description: String,        // 항목 설명
}

pub fn get_hometax_vat_mapping() -> Vec<NtsFieldMapping> {
    vec![
        NtsFieldMapping {
            internal_field: "vendorRegNo".to_string(),
            nts_xml_tag: "Bsns_No".to_string(),
            nts_field_code: "VAT001".to_string(),
            description: "사업자등록번호".to_string(),
        },
        NtsFieldMapping {
            internal_field: "amount".to_string(),
            nts_xml_tag: "Spl_Amt".to_string(),
            nts_field_code: "VAT002".to_string(),
            description: "공급가액".to_string(),
        },
        NtsFieldMapping {
            internal_field: "vat".to_string(),
            nts_xml_tag: "Vat_Amt".to_string(),
            nts_field_code: "VAT003".to_string(),
            description: "부가가치세액".to_string(),
        },
        NtsFieldMapping {
            internal_field: "date".to_string(),
            nts_xml_tag: "Tr_Dt".to_string(),
            nts_field_code: "VAT004".to_string(),
            description: "거래일자".to_string(),
        },
    ]
}

pub fn get_hometax_corp_tax_mapping() -> Vec<NtsFieldMapping> {
    vec![
        NtsFieldMapping {
            internal_field: "retainedEarnings".to_string(),
            nts_xml_tag: "Ret_Earn_Amt".to_string(),
            nts_field_code: "CT010".to_string(),
            description: "이월이익잉여금".to_string(),
        },
        NtsFieldMapping {
            internal_field: "taxableIncome".to_string(),
            nts_xml_tag: "Tax_Inc_Amt".to_string(),
            nts_field_code: "CT020".to_string(),
            description: "각 사업연도 소득금액".to_string(),
        },
    ]
}
