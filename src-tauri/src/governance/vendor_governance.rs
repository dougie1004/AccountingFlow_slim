use crate::core::models::{Partner, ParsedTransaction};
use uuid::Uuid;

/**
 * Vendor Governance
 * 거래처 관리 및 신규 거래처 임시 등록 로직 (UTF-8 보장)
 */
pub fn find_matching_partner(partners: &[Partner], reg_no: &Option<String>, name: &Option<String>) -> Option<Partner> {
    // 1. 사업자번호로 먼저 찾기
    if let Some(ref target_reg) = reg_no {
        let clean_target = target_reg.replace("-", "");
        if clean_target.len() >= 5 {
            if let Some(matched) = partners.iter().find(|p| {
                if let Some(ref p_reg) = p.reg_no {
                    p_reg.replace("-", "") == clean_target && p.status == "Approved"
                } else {
                    false
                }
            }) {
                return Some(matched.clone());
            }
        }
    }

    // 2. 이름으로 찾기
    if let Some(ref target_name) = name {
        return partners.iter().find(|p| {
            p.name.contains(target_name) || target_name.contains(&p.name)
        }).cloned();
    }

    None
}

pub fn create_pending_partner(parsed: &ParsedTransaction) -> Partner {
    Partner {
        id: Uuid::new_v4().to_string(),
        name: parsed.vendor.clone().unwrap_or_else(|| "거래처 미지정".to_string()),
        partner_type: "Vendor".to_string(),
        partner_code: None,
        reg_no: parsed.vendor_reg_no.clone(),
        status: "Pending".to_string(),
    }
}

pub fn validate_reg_no(reg_no: &str) -> Result<(), String> {
    let clean = reg_no.replace("-", "");
    if clean.len() != 10 {
        return Err("사업자등록번호는 10자리여야 합니다.".to_string());
    }
    if !clean.chars().all(|c| c.is_ascii_digit()) {
        return Err("사업자등록번호는 숫자만 포함해야 합니다.".to_string());
    }
    Ok(())
}
