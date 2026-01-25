// Modular Architecture
pub mod core;
pub mod accounting;
pub mod scm;
pub mod tax;
pub mod ai;
pub mod governance;
pub mod inventory;
pub mod utils;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // [Antigravity] Inject API Key for Dev Environment
    if std::env::var("GEMINI_API_KEY").is_err() {
        std::env::set_var("GEMINI_API_KEY", "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE");
        println!("[Antigravity] Dev API Key injected successfully.");
    }

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
            commands::generate_management_report,
            commands::run_erp_migration,
            commands::verify_receipt_compliance,
            commands::evaluate_inventory_assets,
            commands::estimate_corporate_tax,
            commands::get_tax_adjustments,
            commands::chat_with_compliance,
            commands::get_bank_presets,
            commands::get_file_headers,
            commands::suggest_file_mapping,
            commands::process_file_with_mapping,
            commands::load_demo_scenario,
            commands::generate_journal_id,
            commands::get_startup_insights,
            commands::process_advanced_ledger,
            commands::generate_bridge_package,
            commands::get_compliance_mappings,
            commands::get_ir_financial_summary,
            commands::generate_tax_pro_pack,
            commands::parse_universal_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
