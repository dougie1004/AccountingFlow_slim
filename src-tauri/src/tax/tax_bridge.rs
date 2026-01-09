use crate::core::models::{JournalEntry, EntityMetadata, TaxAdjustment, TaxFilingPackage};
use crate::core::file_utils;
use serde::{Serialize, Deserialize};

/**
 * Tax Bridge Engine
 * Aggregates journal data and maps to Hometax (NTS) XML Schema
 * 한글 인코딩 무결성 복구 완료
 */
pub fn generate_hometax_xml(
    entries: Vec<JournalEntry>,
    metadata: &EntityMetadata,
    _adjustments_input: Vec<TaxAdjustment>
) -> Result<TaxFilingPackage, String> {
    
    // 1. Data Aggregation & Dynamic Adjustment Calculation
    let mut adjustments = Vec::new();
    let mut total_amount: f64 = 0.0;
    let mut total_vat: f64 = 0.0;

    for entry in &entries {
        total_amount += entry.amount;
        total_vat += entry.vat;

        // 세무 조정 로직 복구 (캡처본 기반)
        if let Some(ref tax_code) = entry.tax_code {
            match tax_code.as_str() {
                "ENTERTAINMENT_NO_PROOF" => {
                    adjustments.push(TaxAdjustment {
                        category: "접대비(증빙불비)".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 0.0,
                        difference: entry.amount,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "기타사외유출".to_string(),
                    });
                },
                "CAR_UNINSURED" => {
                    adjustments.push(TaxAdjustment {
                        category: "업무무관승용차 관련비용부인".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 0.0,
                        difference: entry.amount,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "기타사외유출".to_string(),
                    });
                },
                "DEPRECIATION_EXCESS" => {
                    adjustments.push(TaxAdjustment {
                        category: "감가상각비한도초과액".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 20_000_000.0,
                        difference: entry.amount - 20_000_000.0,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "유보".to_string(),
                    });
                },
                "PENALTY" => {
                    adjustments.push(TaxAdjustment {
                        category: "벌과금(Warning/Penalty)".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 0.0,
                        difference: entry.amount,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "기타사외유출".to_string(),
                    });
                },
                _ => {}
            }
        }
    }

    // 2. XML Mapping (Standard Schema)
    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str("<HometaxFiling>\n");
    xml.push_str("  <Header>\n");
    xml.push_str(&format!("    <CompanyName>{}</CompanyName>\n", metadata.company_name));
    xml.push_str(&format!("    <RegId>{}</RegId>\n", metadata.reg_id));
    xml.push_str("  </Header>\n");
    xml.push_str("  <Body>\n");
    xml.push_str("    <AggregateData>\n");
    xml.push_str(&format!("      <TotalAmount>{}</TotalAmount>\n", total_amount));
    xml.push_str(&format!("      <TotalVAT>{}</TotalVAT>\n", total_vat));
    xml.push_str("    </AggregateData>\n");
    
    xml.push_str("    <TaxAdjustments>\n");
    for adj in &adjustments {
        xml.push_str("      <Adjustment>\n");
        xml.push_str(&format!("        <Category>{}</Category>\n", adj.category));
        xml.push_str(&format!("        <Amount>{}</Amount>\n", adj.difference));
        xml.push_str(&format!("        <Disposal>{}</Disposal>\n", adj.disposal));
        xml.push_str("      </Adjustment>\n");
    }
    xml.push_str("    </TaxAdjustments>\n");
    xml.push_str("  </Body>\n");
    xml.push_str("</HometaxFiling>");

    // 3. PII Protection & Density Check
    let pii_density = file_utils::calculate_pii_density(&xml);
    let requires_audit = pii_density > 0.05 || total_amount > 500_000_000.0;
    
    let risk_summary = if requires_audit {
        "데이터 밀집도 또는 고액 거래 감지로 인해 AI 세무 감사가 필요합니다.".to_string()
    } else {
        "기본 검증 완료. 신고 가능한 수준입니다.".to_string()
    };

    Ok(TaxFilingPackage {
        xml_content: xml,
        pii_density,
        risk_summary,
        requires_audit,
    })
}

// 기존 함수 유지 (호환성용)
pub fn calculate_tax_adjustments(ledger: Vec<JournalEntry>) -> Vec<TaxAdjustment> {
    let mut adjustments = Vec::new();
    for entry in ledger {
        if let Some(ref tax_code) = entry.tax_code {
             match tax_code.as_str() {
                "ENTERTAINMENT_NO_PROOF" => {
                    adjustments.push(TaxAdjustment {
                        category: "접대비(증빙불비)".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 0.0,
                        difference: entry.amount,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "기타사외유출".to_string(),
                    });
                },
                _ => {}
             }
        }
    }
    adjustments
}

pub fn generate_standard_forms(_ledger: Vec<JournalEntry>, _adjustments: Vec<TaxAdjustment>) -> StandardTaxForms {
    StandardTaxForms {
        vat_summary: "부가가치세 신고서(요약)".to_string(),
        corporate_tax_summary: "법인세 과세표준 및 세액조정계산서".to_string(),
        adjustment_ledger: "세무조정계산서".to_string(),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StandardTaxForms {
    pub vat_summary: String,
    pub corporate_tax_summary: String,
    pub adjustment_ledger: String,
}
