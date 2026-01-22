use crate::core::models::ParsedTransaction;

/**
 * Rule-Based Classification Engine V3 (Semantic & Heuristic)
 * 정확한 상호명 매칭이 아닌, '의미론적 패턴(Semantic Patterns)'과 '업종 접미사(Suffix)'를 분석하여
 * 본 적 없는 데이터도 범용적으로 분류할 수 있도록 고도화된 엔진.
 */
pub fn classify_by_rules(tx: &mut ParsedTransaction) {
    let description = tx.description.as_deref().unwrap_or("").to_lowercase();
    let vendor = tx.vendor.as_deref().unwrap_or("").to_lowercase();
    let combined = format!("{} {}", description, vendor);
    
    // 0. 전처리: 불용어(Stopwords) 제거 및 토큰화
    // "payment for", "inc", "ltd" 등 의미 없는 단어 무시하고 핵심 키워드만 추출
    let tokens: Vec<&str> = combined.split_whitespace()
        .filter(|t| !["payment", "for", "the", "inc", "corp", "ltd", "co", "주식회사", "유한회사"].contains(t))
        .collect();

    // 1. 금액 추출 (Fallback)
    if tx.amount == 0.0 {
        tx.amount = parse_korean_amount(&description);
    }

    // 2. Semantic Category Matching (Generalized)
    // 개별 기업명이 아닌 '업종'을 나타내는 단어들을 검사함

    // [Category: IT / Software / Cloud] -> 지급수수료
    // Logic: "Tech", "Soft", "Cloud", "Data", "Labs", "System", "Network", ".io", ".ai", ".com"
    // AWS가 오든, Azure가 오든, UnknownTech가 오든 다 잡음.
    let tech_keywords = ["tech", "soft", "cloud", "data", "lab", "system", "network", "hosting", "server", "domain", "api", "platform", "saas", "app", "solution", "공학", "시스템", "소프트", "클라우드", "정보", "통신", "아이티", "테크", "솔루션"];
    if matches_any(&tokens, &tech_keywords) || vendor.ends_with(".io") || vendor.ends_with(".ai") || vendor.contains("aws") || vendor.contains("azure") {
        apply_classification(tx, "지급수수료", "Expense", "패턴: IT/SW/클라우드 기업 업종 감지", "High");
        return;
    }

    // [Category: F&B / Welfare] -> 복리후생비
    // Logic: "Cafe", "Food", "Kitchen", "Burger", "Pizza", "Mart", "Store", "Restaurant"
    let food_keywords = ["cafe", "coffee", "brew", "kitchen", "food", "burger", "pizza", "sushi", "mart", "store", "restaurant", "pub", "bar", "bakery", "steak", "diner", "식당", "카페", "커피", "푸드", "키친", "갈비", "횟집", "국밥", "버거", "피자", "베이커리"];
    if matches_any(&tokens, &food_keywords) {
        apply_classification(tx, "복리후생비", "Expense", "패턴: 식음료/외식 업종 감지", "Medium");
        return;
    }

    // [Category: Marketing / Ads] -> 광고선전비
    // Logic: "Ad", "Media", "Studio", "Creative", "Promo"
    let ad_keywords = ["ad", "ads", "media", "studio", "creative", "promo", "marketing", "design", "print", "banner", "광고", "기획", "디자인", "미디어", "스튜디오", "인쇄", "홍보", "마케팅"];
    if matches_any(&tokens, &ad_keywords) {
        apply_classification(tx, "광고선전비", "Expense", "패턴: 광고/미디어/디자인 업종 감지", "High");
        return;
    }

    // [Category: Logistics / Transport] -> 운반비
    // Logic: "Logistics", "Express", "Delivery", "Ship", "Post"
    let logis_keywords = ["logistics", "express", "delivery", "shipping", "post", "parcel", "freight", "cargo", "택배", "운송", "물류", "해운", "항공", "통운", "퀵", "용달", "우편"];
    if matches_any(&tokens, &logis_keywords) {
        apply_classification(tx, "운반비", "Expense", "패턴: 물류/운송 업종 감지", "High");
        return;
    }

    // [Category: Office / Supplies] -> 소모품비
    // Logic: "Office", "Paper", "Stationery", "Depot"
    let supply_keywords = ["office", "paper", "stationery", "supply", "supplies", "depot", "mart", "store", "문구", "오피스", "사무", "제지", "유통", "상사"];
    if matches_any(&tokens, &supply_keywords) {
        apply_classification(tx, "소모품비", "Expense", "패턴: 사무용품/유통 업종 감지", "Medium");
        return;
    }
    
    // [Category: Rent / Facility] -> 임차료/관리비
    let rent_keywords = ["rent", "lease", "estate", "property", "realty", "building", "tower", "임대", "부동산", "빌딩", "타워", "관리", "건물"];
    if matches_any(&tokens, &rent_keywords) {
         if combined.contains("관리") {
             apply_classification(tx, "관리비", "Expense", "패턴: 건물 관리 관련", "High");
         } else {
             apply_classification(tx, "임차료", "Expense", "패턴: 부동산 임대 관련", "High");
         }
         return;
    }

    // [Category: General Tax / Gov] -> 세금과공과
    let tax_keywords = ["tax", "gov", "city", "council", "fine", "세무", "국세", "지방세", "구청", "시청", "법원", "과태료", "범칙금"];
    if matches_any(&tokens, &tax_keywords) {
        apply_classification(tx, "세금과공과", "Expense", "패턴: 관공서/세금 관련", "High");
        return;
    }

    // 3. Fallback: 기존의 Rigorous Match (Legacy Support)
    legacy_keyword_match(tx, &combined);
}

// --- Helper Functions ---

fn matches_any(tokens: &[&str], keywords: &[&str]) -> bool {
    for token in tokens {
        for keyword in keywords {
            if token.contains(keyword) {
                return true;
            }
        }
    }
    false
}

fn apply_classification(tx: &mut ParsedTransaction, acc: &str, entry_type: &str, reason: &str, conf: &str) {
    tx.account_name = Some(acc.to_string());
    tx.entry_type = Some(entry_type.to_string());
    tx.reasoning = format!("Generic Analyzer: {}", reason);
    tx.confidence = Some(conf.to_string());
}

fn legacy_keyword_match(tx: &mut ParsedTransaction, combined: &str) {
    // 기존의 Specific한 로직들 (정부지원금, 급여 등 특수 케이스)
    if combined.contains("정부") || combined.contains("r&d") || combined.contains("지원금") {
        apply_classification(tx, "국고보조금수익", "Revenue", "규칙: 정부지원금", "High");
    } else if combined.contains("급여") || combined.contains("salary") {
        apply_classification(tx, "급여", "Expense", "규칙: 급여", "High");
    } else if combined.contains("자본금") || combined.contains("investment") {
        apply_classification(tx, "자본금", "Equity", "규칙: 투자금", "High");
    } else {
        // Really unknown
        tx.account_name = Some("계정 미지정".to_string());
        tx.entry_type = Some("Expense".to_string());
        tx.reasoning = "규칙: 분류 불가 (Unknown Pattern)".to_string();
        tx.needs_clarification = true;
        tx.confidence = Some("Low".to_string());
    }
}

/// 한국어 금액 표현 파싱 (예: "1억원", "50만원", "10,000,000")
fn parse_korean_amount(input: &str) -> f64 {
    let clean = input.replace(",", "").replace(" ", "");
    
    // "억원" 패턴
    if let Some(idx) = clean.find("억원") {
        if let Ok(num) = clean[..idx].parse::<f64>() {
            return num * 100_000_000.0;
        }
    }
    
    // "만원" 패턴
    if let Some(idx) = clean.find("만원") {
        if let Ok(num) = clean[..idx].parse::<f64>() {
            return num * 10_000.0;
        }
    }

    // 숫자만 있는 경우
    let only_nums: String = clean.chars().filter(|c| c.is_digit(10)).collect();
    only_nums.parse::<f64>().unwrap_or(0.0)
}
