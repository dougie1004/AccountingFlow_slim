// Modular Architecture
pub mod core;
pub mod accounting;
pub mod scm;
pub mod tax;
pub mod ai;
pub mod governance;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::parse_transaction,
            commands::process_batch,
            commands::process_mass_ai_batch,
            commands::process_universal_file,
            commands::run_closing,
            commands::run_tax_bridge,
            commands::create_snapshot,
            commands::verify_proof,
            commands::generate_tax_forms,
            commands::check_modification_allowed,
            commands::generate_filing,
            commands::run_depreciation,
            commands::process_scm_order,
            commands::run_validation_checks,
            commands::run_simulation_data,
            commands::approve_partner,
            commands::save_tenant_config,
            commands::load_tenant_config,
            commands::batch_export_with_validation,
            commands::detect_batch_anomalies,
            commands::generate_cash_flow_forecast,
            commands::generate_management_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
