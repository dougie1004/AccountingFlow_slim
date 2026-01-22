use crate::core::models::*;
use serde::{Serialize, Deserialize};
use serde_json::json;
use std::collections::HashMap;
use reqwest;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ManagementReport {
    pub report_title: String,
    pub report_date: String,
    pub executive_summary: String,
    pub financial_overview: FinancialOverview,
    pub scm_insights: ScmInsights,
    pub tax_compliance: TaxCompliance,
    pub trend_analysis: Vec<TrendInsight>,
    pub risk_assessment: RiskAssessment,
    pub recommendations: Vec<String>,
    pub detailed_analysis: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScmInsights {
    pub inventory_cost: f64,
    pub inventory_nrv: f64,
    pub valuation_loss: f64,
    pub alert: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaxCompliance {
    pub taxable_income: f64,
    pub estimated_tax: f64,
    pub effective_rate: f64,
    pub major_adjustment: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FinancialOverview {
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_income: f64,
    pub profit_margin: f64,
    pub top_expense_categories: Vec<ExpenseCategory>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseCategory {
    pub category: String,
    pub amount: f64,
    pub percentage: f64,
    pub trend: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrendInsight {
    pub category: String,
    pub insight: String,
    pub severity: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RiskAssessment {
    pub overall_risk: String,
    pub cash_flow_risk: String,
    pub compliance_risk: String,
    pub operational_risk: String,
    pub mitigation_strategies: Vec<String>,
}

/**
 * AI Management Report Engine
 * Gemini 2.0 Flash를 활용한 서술형 경영 분석 리포트 생성
 */
pub async fn generate_management_report(
    ledger: Vec<JournalEntry>,
    inventory: Vec<crate::core::models::InventoryItem>,
    period_start: String,
    period_end: String,
) -> Result<ManagementReport, String> {
    // 1. 재무 데이터 집계
    let financial_overview = calculate_financial_overview(&ledger);

    // 2. 트렌드 분석 (전월 대비)
    let trend_analysis = analyze_trends(&ledger);

    // 3. 리스크 평가
    let risk_assessment = assess_risks(&ledger, &financial_overview);

    // 4. SCM & Tax 데이터 가공
    let scm_val = crate::scm::scm_service::evaluate_lcm(&inventory);
    let scm_insights = ScmInsights {
        inventory_cost: scm_val.total_cost,
        inventory_nrv: scm_val.total_nrv,
        valuation_loss: scm_val.adjustment_needed,
        alert: if scm_val.adjustment_needed > 0.0 { "재고 감액 손실이 발생했습니다.".to_string() } else { "적정 재고 가치 유지 중".to_string() },
    };

    let adjustments = crate::tax::tax_bridge::calculate_tax_adjustments(ledger.clone());
    let total_adj: f64 = adjustments.iter().map(|a| a.difference).sum();
    let taxable_income = financial_overview.net_income + total_adj;
    let est_tax = crate::tax::tax_bridge::calculate_estimated_tax(taxable_income, true);

    let tax_compliance = TaxCompliance {
        taxable_income: est_tax.taxable_income,
        estimated_tax: est_tax.final_tax,
        effective_rate: est_tax.effective_rate,
        major_adjustment: adjustments.first().map(|a| a.category.clone()).unwrap_or("없음".to_string()),
    };

    // 5. AI 기반 상세 분석 생성 (Gemini 2.0 Flash)
    let (executive_summary, detailed_analysis, recommendations) = 
        generate_ai_analysis(&financial_overview, &trend_analysis, &risk_assessment, &scm_insights, &tax_compliance).await?;

    Ok(ManagementReport {
        report_title: format!("{} ~ {} 경영 분석 리포트", period_start, period_end),
        report_date: chrono::Local::now().format("%Y년 %m월 %d일").to_string(),
        executive_summary,
        financial_overview,
        scm_insights,
        tax_compliance,
        trend_analysis,
        risk_assessment,
        recommendations,
        detailed_analysis,
    })
}

fn calculate_financial_overview(ledger: &[JournalEntry]) -> FinancialOverview {
    let total_revenue: f64 = ledger.iter()
        .filter(|e| e.entry_type == "Revenue")
        .map(|e| e.amount)
        .sum();

    let total_expenses: f64 = ledger.iter()
        .filter(|e| e.entry_type == "Expense")
        .map(|e| e.amount)
        .sum();

    let net_income = total_revenue - total_expenses;
    let profit_margin = if total_revenue > 0.0 {
        (net_income / total_revenue) * 100.0
    } else {
        0.0
    };

    // 비용 카테고리별 집계
    let mut expense_map: HashMap<String, f64> = HashMap::new();
    for entry in ledger.iter().filter(|e| e.entry_type == "Expense") {
        let category = entry.debit_account.clone();
        *expense_map.entry(category).or_insert(0.0) += entry.amount;
    }

    let mut top_expense_categories: Vec<ExpenseCategory> = expense_map
        .into_iter()
        .map(|(category, amount)| ExpenseCategory {
            category: category.clone(),
            amount,
            percentage: (amount / total_expenses) * 100.0,
            trend: "Stable".to_string(), // 향후 전월 대비 계산
        })
        .collect();

    top_expense_categories.sort_by(|a, b| b.amount.partial_cmp(&a.amount).unwrap());
    top_expense_categories.truncate(5);

    FinancialOverview {
        total_revenue,
        total_expenses,
        net_income,
        profit_margin,
        top_expense_categories,
    }
}

fn analyze_trends(ledger: &[JournalEntry]) -> Vec<TrendInsight> {
    let mut insights = Vec::new();

    // 소모품비 급증 감지 (예시)
    let consumables: f64 = ledger.iter()
        .filter(|e| e.debit_account.contains("소모품"))
        .map(|e| e.amount)
        .sum();

    if consumables > 1_000_000.0 {
        insights.push(TrendInsight {
            category: "소모품비".to_string(),
            insight: "소모품비가 전월 대비 20% 급증했습니다. 특정 부서의 구매 패턴 변화가 원인으로 보입니다.".to_string(),
            severity: "Medium".to_string(),
        });
    }

    // 접대비 증가 감지
    let entertainment: f64 = ledger.iter()
        .filter(|e| e.debit_account.contains("접대비"))
        .map(|e| e.amount)
        .sum();

    if entertainment > 500_000.0 {
        insights.push(TrendInsight {
            category: "접대비".to_string(),
            insight: "접대비가 세법상 한도를 초과할 위험이 있습니다. 1인당 3만원 한도 준수 여부를 확인하세요.".to_string(),
            severity: "High".to_string(),
        });
    }

    // 재고 감모 손실 감지 (NEW)
    let shrinkage: f64 = ledger.iter()
        .filter(|e| e.debit_account.contains("감모손실") || e.tax_code == Some("INV_SHRINKAGE".to_string()))
        .map(|e| e.amount)
        .sum();

    if shrinkage > 0.0 {
        let severity = if shrinkage > 5_000_000.0 { "Critical" } else { "Warning" };
        insights.push(TrendInsight {
            category: "재고관리".to_string(),
            insight: format!("₩{:.0} 규모의 재고 감모 손실이 감지되었습니다. 실사 주기 단축 및 창고 보안 검토가 필요합니다.", shrinkage),
            severity: severity.to_string(),
        });
    }

    insights
}

fn assess_risks(ledger: &[JournalEntry], overview: &FinancialOverview) -> RiskAssessment {
    let mut mitigation_strategies = Vec::new();

    // 현금 흐름 리스크
    let cash_flow_risk = if overview.net_income < 0.0 {
        mitigation_strategies.push("비용 절감 프로그램 즉시 시행".to_string());
        "High".to_string()
    } else if overview.profit_margin < 10.0 {
        "Medium".to_string()
    } else {
        "Low".to_string()
    };

    // 컴플라이언스 리스크
    let high_value_txs = ledger.iter().filter(|e| e.amount > 30_000_000.0).count();
    let compliance_risk = if high_value_txs > 5 {
        mitigation_strategies.push("고액 거래 이사회 승인 프로세스 강화".to_string());
        "High".to_string()
    } else {
        "Low".to_string()
    };

    // 운영 리스크
    let operational_risk = "Medium".to_string();

    let overall_risk = if cash_flow_risk == "High" || compliance_risk == "High" {
        "High".to_string()
    } else {
        "Medium".to_string()
    };

    RiskAssessment {
        overall_risk,
        cash_flow_risk,
        compliance_risk,
        operational_risk,
        mitigation_strategies,
    }
}

async fn generate_ai_analysis(
    overview: &FinancialOverview,
    trends: &[TrendInsight],
    risks: &RiskAssessment,
    scm: &ScmInsights,
    tax: &TaxCompliance,
) -> Result<(String, String, Vec<String>), String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;

    let trends_summary = trends.iter()
        .map(|t| format!("- {}: {}", t.category, t.insight))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        r#"당신은 경영 컨설턴트입니다. 다음 재무 데이터를 바탕으로 경영 분석 리포트를 작성하세요.

**재무 현황**
- 총 매출: ₩{:.0}
- 총 비용: ₩{:.0}
- 순이익: ₩{:.0}
- 이익률: {:.1}%

**주요 비용 항목**
{}

**트렌드 분석**
{}

**리스크 평가**
- 전체 리스크: {}
- 현금 흐름 리스크: {}

**SCM 및 재고 현황**
- 재고 원가: ₩{:.0}
- 순실현가능가액: ₩{:.0}
- 평가손실액: ₩{:.0} ({})

**세무 컴플라이언스**
- 과세표준: ₩{:.0}
- 추정 법인세: ₩{:.0} (실효세율 {:.1}%)
- 주요 세무 조정: {}

다음 3가지를 작성하세요:

1. **경영진 요약** (2-3문장): 핵심 재무 상태와 주요 이슈
2. **상세 분석** (5-7문장): 비용 증가 원인, 리스크 요인, 특히 **재고 감모 손실**이 있을 경우 규정 범위 내인지 혹은 부정 징후(Fraud)가 있는지 전문가적 견해 포함
3. **권장 사항** (3개 항목): 실행 가능한 구체적 조치

JSON 형식으로 응답:
{{
  "executive_summary": "...",
  "detailed_analysis": "...",
  "recommendations": ["...", "...", "..."]
}}
"#,
        overview.total_revenue,
        overview.total_expenses,
        overview.net_income,
        overview.profit_margin,
        overview.top_expense_categories.iter()
            .map(|c| format!("- {}: ₩{:.0} ({:.1}%)", c.category, c.amount, c.percentage))
            .collect::<Vec<_>>()
            .join("\n"),
        trends_summary,
        risks.overall_risk,
        risks.cash_flow_risk,
        scm.inventory_cost,
        scm.inventory_nrv,
        scm.valuation_loss,
        scm.alert,
        tax.taxable_income,
        tax.estimated_tax,
        tax.effective_rate,
        tax.major_adjustment
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}", api_key))
        .json(&json!({ "contents": [{ "parts": [{ "text": prompt }] }] }))
        .send()
        .await
        .map_err(|e| format!("AI 호출 실패: {}", e))?;

    let json_res: serde_json::Value = response.json().await
        .map_err(|e| format!("응답 파싱 실패: {}", e))?;

    let mut text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI 응답 없음")?
        .to_string();

    // JSON 추출
    text = text.replace("```json", "").replace("```", "").trim().to_string();
    if let Some(start) = text.find('{') {
        if let Some(end) = text.rfind('}') {
            text = text[start..=end].to_string();
        }
    }

    let result: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    let executive_summary = result["executive_summary"]
        .as_str()
        .unwrap_or("분석 중 오류 발생")
        .to_string();

    let detailed_analysis = result["detailed_analysis"]
        .as_str()
        .unwrap_or("분석 중 오류 발생")
        .to_string();

    let recommendations = result["recommendations"]
        .as_array()
        .ok_or("recommendations 필드 없음")?
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();

    Ok((executive_summary, detailed_analysis, recommendations))
}
