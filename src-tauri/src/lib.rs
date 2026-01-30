// Modular Architecture
pub mod core;
pub mod accounting;
pub mod tax;
pub mod ai;
pub mod inventory;
pub mod utils;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Safe environment variable loading with verification
    for path in ["../.env", ".env", "./.env"] {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') { continue; }
                if let Some((key, value)) = line.split_once('=') {
                    let clean_value = value.trim().trim_matches('"').trim_matches('\'').to_string();
                    std::env::set_var(key.trim(), &clean_value);
                    
                    // Verification Logging: Show the user which key is being used
                    if key.trim() == "GEMINI_API_KEY" {
                        let len = clean_value.len();
                        if len > 8 {
                            let masked = format!("{}...{}", &clean_value[..6], &clean_value[len-4..]);
                            println!("[Backend] 🚀 AI Engine Ready with Key: {} (Length: {})", masked, len);
                        } else {
                            println!("[Backend] ⚠️ API Key too short! (Length: {})", len);
                        }
                    }
                }
            }
            break;
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::parse_transaction,
            commands::process_mass_ai_batch,
            commands::process_universal_file,
            commands::run_closing,
            commands::run_tax_bridge,
            commands::check_modification_allowed,
            commands::generate_filing,
            commands::run_depreciation,
            commands::save_tenant_config,
            commands::load_tenant_config,
            commands::batch_export_with_validation,
            commands::generate_journal_id,
            commands::parse_universal_file,
            commands::generic_ai_chat,
            commands::process_audit_context,
            commands::perform_audit_check
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
