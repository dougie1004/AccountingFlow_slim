use encoding_rs::EUC_KR;


/// HWP Binary Parser (Heuristic)
/// 
/// HWP files (especially older formats) often use OLE storage or custom binary formats.
/// Instead of a full-blown OLE parser, we use a "Mining" approach to extract strings
/// that look like meaningful Korean or English text. This is enough for the AI 
/// to recover context like date, amount, vendor, and description.

pub fn extract_text_from_hwp_binary(bytes: &[u8]) -> Result<String, String> {
    let mut extracted_text = String::new();

    println!("[HWP Parser] Starting text mining from binary ({} bytes)", bytes.len());
    // Strategy 1: Attempt to decode chunks as UTF-16LE (common in modern HWP / OLE streams)
    // We look for sequences of valid UTF-16LE characters that form readable Korean/English text.
    let text_utf16 = extract_meaningful_text(bytes, "utf-16le");
    if !text_utf16.trim().is_empty() {
        extracted_text.push_str("[UTF-16LE Extraction]\n");
        extracted_text.push_str(&text_utf16);
        extracted_text.push_str("\n\n");
    }

    // Strategy 2: Attempt to decode as EUC-KR (common in older HWP text bodies)
    let text_euckr = extract_meaningful_text(bytes, "euc-kr");
    if !text_euckr.trim().is_empty() {
        extracted_text.push_str("[EUC-KR Extraction]\n");
        extracted_text.push_str(&text_euckr);
    }
    
    if extracted_text.trim().is_empty() {
         return Err("HWP 파일에서 유의미한 텍스트를 추출하지 못했습니다.".to_string());
    }

    Ok(extracted_text)
}

fn extract_meaningful_text(bytes: &[u8], encoding: &str) -> String {
    let mut result = String::new();
    
    match encoding {
        "utf-16le" => {
            // Basic heuristic: Convert explicit bytes to u16 and check for valid range
            let chunks: Vec<u16> = bytes.chunks_exact(2)
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect();
            
            let mut current_segment = String::new();
            
            for &code in &chunks {
                if is_printable_char(code) {
                    if let Some(ch) = std::char::from_u32(code as u32) {
                        current_segment.push(ch);
                    }
                } else {
                    // Segment ended
                    if current_segment.len() > 4 { // Only keep segments longer than 4 chars
                        result.push_str(&current_segment);
                        result.push(' ');
                    }
                    current_segment.clear();
                }
            }
            if current_segment.len() > 4 {
                result.push_str(&current_segment);
            }
        },
        "euc-kr" => {
             // Use encoding_rs to decode everything, then filter garbage
             let (res, _, _) = EUC_KR.decode(bytes);
             result = filter_garbage(&res);
        },
        _ => {}
    }

    result
}

fn is_printable_char(code: u16) -> bool {
    // Basic printable ASCII + Hangul Syllables + Hangul Jamo
    // ASCII: 0x20 - 0x7E
    // Hangul: 0xAC00 - 0xD7A3
    // Common Symbols
    let is_ascii = code >= 0x20 && code <= 0x7E;
    let is_hangul = code >= 0xAC00 && code <= 0xD7A3; // Syllables
    let is_hangul_compat = code >= 0x3130 && code <= 0x318F; // Compatibility Jamo
    
    // Also include Tabs, Newlines for formatting
    let is_whitespace = code == 0x09 || code == 0x0A || code == 0x0D;

    is_ascii || is_hangul || is_hangul_compat || is_whitespace
}

fn filter_garbage(raw: &str) -> String {
    // Split by whitespace/non-printable and keep only what looks like words/numbers
    let mut clean = String::new();
    let mut segment = String::new();

    for c in raw.chars() {
        let code = c as u32;
        // Re-use logic: check if character is likely "real" text
        // (Similar to is_printable_char but on char)
        let is_valid = (code >= 0x20 && code <= 0x7E) || // ASCII
                       (code >= 0xAC00 && code <= 0xD7A3) || // Hangul
                       (code >= 0x3130 && code <= 0x318F) || // Jamo
                       c.is_numeric() || c == ' ' || c == '\n' || c == '\t';

        if is_valid {
            segment.push(c);
        } else {
            if segment.chars().filter(|c| !c.is_whitespace()).count() > 3 {
                clean.push_str(&segment);
                clean.push(' ');
            }
            segment.clear();
        }
    }
    // Flush last
    if segment.chars().filter(|c| !c.is_whitespace()).count() > 3 {
        clean.push_str(&segment);
    }
    
    clean
}
