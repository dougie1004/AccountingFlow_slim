import os

file_path = r'c:\Projects\AccountingFlow\src-tauri\src\commands.rs'

target = """#[tauri::command]
pub fn run_tax_bridge(ledger: Vec<JournalEntry>) -> Vec<TaxAdjustment> {
    tax_bridge::calculate_tax_adjustments(ledger)
}"""

replacement = """#[tauri::command]
pub async fn run_tax_bridge(
    ledger: Vec<JournalEntry>,
    config: TenantConfig,
) -> Result<crate::tax::tax_bridge::TaxFilingPackage, String> {
    let metadata = config.entity_metadata.ok_or("엔티티 메타데이터가 없습니다.")?;
    
    // 1. Generate XML & Base Reporting (Rust Offloading)
    let package = crate::tax::tax_bridge::generate_hometax_xml(
        ledger.clone(), 
        &metadata, 
        vec![] 
    ).map_err(|e| e.to_string())?;

    // 2. AI Audit Report (Gemini Integration)
    let data_summary = format!(
        "회사: {}, 전표 건수: {}, XML 크기: {}",
        metadata.company_name,
        ledger.len(),
        package.xml_content.len()
    );

    let mut final_package = package;
    if final_package.requires_audit {
        let ai_report = crate::ai::tax_audit::audit_tax_filing(&data_summary).await?;
        final_package.risk_summary = format!("{}\\n\\n### AI 세무 감사 결과:\\n{}", final_package.risk_summary, ai_report);
    }

    Ok(final_package)
}"""

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Try a more flexible match for whitespace
import re
pattern = re.escape(target).replace(r'\ ', r'\s+').replace(r'\n', r'\s+')
if re.search(pattern, content):
    new_content = re.sub(pattern, replacement, content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated commands.rs")
else:
    print("Target content not found in commands.rs")
