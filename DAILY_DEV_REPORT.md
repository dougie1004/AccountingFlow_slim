# AccountingFlow 개발 일지 (2026-01-31)

## 📌 주요 작업 요약
사용자 경험(UX) 개선 및 회계 데이터의 투명성/정합성 확보에 집중하였습니다. 특히 대시보드와 총계정원장 간의 데이터 불일치 오해를 해소하기 위해 상세 내역(Dr/Cr) 표시 기능을 강화하였고, 실무에서 필수적인 가계정(Suspense Account) 관리 기능을 추가했습니다.

## 🛠 상세 구현 내역

### 1. 사용자 경험 (UX) 및 편의성
- **새로고침(F5) 시 내비게이션 유지**
  - 문제: 새로고침하면 무조건 대시보드로 초기화되는 현상.
  - 해결: `localStorage`를 활용해 현재 탭 상태를 저장/복원하도록 수정.
- **재무제표 UI 개선**
  - "Close Audit"이라는 어색한 영문 버튼을 "닫기"로 수정.

### 2. 대시보드 (Dashboard) 고도화
- **현금 흐름(Current Cash) 카드 개선**
  - 기존: 잔액(Net Balance)만 표시되어 자금 원천 파악 불가.
  - 개선: **Inflow(차변) / Outflow(대변)** 총액을 하단에 상세 표시하여 잔액 산출 근거 명시.

### 3. 총계정원장 (General Ledger) 정합성 확보
- **합계 계산 로직 수정**
  - 문제: 차변/대변 구분 없이 절대값으로 단순 합산하여 잘못된 합계(`122M`) 표시.
  - 해결: 차변(Debit)과 대변(Credit)을 구분하여 합산하고, 그 차이를 잔액으로 계산.
- **Trial Balance(시산표) 형태의 하단 요약바 적용**
  - **Total Debit (차변 계)** / **Total Credit (대변 계)** / **Net Balance (잔액)** 분리 표시.

### 4. 회계 엔진 및 계정 과목 확장
- **임시/가계정(Suspense Account) 지원**
  - **자산**: 가지급금 (Suspense Payments), 전도금 (Petty Cash), 미수수익 (Accrued Income).
  - **부채**: 가수금 (Suspense Receipts), 선수수익 (Unearned Revenue).
- **시뮬레이션 데이터 추가**
  - 가지급금(출장비), 전도금(부서운영비), 가수금(불명입금) 테스트 케이스 주입 완료.

### 5. 재무제표 (Financial Statements)
- **영업자산/부채 변동(Working Capital) 계산 로직 정교화**
  - 기초 잔액을 순액(자산-부채) 기준으로 수정하고, 기간 변동 표시는 0에서 시작하도록 조정하여 혼란 방지.

---

# AccountingFlow 개발 일지 (2026-02-03)

## 📌 주요 작업 요약
회계 시스템의 신뢰성을 결정짓는 **'결산 및 마감 관리(Period Closing)'** 시스템과 **'데이터 불변성(Immutability)'** 통제 로직을 완비하였습니다. 이제 과거의 확정된 데이터와 현재의 잠정적 데이터를 명확히 분리하여 CFO 수준에서의 리스크 관리 기능을 제공합니다.

## 🛠 상세 구현 내역

### 1. 결산 엔진 (Closing Engine) 및 상태 관리
- **회계 기간(Accounting Period) 상태 도입**
  - OPEN/CLOSED 상태를 기반으로 월간 단위 마감 프로세스 구축.
- **결산 스냅샷(Closing Snapshot) 생성**
  - 결산 시점의 재무 상태표 요약(Assets, Liabilities, Equity) 및 3대 Pillar(Operational, Matching, Compliance) 리스크 잔액을 박제하여 이력 관리.
- **결산 전 검증 로직(Pre-check)**
  - 미승인 전표 존재 여부 및 데이터 무결성 검사 기능을 통해 '정상적인 상태'에서만 마감이 가능하도록 통제.

### 2. 데이터 불변성 및 시각적 락킹 (Visual Locking)
- **전표 수정/삭제 차단**
  - 마감된 기간(CLOSED)에 속하는 모든 전표의 수정, 삭제 버튼을 비활성화하고 입력 필드를 Read-only로 전환.
- **공식 확정 표시(Security Indicator)**
  - 장부 내 마감된 전표 배경에 은은한 락킹 컬러를 적용하고 `🔒 Finalized` 배지를 추가하여 데이터의 확정 상태를 명시.

### 3. 대시보드(Dashboard) - 리스크 관리 강화
- **결산 인사이트 위젯(Closing Insight Widget)**
  - 메인 차트 우측에 최근 결산 리포트 요약을 배치.
  - "결산 시 이월된 미결 리스크" 섹션을 통해 미결된 채권/채무 리스크를 3대 Pillar 카테고리별로 상시 모니터링 가능.
- **결산 상태 인디케이터**
  - 대시보드 헤더에 실시간으로 마지막 결산 확정일을 표시하여 시스템 정합성 상태 노출.

### 4. 재무제표(FS) 보고 모드 이원화
- **Provisional(잠정) vs Finalized(확정) 토글**
  - **잠정 모드**: 현재 승인된 모든 데이터를 포함한 실시간 경영 보고서 조회.
  - **확정 모드**: 마지막 공식 마감일까지의 데이터만 필터링하여 정식 보고용 수치 제공.
- **결산 미진행 알림 및 워터마크**
  - 결산 데이터가 없을 경우 마감을 유도하는 가이드를 제공하고, 확정 모드 조회 시 `Lock` 아이콘을 통해 리포트의 신뢰도 명시.

---
### 5. 경영 리스크 브리핑 및 의사결정 피드백 루프 (Phase 4.5 ~ 5)
- **경영진 맞춤형 리스크 엔진 (Management Risk Engine)**
  - 단순 감사 수치를 넘어 **Observation(관측) → Impact(영향) → Decision(판단 옵션)**의 3단계 로직 도입.
  - 분할 결제 의심, 주말 법인카드 사용, 고액 가지급금 등 경영진이 즉시 판단해야 할 리스크 탐지 로직 고도화.
- **의사결정 캡처 (Decision Capture - Phase 4.5.1)**
  - CEO/CFO가 제시된 옵션 중 무엇을 선택했는지, 그 사유(Comment)는 무엇인지 기록하는 피드백 루프 구축.
  - `RiskDecisionLog`를 통한 판단 이력 관리 및 `DECIDED` 상태 동기화.
- **AI 서술형 보고서 생성 (Narrative Generation - Phase 5)**
  - 감지된 리스크와 경영진의 판단 내역을 종합하여 서술형 Markdown 보고서 자동 생성 기능 구현.
  - **[Generate Final Report]** 버튼을 통해 최종 의사결정 브리핑 문서를 다운로드 가능하게 처리.

### 6. 회계 정합성 보정 (Accounting Integrity)
- **리스 계약 초기 인식(Initial Recognition) 자동화**
  - 리스 등록 시 `사용권자산(RoU Asset)`과 `리스부채(Lease Liability)` 분개를 자동으로 생성하도록 보완하여 재무제표 반영 누락 방지.

---
**✅ Next Step (COMPLETED):**
- 경영진 보고서(Final Report)의 UI 내 직접 미리보기(Preview) 기능 구현 완료.
- 다국어 지원(Korean/English) 리터럴 시스템 실장 완료.
- AI 기반 계정 과목 자동 매칭 로직(Pillar Mapping) 고도화 완료.

**🚀 Future Focus:**
- 언어 전환 UI 및 외화 감사 기능 추가.
- 고해상도 증빙 자료의 대용량 배치 처리 최적화.

---
**🛠 Bug Fixes & Optimization (Current Session):**
- **Receipt OCR Speed & Accuracy:** 
    - Frontend Tesseract.js fallback(Slow/Low accuracy)을 완전 제거하고 Backend Gemini Vision 연동으로 통합.
- **Stability Fixes & Regressions:**
    - AI 응답의 JSON 추출 로직을 강화하여 불필요한 텍스트 포함 시에도 정확하게 데이터를 파싱하도록 수정.
    - Rust Enum(`ParseStatus`)의 대소문자 매칭 이슈(Ok/ok)를 해결하여 역직렬화 오류 차단.
    - 업로드 시 API 속도 제한(Rate Limit) 방지를 위해 병렬 처리를 안정적인 순차 처리로 롤백.
- **Evidence Integration & UI:**
    - AI 분석 완료 시 원본 이미지가 전표에 자동으로 첨부되는 파이프라인 구축.
    - 브라우저 차단 및 경로 이슈가 없는 **앱 내부 전용 증빙 뷰어(Internal Modal)** 구현.
    - 아파트 관리비 등 복잡한 고지서의 경우 합계 금액 위주로 요약 인식하도록 AI 가이드라인 최적화.
