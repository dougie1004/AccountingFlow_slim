use crate::core::models::{TenantConfig, SystemError};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/**
 * Config Manager
 * Handles persistence of tenant configuration to the local filesystem.
 */
fn get_config_path(app: &AppHandle) -> Result<PathBuf, SystemError> {
    let mut path = app.path().app_config_dir().map_err(|e| { eprintln!("[Config Manager] Path Error: {}", e); SystemError::Internal })?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| { eprintln!("[Config Manager] Dir Creation Error: {}", e); SystemError::Internal })?;
    }
    path.push("tenant_config.json");
    Ok(path)
}

pub fn save_config(app: &AppHandle, config: TenantConfig) -> Result<(), SystemError> {
    let path = get_config_path(app)?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| { eprintln!("[Config Manager] Serialize Error: {}", e); SystemError::Internal })?;
    fs::write(path, json).map_err(|e| { eprintln!("[Config Manager] Write Error: {}", e); SystemError::Internal })?;
    Ok(())
}

pub fn load_config(app: &AppHandle) -> Result<TenantConfig, SystemError> {
    let path = get_config_path(app)?;
    if !path.exists() {
        return Ok(TenantConfig::default()); // Return default if not found instead of opaque internal error
    }
    let json = fs::read_to_string(path).map_err(|e| { eprintln!("[Config Manager] Read Error: {}", e); SystemError::Internal })?;
    let config: TenantConfig = serde_json::from_str(&json).map_err(|e| { eprintln!("[Config Manager] Deserialize Error: {}", e); SystemError::Internal })?;
    Ok(config)
}
