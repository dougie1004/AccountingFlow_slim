use regex::Regex;
use once_cell::sync::Lazy;

// Compiling regexes once for performance
static RRN_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\d{6})[-]?(\d{7})").unwrap());
static PHONE_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"(01[016789])[-.:]?(\d{3,4})[-.:]?(\d{4})").unwrap());
static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap());
// Naive Name handling: Masking known famous names or specific patterns if needed, 
// but for general text, RRN and Phone are the critical PIIs.

pub fn apply_deidentification(text: &str) -> String {
    let mut safe_text = text.to_string();

    // 1. Mask RRN (Resident Registration Number) -> 123456-*******
    safe_text = RRN_REGEX.replace_all(&safe_text, "$1-*******").to_string();

    // 2. Mask Phone Numbers -> 010-****-1234
    safe_text = PHONE_REGEX.replace_all(&safe_text, "$1-****-$3").to_string();
    
    // 3. Mask Email -> ***@domain.com
    safe_text = EMAIL_REGEX.replace_all(&safe_text, "***@$2").to_string();

    safe_text
}
