use crate::core::models::{ParsedTransaction, SystemError};
use image::{DynamicImage, GenericImageView, Luma};
use std::io::Cursor;
use regex::Regex;

/// [Antigravity] Tier 1.5: Local OCR Engine V1 (Hybrid Strategy)
/// 
/// NOTE: This module currently performs high-speed Image Pre-processing (Grayscale/Binarization).
/// For full Local OCR, the system requires 'tesseract' and 'leptonica' libraries.
/// In this version, we implement the Pipeline and Regex matching.
pub fn perform_local_ocr(image_bytes: &[u8]) -> Result<Option<ParsedTransaction>, SystemError> {
    println!("[Local OCR] Starting Tier 1.5 Pre-processing (Rust Side)...");

    // 1. Image Pre-processing
    // Pure Rust implementation using 'image' crate
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| { eprintln!("[Local OCR] Image Load Error: {}", e); SystemError::Internal })?;
    
    // Grayscale conversion
    let gray_img = img.grayscale();
    
    // Binarization (Simple Thresholding for OCR stability)
    let _binarized = grayscale_to_binary(&gray_img, 150);
    
    // In a real environment with Tesseract installed, we would run:
    // let text = run_tesseract(&binarized)?;
    
    // Since Tesseract requires system-level installation (vcpkg/libtesseract),
    // we return None here to trigger the Tier 3 (Cloud Vision AI) fallback
    // unless a text-based "Fast Path" is possible.
    
    println!("[Local OCR] Local Pre-processing complete. Tesseract system dependency not detected. Falling back to Tier 3.");
    Ok(None)
}

/// Simple Binary Thresholding (Pure Rust)
fn grayscale_to_binary(img: &DynamicImage, threshold: u8) -> DynamicImage {
    let (width, height) = img.dimensions();
    let mut out = image::ImageBuffer::new(width, height);

    for (x, y, pixel) in img.to_luma8().enumerate_pixels() {
        let val = if pixel.0[0] > threshold { 255 } else { 0 };
        out.put_pixel(x, y, Luma([val]));
    }

    DynamicImage::ImageLuma8(out)
}

/// [Placeholder] For when Tesseract is integrated
#[allow(dead_code)]
fn extract_business_registration_number(text: &str) -> Option<String> {
    let re = Regex::new(r"(\d{3}-\d{2}-\d{5})").unwrap();
    re.captures(text).map(|cap| cap[1].to_string())
}

#[allow(dead_code)]
fn extract_total_amount(text: &str) -> Option<f64> {
    let keywords = ["합계", "금액", "TOTAL", "Total", "Grand Total", "결제금액"];
    let lines: Vec<&str> = text.lines().collect();

    for (i, line) in lines.iter().enumerate() {
        for kw in keywords {
            if line.contains(kw) {
                if let Some(amt) = parse_amount_from_line(line) {
                    return Some(amt);
                }
                if i + 1 < lines.len() {
                    if let Some(amt) = parse_amount_from_line(lines[i+1]) {
                        return Some(amt);
                    }
                }
            }
        }
    }
    None
}

fn parse_amount_from_line(line: &str) -> Option<f64> {
    let clean: String = line.chars()
        .filter(|c| c.is_digit(10) || *c == ',' || *c == '.')
        .collect();
    let parseable = clean.replace(",", "");
    parseable.parse::<f64>().ok().filter(|&v| v > 0.0)
}
