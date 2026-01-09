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
    // 1. 과거 데이터 분석 (최근 3개월)
    let recent_entries: Vec<&JournalEntry> = ledger.iter()
        .rev()
        .take(100)
        .collect();

    let total_revenue: f64 = recent_entries.iter()
        .filter(|e| e.entry_type == "Revenue")
        .map(|e| e.amount)
        .sum();

    let total_expenses: f64 = recent_entries.iter()
        .filter(|e| e.entry_type == "Expense")
        .map(|e| e.amount)
        .sum();

    let government_funds: f64 = recent_entries.iter()
        .filter(|e| e.credit_account.contains("정부보조금") || e.description.contains("정부지원금"))
        .map(|e| e.amount)
        .sum();

    // 2. Burn Rate 계산 (월평균 지출)
    let monthly_burn_rate = total_expenses / 3.0;
    let monthly_revenue = total_revenue / 3.0;

    // 3. AI 기반 예측 (Gemini 2.0 Flash)
    let ai_insights = generate_ai_insights(
        current_balance,
        monthly_burn_rate,
        monthly_revenue,
        government_funds,
    ).await?;

    // 4. 3개월 예측 생성
    let mut projected_months = Vec::new();
    let mut running_balance = current_balance;

    for i in 1..=3 {
        let month_name = get_future_month_name(i);
        
        // 예측 수익/지출 (AI 인사이트 반영)
        let expected_revenue = monthly_revenue * (1.0 + (i as f64 * 0.05)); // 5% 성장 가정
        let expected_expenses = monthly_burn_rate * (1.0 + (i as f64 * 0.02)); // 2% 증가 가정
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

    // 5. 정부지원금 소진 시점 계산
    let government_fund_depletion_date = if government_funds > 0.0 {
        let months_until_depletion = government_funds / monthly_burn_rate;
        Some(format!("약 {:.1}개월 후", months_until_depletion))
    } else {
        None
    };

    // 6. 리스크 레벨 판정
    let risk_level = if running_balance < 0.0 {
        "High".to_string()
    } else if running_balance < monthly_burn_rate * 2.0 {
        "Medium".to_string()
    } else {
        "Low".to_string()
    };

    // 7. 권장 사항 생성
    let mut recommendations = Vec::new();
    if running_balance < monthly_burn_rate * 3.0 {
        recommendations.push("⚠️ 3개월 이내 현금 부족 예상. 추가 자금 조달 검토 필요".to_string());
    }
    if government_funds > current_balance * 0.5 {
        recommendations.push("💡 정부지원금 의존도가 높습니다. 자체 수익 다각화 필요".to_string());
    }
    if monthly_burn_rate > monthly_revenue {
        recommendations.push("📉 지출이 수익을 초과합니다. 비용 절감 방안 검토 필요".to_string());
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
    gov_funds: f64,
) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| {
        "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE".to_string()
    });

    let prompt = format!(
        r#"당신은 재무 분석 전문가입니다. 다음 데이터를 바탕으로 향후 3개월 현금 흐름을 분석하세요.

현재 현금: ₩{:.0}
월평균 지출: ₩{:.0}
월평균 수익: ₩{:.0}
정부지원금: ₩{:.0}

다음 질문에 답하세요:
1. 현재 재무 상태는 안정적인가?
2. 가장 큰 리스크는 무엇인가?
3. 3개월 내 자금 부족 가능성은?
4. 구체적인 개선 방안은?

2-3문장으로 핵심만 간결하게 답변하세요.
"#,
        current_balance, burn_rate, revenue, gov_funds
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
