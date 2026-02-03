import { ClearingRecord } from './index';

export interface IntelligenceSnapshot {
    companyId: string;
    asOfDate: string;
    metrics: {
        totalAssets: number;
        unsettledAmount: number;    // 전체 미결 금액
        suspenseRatio: number;      // 미결 가계정 / 총자산 (Compliance)
        opRiskRatio: number;        // 상거래 미결 / 총 미결 (Operational)
        matchingRiskRatio: number;  // 선급/선수 미결 / 총 미결 (Matching)
        blockedAmount: number;
        blockedRatio: number;       // BLOCKED / 총 미결
        overdue90Amount: number;
        overdue90Ratio: number;     // 90일 초과 / 총 미결
    };
    breakdowns: {
        byStatus: {
            OPEN: number;
            BLOCKED: number;
            CLEARED: number;
        };
        byRiskReason: Record<string, number>;
    };
}

export type InsightSeverity = 'INFO' | 'STABLE' | 'ATTENTION' | 'URGENT';

export interface InsightFinding {
    id: string;
    severity: InsightSeverity;
    title: string;
    description: string;
    recommendation: string;
    relatedMetric?: string;
    tags?: string[];
}
