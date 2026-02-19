use crate::inventory::InventoryItem;

pub struct ScmValuationResult {
    pub total_cost: f64,
    pub total_nrv: f64,
    pub adjustment_needed: f64,
}

pub fn evaluate_lcm(inventory: &[InventoryItem]) -> ScmValuationResult {
    // Mock logic
    let total_cost: f64 = inventory.iter().map(|i| i.purchase_price * i.current_stock as f64).sum();
    let total_nrv: f64 = total_cost * 0.95; // Assume 5% depreciation for demo
    let adjustment_needed = (total_cost - total_nrv).max(0.0);

    ScmValuationResult {
        total_cost,
        total_nrv,
        adjustment_needed
    }
}
