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

use crate::core::models::JournalEntry;
use std::collections::HashMap;

pub fn extract_structural_metrics(entries: &[&JournalEntry], target_year: i32) -> (f64, f64, f64, f64, f64, f64, f64) {
    if entries.is_empty() {
        return (0.0, 0.0, 0.0, 0.2, 1.0, 0.0, 1000.0);
    }

    let mut monthly_totals = vec![0.0; 12];
    let mut vendor_totals: HashMap<String, f64> = HashMap::new();
    let mut total_amount = 0.0;
    let mut base_count = 0;
    
    let year_str = target_year.to_string();
    
    for e in entries {
        if e.date.starts_with(&year_str) {
            let amt = e.amount;
            total_amount += amt;
            base_count += 1;
            
            if e.date.len() >= 7 {
                if let Ok(m) = e.date[5..7].parse::<usize>() {
                    if m >= 1 && m <= 12 {
                        monthly_totals[m - 1] += amt;
                    }
                }
            }
            
            let vendor = e.vendor.clone().unwrap_or_else(|| "UNKNOWN".to_string());
            *vendor_totals.entry(vendor).or_insert(0.0) += amt;
        }
    }
    
    let mean = total_amount / 12.0;    
    let mut variance = 0.0;
    let mut max_month = 0.0;
    
    for &m_amt in &monthly_totals {
        variance += (m_amt - mean).powi(2);
        if m_amt > max_month {
            max_month = m_amt;
        }
    }
    variance /= 12.0;
    let std_dev = variance.sqrt();
    let cv = if mean > 0.0 { std_dev / mean } else { 0.0 };
    
    let spike_ratio = if mean > 0.0 { max_month / mean } else { 1.0 };
    
    let mut hhi_current = 0.0;
    if total_amount > 0.0 {
        for &v_amt in vendor_totals.values() {
            let share = v_amt / total_amount;
            hhi_current += share * share;
        }
    }
    
    let ur = 0.15; // In v1.0, unexplained_delta is a base constant, normally drawn from missing receipts
    let hhi_expected = 0.20; // Structural baseline HHI
    let budget_excess = 0.0;
    let budget = total_amount * 1.05; // 5% buffer rule
    
    (ur, cv, hhi_current, hhi_expected, spike_ratio, budget_excess, budget)
}
