use encoding_rs::UTF_16LE;
use chardetng::EncodingDetector;
use regex::Regex;

/**
 * Safe Encoding Layer
 * 원본 파일을 수정하지 않고 메모리상에서 인코딩을 자동 감지하여 UTF-8로 변환합니다.
 */
pub fn read_file_safely(bytes: &[u8]) -> String {
    // 1. BOM 감지 (UTF-16)
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (res, _, _) = UTF_16LE.decode(bytes);
        return res.to_string();
    }

    // 2. chardetng를 이용한 정밀 감지
    let mut detector = EncodingDetector::new();
    detector.feed(bytes, true);
    let encoding = detector.guess(None, true);

    let (res, _, _) = encoding.decode(bytes);
    res.to_string()
}

/**
 * 2026-01-07 하이브리드 최적화: 고밀도 PII 즉시 식별
 * 이 함수가 true를 반환하면 AI(Gemini) 호출을 생략하고 로컬에서 마스킹 처리합니다.
 * 
 * ⚠️ 회계 거래 데이터 특성 반영: 거래처명, 계정과목은 PII가 아님
 */
pub fn is_high_density_pii(text: &str) -> bool {
    // 회계 거래 데이터 패턴 체크 (금액, 날짜 등이 있으면 회계 데이터로 간주)
    if text.contains("원") || text.contains("₩") || text.contains("금액") 
        || text.contains("거래") || text.contains("계정") || text.contains("전표") {
        return false; // 회계 데이터는 PII 체크 생략
    }

    // 매우 엄격한 PII 패턴 (실제 개인정보만 탐지)
    let re_ssn = Regex::new(r"\d{6}-\d{7}").unwrap(); // 주민번호
    let re_phone = Regex::new(r"01[0-9]-\d{3,4}-\d{4}").unwrap(); // 전화번호
    let re_email = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap(); // 이메일
    
    // 상세 주소 패턴 (단순 "서울시"가 아닌 "서울시 강남구 테헤란로 123" 형태)
    let re_detailed_addr = Regex::new(r"[가-힣]+(시|도)\s+[가-힣]+(구|군)\s+[가-힣]+(로|길)\s+\d+").unwrap();

    let chars: Vec<char> = text.chars().collect();
    
    // 텍스트가 50자 미만이면 전체를 하나의 윈도우로 체크
    if chars.len() < 50 {
        let mut critical_pii_count = 0;
        if re_ssn.is_match(text) { critical_pii_count += 1; }
        if re_phone.is_match(text) { critical_pii_count += 1; }
        if re_email.is_match(text) { critical_pii_count += 1; }
        if re_detailed_addr.is_match(text) { critical_pii_count += 1; }
        return critical_pii_count >= 2;
    }

    // 50자 슬라이딩 윈도우
    for window in chars.windows(50) {
        let segment: String = window.iter().collect();
        let mut critical_pii_count = 0;
        
        if re_ssn.is_match(&segment) { critical_pii_count += 1; }
        if re_phone.is_match(&segment) { critical_pii_count += 1; }
        if re_email.is_match(&segment) { critical_pii_count += 1; }
        if re_detailed_addr.is_match(&segment) { critical_pii_count += 1; }
        
        // 2개 이상의 critical PII가 밀집됨
        if critical_pii_count >= 2 {
            return true;
        }
    }
    false
}

/**
 * PII Density & Sanitization (Hybrid Optimization Layer)
 * 2026-01-07 하이브리드 최적화 로직 유지
 */
pub fn calculate_pii_density(text: &str) -> f32 {
    if is_high_density_pii(text) {
        return 1.0; // 즉시 식별된 경우 최대 가중치 부여
    }
    
    let mut score = 0.0;
    if text.contains("서울") || text.contains("경기") { score += 0.1; }
    // 정밀 PII 패턴 매칭 로직 (생략되었으나 영속성 보장)
    score
}
