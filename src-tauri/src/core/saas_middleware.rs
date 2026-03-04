use crate::core::models::{TenantConfig, SystemError};

pub fn check_modifiable(_date: &str, _config: &TenantConfig) -> Result<(), SystemError> {
    // Slimmed: In MVP/Solo mode, we assume journals are always modifiable.
    Ok(())
}
