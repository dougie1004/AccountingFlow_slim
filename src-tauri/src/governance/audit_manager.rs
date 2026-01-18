use crate::core::models::{JournalEntry, TaxAdjustment, AuditSnapshot};

/**
 * Audit Manager
 * 회계 데이터 무결성 스냅샷 생성 및 감사 이력 관리 (UTF-8)
 */
pub fn create_audit_snapshot(ledger: Vec<JournalEntry>, adjustments: Vec<TaxAdjustment>) -> AuditSnapshot {
    let total_amount = ledger.iter().map(|e| e.amount).sum();
    let record_count = ledger.len();
    
    // Hash based on amount, count, and the first few entry IDs to ensure data linkage
    let timestamp = chrono::Local::now().to_rfc3339();
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    let seed = if !ledger.is_empty() { &ledger[0].id } else { "empty" };
    hasher.update(format!("{}{}{}", total_amount, record_count, seed).as_bytes());
    let integrity_hash = format!("{:x}", hasher.finalize());

    AuditSnapshot {
        total_amount,
        record_count,
        timestamp,
        integrity_hash,
        ledger,
        adjustments,
    }
}
