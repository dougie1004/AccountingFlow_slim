use crate::core::models::TenantConfig;

pub fn check_modifiable(date: &str, config: &TenantConfig) -> Result<(), String> {
    if config.is_read_only {
        return Err("Tenant is in Read-Only mode.".to_string());
    }

    if let Some(closing_date) = &config.closing_date {
        if date <= closing_date.as_str() {
            return Err(format!("Period closed. Transaction date {} is on or before closing date {}.", date, closing_date));
        }
    }

    Ok(())
}
