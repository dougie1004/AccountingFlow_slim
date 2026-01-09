use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InventoryItem {
    pub id: String,
    pub name: String,
    pub purchase_price: f64, // 매입 원가
    pub current_stock: u32,  // 현재 재고량
    pub asset_value: f64,    // 장부상 자산 가액
}

impl InventoryItem {
    /// 재고 가치 실시간 업데이트 로직 (SCM 대시보드 연동용)
    pub fn calculate_asset_value(&mut self) {
        self.asset_value = self.purchase_price * (self.current_stock as f64);
    }
}

// UserQuota 관련 컴파일 오류 해결을 위한 정의 (2026-01-10 수정 반영)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserQuota {
    pub api_calls_remaining: u32,
    pub disk_usage_limit: u64,
}
