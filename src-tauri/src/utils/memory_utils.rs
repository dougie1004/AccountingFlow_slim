use sha2::{Sha256, Digest};

/**
 * Business Memory Layer - Vendor Utility
 * Handles normalization and hashing of vendor names to protect privacy 
 * and increase pattern matching accuracy.
 */

pub fn normalize_vendor(vendor: &str) -> String {
    // 1. Lowercase
    // 2. Filter: Keep only alphanumeric characters (includes Korean syllables)
    // 3. This naturally removes spaces and special characters like (주), Ltd, etc.
    vendor.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
}

pub fn generate_pattern_hash(
    source: &str,
    flow: &str,
    vendor: &str,
    amount: f64,
    date: &str,
) -> String {
    let normalized_vendor = normalize_vendor(vendor);
    
    // Amount Bucket: <10k, <50k, <100k, <500k, <1m, >=1m
    let amount_bucket = if amount < 10000.0 { "S1" }
                        else if amount < 50000.0 { "S2" }
                        else if amount < 100000.0 { "S3" }
                        else if amount < 500000.0 { "M1" }
                        else if amount < 1000000.0 { "M2" }
                        else { "L1" };

    // Month: Extract month from "YYYY-MM-DD"
    let month = date.split('-').nth(1).unwrap_or("00");

    let combined = format!("{}:{}:{}:{}:{}", source, flow, normalized_vendor, amount_bucket, month);
    
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalization() {
        assert_eq!(normalize_vendor("삼성전자(주)"), "삼성전자주");
        assert_eq!(normalize_vendor("삼성전자 주식회사"), "삼성전자주식회사");
        assert_eq!(normalize_vendor("  Starbucks  "), "starbucks");
        assert_eq!(normalize_vendor("Apple, Inc."), "appleinc");
    }
}
