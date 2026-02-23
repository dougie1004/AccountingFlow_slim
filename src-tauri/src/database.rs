use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{params, Connection};

pub fn initialize_database(app_handle: &AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() { std::fs::create_dir_all(&app_dir).ok(); }
    
    let db_path = app_dir.join("accounting_slim_v1.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

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
    ).map_err(|e| e.to_string())?;

    // 2. Tenant Config
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tenant_config (
            id TEXT PRIMARY KEY,
            config_json TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // 3. Accounts (Master Data - Constitutional Art. 4 Enforcement)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            nature TEXT NOT NULL
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // 4. Initial Balances
    conn.execute(
        "CREATE TABLE IF NOT EXISTS initial_balances (
            account TEXT PRIMARY KEY,
            amount REAL NOT NULL
        )",
        params![]
    ).map_err(|e| e.to_string())?;

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
    ).map_err(|e| e.to_string())?;

    // [CONSTITUTION Art. 4] Mandatory Seeding of Standard Accounts
    // Ensure all standard accounts exist with their natures.
    let standard_accounts = vec![
        ("현금", "ASSET"),
        ("보통예금", "ASSET"),
        ("매출", "NON_OPERATING"),
        ("매출원가", "COGS"),
        ("급여", "SG&A"),
        ("지급수수료", "SG&A"),
        ("임차료", "SG&A"),
    ];

    for (name, nature) in standard_accounts {
        conn.execute(
            "INSERT OR IGNORE INTO accounts (id, name, nature) VALUES (?1, ?2, ?3)",
            params![uuid::Uuid::new_v4().to_string(), name, nature]
        ).ok();
    }

    Ok(())
}

pub fn save_config(conn: &Connection, tenant_id: &str, config_json: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO tenant_config (id, config_json) VALUES (?1, ?2)",
        params![tenant_id, config_json]
    ).map_err(|e| e.to_string())?;
    Ok(())
}
