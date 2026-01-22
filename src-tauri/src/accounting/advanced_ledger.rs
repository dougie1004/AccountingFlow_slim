use serde::{Deserialize, Serialize};
use crate::core::models::JournalEntry;

/// Trait for advanced accounting logic plugins
pub trait AdvancedAccountingModule {
    fn module_id(&self) -> &'static str;
    fn process_logic(&self, input: AdvancedLedgerInput, ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String>;
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdvancedLedgerInput {
    pub module_id: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdvancedLedgerOutput {
    pub status: String,
    pub summary: String,
    pub content: serde_json::Value,
    pub suggested_entries: Vec<SuggestedEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SuggestedEntry {
    pub account_code: String,
    pub account_name: String,
    pub debit: f64,
    pub credit: f64,
    pub description: String,
}

/// R&D Capitalization Engine
pub struct RndCapitalizationEngine;
impl AdvancedAccountingModule for RndCapitalizationEngine {
    fn module_id(&self) -> &'static str { "rnd_capitalization" }
    fn process_logic(&self, input: AdvancedLedgerInput, ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String> {
        let capitalization_ratio = input.payload["capitalizationRatio"].as_f64().unwrap_or(0.5);
        
        let mut total_labor_cost = 0.0;
        let mut capitalized_amount = 0.0;
        let mut target_entries_count = 0;

        for entry in ledger {
            // Check for labor costs (급여, 임금, 인건비)
            let is_labor = entry.debit_account.contains("급여") || 
                           entry.debit_account.contains("임금") || 
                           entry.debit_account.contains("인건비");
            
            // Check if it's tagged for a project or research (연구, 개발, Project)
            let is_rnd = entry.description.contains("연구") || 
                         entry.description.contains("개발") || 
                         entry.description.contains("Project") ||
                         entry.description.contains("기획");

            if is_labor && is_rnd && entry.status == "Approved" {
                total_labor_cost += entry.amount;
                target_entries_count += 1;
            }
        }

        capitalized_amount = total_labor_cost * capitalization_ratio;
        
        let mut suggested_entries = vec![];
        if capitalized_amount > 0.0 {
            // Dr. 무형자산(개발비) / Cr. 비용(급여/인건비 등 대체)
            suggested_entries.push(SuggestedEntry {
                account_code: "20100".to_string(),
                account_name: "무형자산(개발비)".to_string(),
                debit: capitalized_amount,
                credit: 0.0,
                description: format!("R&D 인건비 자산화 대체 (비율: {}%)", capitalization_ratio * 100.0),
            });
            suggested_entries.push(SuggestedEntry {
                account_code: "80100".to_string(),
                account_name: "인건비 대체(비용차감)".to_string(),
                debit: 0.0,
                credit: capitalized_amount,
                description: format!("R&D 인건비 자산화에 따른 비용 대체"),
            });
        }

        Ok(AdvancedLedgerOutput {
            status: "Success".to_string(),
            summary: format!("총 인건비 {}원 중 {}%를 자산화하여 무형자산 {}원을 생성합니다.", total_labor_cost, capitalization_ratio * 100.0, capitalized_amount),
            content: serde_json::json!({
                "totalLaborCost": total_labor_cost,
                "capitalizedAmount": capitalized_amount,
                "targetEntriesCount": target_entries_count,
                "impactOnNetIncome": capitalized_amount
            }),
            suggested_entries,
        })
    }
}

/// Stock-based Compensation Engine (Black-Scholes based)
pub struct StockCompensationEngine;
impl AdvancedAccountingModule for StockCompensationEngine {
    fn module_id(&self) -> &'static str { "stock_compensation" }
    fn process_logic(&self, input: AdvancedLedgerInput, _ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String> {
        let payload = &input.payload;
        let s0 = payload["stockPrice"].as_f64().unwrap_or(10000.0); // 현재 주가
        let k = payload["exercisePrice"].as_f64().unwrap_or(5000.0); // 행사가
        let t = payload["vestingYears"].as_f64().unwrap_or(2.0); // 가동(베스팅) 기간
        let r = payload["riskFreeRate"].as_f64().unwrap_or(0.035); // 무위험 이자율
        let sigma = payload["volatility"].as_f64().unwrap_or(0.4); // 변동성
        let quantity = payload["quantity"].as_f64().unwrap_or(1000.0); // 부여 수량

        // Simplified Black-Scholes Calculation
        let d1 = ( (s0 / k).ln() + (r + sigma.powi(2) / 2.0) * t ) / (sigma * t.sqrt());
        let d2 = d1 - sigma * t.sqrt();

        // Cumulative Normal Distribution (Approximation)
        fn norm_cdf(x: f64) -> f64 {
            1.0 / (1.0 + (-x * 1.5976).exp()) // Simple logistic approximation
        }

        let option_value = s0 * norm_cdf(d1) - k * (-r * t).exp() * norm_cdf(d2);
        let total_expense = option_value * quantity;
        let monthly_expense = total_expense / (t * 12.0);

        let mut suggested_entries = vec![];
        if monthly_expense > 0.0 {
            // Dr. 주식보상비용 (Expense) / Cr. 주식선택권 (Equity)
            suggested_entries.push(SuggestedEntry {
                account_code: "80200".to_string(),
                account_name: "주식보상비용".to_string(),
                debit: monthly_expense,
                credit: 0.0,
                description: format!("스톡옵션 비용 안분 (총 가치: ₩{:.0})", total_expense),
            });
            suggested_entries.push(SuggestedEntry {
                account_code: "30500".to_string(),
                account_name: "주식매수선택권(자본조정)".to_string(),
                debit: 0.0,
                credit: monthly_expense,
                description: format!("스톡옵션 부여에 따른 자본 조정 항목 계상"),
            });
        }

        Ok(AdvancedLedgerOutput {
            status: "Success".to_string(),
            summary: format!("블랙-숄즈 모델 기반 옵션 가치는 ₩{:.0}이며, 매월 ₩{:.0}의 비용 처리가 필요합니다.", option_value, monthly_expense),
            content: serde_json::json!({
                "optionValue": option_value,
                "totalExpense": total_expense,
                "monthlyExpense": monthly_expense,
                "vestingPeriod": format!("{:.1}년", t)
            }),
            suggested_entries,
        })
    }
}

/// Foreign Currency Revaluation Engine
pub struct CurrencyRevaluationEngine;
impl AdvancedAccountingModule for CurrencyRevaluationEngine {
    fn module_id(&self) -> &'static str { "currency_revaluation" }
    fn process_logic(&self, input: AdvancedLedgerInput, _ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String> {
        let payload = &input.payload;
        let balance_fc = payload["balance"].as_f64().unwrap_or(1000.0); // 외화 잔액
        let current_rate = payload["currentRate"].as_f64().unwrap_or(1350.0); // 현재 환율
        let book_rate = payload["bookRate"].as_f64().unwrap_or(1300.0); // 장부 환율 (평균 취득가)

        let revalued_amount = balance_fc * current_rate;
        let book_amount = balance_fc * book_rate;
        let gain_loss = revalued_amount - book_amount;

        let mut suggested_entries = vec![];
        if gain_loss != 0.0 {
            if gain_loss > 0.0 {
                // Dr. 외화예금 / Cr. 외화환산이익
                suggested_entries.push(SuggestedEntry {
                    account_code: "10300".to_string(),
                    account_name: "외화예금(평가)".to_string(),
                    debit: gain_loss.abs(),
                    credit: 0.0,
                    description: format!("기말 환율 재평가에 따른 자산 가치 증가 (환율: {})", current_rate),
                });
                suggested_entries.push(SuggestedEntry {
                    account_code: "90100".to_string(),
                    account_name: "외화환산이익".to_string(),
                    debit: 0.0,
                    credit: gain_loss.abs(),
                    description: format!("기말 외화환산이익 인식"),
                });
            } else {
                // Dr. 외화환산손실 / Cr. 외화예금
                suggested_entries.push(SuggestedEntry {
                    account_code: "90200".to_string(),
                    account_name: "외화환산손실".to_string(),
                    debit: gain_loss.abs(),
                    credit: 0.0,
                    description: format!("기말 환율 재평가에 따른 가치 하락 (환율: {})", current_rate),
                });
                suggested_entries.push(SuggestedEntry {
                    account_code: "10300".to_string(),
                    account_name: "외화예금(평가)".to_string(),
                    debit: 0.0,
                    credit: gain_loss.abs(),
                    description: format!("기말 외화환산손실 인식"),
                });
            }
        }

        Ok(AdvancedLedgerOutput {
            status: "Success".to_string(),
            summary: format!("외화 잔액 재평가 결과, ₩{:.0}의 {}이 발생했습니다.", gain_loss.abs(), if gain_loss >= 0.0 { "평가이익" } else { "평가손실" }),
            content: serde_json::json!({
                "gainLoss": gain_loss,
                "currentValuation": revalued_amount,
                "bookValuation": book_amount
            }),
            suggested_entries,
        })
    }
}

/// Tax Credit Finder Engine (Tax Benefit Optimizer)
pub struct TaxCreditFinderEngine;
impl AdvancedAccountingModule for TaxCreditFinderEngine {
    fn module_id(&self) -> &'static str { "tax_credit_finder" }
    fn process_logic(&self, _input: AdvancedLedgerInput, ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String> {
        let mut rnd_labor_cost = 0.0;
        let mut youth_employee_count = 0; // Simplified detection
        
        for entry in ledger {
            // R&D Labor Detection (Same as capitalization logic)
            let is_labor = entry.debit_account.contains("급여") || entry.debit_account.contains("인건비");
            let is_rnd = entry.description.contains("연구") || entry.description.contains("개발");
            
            if is_labor && is_rnd && entry.status == "Approved" {
                rnd_labor_cost += entry.amount;
            }

            // Youth Employment Detection (Simplified via tags/descriptions)
            if entry.description.contains("청년") && (entry.description.contains("입사") || entry.description.contains("채용")) {
                youth_employee_count += 1;
            }
        }

        // 1. R&D 세액공제 (SME 기준 25% 가정)
        let rnd_credit = rnd_labor_cost * 0.25;
        
        // 2. 통합고용세액공제 (청년 1명당 약 1,550만원 가정 - 수도권/중소기업 기준)
        let youth_credit = (youth_employee_count as f64) * 15_500_000.0;
        
        let total_benefit = rnd_credit + youth_credit;

        Ok(AdvancedLedgerOutput {
            status: "Success".to_string(),
            summary: format!("총 ₩{:.0}의 잠재적 세액공제 혜택이 탐지되었습니다. (R&D: ₩{:.0}, 고용: ₩{:.0})", total_benefit, rnd_credit, youth_credit),
            content: serde_json::json!({
                "rndCredit": rnd_credit,
                "youthEmploymentCredit": youth_credit,
                "totalBenefit": total_benefit,
                "rndLaborIdentified": rnd_labor_cost,
                "youthCount": youth_employee_count
            }),
            suggested_entries: vec![], // 세액공제는 결산 조정 사항으로 이월결손금 등 복합 로직 필요하므로 리포트 위주
        })
    }
}

/// CB/BW Amortized Cost Engine (Effective Interest Method)
pub struct FinancialInstrumentEngine;
impl AdvancedAccountingModule for FinancialInstrumentEngine {
    fn module_id(&self) -> &'static str { "financial_instruments" }
    fn process_logic(&self, _input: AdvancedLedgerInput, _ledger: &[JournalEntry]) -> Result<AdvancedLedgerOutput, String> {
        Ok(AdvancedLedgerOutput {
            status: "Success".to_string(),
            summary: "금융상품 상각 로직이 초기화되었습니다.".to_string(),
            content: serde_json::json!({ "message": "Financial Instruments logic initialized" }),
            suggested_entries: vec![],
        })
    }
}
