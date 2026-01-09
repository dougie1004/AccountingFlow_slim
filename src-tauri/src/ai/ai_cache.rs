use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use crate::core::models::ParsedTransaction;
use sha2::{Sha256, Digest};

/**
 * AI Response Cache
 * 동일한 입력에 대해 AI를 재호출하지 않고 캐시된 결과 반환
 */
pub struct AICache {
    cache: Arc<Mutex<HashMap<String, CachedResult>>>,
    max_size: usize,
}

#[derive(Clone, Debug)]
struct CachedResult {
    transaction: ParsedTransaction,
    timestamp: std::time::SystemTime,
    hit_count: u32,
}

impl AICache {
    pub fn new(max_size: usize) -> Self {
        AICache {
            cache: Arc::new(Mutex::new(HashMap::new())),
            max_size,
        }
    }

    /// 입력 문자열의 해시 생성
    fn hash_input(&self, input: &str, policy: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        hasher.update(policy.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 캐시에서 결과 조회
    pub fn get(&self, input: &str, policy: &str) -> Option<ParsedTransaction> {
        let hash = self.hash_input(input, policy);
        let mut cache = self.cache.lock().unwrap();
        
        if let Some(cached) = cache.get_mut(&hash) {
            // 캐시 히트 카운트 증가
            cached.hit_count += 1;
            
            // 24시간 이내 캐시만 유효
            if cached.timestamp.elapsed().unwrap().as_secs() < 86400 {
                let mut result = cached.transaction.clone();
                result.audit_trail.push(format!(
                    "[{}] 캐시에서 복원 ({}번째 재사용)",
                    chrono::Local::now().format("%H:%M:%S"),
                    cached.hit_count
                ));
                return Some(result);
            } else {
                // 만료된 캐시 삭제
                cache.remove(&hash);
            }
        }
        
        None
    }

    /// 캐시에 결과 저장
    pub fn set(&self, input: &str, policy: &str, transaction: ParsedTransaction) {
        let hash = self.hash_input(input, policy);
        let mut cache = self.cache.lock().unwrap();
        
        // 캐시 크기 제한 (LRU 방식)
        if cache.len() >= self.max_size {
            // 가장 오래된 항목 제거
            if let Some(oldest_key) = cache.iter()
                .min_by_key(|(_, v)| v.timestamp)
                .map(|(k, _)| k.clone()) {
                cache.remove(&oldest_key);
            }
        }
        
        cache.insert(hash, CachedResult {
            transaction,
            timestamp: std::time::SystemTime::now(),
            hit_count: 0,
        });
    }

    /// 캐시 통계 조회
    pub fn stats(&self) -> (usize, u32) {
        let cache = self.cache.lock().unwrap();
        let total_hits: u32 = cache.values().map(|v| v.hit_count).sum();
        (cache.len(), total_hits)
    }

    /// 캐시 초기화
    pub fn clear(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }
}

// Global Singleton
lazy_static::lazy_static! {
    pub static ref AI_CACHE: AICache = AICache::new(1000); // 최대 1000개 캐시
}
