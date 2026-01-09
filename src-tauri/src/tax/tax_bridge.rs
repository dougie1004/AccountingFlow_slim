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
                "INVENTORY_LOSS" => {
                    adjustments.push(TaxAdjustment {
                        category: "재고자산평가손실(부인)".to_string(),
                        book_amount: entry.amount,
                        tax_amount: 0.0,
                        difference: entry.amount,
                        adjustment_type: "Inclusion".to_string(),
                        disposal: "유보(발생)".to_string(),
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

    // 2.5 Tax Estimation (추정 법인세)
    let total_adj: f64 = adjustments.iter().map(|a| a.difference).sum();
    let taxable_income = total_amount * 0.2 + total_adj; // 간이 이익 계산 (현업에선 재무제표 기준)
    let is_sme = metadata.corp_type == "SME";
    let est = calculate_estimated_tax(taxable_income, is_sme);

    xml.push_str("    <TaxEstimation>\n");
    xml.push_str(&format!("      <TaxableIncome>{:.0}</TaxableIncome>\n", est.taxable_income));
    xml.push_str(&format!("      <BaseTax>{:.0}</BaseTax>\n", est.base_tax));
    xml.push_str(&format!("      <Deductions>{:.0}</Deductions>\n", est.deductions));
    xml.push_str(&format!("      <FinalTax>{:.0}</FinalTax>\n", est.final_tax));
    xml.push_str(&format!("      <EffectiveRate>{:.2}</EffectiveRate>\n", est.effective_rate));
    xml.push_str("    </TaxEstimation>\n");

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
#[serde(rename_all = "camelCase")]
pub struct TaxEstimation {
    pub taxable_income: f64,
    pub base_tax: f64,
    pub deductions: f64,
    pub final_tax: f64,
    pub effective_rate: f64,
}

pub fn calculate_estimated_tax(taxable_income: f64, is_sme: bool) -> TaxEstimation {
    // 2024/2025 한국 법인세율 (지방소득세 제외)
    // 2억 이하: 9%
    // 2억 ~ 200억: 19%
    let income = if taxable_income > 0.0 { taxable_income } else { 0.0 };
    let mut tax = 0.0;

    if income <= 200_000_000.0 {
        tax = income * 0.09;
    } else if income <= 20_000_000_000.0 {
        tax = 18_000_000.0 + (income - 200_000_000.0) * 0.19;
    } else {
        tax = 18_000_000.0 + 3_762_000_000.0 + (income - 20_000_000_000.0) * 0.24;
    }

    // 중소기업 특별세액감면 (간이 10% 적용)
    let deductions = if is_sme { tax * 0.1 } else { 0.0 };
    let final_tax = tax - deductions;
    let effective_rate = if income > 0.0 { (final_tax / income) * 100.0 } else { 0.0 };

    TaxEstimation {
        taxable_income,
        base_tax: tax,
        deductions,
        final_tax,
        effective_rate,
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StandardTaxForms {
    pub vat_summary: String,
    pub corporate_tax_summary: String,
    pub adjustment_ledger: String,
}
