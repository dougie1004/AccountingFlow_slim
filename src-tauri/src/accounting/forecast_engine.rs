use crate::core::models::JournalEntry;
use serde::{Serialize, Deserialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CashFlowForecast {
    pub current_balance: f64,
    pub monthly_burn_rate: f64,
    pub projected_months: Vec<MonthlyProjection>,
    pub government_fund_depletion_date: Option<String>,
    pub risk_level: String,
    pub recommendations: Vec<String>,
    pub ai_insights: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyProjection {
    pub month: String,
    pub projected_balance: f64,
    pub expected_revenue: f64,
    pub expected_expenses: f64,
    pub net_cash_flow: f64,
}

/**
 * AI Cash Flow Forecast Engine
 * Gemini 2.0 Flash를 활용한 3개월 현금 흐름 예측
 */
pub async fn generate_cash_flow_forecast(
    ledger: Vec<JournalEntry>,
    current_balance: f64,
) -> Result<CashFlowForecast, String> {
    // 1. 과거 월별 트렌드 분석 (최근 180일)
    let today = chrono::Local::now().naive_local();
    let mut monthly_stats = std::collections::BTreeMap::new();

    for entry in &ledger {
        if let Ok(dt) = chrono::NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d") {
            let key = dt.format("%Y-%m").to_string();
            let stats = monthly_stats.entry(key).or_insert((0.0, 0.0));
            if entry.entry_type == "Revenue" { stats.0 += entry.amount; }
            if entry.entry_type == "Expense" || entry.entry_type == "Payroll" { stats.1 += entry.amount; }
        }
    }

    // 2. 성장률/지출 변동률 계측 (최근 2개월 비교)
    let stats_vec: Vec<_> = monthly_stats.values().cloned().collect();
    let (rev_growth, exp_growth) = if stats_vec.len() >= 2 {
        let last = stats_vec[stats_vec.len() - 1];
        let prev = stats_vec[stats_vec.len() - 2];
        
        let rg = if prev.0 > 0.0 { (last.0 - prev.0) / prev.0 } else { 0.0 };
        let eg = if prev.1 > 0.0 { (last.1 - prev.1) / prev.1 } else { 0.0 };
        
        // 급격한 변동 제한 (Max 20%, Min -20%)
        (rg.clamp(-0.2, 0.2), eg.clamp(-0.2, 0.2))
    } else {
        (0.0, 0.0) // 데이터 부족 시 현상 유지(0%) 가정
    };

    let last_month_stats = stats_vec.last().cloned().unwrap_or((0.0, 0.0));
    let monthly_revenue = if last_month_stats.0 > 0.0 { last_month_stats.0 } else { 0.0 };
    let monthly_burn_rate = if last_month_stats.1 > 0.0 { last_month_stats.1 } else { 0.0 };

    // 3. AI 기반 예측 (Gemini 2.0 Flash) - 계산된 성장률 전달
    let ai_insights = generate_ai_insights(
        current_balance,
        monthly_burn_rate,
        monthly_revenue,
        rev_growth,
        exp_growth,
    ).await?;

    // 4. 3개월 예측 생성 (도출된 추세 반영)
    let mut projected_months = Vec::new();
    let mut running_balance = current_balance;

    for i in 1..=3 {
        let month_name = get_future_month_name(i);
        
        // 복리 성장 반영
        let expected_revenue = monthly_revenue * (1.0 + rev_growth).powi(i as i32);
        let expected_expenses = monthly_burn_rate * (1.0 + exp_growth).powi(i as i32);
        let net_cash_flow = expected_revenue - expected_expenses;
        
        running_balance += net_cash_flow;

        projected_months.push(MonthlyProjection {
            month: month_name,
            projected_balance: running_balance,
            expected_revenue,
            expected_expenses,
            net_cash_flow,
        });
    }

    // 5. 정부지원금 소진 시점 (지원금이 존재하는 경우만)
    let government_funds: f64 = ledger.iter()
        .filter(|e| e.credit_account.contains("정부보조금") || e.description.contains("정부지원금"))
        .map(|e| e.amount)
        .sum();

    let government_fund_depletion_date = if government_funds > 0.0 && monthly_burn_rate > 0.0 {
        let months_until_depletion = government_funds / monthly_burn_rate;
        Some(format!("약 {:.1}개월 후", months_until_depletion))
    } else {
        None
    };

    // 6. 리스크 레벨 판정 (추세 반영 잔액 기준)
    let risk_level = if running_balance < 0.0 {
        "High".to_string()
    } else if running_balance < monthly_burn_rate * 2.0 {
        "Medium".to_string()
    } else {
        "Low".to_string()
    };

    // 7. 권장 사항
    let mut recommendations = Vec::new();
    if running_balance < monthly_burn_rate * 3.0 {
        recommendations.push("⚠️ 현재 추세 유지 시 3개월 내 유동성 위기 발생 가능".to_string());
    }
    if exp_growth > 0.05 {
        recommendations.push(format!("📈 비용 증가세({:.1}%)가 가파릅니다. 고정비 점검 필요", exp_growth * 100.0));
    }
    if rev_growth < 0.0 && monthly_revenue > 0.0 {
        recommendations.push("📉 매출 감소 추세가 감지되었습니다. 수익 모델 다각화 검토 필요".to_string());
    }

    Ok(CashFlowForecast {
        current_balance,
        monthly_burn_rate,
        projected_months,
        government_fund_depletion_date,
        risk_level,
        recommendations,
        ai_insights,
    })
}

async fn generate_ai_insights(
    current_balance: f64,
    burn_rate: f64,
    revenue: f64,
    rev_growth: f64,
    exp_growth: f64,
) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "환경 변수 'GEMINI_API_KEY'가 설정되지 않았습니다.".to_string())?;

    let prompt = format!(
        r#"당신은 전문 CFO AI입니다. 다음의 '실제 데이터 기반 추세'를 분석하여 향후 3개월 리스크를 진단하세요.

현재 현금 잔액: ₩{:.0}
직전 월 매출: ₩{:.0} (기대 성장률: {:.1}%)
직전 월 지출: ₩{:.0} (지출 변동률: {:.1}%)

핵심 분석 내용:
1. 매출 성장세와 지출 증가세 중 무엇이 더 우세한가?
2. 현재의 현금 연소 속도(Burn Rate)가 감당 가능한 수준인가?
3. 경영진이 즉각 조치해야 할 재무적 트리거는?

2-3문장으로 매우 날카롭고 직설적으로 조언하세요. 존댓말을 사용하세요.
"#,
        current_balance, revenue, rev_growth * 100.0, burn_rate, exp_growth * 100.0
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

    let insights = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("AI 응답 없음")?
        .to_string();

    Ok(insights)
}

fn get_future_month_name(months_ahead: i32) -> String {
    let now = chrono::Local::now();
    let future = now + chrono::Duration::days(months_ahead as i64 * 30);
    future.format("%Y년 %m월").to_string()
}
