use serde::{Serialize, Deserialize};
use crate::core::models::JournalEntry;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupInsights {
    pub cash_analysis: CashAnalysis,
    pub burn_metrics: BurnMetrics,
    pub government_grants: Vec<GrantInfo>,
    pub generated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashAnalysis {
    pub total_cash_balance: f64,
    pub estimated_vat_to_pay: f64, // 납부 예정 부가세 (Estimated VAT to pay)
    pub fixed_operating_expenses: f64,
    pub real_available_cash: f64, // 실질 가용 자금
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BurnMetrics {
    pub average_monthly_burn: f64,
    pub runway_months: f64,
    pub recent_monthly_expenses: Vec<MonthlyExpense>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyExpense {
    pub month: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrantInfo {
    pub name: String,
    pub total_amount: f64,
    pub remaining_balance: f64,
}

pub fn calculate_insights(ledger: &[JournalEntry]) -> StartupInsights {
    // 1. Calculate Cash Balance & Liabilities
    let mut total_cash = 0.0;
    let mut vat_payable = 0.0;
    let mut vat_receivable = 0.0;
    let mut accounts_payable = 0.0; // 미지급금/미지급비용

    // Filter for Approved entries only for accurate insights
    let approved_entries: Vec<&JournalEntry> = ledger.iter()
        .filter(|e| e.status == "Approved")
        .collect();

    for entry in &approved_entries {
        // Cash Logic
        let is_cash_debit = entry.debit_account.contains("현금") || entry.debit_account.contains("예금") || entry.debit_account.to_lowercase().contains("cash") || entry.debit_account.to_lowercase().contains("bank");
        let is_cash_credit = entry.credit_account.contains("현금") || entry.credit_account.contains("예금") || entry.credit_account.to_lowercase().contains("cash") || entry.credit_account.to_lowercase().contains("bank");

        if is_cash_debit { total_cash += entry.amount + entry.vat; }
        if is_cash_credit { total_cash -= entry.amount + entry.vat; }

        // Liability Tracking: Accounts Payable, Credit Card (미지급금, 미지급비용, 카드대금)
        let is_payable_credit = entry.credit_account.contains("미지급") || entry.credit_account.contains("카드") || entry.credit_account.to_lowercase().contains("payable");
        let is_payable_debit = entry.debit_account.contains("미지급") || entry.debit_account.contains("카드") || entry.debit_account.to_lowercase().contains("payable");

        if is_payable_credit { accounts_payable += entry.amount + entry.vat; }
        if is_payable_debit { accounts_payable -= entry.amount + entry.vat; }

        // VAT Liability
        if entry.vat > 0.0 {
            match entry.entry_type.as_str() {
                "Revenue" | "매출" => vat_payable += entry.vat,
                "Expense" | "Asset" | "매입" => vat_receivable += entry.vat,
                _ => {}
            }
        }
    }

    // Estimated VAT to pay
    let estimated_vat_to_pay = (vat_payable - vat_receivable).max(0.0);

    // 2. Burn Rate & Runway
    let mut monthly_burn: HashMap<String, f64> = HashMap::new();
    
    // Sort logic date wise? We iterate all and bucket.
    for entry in &approved_entries {
        if entry.entry_type == "Expense" || entry.entry_type == "매입" {
            // YYYY-MM
            let month = entry.date.chars().take(7).collect::<String>();
            let entry_total = entry.amount + entry.vat; // Cash out perspective
            *monthly_burn.entry(month).or_insert(0.0) += entry_total;

            // Simple heuristic for fixed expenses: Rent, Payroll, Subscription
            let desc = entry.description.to_lowercase();
            let account = entry.debit_account.to_lowercase();
            if account.contains("wages") || account.contains("급여") || 
               account.contains("rent") || account.contains("임차료") || 
               account.contains("subscription") || desc.contains("software") {
                   // This is a rough estimation of "monthly fixed" - actually this logic sums ALL history. 
                   // Ideally we should take the last month's fixed expenses.
                   // Let's refine: We'll calculate fixed expenses based on the LATEST month's data.
            }
        }
    }

    // Sort months and take last 3
    let mut sorted_months: Vec<String> = monthly_burn.keys().cloned().collect();
    sorted_months.sort();
    sorted_months.reverse(); // Newest first

    let recent_months = sorted_months.iter().take(3).collect::<Vec<_>>();
    let mut total_burn_3m = 0.0;
    let mut months_count = 0;
    
    let mut latest_month_fixed_expenses = 0.0;

    if let Some(latest) = recent_months.first() {
         for entry in &approved_entries {
            let month = entry.date.chars().take(7).collect::<String>();
             if &month == *latest {
                let account = entry.debit_account.to_lowercase();
                if account.contains("wages") || account.contains("급여") || 
                   account.contains("rent") || account.contains("임차료") || 
                   account.contains("subscription") || entry.debit_account.contains("고정비") {
                       latest_month_fixed_expenses += entry.amount + entry.vat;
                   }
             }
         }
    }

    for month in recent_months {
        if let Some(amount) = monthly_burn.get(month) {
            total_burn_3m += amount;
            months_count += 1;
        }
    }

    let average_burn_rate = if months_count > 0 { total_burn_3m / months_count as f64 } else { 0.0 };

    // 3. Government Grants & Restricted Cash
    let mut grant_balances: HashMap<String, f64> = HashMap::new();
    let mut total_grant_cash = 0.0;

    for entry in &approved_entries {
        let is_grant_related = entry.description.contains("정부지원") || entry.description.contains("보조금") || entry.description.contains("출연금");
        if is_grant_related {
             let grant_name = "정부지원금 통합"; 
             if entry.credit_account.contains("보조금") || entry.credit_account.contains("출연금") {
                 let val = entry.amount;
                 *grant_balances.entry(grant_name.to_string()).or_insert(0.0) += val;
                 total_grant_cash += val;
             }
             if entry.debit_account.contains("보조금") || entry.debit_account.contains("출연금") {
                 let val = entry.amount;
                 *grant_balances.entry(grant_name.to_string()).or_insert(0.0) -= val;
                 total_grant_cash -= val;
             }
        }
    }

    // REAL AVAILABLE CASH: Cash - VAT - Accounts Payable - Grant Cash (since it's restricted)
    // We treat Grant Cash as a separate pool.
    let real_available_cash = (total_cash - estimated_vat_to_pay - accounts_payable - total_grant_cash).max(0.0);
    let runway = if average_burn_rate > 0.0 { real_available_cash / average_burn_rate } else { 0.0 };

    let grants: Vec<GrantInfo> = grant_balances.into_iter().map(|(k, v)| GrantInfo {
        name: k,
        total_amount: v,
        remaining_balance: v,
    }).collect();

    StartupInsights {
        cash_analysis: CashAnalysis {
            total_cash_balance: total_cash,
            estimated_vat_to_pay,
            fixed_operating_expenses: latest_month_fixed_expenses + accounts_payable, // Treat payables as immediate needs
            real_available_cash,
        },
        burn_metrics: BurnMetrics {
            average_monthly_burn: average_burn_rate,
            runway_months: runway,
            recent_monthly_expenses: monthly_burn.into_iter().map(|(k, v)| MonthlyExpense { month: k, amount: v }).collect(),
        },
        government_grants: grants,
        generated_at: chrono::Local::now().to_rfc3339(),
    }
}
