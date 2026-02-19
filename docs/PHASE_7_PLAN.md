> ⚠️ **본 문서는 비공개 문서입니다. 무단 배포 및 외부 유출을 엄격히 금지합니다.**

# Phase 7 구현 계획: 신뢰의 시각화


## 목표
- AI가 '침묵'한 영역(Unclassified)을 사용자에게 명확히 인지시키고, 이를 효율적으로 처리할 수 있는 UI/UX를 제공한다.

## To-Do List

### 1. Backend: Confidence Filtering
- [ ] `DataMapper` 로직 수정: AI 추천 점수가 `CONFIDENCE_THRESHOLD` (85점) 미만일 경우 `account_code`를 `null` 또는 `UNCLASSIFIED`로 할당.
- [ ] `JournalEntry` 메타데이터에 `aiConfidenceScore` 및 `silenceReason` 필드 추가.

### 2. Frontend: Sidebar & Navigation
- [ ] `ComplianceSidebar.tsx`: '검토 필요(Unclassified)' 항목의 개수를 뱃지(Badge)로 표시.
- [ ] 사이드바 메뉴에 '검토 대기함(Suspense Inbox)' 탭 추가 (선택 사항).

### 3. Frontend: Staging Table
- [ ] `StagingTable.tsx`: 미분류 항목은 배경색을 연한 회색(Grey Zone)으로 처리하여 시각적 구분.
- [ ] '일괄 승인' 버튼 클릭 시, 미분류 항목은 승인 대상에서 자동 제외되도록 로직 수정.

### 4. Feedback Loop
- [ ] 사용자가 수동 분류한 데이터를 별도 저장소(`CorrectedExamples`)에 저장하여 다음 학습 모델 개선에 활용.
