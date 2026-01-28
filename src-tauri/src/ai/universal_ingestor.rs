use crate::core::models::ParsedTransaction;
use std::path::Path;
use uuid::Uuid;

pub async fn ingest_universal_file(
    file_bytes: Vec<u8>,
    file_name: String,
) -> Result<Vec<ParsedTransaction>, String> {
    let path = Path::new(&file_name);
    let extension = path.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    let source_id = Uuid::new_v4().to_string();
    let source_info = format!("Source: {} (ID: {})", file_name, source_id);

    match extension.as_str() {
        "csv" | "tsv" => {
            let mut results = crate::ai::robust_parser::parse_robust_csv(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            Ok(results)
        }
        "xlsx" | "xls" | "xlsm" => {
            let mut results = crate::ai::excel_parser::parse_excel_file(file_bytes)?;
            attach_source_info(&mut results, &source_info);
            Ok(results)
        }
        "txt" => {
            let raw_text = String::from_utf8_lossy(&file_bytes).to_string();
            let mut ai_res = crate::ai::ai_service::call_journal_ai(&raw_text, None, "Default Policy", "default", "Pro").await?;
            ai_res.audit_trail.push(source_info.clone());
            Ok(vec![ai_res])
        }
        "pdf" | "jpg" | "jpeg" | "png" | "image" => {
            // Tier 1.5: Local OCR (Regex & Layout Template equivalent)
            if let Ok(Some(mut local_res)) = crate::ai::local_ocr_engine::perform_local_ocr(&file_bytes) {
                local_res.audit_trail.push(source_id.clone());
                local_res.reasoning.push_str(" | Local OCR Success");
                return Ok(vec![local_res]);
            }

            // Tier 3: Universal Media (Vision) -> AI (Fallback)
            let mut ai_res = crate::ai::ai_service::extract_transaction_from_media(file_bytes, &extension).await?;
            crate::ai::rule_based_classifier::classify_by_rules(&mut ai_res);
            
            ai_res.audit_trail.push(source_info.clone());
            Ok(vec![ai_res])
        }
        _ => Err(format!("Unsupported file format in Slim version: .{}", extension)),
    }
}

fn attach_source_info(transactions: &mut Vec<ParsedTransaction>, source_info: &str) {
    for tx in transactions {
        tx.audit_trail.push(source_info.to_string());
    }
}
