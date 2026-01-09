use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc, Duration};

pub struct QuotaManager {
    usage: Arc<Mutex<HashMap<String, UserQuota>>>,
}

#[derive(Clone, Debug)]
struct UserQuota {
    tenant_id: String,
    daily_calls: u32,
    monthly_calls: u32,
    last_reset: DateTime<Utc>,
    total_cost_usd: f64,
}

impl QuotaManager {
    pub fn new() -> Self {
        QuotaManager {
            usage: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn can_use_ai(&self, tenant_id: &str, tier: &str) -> Result<(), String> {
        let mut usage = self.usage.lock().unwrap();
        let quota = usage.entry(tenant_id.to_string()).or_insert(UserQuota {
            tenant_id: tenant_id.to_string(),
            daily_calls: 0,
            monthly_calls: 0,
            last_reset: Utc::now(),
            total_cost_usd: 0.0,
        });

        if Utc::now() - quota.last_reset > Duration::hours(24) {
            quota.daily_calls = 0;
            quota.last_reset = Utc::now();
        }

        let (daily_limit, monthly_limit) = match tier {
            "Free" => (50, 500),
            "Pro" => (500, 5000),
            "Enterprise" => (5000, 50000),
            _ => (10, 100),
        };

        if quota.daily_calls >= daily_limit {
            return Err(format!("Daily limit reached: {}", daily_limit));
        }

        if quota.monthly_calls >= monthly_limit {
            return Err(format!("Monthly limit reached: {}", monthly_limit));
        }

        Ok(())
    }

    pub fn record_usage(&self, tenant_id: &str, cost_usd: f64) {
        let mut usage = self.usage.lock().unwrap();
        if let Some(quota) = usage.get_mut(tenant_id) {
            quota.daily_calls += 1;
            quota.monthly_calls += 1;
            quota.total_cost_usd += cost_usd;
        }
    }

    pub fn get_usage(&self, tenant_id: &str) -> Option<(u32, u32, f64)> {
        let usage = self.usage.lock().unwrap();
        usage.get(tenant_id).map(|q| (q.daily_calls, q.monthly_calls, q.total_cost_usd))
    }
}

lazy_static::lazy_static! {
    pub static ref QUOTA_MANAGER: QuotaManager = QuotaManager::new();
}
