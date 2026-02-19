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

**Next Steps:**
*   **Phase 3 - Step 2:** Implement AI Advice Generation based on the observed deviations.
*   Connect the `StrategicBridge` to the LLM (Gemini) to generate actionable C-level insights.

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
