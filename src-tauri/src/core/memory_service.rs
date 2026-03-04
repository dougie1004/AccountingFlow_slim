use rusqlite::{params, Connection};
use crate::core::models::{SystemError, JournalLeg, JournalEntry};
use crate::utils::memory_utils;

/**
 * Local Business Memory Service (V2.0 - High Precision)
 * Manages the persistence and retrieval of historical accounting patterns.
 */

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AccountSuggestion {
    pub debit_legs: Vec<JournalLeg>,
    pub credit_legs: Vec<JournalLeg>,
    pub usage_count: i32,
}

pub fn update_business_pattern_v2(
    conn: &Connection,
    tenant_id: &str,
    source: &str,
    flow: &str,
    vendor: &str,
    amount: f64,
    date: &str,
    debit_legs: Vec<JournalLeg>,
    credit_legs: Vec<JournalLeg>,
) -> Result<(), SystemError> {
    if vendor.is_empty() || debit_legs.is_empty() {
        return Ok(());
    }

    let context_hash = memory_utils::generate_pattern_hash(source, flow, vendor, amount, date);
    let debit_json = serde_json::to_string(&debit_legs).unwrap_or("[]".into());
    let credit_json = serde_json::to_string(&credit_legs).unwrap_or("[]".into());

    conn.execute(
        "INSERT INTO business_patterns_v2 (tenant_id, context_hash, debit_legs, credit_legs, usage_count)
         VALUES (?1, ?2, ?3, ?4, 1)
         ON CONFLICT(tenant_id, context_hash) DO UPDATE SET
            debit_legs = excluded.debit_legs,
            credit_legs = excluded.credit_legs,
            usage_count = usage_count + 1,
            last_used_at = CURRENT_TIMESTAMP",
        params![tenant_id, context_hash, debit_json, credit_json]
    ).map_err(|e| { eprintln!("[Memory Service] Update Error: {}", e); SystemError::DatabaseError })?;

    Ok(())
}

pub fn get_business_suggestions_v2(
    conn: &Connection,
    tenant_id: &str,
    source: &str,
    flow: &str,
    vendor: &str,
    amount: f64,
    date: &str,
) -> Result<Vec<AccountSuggestion>, SystemError> {
    if vendor.is_empty() {
        return Ok(vec![]);
    }

    let context_hash = memory_utils::generate_pattern_hash(source, flow, vendor, amount, date);

    let mut stmt = conn.prepare(
        "SELECT debit_legs, credit_legs, usage_count
         FROM business_patterns_v2
         WHERE tenant_id = ?1 AND context_hash = ?2
         LIMIT 3"
    ).map_err(|e| { eprintln!("[Memory Service] Suggestion Prepare Error: {}", e); SystemError::DatabaseError })?;

    let rows = stmt.query_map(params![tenant_id, context_hash], |row| {
        let debit_json: String = row.get(0)?;
        let credit_json: String = row.get(1)?;
        let usage_count: i32 = row.get(2)?;

        let debit_legs = serde_json::from_str(&debit_json).unwrap_or(vec![]);
        let credit_legs = serde_json::from_str(&credit_json).unwrap_or(vec![]);

        Ok(AccountSuggestion {
            debit_legs,
            credit_legs,
            usage_count,
        })
    }).map_err(|e| { eprintln!("[Memory Service] Suggestion Query Error: {}", e); SystemError::DatabaseError })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| { eprintln!("[Memory Service] Row Map Error: {}", e); SystemError::DatabaseError })?);
    }

    Ok(results)
}

pub fn reset_business_memory(
    conn: &Connection,
    tenant_id: &str,
) -> Result<(), SystemError> {
    conn.execute(
        "DELETE FROM business_patterns_v2 WHERE tenant_id = ?1",
        params![tenant_id],
    ).map_err(|e| { eprintln!("[Memory Service] Delete Error: {}", e); SystemError::DatabaseError })?;
    Ok(())
}
