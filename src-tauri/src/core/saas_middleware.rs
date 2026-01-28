use crate::core::models::TenantConfig;

pub fn check_modifiable(_date: &str, _config: &TenantConfig) -> Result<(), String> {
    // Slimmed: In MVP/Solo mode, we assume journals are always modifiable.
    Ok(())
}
