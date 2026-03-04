use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{params, Connection};
use crate::core::models::SystemError;

pub fn initialize_database(app_handle: &AppHandle) -> Result<(), SystemError> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| { eprintln!("[DB Init] Path Error: {}", e); SystemError::Internal })?;
    if !app_dir.exists() { std::fs::create_dir_all(&app_dir).ok(); }
    
    let db_path = app_dir.join("accounting_slim_v1.db");
    let conn = Connection::open(db_path).map_err(|e| { eprintln!("[DB Init] Open Error: {}", e); SystemError::DatabaseError })?;

    println!(">>> [INIT] Initializing AccountingFlow Slim DB...");

    // 1. Journal Entries (Core)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            vendor TEXT,
            debit_account TEXT NOT NULL,
            credit_account TEXT NOT NULL,
            amount REAL NOT NULL,
            vat REAL DEFAULT 0,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'Open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    // 2. Tenant Config
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tenant_config (
            id TEXT PRIMARY KEY,
            config_json TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    // 3. Accounts (Master Data - Constitutional Art. 4 Enforcement)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            nature TEXT NOT NULL
        )",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    // 4. Initial Balances
    conn.execute(
        "CREATE TABLE IF NOT EXISTS initial_balances (
            account TEXT PRIMARY KEY,
            amount REAL NOT NULL
        )",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    // 5. Account Risk Profile (AFRI v1.0)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS account_risk_profile (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            total_score REAL NOT NULL,
            ur REAL NOT NULL,
            vr REAL NOT NULL,
            cr REAL NOT NULL,
            tr REAL NOT NULL,
            br REAL NOT NULL,
            grade TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    // 6. Local Business Memory Layer (High-Precision V2)
    // Stores historical confirmation patterns for complex multi-leg account suggestions
    conn.execute(
        "CREATE TABLE IF NOT EXISTS business_patterns_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            context_hash TEXT NOT NULL,
            debit_legs TEXT NOT NULL,
            credit_legs TEXT NOT NULL,
            usage_count INTEGER DEFAULT 1,
            last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, context_hash)
        )",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Query Execution Error: {}", e); SystemError::DatabaseError })?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pattern_context ON business_patterns_v2(tenant_id, context_hash)",
        params![]
    ).map_err(|e| { eprintln!("[DB Init] Index Creation Error: {}", e); SystemError::DatabaseError })?;

    // [CONSTITUTION Art. 4] Mandatory Seeding of Standard Accounts
    // Ensure all standard accounts exist with their natures.
    let standard_accounts = vec![
        ("현금", "ASSET"),
        ("보통예금", "ASSET"),
        ("매출", "NON_OPERATING"),
        ("매출원가", "COGS"),
        ("급여", "SG&A"),
        ("지급수수료", "SG&A"),
        ("지급임차료", "SG&A"),
    ];

    for (name, nature) in standard_accounts {
        conn.execute(
            "INSERT OR IGNORE INTO accounts (id, name, nature) VALUES (?1, ?2, ?3)",
            params![uuid::Uuid::new_v4().to_string(), name, nature]
        ).ok();
    }

    Ok(())
}

pub fn get_connection(app_handle: &tauri::AppHandle) -> Result<rusqlite::Connection, SystemError> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| { eprintln!("[DB Conn] Path Error: {}", e); SystemError::Internal })?;
    let db_path = app_dir.join("accounting_slim_v1.db");
    rusqlite::Connection::open(db_path).map_err(|e| { eprintln!("[DB Conn] Open Error: {}", e); SystemError::DatabaseError })
}

pub fn save_config(conn: &rusqlite::Connection, tenant_id: &str, config_json: &str) -> Result<(), SystemError> {
    conn.execute(
        "INSERT OR REPLACE INTO tenant_config (id, config_json) VALUES (?1, ?2)",
        params![tenant_id, config_json]
    ).map_err(|e| { eprintln!("[DB Config] Save Error: {}", e); SystemError::DatabaseError })?;
    Ok(())
}
