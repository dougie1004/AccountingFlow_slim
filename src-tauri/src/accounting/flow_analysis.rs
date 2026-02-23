use crate::models::{RiskIndex, RiskBreakdown, RiskGrade};

pub fn calculate_afri(ur: f64, cv: f64, hhi_current: f64, hhi_expected: f64, spike_ratio: f64, budget_excess: f64, budget: f64) -> RiskIndex {
    // 1. Normalize Constraints (0~1 락핑 클램프)
    let vr = (cv / 1.5).min(1.0).max(0.0);
    let delta_hhi = hhi_current - hhi_expected;
    let cr = if delta_hhi > 0.0 { (delta_hhi / 0.25).min(1.0) } else { 0.0 }; // 절대 음수 방어
    let tr = ((spike_ratio - 1.0) / 2.0).min(1.0).max(0.0);
    let br = if budget > 0.0 { (budget_excess / budget).min(1.0).max(0.0) } else { 0.0 }; // 0으로 나누기 방어
    let ur_norm = ur.min(1.0).max(0.0);

    // 2. Hard Locked Formula (가중치 동적 변경 절대 금지 - AFRI v1.0)
    let total_score = (0.30 * ur_norm) + (0.20 * vr) + (0.20 * cr) + (0.15 * tr) + (0.15 * br);

    // 3. Deterministic Grade Mapping
    let grade = if total_score >= 0.80 {
        RiskGrade::Critical
    } else if total_score >= 0.60 {
        RiskGrade::High
    } else if total_score >= 0.30 {
        RiskGrade::Moderate
    } else {
        RiskGrade::Low
    };

    RiskIndex { 
        total_score, 
        grade, 
        breakdown: RiskBreakdown { 
            unexplained_ratio: ur_norm, 
            volatility_risk: vr, 
            concentration_risk: cr, 
            temporal_risk: tr, 
            budget_risk: br 
        } 
    }
}
