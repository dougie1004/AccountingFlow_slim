use crate::core::models::{JournalEntry, EntityMetadata, TaxFilingPackage, SystemError};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxAdjustment {
    pub category: String,
    pub description: String,
    pub difference: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimatedTaxResult {
    pub taxable_income: f64,
    pub final_tax: f64,
    pub effective_rate: f64,
    pub rnd_credit: f64,
    pub employment_credit: f64,
}

pub fn generate_hometax_xml(
    _ledger: Vec<JournalEntry>,
    meta: &EntityMetadata,
    _adjustments: Vec<String>
) -> Result<TaxFilingPackage, SystemError> {
    // Slimmed: Generate a minimal XML structure for demo purposes
    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<TaxFiling>
    <Header>
        <CompanyName>{}</CompanyName>
        <RegID>{}</RegID>
    </Header>
    <Body>
        <Status>Finalized</Status>
    </Body>
</TaxFiling>"#,
        meta.company_name, meta.reg_id
    );

    Ok(TaxFilingPackage { xml_content: xml })
}

pub fn calculate_tax_adjustments(ledger: Vec<JournalEntry>) -> Vec<TaxAdjustment> {
    let mut adjustments = Vec::new();
    
    // Example: Entertainment expenses limit (mock)
    let entertainment: f64 = ledger.iter()
        .filter(|e| e.debit_account.contains("접대비") || e.description.contains("접대"))
        .map(|e| e.amount)
        .sum();
    
    if entertainment > 24_000_000.0 {
         adjustments.push(TaxAdjustment {
             category: "접대비 한도 초과".to_string(),
             description: "법인세법상 한도 초과분 손금 불산입".to_string(),
             difference: entertainment - 24_000_000.0,
         });
    }

    adjustments
}

pub fn calculate_estimated_tax(
    revenue: f64,
    taxable_income: f64,
    is_startup: bool,
    rnd_expense: f64,
    employment_increase: u32,
    youth_employ_count: u32
) -> EstimatedTaxResult {
    // Simplified Korean Corporate Tax logic (2024 rates)
    // < 200M: 9%, 200M~20B: 19%
    let tax_base = taxable_income.max(0.0);
    let mut tax = if tax_base <= 200_000_000.0 {
        tax_base * 0.09
    } else {
        200_000_000.0 * 0.09 + (tax_base - 200_000_000.0) * 0.19
    };

    // Tax Credits
    let rnd_credit = rnd_expense * 0.25;
    let employment_credit = (youth_employ_count as f64 * 11_000_000.0) + (employment_increase as f64 * 7_000_000.0); 
    
    let total_credit = rnd_credit + employment_credit;
    tax = (tax - total_credit).max(0.0);

    // Startup reduction (50~100%) - Simplified
    if is_startup && revenue < 100_000_000.0 { // Very simplified check
         tax = tax * 0.5;
    }

    EstimatedTaxResult {
        taxable_income: tax_base,
        final_tax: tax,
        effective_rate: if revenue > 0.0 { (tax / revenue) * 100.0 } else { 0.0 },
        rnd_credit,
        employment_credit
    }
}
