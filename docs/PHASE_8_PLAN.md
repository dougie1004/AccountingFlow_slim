> ⚠️ **본 문서는 비공개 문서입니다. 무단 배포 및 외부 유출을 엄격히 금지합니다.**

# Phase 8 계획: 책임 라우팅 (Responsibility Routing)


**"시스템이 모르는 것은, 누가 알 것인가?"**

Phase 7에서 AI가 침묵한(미분류) 전표들은 이제 '누군가'의 책임을 기다립니다. Phase 8은 이 책임을 적절한 주체에게 배달하는 '라우팅(Routing)' 시스템을 구축합니다.

## 핵심 기능 (Core Features)

### 1. 책임 주체 정의 (Responsibility Actors)
- **AI (System)**: 확신할 수 있는 단순 반복 거래.
- **CFO (Human Expert)**: 판단이 필요한 복잡한 거래, 세무 이슈.
- **CEO (Business Owner)**: 용처가 불분명한 지출, 접대비 등 소명이 필요한 거래.

### 2. 라우팅 로직 (Routing Logic)
- **금액 기준**: 100만 원 이상 거래 -> CFO 검토.
- **계정 기준**: '접대비', '복리후생비' -> CEO 소명 요청.
- **미분류**: AI가 모르는 거래 -> CFO에게 우선 배정.

### 3. 책임 로그 (Accountability Log)
- 전표 처리가 완료되면 `processedBy` 필드에 처리 주체(Actor)를 기록.
- "이 전표는 AI가 처리함", "이 전표는 CEO가 소명함" 등 이력을 투명하게 관리.

## UI 구성안
- **Responsibility Card**: 각 전표 옆에 '담당자 아이콘' 표시.
- **Assign Modal**: "이 거래를 누구에게 물어보시겠습니까?" 팝업 제공.
