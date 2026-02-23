use serde::{Serialize, Deserialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum AccountNature {
    REVENUE,
    COGS,
    #[serde(rename = "SG&A")]
    SGnA,
    ASSET,
    LIABILITY,
    EQUITY,
    NON_OPERATING,
}

impl fmt::Display for AccountNature {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AccountNature::REVENUE => write!(f, "REVENUE"),
            AccountNature::COGS => write!(f, "COGS"),
            AccountNature::SGnA => write!(f, "SG&A"),
            AccountNature::ASSET => write!(f, "ASSET"),
            AccountNature::LIABILITY => write!(f, "LIABILITY"),
            AccountNature::EQUITY => write!(f, "EQUITY"),
            AccountNature::NON_OPERATING => write!(f, "NON_OPERATING"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub nature: AccountNature,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManagementIssue { 
    pub id: i64, 
    pub issue_title: String, 
    pub description: String, 
    pub severity: String, 
    pub raw_row_data: Option<String>, 
    pub row_index: i32,
    pub detected_at: String,
    pub recommendations: String,
    pub evidence_quote: String,
    pub project_id: Option<String>, // Renamed from audit_id
    pub evidence_image: Option<String>,
    pub status: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub remediation_plan: Option<String>,
    pub manager_comment: Option<String>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManagementProject {
    pub id: String, // UUID
    pub title: String,
    pub status: String, // Planning, Execution, Reporting, Closed
    pub progress_pct: i32,
    pub start_date: String,
    pub end_date: String,
    pub lead_reviewer: String, // Renamed from lead_auditor
    // Detailed Editable Fields
    pub planning_start: Option<String>,
    pub planning_end: Option<String>,
    pub fieldwork_start: Option<String>,
    pub fieldwork_end: Option<String>,
    pub reporting_start: Option<String>,
    pub reporting_end: Option<String>,
    pub audit_scope: Option<String>,
    pub findings_count: i32,
    pub risk_score: i32,
    pub created_at: Option<String>,
    pub valuation_tier: Option<String>, // seed, startup, enterprise
}

// AuditFinding removed as it is currently unused and causing warnings.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemEvent {
    pub id: String, // UUID
    pub timestamp: String,
    pub event_type: String, // AI_SIGNAL, RISK_CHANGE, SYSTEM_ALERT
    pub description: String,
    pub related_entity_id: Option<i64>,
    pub audit_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManagementPlan {
    pub id: i64,
    pub year: i32,
    pub review_domain: String,
    pub risk_score: i32,
    pub strategic_importance: String,
    pub resource_days: i32,
    pub status: String,
    pub description: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditUniverseEntity {
    pub id: i64,
    pub unit_name: String,
    pub category: String,
    pub impact_score: i32,
    pub likelihood_score: i32,
    pub last_audit_year: i32,
    pub budget_size: String,
    pub headcount: i32,
    pub last_audit_rating: String,
    pub key_systems: String,
    pub ai_analysis: Option<AiRiskAnalysis>,
    pub findings_count: i32,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardTransaction {
    pub id: i64,
    pub emp_name: String,
    pub dept_name: String,
    pub card_num: String,
    pub vendor_name: String,
    pub amount: i64,
    pub date: String,
    pub category: String,
    pub address: String,
    pub lat: f64,
    pub lng: f64,
    pub risk_score: i32,
    pub risk_reason: String,
    pub is_near_home: bool,
    pub is_late_night: bool,
    pub home_address: String,
    pub home_lat: f64,
    pub home_lng: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImpactBreakdown {
    pub financial_loss: i32,
    pub strategic_impact: i32,
    pub reputation_risk: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LikelihoodBreakdown {
    pub historical_frequency: i32,
    pub control_weakness: i32,
    pub process_complexity: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiRiskAnalysis {
    pub reason: String,
    pub impact_score: i32,
    pub likelihood_score: i32,
    pub impact_breakdown: ImpactBreakdown,
    pub likelihood_breakdown: LikelihoodBreakdown,
    pub audit_approach: Option<String>,
    pub reference_standard: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub findings_count: i32,
    pub risk_score: i32,
    pub status: String,
}

// AI 遺꾩꽍 寃곌낵 ?꾩껜瑜??대뒗 援ъ“泥?
// AI 분석 결과 전체를 담는 구조체
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewAnalysisResult {
    pub summary: String,
    pub risk_score: i32,
    pub findings: Vec<ReviewFinding>,
}

// 개별 발견 사항 (여기서 채택/기각 여부, 증빙 등이 포함되어야 함)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewFinding {
    pub id: String,
    pub category: String,
    pub severity: String, // High, Medium, Low
    pub description: String,
    pub evidence: String, // 상세 증빙 데이터
    pub recommendation: String,
    pub status: String, // "Pending", "Accepted", "Rejected"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SheetData {
    pub name: String,
    pub data: Vec<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManagementScenario {
    pub id: String, // e.g., "PR-01", "CC-01"
    pub name: String,
    pub domain: String,
    pub risk_level: String, // High, Medium, Low
    pub description: String,
    pub rules: Option<String>, // JSON string
    pub ai_prompt_template: Option<String>,
    pub required_fields: Option<String>,
    pub version: String,
    pub enabled: bool,
}

// [CERTIFIED REVIEW] Structure for review_run_log.json
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewRunLog {
    pub run_id: String,
    pub scan_summary: ScanSummary,
    pub rule_hits: Vec<String>,
    pub ai_input_payload: String, // Masked summary
    pub ai_output_cards: Vec<AiOutputCard>,
    pub execution_time: String,
    pub reproducibility_check: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanSummary {
    pub total_rows: usize,
    pub candidate_rows: usize,
    pub rule_engine_summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiOutputCard {
    pub title: String,
    pub risk_level: String, // High, Medium, Low
    pub rationale: Vec<String>, // Why we should look (3 points)
    pub counter_argument: String, // Possible normal scenario
    pub next_action: String, // Single step
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum RiskGrade {
    Low,
    Moderate,
    High,
    Critical,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiskBreakdown {
    pub unexplained_ratio: f64,
    pub volatility_risk: f64,
    pub concentration_risk: f64,
    pub temporal_risk: f64,
    pub budget_risk: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiskIndex {
    pub total_score: f64,
    pub grade: RiskGrade,
    pub breakdown: RiskBreakdown,
}
