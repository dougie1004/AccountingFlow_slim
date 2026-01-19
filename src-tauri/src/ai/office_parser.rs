use std::io::{Read, Cursor};
use zip::ZipArchive;
use regex::Regex;

pub fn extract_text_from_office(bytes: Vec<u8>, ext: &str) -> Result<String, String> {
    println!("[Office Parser] Parsing {} file (Size: {} bytes)", ext, bytes.len());
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| format!("ZIP 아카이브 열기 실패: {}", e))?;

    let mut full_text = String::new();

    if ext == "docx" {
        // Word: word/document.xml
        if let Ok(mut file) = archive.by_name("word/document.xml") {
            let mut content = String::new();
            file.read_to_string(&mut content).map_err(|e| format!("XML 읽기 실패: {}", e))?;
            full_text.push_str(&clean_xml_tags(&content));
        } else {
            return Err("유효한 Word 문서가 아닙니다 (document.xml 누락).".to_string());
        }
    } else if ext == "pptx" {
        // PPT: ppt/slides/slide*.xml
        let mut slide_indices: Vec<usize> = (1..=50).collect(); // Max 50 slides check
        
        for i in slide_indices {
            let filename = format!("ppt/slides/slide{}.xml", i);
            if let Ok(mut file) = archive.by_name(&filename) {
                let mut content = String::new();
                if file.read_to_string(&mut content).is_ok() {
                    full_text.push_str(&format!("\n--- Slide {} ---\n", i));
                    full_text.push_str(&clean_xml_tags(&content));
                }
            } else {
                // Stop if we miss a slide or maybe continue? 
                // PPT slides numbering usually is sequential but gaps might exist? 
                // Let's rely on file listing if possible, but zip crate file iteration is easier.
            }
        }
        
        // Iteration approach is better if we want to be robust
        if full_text.is_empty() {
             for i in 0..archive.len() {
                let file = archive.by_index(i).unwrap();
                let name = file.name().to_string();
                if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                    let mut file = file;
                    let mut content = String::new();
                    if file.read_to_string(&mut content).is_ok() {
                         full_text.push_str(&format!("\n[Slide Content]\n"));
                         full_text.push_str(&clean_xml_tags(&content));
                    }
                }
             }
        }
    }

    if full_text.trim().is_empty() {
        return Err("문서에서 텍스트를 추출할 수 없습니다.".to_string());
    }

    Ok(full_text)
}

fn clean_xml_tags(xml: &str) -> String {
    // Simple regex to strip XML tags. 
    // <[^>]*> matches any tag.
    // Use lazy_static for performance if strictly needed, but simple compilation here is fine for now.
    let re = Regex::new(r"<[^>]*>").unwrap();
    let text = re.replace_all(xml, " ");
    
    // Cleanup whitespace
    let whitespace_re = Regex::new(r"\s+").unwrap();
    whitespace_re.replace_all(&text, " ").trim().to_string()
}
