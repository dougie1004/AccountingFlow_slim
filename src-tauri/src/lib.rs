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
    // Environment variables should be managed via external .env or system env

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
            commands::parse_universal_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
