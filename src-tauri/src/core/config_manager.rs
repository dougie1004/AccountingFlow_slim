use crate::core::models::TenantConfig;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/**
 * Config Manager
 * Handles persistence of tenant configuration to the local filesystem.
 */
fn get_config_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("./"));
    if !path.exists() {
        fs::create_dir_all(&path).ok();
    }
    path.push("tenant_config.json");
    path
}

pub fn save_config(app: &AppHandle, config: TenantConfig) -> Result<(), String> {
    let path = get_config_path(app);
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_config(app: &AppHandle) -> Result<TenantConfig, String> {
    let path = get_config_path(app);
    if !path.exists() {
        return Err("Configuration file not found".to_string());
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: TenantConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(config)
}
