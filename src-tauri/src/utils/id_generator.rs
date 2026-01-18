use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;


// In-memory counter storage: Map<"YYYYMMDD", current_sequence>
static SEQUENCE_MAP: Lazy<Mutex<HashMap<String, u32>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

#[derive(Debug, Clone, Copy)]
pub enum IdPrefix {
    General, // G - Normal
    Sales,   // S - Sales
    Purchase,// P - Purchase
    AI,      // A - Draft
}

impl IdPrefix {
    fn as_str(&self) -> &'static str {
        match self {
            IdPrefix::General => "G",
            IdPrefix::Sales => "S",
            IdPrefix::Purchase => "P",
            IdPrefix::AI => "A",
        }
    }
}

pub fn generate_id(date_str: &str, prefix: IdPrefix) -> String {
    // 1. Validate and Parse Date (YYYY-MM-DD -> YYYYMMDD)
    let date_clean = date_str.replace("-", "");
    let date_part = if date_clean.len() == 8 {
        date_clean
    } else {
        // Fallback to today if invalid
        chrono::Local::now().format("%Y%m%d").to_string()
    };

    // 2. Atomic Increment
    let mut map = SEQUENCE_MAP.lock().unwrap();
    let counter = map.entry(date_part.clone()).or_insert(0);
    *counter += 1;
    let sequence = *counter;

    // 3. Format: [Prefix][YYYYMMDD]-[0001]
    format!("{}{}-{:04}", prefix.as_str(), date_part, sequence)
}

// Logic to determine prefix based on transaction data
pub fn determine_prefix(entry_type: &str) -> IdPrefix {
    match entry_type {
        "Revenue" => IdPrefix::Sales,
        "Expense" | "Asset" => IdPrefix::Purchase,
        _ => IdPrefix::General,
    }
}
