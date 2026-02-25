> ⚠️ **본 문서는 비공개 문서입니다. 무단 배포 및 외부 유출을 엄격히 금지합니다.**

# AccountingFlow 회계 정책 (Accounting Constitution)


## 핵심 철학: "Fail-Fast & Integrity First"

AccountingFlow는 부정확한 회계 처리를 허용하느니 차라리 시스템을 멈추는 것을 원칙으로 합니다.
모든 데이터 흐름은 추적 가능해야 하며(Traceable), 설명 가능해야 하고(Explainable), 불변해야 합니다(Immutable).

### 1. 회계 헌법 6대 규칙 (The 6 Canons)

#### Rule 1: 단일 진입점 (Single Entry Point)
- 모든 현금 및 자본의 변동 계산은 오직 `calculateNetCashChange()` 함수 하나만을 통해 이루어져야 한다.
- 분산된 로직에서 개별적으로 더하거나 빼는 행위를 엄격히 금지한다.

#### Rule 2: 기준 시나리오 검증 (Baseline Scenario)
- 복잡한 로직을 배포하기 전, 손으로 계산 가능한 10개의 '기준 거래(Baseline Transaction)'를 통과해야 한다.
- 예: "100만원 매출 발생 후 10% 부가세 예수금 적립" 등의 기본 시나리오.

#### Rule 3: 자동 무결성 검증 (Auto Validation)
- 시스템이 구동될 때마다 Ledger(원장)의 차변(Debit)과 대변(Credit)의 합이 일치하는지 자동으로 검증한다.
- 불일치 발생 시 즉시 `CRITICAL_ERROR`를 발생시킨다.

#### Rule 4: 현실성 체크 (Reality Check)
- 비현실적인 수치(예: 순현금 100조 원 이상, 마이너스 현금 등)가 감지되면 즉시 경고를 발생시킨다.

#### Rule 5: 시뮬레이션 순수성 (Simulation Purity)
- 시뮬레이션 과정에서 원본 원장(Source Ledger)을 직접 변조(Mutation)해선 안 된다.
- 반드시 복제된 상태(Cloned State) 위에서 가상의 거래를 수행해야 한다.

#### Rule 6: 상태 추적 (State Tracking)
- AR(매출채권)/AP(매입채무)는 단순한 숫자가 아닌, 발생 시간과 만기 상태를 가진 '상태'로 관리되어야 한다.

#### Rule 7: 데이터 정직성 (Data Honesty)
- "목표에 근접하도록 튜닝"하는 모든 행위(Narrative Mode)를 엄격히 금지하며, 목표 미달 시에는 미달했다는 사실을 그대로 보고함으로써 리스크를 조기에 발견할 수 있도록 한다.

#### Rule 8: 증거 기반의 리스크 소명 (Evidence-based Drill-down)
- 경영진용 리스크 지표가 'Watch' 또는 'Critical'을 발생시킨 경우, 해당 카드를 클릭했을 때 일반 메뉴로 이동하는 것이 아니라, 해당 판정의 근거가 된 'Raw Data(증거)'를 즉시 제시해야 한다.
- 단순한 라우팅은 경영자의 판단 시간을 낭비하게 하므로 금지한다.

#### Rule 9: 맥락 기반 계정 집계 (Context-Aware Aggregation)
- 리스크 분석 엔진은 계정 이름이 동일하더라도 비즈니스 맥락에 따라 집계 방식을 달리해야 한다. 
- 예: B2C 구독자 등의 '매스 소비자' 그룹은 단일 거래처 리스크 집계에서 제외하고 '분산된 매출'로 해석한다. 이들을 단일 리스크로 오인하여 불필요한 공포(False Positive)를 유도하지 않는다.

#### Rule 10: UI 보존 및 지시 기반의 변경 (UI Preservation & Instruction-led Mutation)
- 사용자의 명시적인 요청 없이 기존 UI의 구조, 스타일, 기능을 임의로 변경하거나 삭제하는 행위를 엄격히 금지한다.
- 새로운 기능은 기존의 흐름을 방해하지 않는 범위 내에서 "필요한 것만" 추가하며, 과잉 기능(Over-feature)으로 인한 시각적 노이즈를 최소화한다.
- 사용자의 의도를 벗어난 독단적인 디자인 변경은 회계 헌법 위반으로 간주한다.

---

### 2. 기술적 구현 디테일

#### 원장 불변성 (Ledger Immutability)
`JournalEntry` 객체는 생성되는 즉시 고유한 `sequenceNumber`를 부여받으며, 이후 수정이 불가능해야 한다 (`Read-Only`). 수정이 필요한 경우, 역분개(Reversal Entry) 후 새로운 전표를 생성하는 것이 원칙이다.

#### 시간 컨텍스트 (Time Context)
모든 회계 처리는 '시스템 시간(Now)'이 아닌 '해당 전표의 결산 시점(Accounting Period End)'을 기준으로 판단한다.
