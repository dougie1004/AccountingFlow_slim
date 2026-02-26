# Daily Work Log

## 2026-02-18

### 🚀 Phase 3: Observation Mode Implementation (Step 1 Complete)

**Objective:**
Implement a "Silent Observation" system that compares actual financial data against the strategic baseline without interfering with operations, to prepare for AI-driven strategic advice.

**Work Items:**
1.  **Strategic Deviation Engine (`deviationEngine.ts`) Upgrade**
    *   Implemented logic to compare real-time `ledger` data against `baselineScenario.ts`.
    *   Added calculation for Variance % across key metrics: Revenue, Expense, Cash, NetIncome.
    *   Defined severity levels (STABLE, WATCH, CRITICAL) based on deviation magnitude.

2.  **Strategic Observation Console (`ProcessMonitoring.tsx`)**
    *   Added a dedicated console UI to the Process Monitoring page.
    *   Displays real-time variance without blocking user operations (unless critical integrity failure).
    *   Added "System OFFLINE" graceful error handling to prevent page crashes during data violations.

3.  **Critical Integrity Fixes (`AccountingContext.tsx`)**
    *   **Bug Fix:** Resolved a persistent `[CONSTITUTION VIOLATION]` error where the system incorrectly calculated VAT totals (adding VAT to only one side of the ledger).
    *   **Improvement:** Refactored the double-entry validation logic to correctly sum `amount + vat` for both Debit and Credit sides, ensuring true accounting equilibrium.

4.  **Mock Data Hardening (`mockDataGenerator.ts`)**
    *   Enforced strict `Math.round()` on all generated amounts to eliminate floating-point calculation errors (e.g., 1-won mismatches).
    *   Verified that the 3-year simulation data (STANDARD scenario) is compliant with the system's Constitution.

**Results:**
*   Successfully injected 3 years of simulation data (452 entries).
*   **Observation Mode Active:** The system correctly identified significant strategic deviations (Revenue +5894%, NetIncome -1075%) compared to the 1-month baseline, confirming the engine's ability to track "Growth vs Plan".
*   System stability maintained under high data load.

**6. **Final Sanity Pass & Presentation Prep**
    - Verified brand consistency in Financial Statements.
    - Added "Lie Detector" tooltips to the Sealing Engine.
    - Created `presentation_showcase.md` workflow for the critical intermediate presentation.
    - 🛡️ **Status: STABLE & PRESENTATION READY**

### Next Steps:
- Execute the presentation using the `/presentation_showcase` workflow.
- Monitor AI service stability during the demo.
- Prepare for the next phase of the CFO audit automation.

---

## 2026-02-18 (Session 2)

### 🐛 Critical Bug Fix: 이익잉여금(Retained Earnings) 누락 → 합계잔액시산표 차대 불일치

**문제 현상:**
- 합계잔액시산표(TB) 하단의 차변 합계 ≠ 대변 합계
- `이익잉여금` 계정이 시산표에 표시되지 않거나 맨 마지막 줄에 밀려서 보이지 않음

**근본 원인:**
- `FinancialStatements.tsx`의 `movementMap` 생성 로직에서 전년도 수익/비용을 이익잉여금으로 이월(Closing)할 때 계정명을 `'이익잉여금 (Retained Earnings)'`로 하드코딩
- `STANDARD_ACCOUNTS`에 정의된 표준 계정명은 `'이익잉여금'` (괄호 없음)
- 이름 불일치로 인해 `sortOrder` 매칭 실패 → `999`번으로 밀려남 → 화면 밖 또는 합계 불일치

**수정 파일:**
1. `src/pages/FinancialStatements.tsx` (135라인)
   - `process('이익잉여금 (Retained Earnings)', ...)` → `process('이익잉여금', ...)`
2. `src/pages/TrialBalance.tsx` (137라인)
   - `const reAcc = '이익잉여금(결손금)'` → `const reAcc = '이익잉여금'`
   - `useAccounting`에서 `subLedger` 추가 destructuring
   - `selectedYear`를 로컬 `useState`로 분리 (Context에 없는 속성 참조 오류 수정)
   - `parseInt(selectedYear)` 타입 캐스팅 추가
3. `src/utils/canonicalData.ts` (103라인)
   - 데모 데이터의 결산 분개 계정명도 `'이익잉여금'`으로 통일

**검증:**
- `이익잉여금`이 `STANDARD_ACCOUNTS`의 `sortOrder: 320`에 매칭 → 자본금 다음 위치에 정상 표시
- 전년도 누적 손익이 이익잉여금 Opening Balance로 정상 이월됨
- 차변/대변 합계 일치 예상

---

### 📊 시나리오별 재무 전망 분석 (코드 정적 분석 기반)

`mockDataGenerator.ts` 로직 분석을 통한 4개 시나리오 가정 및 예상 결과 정리.
→ 상세 내용: `SCENARIO_ANALYSIS_2026_2028.md` 참조

**핵심 인사이트:**
- **생존 모드:** 2028년 흑자 전환 가능. 대표이사 가수금으로 연명하지만 이익률이 가장 높음.
- **자력 표준:** 지원금 없이 3인 체제는 2026년 말 파산 위험. 가장 위험한 시나리오.
- **표준 성장:** 지원금 5,000만 + B2B 계약으로 안정적. 권장 시나리오.
- **공격 확장:** VC 투자 2억 필수. 성공 시 2028년 매출 12억 가능.

**Next Steps:**
- 브라우저에서 각 시나리오 직접 실행하여 시산표 차대 일치 최종 확인
- `이익잉여금` 수정 후 TB 화면 스크린샷으로 검증

---

## 2026-02-19

### 🎯 SaaS 수익 모델 현실화 및 재무 시뮬레이션 정밀 튜닝 (v9.2)

**Objective:**
사업계획서 상의 요금제 비중, AI 원가 절감 전략, 그리고 현실적인 B2B 획득 비용(CAC)을 반영하여 "종이 위 계산"이 아닌 "생존 가능한 로드맵"을 검증함.

**Work Items:**
1.  **초보수적 SaaS 매출 모델 적용 (ARPU 30,850원)**
    *   기존 3.5만 원에서 프로페셔널 비중을 5%로 하향 조정하여 30,850원으로 현실화.
    *   매출원가(COGS)를 하이브리드 AI 전략(Flash 200건 + Pro 60건)에 맞춰 **인당 3,000원**으로 고정.

2.  **정부 지원 심사 대응용 CAC/LTV 동기화**
    *   **Reality Check CAC:** 2만 원대에서 **8만 원(보수) / 5만 원(표준)**으로 대폭 상향.
    *   **LTV 수식 교정:** 하드코딩되었던 과거 단가(15,000원)를 현재 공헌이익(27,850원) 기반으로 자동 계산되도록 수정.
    *   **Payback Period:** 약 2.9개월(보수 기준)로 산출되어 비즈니스 모델의 건강성 입증.

3.  **하이브리드 생존 전략(Survival Strategy) 복구**
    *   Pure SaaS만으로는 2027년 '현금 절벽' 돌파가 불가능함을 확인 (CAC 8만 원 조건).
    *   **스타트업 리테이너(250만~400만/월)** 수입을 재유입시켜 2027년 고정비를 방어하는 하이브리드 모델 완성.
    *   업체명을 '소규모 스타트업/1인 기업'으로 현실화하여 리얼리티 강화.

4.  **성장 엔진 로직 버그 수정**
    *   **Roadmap Ceiling 버그:** 사업계획서 수치(60-300-800)가 '강제 캡'으로 작동하여 마케팅 ON/OFF 임팩트가 가려지던 문제 해결.
    *   마케팅 중단 시 유효 성장률이 즉시 꺾이고 이탈률에 의해 유저가 순감하는 다이내믹 로직 구현.

**Results:**
*   **BEP 유저수:** 보수적 모델 기준 **약 556명** (2028년 상반기 도달 예상)
*   **자금 조달 필요성:** 2027년 누적 적자 구간(약 8천~1억) 확인. 구축 용역 병행 시 자력 생존 가능성 극대화.
*   로드맵과 시뮬레이션 데이터 간의 수치적 무결성 확보.

**Next Steps:**
*   최종 튜닝된 데이터를 바탕으로 투자자용 IR 재무 추정 장표(Excel Export 수준) 데이터 정교화.
*   시나리오별 '현금 고갈 경고' 시스템 작동 테스트.
## 2026-02-19 (Session 2)

### 📊 SaaS 시뮬레이션 엔진 v11.0 '방어적 표준화' 및 현금 무결성 복구

**Objective:**
ChatGPT의 비판적 피드백을 수용하여, 모든 변수가 동시에 좋아지는 '장밋빛 시나리오'를 배제하고 외부 심사역이 납득 가능한 수준의 **방어적 재무 모델**을 정립함.

**Work Items:**
1.  **현금 무결성 시스템 (Hard Cash Guard v4.0) 복구**
    *   **문제:** 회계 원칙상 현금이 마이너스(-)가 되는 비현실적 데이터 발생.
    *   **해결:** 지출 전 현금 잔액을 실시간 감시하여 1,000만 원 미만 시 즉시 **'운영 런웨이 확보를 위한 전략적 유상증자(Equity)'** 분개(5,000만) 자동 삽입.
    *   **효과:** 대시보드상 현금 잔액의 무결성 확보 및 외부 자금 수혈 시점의 투명한 시각화.

2.  **SaaS 성장 엔진 v11.0 '방어적 밸런싱'**
    *   **이탈률(Churn) 하한선 설정:** 연차가 쌓여도 폐업 등 불항력적 요인을 고려하여 **3% 미만으로 내려가지 않도록** 고정.
    *   **CAC 효율화 가이드라인:** 브랜드 인지도 상승에도 불구하고 경쟁 심화를 반영하여 **6만 원(생존) / 4만 원(성장) 이하로 떨어지지 않도록** 방어적 설계.
    *   **브랜드 모멘텀 제어:** 유저 500명 돌파 전까지는 자연 유입(Organic) 효율을 80% 수준으로 억제하여 현실적인 임계점 구현.

3.  **타임라인 및 기초 잔액 정상화**
    *   **Bug Fix:** 설립 전인 2026년 1~4월에 유령 비용이 발생하던 타임라인 버그 수정. 시뮬레이션은 무조건 **2026년 5월 설립 자본금 납입**부터 시작되도록 강제.
    *   **연도별 이월:** 2026년 말의 기말 유저 수가 2027년 기초 유저 수로 정상적으로 이월(Carry-over)되도록 구조 개선.

**Results:**
*   **2028년 말 유저 목표:** 약 **850명 내외** (사업계획서 800명과 95% 이상 일치)
*   **재무적 설득력:** "가장 보수적인 지표(Churn 3%, CAC 6만)를 썼음에도 2028년 내 자생이 가능하다"는 강력한 근거 확보.
*   **현금 흐름:** 2027년 중 누적 수혈액(약 1억 내외) 확인을 통해 전략적 자금 계획 수립 가능.

**Next Steps:**
*   `SCENARIO_ANALYSIS_2026_2028.md`를 v11.0 수치로 전면 개정하여 IR 대응 준비.
*   구현된 실행파일(.exe)을 통해 최종 대시보드 UI 및 데이터 무결성 재검증.
---

## 2026-02-19 (Session 3 - Final)

### 🏢 법인 설립 시뮬레이션 및 보조금 바우처 회계 고도화 (v11.8)

**Objective:**
재부팅 전 모든 전략적 로직을 확정하고, 정부지원금을 받는 스타트업의 실제 회계 현실(부가세 자부담, 바우처 카드 사용, 법인 설립 비용)을 100% 동기화함.

**Work Items:**
1.  **정부보조금 바우처(Voucher Card) 시스템 완비**
    *   **로직:** 보조금은 통장에 입금되지 않으나 한도(5,000만) 내에서 카드 결제 시 **[비용 ↔ 보조금수익]**이 1:1로 즉시 상계되는 구조 구현.
    *   **부가세 자부담:** 카드로 긁더라도 '부가세(10%)'만큼은 대표님의 보통예금 통장에서 실제 인출되도록 설계하여 자금 압박의 리얼리티 확보.
    *   **효과:** 보조금을 매출로 오인하여 발생하는 '가짜 BEP' 문제 해결 및 현금 잔액의 무결성 확보.

2.  **주식회사(Inc.) 설립 및 B2B 사업 기반 구축**
    *   **설립 타임라인:** 2026-05-02 법인 설립 자본금 납입 및 등기 프로세스 강제.
    *   **설립 비용:** 등록면허세, 법무사 수수료, 법인 인감 제작 및 초기 워크스테이션 구입(부가세 자부담) 전표 반영.
    *   **자본금 현실화:** 보조금이 있는 경우 설립 자본금을 500만 원(최소)으로 설정하여, 부가세 지출로 인해 자본이 타들어 가는 실제 창업 경험 시뮬레이션.

3.  **UI/UX 비즈니스 텍스트 정교화**
    *   **Label 변경:** 모호한 "AI Projection (2029+)"을 **"장기 비즈니스 건전성"**으로 변경하여 전략적 의미 강화.
    *   **BEP 판독기 수정:** 보조금 수익을 영업수익에서 제외하여, 실제 SaaS 구독 매출이 비용을 넘어서는 시점에만 흑자 표시가 나오도록 교정.

4.  **최종 성장 밸런싱 (Target 800)**
    *   2028년 연초에 목표를 조기 달성하던 버그 해결. 유입 효율을 35% 하향 조정하여 **2028-12 기점에 약 800명 내외**로 안착하는 우상향 곡선 완성.

**Results:**
*   **회계적 정석:** 나랏돈과 내 돈이 섞이지 않는 투명한 시뮬레이션 체계 구축.
*   **전략적 긴장감:** "지원금이 있어도 부가세 때문에 현금이 부족해지는" 상황이 연출되어 적기 자본 수혈의 필요성 입증.
*   **데이터 일관성:** 사업계획서 상의 2028년 800명 목표와 데이터가 98% 일치함.

**Status:**
*   모든 코드는 `src/utils/mockDataGenerator.ts` 및 `src/pages/SimulationReport.tsx`에 최종 반영됨.
*   `DAILY_WORK_LOG.md` 및 `SCENARIO_ANALYSIS_2026_2028.md` 업데이트 완료.

**Next Steps (After Reboot):**
*   작성된 시나리오 데이터를 바탕으로 투자 제안용 'Financial Summary' 엑셀 익스포트 기능 검증.
*   AI 경영 조언 시스템(Observation Mode) 연동 테스트.

---

## 2026-02-25

### 🚀 Data Ingestion & AI Intelligence Hardening (Phase 6+)

**Objective:**
Maximize the utility of raw data imports by incorporating supplemental 'Note/Remarks' context and automating intelligent VAT handling to eliminate 'Unclassified' entries and tax calculation errors.

**Work Items:**

1.  **Contextual Ingestion Engine (Note/Remarks Integration)**
    *   **Backend (`excel_parser.rs`):** Implemented automated detection for columns containing '비고', '메모', 'Note', or 'Remark'. The parser now extracts this metadata and appends it to the transaction description in the format `[Description] ([Note])`.
    *   **Frontend (`SmartExcelUploader.tsx`):** Added a dedicated "비고/메모 (Note)" mapping field. The UI now supports auto-detecting these headers from Korean bank/card exports.
    *   **Migration Wizard (`DataMigration.tsx`):** Updated the ERP migration flow to also capture and synthesize 'Note' data, ensuring legacy context is not lost during system transition.

2.  **Intelligent VAT Separation & Exemption Logic**
    *   **Rule Engine (`rule_based_classifier.rs`):** Implemented a mandatory VAT check. If VAT is missing from the source (e.g., simplified bank statement), the engine automatically separates VAT (10/110) for taxable items.
    *   **Exemption Guard:** Added a blacklist for non-taxable accounts including Salaries (급여), Insurance (보험료), Equity (자본금/잉여금), and Taxes (세금과공과). These items are now forced to 0 VAT regardless of the total amount.
    *   **Result:** Drastically reduced manual VAT corrections for common startup payroll and investment transactions.

3.  **Time Constitution Compliance**
    *   Enforced mandatory `transactionDate` and `recognitionDate` for all migration and import records. This ensures that historical data adheres to the same accrual-based principles as real-time transactions.

4.  **Sample Data Synchronization**
    *   Updated `generate_sample_excel.js` to include realistic '비고' entries (e.g., "Seed Series-A", "AI Infrastructure", "강남점 스마트오피스").
    *   Verified that the generated `real_data_sample.xlsx` is correctly classified by the AI with 100% hits on the upgraded rule engine.

5.  **Numeric Consistency & Truth Unification (SSOT)**
    *   **Logic Alignment:** Fixed a critical discrepancy where the Dashboard showed a 15% AR ratio while the detail modal showed 100%. Both now use the **Net Ledger Balance (Debit - Credit)** logic instead of unreliable per-entry flags.
    *   **Data Labeling:** Updated SaaS revenue generation to include explicit vendor labels ('SaaS 정기 구독자'), eliminating 'Unknown' (알수없음) entries in risk drill-downs.
    *   **Dual-View Runway Reporting:** Resolved the naming confusion between Dashboard (1.6m) and AI Forecast (8m). Implemented **Survival Runway** (Zero-Revenue baseline) and **Strategic Runway** (Forward-projection) with clear tooltips and constitutional mandates (Article 23).
    *   **Strategic Trend Fix:** Corrected the 'Whale Tail' phenomenon where the sales trend dropped to 0 on weekends. Upgraded to a **30-day Moving Average** to represent the Monthly Run-rate consistently.
    *   **Constitution Adherence:** Codified **Article 22** (Cross-Component Consistency), **Article 23** (Dual-View Runway & Context-Aware Trends), and **Article 24** (Strategic Feedback Synthesis).
    *   **Personalization:** Formally integrated the CEO's recurring feedback (numerical consistency, 30D-MA, survival mindset) into the system's core development DNA.

**Results:**
*   **Classification Accuracy:** Increased hit rate for vendors with multi-purpose spend (e.g., Amazon) by using the 'Note' field context.
*   **Compliance:** Fully aligned with Accounting Constitution Articles 19 & 20.
*   **User Experience:** Faster "Confirm" cycles as AI suggestions are now high-confidence based on full-context synthesis.

**Next Steps:**
*   Implement 'Bulk Review' mode for AI-classified entries to accelerate large-scale historical imports.
*   Extend 'Note' analysis to PDF/Receipt OCR for even higher context resolution.

## 2026-02-20

### 🛡️ 금융 정합성 엔진 v2.0 'L4 Immutable Sealing' 및 전략 리포트 고도화

**Objective:**
단순한 시뮬레이터를 넘어, 외부 조작이 불가능한 'Level 4: Immutable' 무결성 시스템을 구축하고, 누적 적자를 고려한 진실된 전략 지표를 제공함.

**Work Items:**

1.  **계정 드릴다운(Drill-down) 가시성 보정**
    *   **문제:** 이익잉여금 클릭 시 기초 잔액이 0으로 표시되어 기초 이월액 확인이 불가능했음.
    *   **해결:** `TrialBalance.tsx` 및 `FinancialStatements.tsx`의 상세 보기 모달에 **'전기이월(Brought Forward)'** 전용 행을 추가. 
    *   **효과:** 거래가 없는 달에도 과거 결산 결과를 투명하게 확인 가능.

2.  **L4 무결성 엔진 (Strategic Canonicalization) 구현**
    *   **Canonicalization:** 데이터의 '외형'이 아닌 '본질'만 추출하여 해싱. 행 순서 변경, 콤마 추가 등 서식 변화에도 해시값이 유지되도록 설계.
    *   **Seal & Verify:** 엑셀 내보내기 시 SHA-256 해시를 메타데이터로 봉인하고, 업로드 시 **엔진 리플레이(Replay)**를 통해 1원이라도 조작되었는지 즉시 검증하는 UI 구현.
    *   **결과:** "실험실 환경"을 넘어 "야생(외부 환경)의 데이터 조작"으로부터 시스템 방어.

3.  **BEP 대시보드 타임라인 무결성 확보 (Lifetime Analysis)**
    *   **문제:** 특정 연도(2028년) 필터링 시 과거의 누적 결산 손실을 잊어버리고 조기에 '누적 흑자'로 오판하던 로직 수정.
    *   **해결:** 상단 전략 대시보드는 현재 화면 필터와 무관하게 **전체 시뮬레이션 생애 주기(Lifetime)** 데이터를 분석하도록 강제.
    *   **효과:** 2028년 4월에 월간 흑자가 나더라도, 과거 적자를 다 갚는 '진짜 BEP' 시점을 2029년 이후로 정확히 추정.

**Results:**
*   **회계 헌법 제11~12조 공포:** '역사적 연속성'과 '전략 지표의 생애 주기 정합성'을 헌법에 명시.
*   **보안 레벨 격상:** ChatGPT의 공격 테스트 6종을 통과할 수 있는 수준의 무결성 확보.

**Status:**
*   모든 코드는 `src/utils/integrity.ts`, `src/pages/FinancialStatements.tsx`, `src/pages/SimulationReport.tsx`에 반영됨.
*   헌법 및 과업 기록 실시간 업데이트 체계 가동 시작.

## 2026-02-20 (Session 2)

### 📊 정부지원금(바우처) 현실화 및 집행 기한 엄격화

**Objective:**
5,000만 원이라는 보조금의 현실적 무게감을 반영하고, 프로젝트 종료 기한에 따른 사용 제한 로직을 구현하여 시뮬레이션의 실무적 정합성을 확보함.

**Work Items:**

1.  **보조금 집행 기한(Expiration) 도입 (헌법 제13조)**
    *   **문제:** 보조금을 3개년 내내 나누어 쓰는 비현실적 데이터 발생.
    *   **해결:** '2027년 5월(설립 후 1년)'을 바우처 만료일로 설정. 만료 이후의 지출은 무조건 회삿돈(보통예금)으로 결제되도록 강제.

2.  **지원금 규모 현실화 (5,000만 원 고정)**
    *   **조정:** 확장(Growth) 시나리오에서도 지원금은 5,000만 원으로 유지. (대표님 피드백: "5,000만 원도 충분히 큰 액수임" 반영)
    *   **효과:** 확장 시나리오에서는 높은 고정비로 인해 보조금이 더 빨리 소진되므로, 2027년 초 '현금 절벽' 구간의 긴장감이 더욱 리얼하게 묘사됨.

3.  **회계 헌법 제13조 공포**
    *   **내용:** "정부지원금은 사용기한이 존재하며, 기한 내 미사용 시 소멸한다. 시뮬레이션은 기한 내 보조금 우선 소진을 원칙으로 한다." 명시.

**Results:**
*   **2027년 상반기 자금 계획의 중요성 부각:** 지원금이 끊기는 27년 5월 이후의 현금 흐름을 미리 대비해야 함을 시각적으로 증명.
*   **실무 정합성:** 실제 정부 사업의 과업 기간(보통 1년)과 회계 처리를 일치시킴.

## 2026-02-20 (Session 3)

### 🚀 대시보드 통합 시뮬레이션 및 월별 손익 연계 강화

**Objective:**
사용자가 여러 메뉴를 오가지 않고도 대시보드에서 즉시 3개년 전체 시나리오를 실행할 수 있도록 통합하고, 월별 손익 현황 데이터와의 동기화 무결성을 확보함.

**Work Items:**

1.  **Dashboard '3개년 시뮬레이션 RUN' 마스터 버튼 추가**
    *   **기능:** 클릭 한 번으로 2026~2028년 전체 데이터를 생성하고 시스템 시각을 2028년 말로 자동 이동.
    *   **연계:** `SimulationReport.tsx`에서 사용하는 엔진과 동일한 `seedThreeYearSimulation`을 연동하여 데이터 100% 일치 보장.

2.  **전 메뉴 데이터 동기화 확인**
    *   **검증:** 대시보드에서 생성된 데이터가 `월별손익현황`, `합계잔액시산표`, `재무제표`, `원장` 메뉴에 즉시 반영됨을 확인.
    *   **자동 타임라인 싱크:** 시뮬레이션 실행 후 시스템 시각(`systemNow`)이 2028-12-31로 자동 설정되어 즉각적인 경영 분석 가능.

**Results:**
*   **원클릭 경영 전망:** 복잡한 개별 연도 팩 실행 없이도 3년 치 사업 계획의 재무적 임팩트를 즉시 확인 가능.
*   **데이터 연속성:** 대시보드와 상세 리포트 간의 수치 불일치 가능성 원천 차단.

## 2026-02-20 (Session 4)

### 📊 운영 계획 고도화: BvA(Budget vs Actual) 분석 센터 구축

**Objective:**
단순 예산 수립 기능을 넘어, 실제 지출 데이터(Actual)와 비교 분석(Variance Analysis)이 가능한 경영 통제 시스템을 완성함.

**Work Items:**

1.  **네비게이션 중복 오류 수정 (App.tsx)**
    *   **문제:** '운영 계획 수립' 메뉴 클릭 시 화면에 동일한 내용이 두 번 렌더링되던 문제 해결.
    *   **원인:** `App.tsx` 내 `activeTab === 'operation-plan'` 조건문이 중복 작성되어 있었음.

2.  **BvA Analysis 엔진 구현 (Operation Plan)**
    *   **Actual Tracking:** 현재 장부(Ledger)에서 승인된 비용 전표를 실시간으로 집계하여 예산 항목별로 매칭.
    *   **Variance Logic:** '계획(Plan) - 실적(Actual) = 차이(Diff)' 산식 적용. 예산 대비 초과 지출(Rose)과 절감(Emerald)을 직관적으로 시각화.
    *   **Summary Dashboard:** 카드 섹션에 '총 예산', '총 실지출', '총 절감액'을 배치하여 한눈에 재무 건전성 파악 가능.

3.  **회계 헌법 제14조 공포**
    *   **내용:** "모든 지출은 사전 승인된 운영 계획(예산)에 의거해야 하며, 월별 계획 대비 실적 분석(BvA)을 통해 전략적/운영적 편차를 파악해야 한다." 명시.

**Results:**
*   **경영 통제력 강화:** "얼마를 쓰기로 했는가?"와 "실제로 얼마를 썼는가?"를 한 페이지에서 즉시 비교 가능.
*   **데이터 정합성:** 장부의 실제 데이터가 운영 계획 리포트와 실시간으로 동기화됨을 확인.

## 2026-02-20 (Session 5)

### 🔒 데이터 무결성 검증 센터(Integrity Center) 정체성 정립

**Objective:**
불분명했던 '인텔리티 센터'라는 명칭을 직관적으로 변경하고, 해당 메뉴가 경영상의 어떤 목적을 수행하는지 명확히 규정함.

**Work Items:**

1.  **메뉴 명칭 변경 (Rebranding)**
    *   **변경 전:** 파이낸셜 인텔리티 센터 (Integrity Center)
    *   **변경 후:** 데이터 무결성 검증 센터 (Data Integrity Verification Center)
    *   **사유:** CFO 및 외부 감사인이 메뉴의 목적(조작 방지 및 진본 확인)을 즉각 인지할 수 있도록 함.

2.  **운영 목적(Operational Purpose) 명시**
    *   UI 상단에 "CFO 및 외부 감사인 전용 진본 확인실"이라는 안내 문구와 상세 설명을 추가.
    *   SHA-256 디지털 지문(Hash)을 통한 1원 단위 위변조 감지 원리를 설명하여 시스템의 공신력을 강조.

3.  **회계 헌법 제15조 공포**
    *   **내용:** "대외용으로 제출되는 모든 재무 보고서는 무결성 검증 센터를 통한 진본 확인 과정을 거쳐야 하며, 디지털 지문이 훼손된 문서는 공식 효력을 상실한다." 명시.

**Results:**
*   **Zero-Trust 아키텍처 완성:** 시스템 내부 데이터뿐만 아니라, 외부로 나간 데이터의 무결성까지 사후적으로 통제할 수 있는 프로세스 정립.
*   **사용자 의도 반영:** 대표님의 피드백을 반영하여 직관적이고 권위 있는 명칭으로 조정 완료.

## 2026-02-20 (Session 6)

### 📉 AI 현금흐름 예측 엔진 정밀 튜닝 및 논리 정합성 강화 (Bug Fix)

**Objective:**
예산 잔액과 예측치 간의 수치 불일치 원인을 정확히 규명하고, 시뮬레이션 데이터와 100% 일치하도록 엔진을 긴급 수리함.

**Work Items:**

1.  **현금 vs 자본(Equity) 혼동 버그 수정 (AccountingContext.tsx)**
    *   **문제:** 결산이 완료된 달(`CLOSED`)의 경우, 시스템이 현금 잔액을 '자산 - 부채(즉, 자본)'로 대략적으로 계산하여 반환하고 있었음.
    *   **영향:** 시뮬레이션상 비품(Bi-pum)이나 무형자산(Patent)은 많지만 누적 적자가 큰 경우, 실제 현금은 플러스임에도 불구하고 '자본' 수치는 마이너스가 되어 AI가 시작점 자체를 잘못 잡는 오류 발생. (약 3,350만원의 오차 원인)
    *   **수정:** `ClosingRecord` 생성 시 해당 시점의 실제 **현금 잔액(Cash Balance)**을 명시적으로 캡처하도록 데이터 구조를 개선하고, 예측 엔진이 이를 참조하도록 수정.

2.  **오진단 사과 및 로직 정정**
    *   **내용:** 이전 세션에서 언급한 '가수금(CEO 대여금) 차감 로직'은 데이터 갭을 설명하기 위한 잘못된 가설(오진)이었음을 확인. 현재 시뮬레이션 데이터에는 가수금이 없으며, 오직 '자산 vs 현금' 계산 방식의 차이로 인해 발생한 문제였음.

3.  **UI 투명성 및 정합성 확보**
    *   **수정:** 이제 요약 대시보드의 '현재 현금'과 AI 예측 패널의 '시작 현금'이 1원 단위까지 일치함.

4.  **회계 헌법 제16조 개정 (현금/자본 분리 원칙)**
    *   **내용:** "AI 예측 및 런웨이 산출은 반드시 '실제 현금 잔고'를 기초로 해야 하며, 자본(Equity)이나 순자산 가치를 현금의 대용치로 사용해서는 안 된다."

**Results:**
*   **완벽한 수치 일치:** 이제 대표님이 보시는 모든 화면의 현금 흐름 숫자가 하나의 진실(FTE)로 수렴함.
*   **데이터 정합성:** 마감된 달의 데이터도 더 이상 추정치가 아닌, 확정된 스냅샷을 사용함.

---

## 2026-02-26

### ⚖️ 재무 정합성(Financial Integrity) 마스터 브릿지 완성

**Objective:**
재무제표 간의 수치 불일치(Discrepancy)를 완전히 해결하고, 시스템 데이터와 외부 보고서 간의 무결성을 보장하는 검증 체계를 확립함.

**Work Items:**

1.  **현금흐름표(C/F) 정합성 로직 원천 수정**
    *   **중복 집계 해결:** 간접법 계산 시 이익잉여금(Retained Earnings) 변동분이 '기타 자산/부채 변동'에 중복 반영되어 숫자가 튀던 현상을 로직 수준에서 해결.
    *   **투자/재무 활동 분류 정교화:** 산업재산권 등 무형자산 취득이 영업활동으로 흐르던 것을 투자활동으로 정확히 재분류.
    *   **현금 대조군(Bridge) 추가:** 현금흐름표 하단에 '기초 현금'과 '기말 현금' 행을 추가하여 B/S의 현금 잔액과 직접 비교 가능하도록 개선.

2.  **실시간 무결성 검증 센터 (Verified Badge)**
    *   **자동 검증:** 현금흐름표의 기말 잔액이 재무상태표(B/S)의 보통예금 현금 잔액과 100% 일치할 경우 **[Verified]** 배지를 표시하는 로직 구현.
    *   **신뢰도 향상:** "숫자가 왜 안 맞지?"라는 의문 자체를 원천 차단하고 시스템이 스스로 정합성을 증명하게 함.

3.  **Sealing Engine (Verify 버튼) 철학 및 매뉴얼 정립**
    *   **디지털 지문(Hash):** 엑셀 파일 생성 시 데이터 지문을 심고, 사후 업로드 시 위변조 여부를 가려내는 '거짓말 탐지기' 기능의 작동 원리를 CFO 관점에서 상세 설명.
    *   **배치 논리:** 왜 '합계잔액시산표' 메뉴에 검증 기능이 있어야 하는지 회계적(T/B의 본질) 근거 정립.

4.  **AI 서비스 안정성 고도화 (Refinement)**
    *   백엔드(Rust)의 AI 호출 로직에 지수 백오프(Exponential Backoff) 및 모델 폴백(Fallback)을 적용하여 429(Rate Limit) 오류 발생 시에도 사용자 경험이 끊기지 않도록 개선.

5.  **최종 검토 및 프레젠테이션 준비 (Final Sanity Pass)**
    - 재무제표 내 브랜드 일관성(AccountingFlow) 확보.
    - Sealing Engine(Verify 버튼)에 CFO용 상세 툴팁(거짓말 탐지기) 추가.
    - 중간 발표를 위한 `/presentation_showcase` 워크플로우 생성 완료.
    - 🛡️ **상태: 프레젠테이션 준비 완료 (Presentation Ready)**

6.  **GitHub 코드 동결 및 업로드 (Core Logic Sealed)**
    - `feat: implement Financial Integrity Master Bridge and Sealing Engine` 커밋 및 푸시 완료.
    - 무결성 검증 엔진, 생존 모드 시뮬레이터, 타우리 백엔드 로직 전체 동기화.

**Results:**
*   **재무제표 일치:** B/S, P/L, C/F, T/B의 모든 숫자가 1원 단위까지 완벽하게 정렬됨.
*   **CFO 통제권 강화:** 실무자의 엑셀 조작 가능성을 기술적으로 차단할 수 있는 '검증권' 부여.
*   **데이터 신뢰성:** SHA-256 해시 기반의 거짓말 탐지기 엔진 작동 확인.

### Next Steps:
- `/presentation_showcase` 워크플로우를 따라 중간 프레젠테이션 진행.
- "생존 모드" 시나리오를 통한 스타트업의 자금 통제력 시연.
- AI 전무(AI CFO)의 전략 시뮬레이션 기능 시연 및 피드백 청취.
- 실시간 리스크 탐지 지표의 실효성 최종 점검.
