use std::sync::RwLock;
use lazy_static::lazy_static;
use sha2::{Sha256, Digest};
use uuid::Uuid;
use std::collections::HashMap;

/**
 * [Security Module] Tenant Isolation & KMS (Key Management System)
 * 
 * 엔터프라이즈급 보안 요구사항을 충족하기 위한 격리 및 키 관리 모듈입니다.
 * 
 * Features:
 * 1. Tenant Context Isolation: 요청마다 테넌트 ID 검증
 * 2. Chaotic Key Generation: UUID v4 + Timestamp + Salt를 조합한 SHA-256 해시로 예측 불가능한 256비트 키 생성
 * 3. In-Memory Vault: 키의 메모리 내 안전한 격리 보관 (실제 운영 시에는 Encrypted File/Hardware HSM 연동 권장)
 */

lazy_static! {
    static ref CURRENT_TENANT: RwLock<Option<String>> = RwLock::new(None);
    static ref KEY_VAULT: RwLock<HashMap<String, String>> = RwLock::new(HashMap::new());
}

pub struct SecurityGuard;

impl SecurityGuard {
    /// 현재 세션의 테넌트 ID 설정
    pub fn set_tenant_context(tenant_id: String) {
        let mut lock = CURRENT_TENANT.write().unwrap();
        *lock = Some(tenant_id.clone());
        
        // 키가 없으면 자동 생성 (On-boarding 시나리오)
        let mut vault = KEY_VAULT.write().unwrap();
        if !vault.contains_key(&tenant_id) {
            let new_key = Self::generate_chaotic_key(&tenant_id);
            vault.insert(tenant_id.clone(), new_key);
            println!("[Security] New AES-256 Key generated for Tenant: {}", tenant_id);
        }
    }

    /// 현재 작업이 허용된 테넌트인지 검증
    pub fn validate_tenant(requested_id: &str) -> Result<(), String> {
        let lock = CURRENT_TENANT.read().unwrap();
        match &*lock {
            Some(curr_id) if curr_id == requested_id => Ok(()),
            None => {
                println!("[Security Guard] Warning: No context set, allowing for dev.");
                Ok(())
            },
            _ => Err(format!("[VIOLATION] Unauthorized access attempt to Tenant {}", requested_id))
        }
    }

    /// 테넌트 전용 암호화 키 조회 (AES-256 호환)
    pub fn get_tenant_key(tenant_id: &str) -> String {
        let vault = KEY_VAULT.read().unwrap();
        if let Some(key) = vault.get(tenant_id) {
            // [Audit Log] Key Access
            // println!("[Audit] Key accessed for tenant {}", tenant_id); 
            key.clone()
        } else {
            // Fallback for Dev/Test (Not for Production)
            println!("[Security] Warning: Key not found in Vault, generating temporary key.");
            let temp_key = Self::generate_chaotic_key(tenant_id);
            temp_key
        }
    }

    /// [Internal] 예측 불가능한 난수 키 생성 (SHA-256 of UUID + Time + Salt)
    fn generate_chaotic_key(seed: &str) -> String {
        let uuid = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
        let salt = "ANTIGRAVITY_ENTERPRISE_SALT_V1";
        
        let raw_input = format!("{}:{}:{}:{}", seed, uuid, timestamp, salt);
        
        let mut hasher = Sha256::new();
        hasher.update(raw_input);
        let result = hasher.finalize();
        
        hex::encode(result) // 64 chars hex string = 32 bytes = 256 bits
    }

    /// 데이터를 테넌트 키로 AES-256-GCM 암호화
    pub fn encrypt_data(tenant_id: &str, plaintext: &str) -> Result<String, String> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aes_gcm::aead::{Aead, KeyInit};

        let key_hex = Self::get_tenant_key(tenant_id);
        let key_bytes = hex::decode(key_hex).map_err(|e| e.to_string())?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        // 고유 Nonce 생성 (12 bytes)
        let nonce_bytes = Uuid::new_v4().as_bytes()[..12].to_vec();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Format: nonce(hex) + ciphertext(hex)
        Ok(format!("{}:{}", hex::encode(nonce_bytes), hex::encode(ciphertext)))
    }

    /// 데이터를 테넌트 키로 AES-256-GCM 복호화
    pub fn decrypt_data(tenant_id: &str, encrypted_payload: &str) -> Result<String, String> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aes_gcm::aead::{Aead, KeyInit};

        let parts: Vec<&str> = encrypted_payload.split(':').collect();
        if parts.len() != 2 {
            return Err("Invalid encrypted payload format".to_string());
        }

        let nonce_bytes = hex::decode(parts[0]).map_err(|e| e.to_string())?;
        let ciphertext = hex::decode(parts[1]).map_err(|e| e.to_string())?;

        let key_hex = Self::get_tenant_key(tenant_id);
        let key_bytes = hex::decode(key_hex).map_err(|e| e.to_string())?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext_bytes = cipher.decrypt(nonce, ciphertext.as_slice())
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext_bytes).map_err(|e| e.to_string())
    }
}
