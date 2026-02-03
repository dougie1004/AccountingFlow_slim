import { IntelligenceSnapshot, InsightFinding, InsightSeverity } from '../types/intelligence';

export const analyzeIntelligence = (snapshot: IntelligenceSnapshot): InsightFinding[] => {
    const findings: InsightFinding[] = [];

    // 1. Compliance Risk (가계정 / Suspense)
    if (snapshot.metrics.suspenseRatio > 0.1) {
        findings.push({
            id: 'compliance-risk',
            severity: 'URGENT',
            title: '가계정(가수/가지급) 비중 임계치 초과',
            description: `총자산 대비 가계정 비중이 ${(snapshot.metrics.suspenseRatio * 100).toFixed(1)}%로 매우 높습니다.`,
            recommendation: '세무 조사 리스크가 있으므로 즉시 실질 계정으로 대체 전표를 발행하세요.',
            tags: ['세무 리스크', '법적 준거성']
        });
    }

    // 2. Operational Risk (상거래 미결 / Operational)
    if (snapshot.metrics.overdue90Ratio > 0.4) {
        findings.push({
            id: 'operational-aging',
            severity: 'ATTENTION',
            title: '상거래 채권/채무 노후화 주의',
            description: `전체 미결 항목의 ${(snapshot.metrics.overdue90Ratio * 100).toFixed(1)}%가 90일 이상 정체되어 있습니다.`,
            recommendation: '거래처별 채권 회수 계획을 점검하고, 악성 채권에 대한 대손 충당금 설정을 검토하세요.',
            tags: ['자금 회수', '운전자본']
        });
    }

    // 3. Matching Risk (선급/선수 / Matching)
    if (snapshot.metrics.matchingRiskRatio > 0.3) {
        findings.push({
            id: 'matching-risk',
            severity: 'ATTENTION',
            title: '월결산 상각 필품 항목(선급/선수) 증가',
            description: `현재 미결 자금 중 선급금(비용) 및 선수금의 비중이 ${(snapshot.metrics.matchingRiskRatio * 100).toFixed(1)}%입니다.`,
            recommendation: '선급비용의 경우 월할 상각(Amortization) 전표 발행 여부를 점검하고, 선수금은 서비스 제공 완료에 따른 매출 인식을 검토하세요.',
            tags: ['계약 관리', '수익 인식', '월차 결산']
        });
    }

    // 4. Evidence & Blocked Logic
    if (snapshot.metrics.blockedRatio > 0.2) {
        findings.push({
            id: 'blocked-focus',
            severity: 'ATTENTION',
            title: '내부 통제에 의한 정산 중단 건 발생',
            description: `미결 금액의 ${(snapshot.metrics.blockedRatio * 100).toFixed(1)}%가 증빙 미비 등의 사유로 잠겨 있습니다.`,
            recommendation: '해당 담당자에게 증빙 보완을 요청하거나 예외 승인 절차를 진행하세요.',
            tags: ['내부 통제']
        });
    }

    // 5. Stable Case
    if (findings.length === 0) {
        findings.push({
            id: 'healthy-status',
            severity: 'STABLE',
            title: '통제 지표 매우 양호',
            description: '가계정, 상거래 미결, 매칭 리스크 전 영역에서 특이사항이 발견되지 않았습니다.',
            recommendation: '현재의 투명한 자금 정산 체계를 유지하시기 바랍니다.',
            tags: ['안정성']
        });
    }

    return findings;
};
