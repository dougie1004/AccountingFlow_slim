use serde::{Serialize, Deserialize};
use crate::core::models::JournalEntry;
use crate::accounting::insights::{calculate_insights, StartupInsights};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IRFinancialSummary {
    pub capital_efficiency_ratio: f64,
    pub tax_adjusted_runway: f64,
    pub r_and_d_capitalization_value: f64,
    pub estimated_tax_benefits: f64,
    pub burn_rate: f64,
    pub real_available_cash: f64,
    pub valuation_uplift_multiplier: f64,
    pub fx_exposure_index: String,
    pub compliance_score: f64,
    pub investor_message: String,
    pub metrics: IRMetrics,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IRMetrics {
    pub rnd_to_burn_ratio: f64,
    pub cash_integrity_ratio: f64,
    pub fx_gain_loss: f64,
}

pub fn generate_ir_summary(ledger: &[JournalEntry]) -> IRFinancialSummary {
    let insights = calculate_insights(ledger);
    
    // 1. R&D Capitalization & Tax Credits (Recalculate or extract)
    let mut rnd_capitalized = 0.0;
    let mut total_burn = 0.0;
    let mut approved_count = 0;
    let mut fx_exposure = 0.0;
    let mut fx_gain_loss = 0.0;
    let mut total_revenue = 0.0;
    
    for entry in ledger {
        if entry.status == "Approved" {
            approved_count += 1;
            if entry.debit_account.contains("무형자산(개발비)") {
                rnd_capitalized += entry.amount;
            }
            if entry.entry_type == "Revenue" {
                total_revenue += entry.amount;
            }
            if entry.debit_account.contains("외화") || entry.description.contains("환차") {
                fx_exposure += entry.amount.abs();
                if entry.credit_account.contains("외화환산이익") { fx_gain_loss += entry.amount; }
                if entry.debit_account.contains("외화환산손실") { fx_gain_loss -= entry.amount; }
            }
        }
        if entry.entry_type == "Expense" {
            total_burn += entry.amount;
        }
    }

    // 2. Capital Efficiency Ratio = (R&D Assets / Total Burn)
    // 투자자 입장에서 "태운 돈 대비 얼마나 많은 기술 자산을 확보했는가"의 지표
    let cap_efficiency = if total_burn > 0.0 { rnd_capitalized / total_burn } else { 0.0 };

    // 3. Tax Credit Estimation (SME R&D 25%)
    let estimated_tax_credit = rnd_capitalized * 0.25;

    // 4. Tax-Adjusted Runway
    // (실질 가용 현금 + 세액공제 예상액) / 월평균 번레이트
    let adj_cash = insights.cash_analysis.real_available_cash + estimated_tax_credit;
    let adj_runway = if insights.burn_metrics.average_monthly_burn > 0.0 {
        adj_cash / insights.burn_metrics.average_monthly_burn
    } else {
        0.0
    };

    // 5. Compliance Score
    let compliance_score = if !ledger.is_empty() {
        (approved_count as f64 / ledger.len() as f64) * 100.0
    } else {
        100.0
    };

    // 6. FX Exposure Index
    let fx_ratio = if total_revenue > 0.0 { fx_exposure / total_revenue } else { 0.0 };
    let fx_level = if fx_ratio > 0.2 { "High Risk" } else if fx_ratio > 0.05 { "Monitored" } else { "Safe" };

    // 7. Investor Message (VC Friendly)
    let investor_message = format!(
        "당사는 효율적인 R&D 자산화 전략을 통해 Burn Rate 대비 {:.1}%의 기술 자산을 축적 중입니다. \
        또한 세액 공제 최적화를 통해 {}개월의 추가 런웨이를 확보하였으며, \
        전체 전표의 {:.1}%가 전문가 승인을 완료하여 매우 높은 투명성을 유지하고 있습니다.",
        cap_efficiency * 100.0,
        (adj_runway - insights.burn_metrics.runway_months).max(0.0).fixed_floor(),
        compliance_score
    );

    IRFinancialSummary {
        capital_efficiency_ratio: cap_efficiency,
        tax_adjusted_runway: adj_runway,
        r_and_d_capitalization_value: rnd_capitalized,
        estimated_tax_benefits: estimated_tax_credit,
        burn_rate: insights.burn_metrics.average_monthly_burn,
        real_available_cash: insights.cash_analysis.real_available_cash,
        valuation_uplift_multiplier: 1.2, // Simulated based on R&D asset impact
        fx_exposure_index: fx_level.to_string(),
        compliance_score,
        investor_message,
        metrics: IRMetrics {
            rnd_to_burn_ratio: cap_efficiency,
            cash_integrity_ratio: (insights.cash_analysis.real_available_cash / insights.cash_analysis.total_cash_balance).min(1.0),
            fx_gain_loss,
        }
    }
}

trait FloatExt {
    fn fixed_floor(&self) -> f64;
}

impl FloatExt for f64 {
    fn fixed_floor(&self) -> f64 {
         (self * 10.0).floor() / 10.0
    }
}
