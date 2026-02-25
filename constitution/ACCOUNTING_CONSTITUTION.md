Article 1. Every account must have exactly one Nature.
Article 2. An account cannot belong to more than one financial statement section.
Article 3. Financial statements must ignore account names and rely only on Nature.
Article 4. Accounts without Nature must not be persisted or calculated.
Article 5. Any violation must stop the calculation immediately.
Article 6. [Grant Accountability] Voucher-based subsidies must never trigger cash inflows. Only self-funded portions (VAT) may impact the bank balance.
Article 7. [Matching Principle] Grants related to fixed assets must be deferred and amortized in strict synchronization with the asset's depreciation schedule.
Article 8. [Lease Integrity] Lease schedules must be followed precisely, separating principal repayment from interest expense.
Article 9. [Revenue Strictness] Top-line 'Sales Revenue' must only include core operating income (e.g., Service, SaaS). Non-operating items like Grant Income or Miscellaneous Gains must be strictly excluded from the revenue category to prevent inflated business performance.
Article 10. [Usage vs Recognition] Voucher usage metrics must represent actual 'Economic Consumption' (New Swipes/Liabilities). Accounting recognition (Amortization) is a non-cash flow and must not be double-counted in usage totalizers.
Article 11. [Historical Continuity] Every data drill-down must include the 'Brought Forward' (Opening) balance. A view showing only period-movements without an opening balance is a violation of financial traceability.
Article 12. [Lifetime Integrity of Strategic Metrics] Strategic dashboards (e.g., BEP, Payback Period) must be calculated based on the entire lifetime of the business history (2026~). Analyzing metrics based only on a filtered sub-period without accounting for cumulative losses is a violation of strategic truth and leads to false profitability claims.
Article 13. [Grant Expiration & Prioritization] Government grants (Vouchers) have a fixed execution period (typically matching the project year). Simulations must prioritize grant consumption over bank cash during the valid period. Voucher usage after the project completion deadline (e.g., Early 2027 for a 2026 grant) is strictly prohibited to maintain regulatory realism.
Article 14. [BvA Accountability] Every expenditure must be accountable against a pre-authorized Operation Plan (Budget). A systematic comparison between Planned (Budget) and Actual (Ledger) data must be performed monthly, with mandatory variance analysis to identify strategic or operational deviations.
Article 15. [Integrity Mandate] All financial reports submitted externally must undergo verification through the Data Integrity Verification Center. Any document whose digital fingerprint (Hash) is missing or compromised is considered officially void, upholding the system's zero-trust transparency commitment.
Article 16. [Absolute Separation of Cash and Equity] AI Forecasts and Runway calculations must strictly use the liquidated bank balance (Cash) as the calculation base. Under no circumstances shall Equity (Assets - Liabilities) or Net Asset Value be used as a proxy for available cash, even for closed periods. This prevents "Ghost Liability" errors where non-cash assets or accumulated losses distort the projection starting point.
Article 17. [Business Plan Fidelity] All strategic simulations must strictly adhere to the "2026-2028 Master Business Plan":
- **Revenue Model**: Tiered SaaS pricing (19.9k / 39.9k / 79k) with a 40:50:10 user ratio (Blended ARPU: 35,810 KRW).
- **Operational Cost Base**: Monthly fixed costs (Labor 7.8M, Rent 1.56M, Ops 2M) and AI Variable costs (3,000 KRW per user).
- **Growth Roadmap**: Paid user milestones of 60 (2026), 300 (2027), and 800 (2028).
Deviation from these core parameters without explicit board-level override is a violation of the system's strategic baseline.
Article 18. [Viability Guardrail] Every growth projection must reflect realistic unit economics (LTV/CAC > 3x, Churn 3-5%). A scenario that fails to reaching the operational BEP threshold (~500 users) by Year 3 is considered a "Strategic Failure" and must be flagged with a Red Alert for immediate intervention.

---

# 🛡️ AI Governance Policy v1.0
*(For AccountingFlow & AuditFlow – Production Grade Only)*

## Ⅰ. 목적 (Purpose)
본 정책은 회계·감사 시스템 내 AI 사용에 있어 다음을 보장하기 위함이다:
- 예측 가능성 (Predictability)
- 재현 가능성 (Reproducibility)
- 책임 분리 가능성 (Accountability Separation)
- 제품 안정성 (Production Stability)

> **AI는 “판단 보조 계층”이며, 결코 “재무 의사결정의 주체”가 아니다.**

## Ⅱ. 모델 등급 체계 (Model Tiering Framework)
AI 모델은 아래 3개 등급으로 분리한다.

### 🔴 Tier 1 – Production Core (Critical Engine)
- **적용 범위**: Ledger 분석, 리스크 점수 산정, 이상 거래 판정, DD/Compliance 판단 보조, 시스템 경보 생성
- **허용 조건**:
  - Stable 정식 릴리즈 모델만 사용
  - Deprecated/Experimental/Preview 금지
  - 모델 버전 명시적 고정 (Version Lock)
  - 자동 업그레이드 금지
- **금지**: exp / experimental 모델, Preview API, Behavior drift 가능 모델, Unstable temperature 기반 생성 판단

### 🟡 Tier 2 – Analytical Support Layer
- **적용 범위**: 리포트 요약, 설명 문구 생성, 내부 리뷰 초안, 사용자 친화적 표현 변환
- **허용 조건**:
  - Stable 모델 우선
  - 필요 시 제한적 Preview 허용
  - 단, 결과는 항상 Deterministic Core에 의해 검증됨

### 🟢 Tier 3 – Sandbox / R&D Layer
- **적용 범위**: 내부 테스트, 기능 실험, UX 실험, 모델 성능 비교
- **허용 조건**: exp 모델 사용 가능, 외부 고객 데이터 사용 금지, Production 환경 완전 격리

## Ⅲ. 모델 사용 원칙 (Core Principles)
1. **Deterministic Supremacy**: AI 판단은 항상 Rust/Local Deterministic 엔진보다 하위 계층이다. AI는 제안하고, Core Engine이 승인한다.
2. **Local-First Enforcement**: 원장 데이터 원본은 외부 전송 금지. 벡터화 또는 구조적 신호만 전송 가능. 개인식별정보(PII) 외부 전송 금지.
3. **Version Lock & Audit Log**: 사용 모델명, 버전, 파라미터 고정. 판단 결과와 함께 모델 버전 로그 저장. 사후 재현 테스트 가능해야 함.
4. **No Silent Drift Rule**: 모델 변경 시 사전 테스트 필수. 결과 차이 분석 보고서 작성. Production 반영 전 승인 절차 필요.

## Ⅳ. 책임 분리 구조 (Liability Separation)
| 영역 | 책임 주체 |
| :--- | :--- |
| 데이터 정확성 | 사용자 |
| Deterministic 계산 | 시스템 |
| AI 제안 해석 | 사용자 승인 후 반영 |
| 최종 회계 반영 | 사용자 Confirm 필수 |

> **AI는 법적 판단 주체가 아니다.**

## Ⅴ. 금지 규정 (Explicit Prohibitions)
- Experimental 모델의 Production Core 사용 금지
- 모델 자동 교체 허용 금지
- 비가시적 AI 판단 반영 금지
- Explainability 없는 점수 산정 금지

---

# 📊 Annex A. 전략적 시나리오별 재무 전망 요약 (2026-2028)

본 시뮬레이션은 KOSA(한국소프트웨어산업협회) 2024-25 임금 실태조사 데이터와 4대보험/퇴직충당금(1.183배)을 반영한 실질 인건비를 기반으로 산출되었습니다.

### 1. 🛡️ 생존 모드 (Survival: 초정예 자력 생존)
*목표: 외부 지원 없이 순수 자본금 5천만 원으로 유저 800명 도달 및 BEP 검증*

| 구분 | 2026년 (설립/Lean) | 2027년 (성장/고통) | 2028년 (안정/결실) |
| :--- | :--- | :--- | :--- |
| **인력 구성** | CEO(무급), 주니어1 (9월 채용) | CEO(5M), 주니어1 | CEO(5M), 주니어1 |
| **유저 로드맵** | 연말 60명 | 연말 300명 | 연말 800명 |
| **연 매출** | 약 150만 원 | 약 7,700만 원 | 약 2억 3,600만 원 |
| **연 순이익** | 약 -4,600만 원 | 약 -1억 2,000만 원 | 약 +6,000만 원 |
| **기말 잔액** | 약 350만 원 (데드라인) | 약 3,300만 원 (자본 확충) | 약 +9,300만 원 (회수 시작) |

> **CFO 평**: 생존 모드는 2027년에 약 1.5~2억 원 내외의 추가 자입(유상증자)이 필연적으로 발생합니다. 대표님이 개인 자금을 '가수금'이 아닌 '자본금'으로 납입함으로써 재무 구조를 건실하게 유지하고, 향후 기관 투자를 받기에 유리한 기초 체력을 확보하는 시나리오입니다.

---

### 2. 🟢 표준 성장 (Standard: 지원금 레버리지)
*목표: 경영권을 지키며 정부지원금 5천만 원을 레버리지로 성장을 가속화*

| 구분 | 2026년 (지원금 수령) | 2027년 | 2028년 |
| :--- | :--- | :--- | :--- |
| **인력 구성** | CEO(무급), 주니어1 (9월 채용) | 대표+초급1+중급1 (점진 충원) | 대표+초급1+중급1+마1 |
| **자본 조달** | 자본금 50M + **지원금 50M** | 추가 외부 투자 없음 (경영권 방어) | 영업이익으로만 운영 |
| **연 매출** | 약 150만 원 | 약 8,200만 원 | 약 2억 5,000만 원 |
| **연 순이익** | 약 +400만 원 | 약 -1억 2,000만 원 | 약 +6,500만 원 |
| **기말 잔액** | 약 5,400만 원 (여유) | 약 8,000만 원 (자본 확충) | 약 1억 4,000만 원 |

> **CFO 평**: 표준 모드 역시 투자가 없는 시나리오에서는 2027년에 자금 압박이 오지만, 이를 대표님의 추가 증자로 해결합니다. 정부지원금 5천만 원이 이미 '순자산'을 불려두었기에, Survival 모드보다 증자 부담이 적으며 훨씬 탄탄한 재무 상태로 2028년 흑자 전환을 맞이합니다.

---

### 3. 🚀 공격 확장 (Growth: 팀 6인 + 투자 10억)
*목표: 압도적 자본력으로 시장을 선점하여 2028년 유저 2,000명 이상 달성*

| 구분 | 2026년 | 2027년 | 2028년 |
| :--- | :--- | :--- | :--- |
| **연 매출** | 약 250만 원 | 약 2억 원 | 약 8억 원 |
| **연 순이익** | 약 -1억 5,000만 원 | 약 -4억 원 | 약 +2억 5,000만 원 |
| **기말 잔액** | 약 1억 원 | 약 7억 원 (Series A 유치) | 약 9억 5,000만 원 |

---
*본 요약 자료는 회계 헌법 제17조 및 제18조의 실행 지침으로 활용되며, 시뮬레이션 엔진의 결과값 검증 기준(Baseline)이 된다.*

---
*본 요약 자료는 회계 헌법 제17조 및 제18조의 실행 지침으로 활용되며, 시뮬레이션 엔진의 결과값 검증 기준(Baseline)이 된다.*

Article 19. [Historical Integrity and Metadata Accountability] Every imported record must preserve its original metadata, specifically Supplemental Notes (Remarks/비고). Ignoring supplemental context during ingestion is a violation of financial traceability. AI engines must synthesize both the primary description and supplemental notes to ensure account classification accuracy.

Article 20. [Intelligent VAT Fairness] The system must uphold the principle of Net Value. For single-entry imports lacking VAT columns, the engine must automatically separate VAT (10/110) for taxable transactions while strictly exempting non-taxable categories (Salaries, Insurance, Equity, Taxes). Silent omission of VAT for taxable items in the ledger is a violation of tax compliance integrity.

Article 21. [Legacy Logic Integrity] Before modifying or deleting existing code, a mandatory evaluation of the original rationale must be performed. Code must not be removed silently; any deletion must be accompanied by a verification that the logic no longer serves its intended strategic or technical purpose. Respecting the "Why" behind past implementation is a requirement for system stability.

Article 22. [Cross-Component Numerical Consistency] All summary metrics, dashboard cards, and their respective drill-down detail views must share the exact same calculation logic and data sources. Contradictory signals between a high-level summary and its evidence modal (e.g., 15% vs 100% AR ratio) are a violation of Strategic Integrity. Consistency is the foundation of institutional trust.

Article 23. [Dual-View Runway Reporting] The system must report Runway from two distinct perspectives to provide a complete decision matrix:
1. **Survival Runway (Defensive Floor):** Calculated under the assumption of Zero-Revenue (Gross Burn). This is the hard survival baseline for risk management.
2. **Strategic Runway (Offensive Ceiling):** Calculated using AI-forecasting (Net Burn). This is the projection for business-as-usual growth.
Contradictions between these two are expected and must be explicitly labeled to avoid executive confusion. **Strategic trend lines must also use context-aware windows (e.g., 30-day MA for monthly business) to maintain a consistent signal through idle transaction periods.**
 
+Article 24. [Strategic Feedback Synthesis] To ensure continuous alignment with executive intent, the system must maintain a permanent 'Strategic Feedback Loop'. All historical corrections, logic refinements, and preferred reporting styles (e.g., preference for 30-day moving averages, dual-runway views, and unified ledger-based risk calculations) must be treated as immutable developer mandates. Any new feature or modification must be cross-referenced against this feedback history to prevent the regression of established reporting standards and to maintain the "Strategic Voice" of the AI CFO.
