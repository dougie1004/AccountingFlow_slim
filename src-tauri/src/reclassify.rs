use tauri::AppHandle;
use rusqlite::params;
use crate::core::models::SystemError;
use crate::database;

#[tauri::command]
pub fn reclassify_severity(app_handle: AppHandle) -> Result<String, SystemError> {
    let conn = database::get_connection(&app_handle).map_err(|e| { 
        eprintln!("[Reclassify] DB Connection Error: {}", e); 
        SystemError::DatabaseError 
    })?;

    let critical_keywords = vec![
        "부정", "공금", "횡령", "배임", "비리", "뇌물", "리베이트", "금품수수",
        "구매부정", "담합", "유착", "비자금", "착복", "유용"
    ];

    let mut updated = 0;

    // Get all Low severity issues from account_risk_profile (aligned with slim_v1 schema)
    let mut stmt = conn.prepare(
        "SELECT id, description FROM account_risk_profile WHERE risk_status = 'Low'"
    ).map_err(|e| { 
        eprintln!("[Reclassify] Prepare Error: {}", e); 
        SystemError::DatabaseError 
    })?;

    let issues: Vec<(i64, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| { 
        eprintln!("[Reclassify] Query Error: {}", e); 
        SystemError::DatabaseError 
    })?
    .filter_map(|r| r.ok())
    .collect();

    for (id, desc) in issues {
        for keyword in &critical_keywords {
            if desc.contains(keyword) {
                conn.execute(
                    "UPDATE account_risk_profile SET risk_status = 'High' WHERE id = ?1",
                    params![id]
                ).map_err(|e| { 
                    eprintln!("[Reclassify] Update Error: {}", e); 
                    SystemError::DatabaseError 
                })?;
                updated += 1;
                println!(">>> [Reclassify] Updated risk record #{} to High (found: {})", id, keyword);
                break;
            }
        }
    }

    Ok(format!("{}건의 리스크 항목을 High로 재분류했습니다.", updated))
}
