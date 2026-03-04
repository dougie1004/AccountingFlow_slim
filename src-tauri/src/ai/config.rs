use std::env;

pub struct AiConfig {
    pub base_url: String,
    pub model_flash: String,
    pub model_pro: String,
}

impl AiConfig {
    pub fn load() -> Self {
        // Support custom endpoints (e.g., OpenRouter, Gemini Proxy, AI Gateway)
        let base_url = env::var("GEMINI_BASE_URL")
            .or_else(|_| env::var("AI_ENDPOINT"))
            .unwrap_or_else(|_| "https://generativelanguage.googleapis.com/v1beta".to_string());
        
        let model_flash = env::var("GEMINI_MODEL")
            .or_else(|_| env::var("AI_MODEL_NAME"))
            .unwrap_or_else(|_| "gemini-2.0-flash".to_string());

        let model_pro = env::var("GEMINI_PRO_MODEL")
            .unwrap_or_else(|_| "gemini-2.0-flash".to_string());

        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            model_flash,
            model_pro,
        }
    }

    pub fn get_url(&self, model: &str, api_key: &str) -> String {
        let mut model_name = model.to_string();
        if !model_name.starts_with("models/") && !self.base_url.contains("googleapis.com") {
             // For some proxies, we don't need models/ prefix or it's handled differently,
             // but for Google, it's strictly required.
        }
        
        if self.base_url.contains("generativelanguage.googleapis.com") {
             if !model_name.starts_with("models/") {
                 model_name = format!("models/{}", model_name);
             }
             format!("{}/{}:generateContent?key={}", self.base_url, model_name, api_key)
        } else {
             // Custom Endpoint handling: Often they use /v1/chat/completions or similar,
             // but if they follow Gemini's specific URL structure:
             format!("{}/{}:generateContent?key={}", self.base_url, model_name, api_key)
        }
    }
}
