/**
 * 🛡️ Responsibility Distribution Engine (Phase 9)
 * Defines the routing of human responsibility when the AI remains silent.
 */

export type OrgRole = 'FINANCE_STAFF' | 'CFO' | 'SYSTEM_ADMIN' | 'INTERNAL_AUDITOR';

export interface ResponsibilityRoute {
    currentOwner: OrgRole;
    nextEscalation?: OrgRole;
    escalationAfterDays?: number;
    isImmutable: boolean;
    reason: string;
    description: string;
}

export interface OrgProfile {
    id: string;
    name: string;
    description: string;
    roles: OrgRole[];
    thresholds: {
        escalationDays: number;      // Tension Point 1: 2, 3, or 5 days
        highRiskAmount: number;     // Tension Point 2: Amount threshold
        requiresEvidence: boolean;  // Tension Point 2: Missing evidence = CFO route
        autoLockAfterReview: boolean; // Tension Point 3: Immediate lock vs Manual
    };
}

/**
 * STARTUP_V1: The "Small but Strong" Guardrail
 * Prioritizes speed and direct CFO oversight for anomalies.
 */
export const STARTUP_V1: OrgProfile = {
    id: 'STARTUP_V1',
    name: 'Startup Control Standard',
    description: '1인~소규모 재무팀을 위한 지연 방지 중심 프로세스',
    roles: ['FINANCE_STAFF', 'CFO'],
    thresholds: {
        escalationDays: 3,           // 3일 방치 시 CFO 강제 이관 (Tension Point 1)
        highRiskAmount: 5000000,    // 스타트업 임계값 하향 조정: 500만원 (Tension Point 2)
        requiresEvidence: true,     // 증빙 없음 = 즉시 CFO (Tension Point 2)
        autoLockAfterReview: true   // CFO 검토 시 즉시 봉인 (Tension Point 3)
    }
};

export interface TransactionIdentity {
    amount: number;
    isHighRisk?: boolean;
    accountName?: string;
    hasEvidence?: boolean;
    isRecurringAnomaly?: boolean;
}

/**
 * Calculates the responsibility route based on the 'Tension Point' configuration.
 * Phase 9-1: STARTUP_V1 Precision Tuning.
 */
export const getResponsibilityRoute = (
    tx: TransactionIdentity,
    profile: OrgProfile = STARTUP_V1
): ResponsibilityRoute => {
    const { thresholds } = profile;

    // 1. [Tension Point 3] Lock Logic
    if (tx.accountName) {
        return {
            currentOwner: 'CFO',
            isImmutable: thresholds.autoLockAfterReview,
            reason: 'LOCKED_AFTER_REVIEW',
            description: thresholds.autoLockAfterReview
                ? 'CFO 검토 및 정책에 의해 전표가 즉시 봉인되었습니다.'
                : '검토 완료 후 최종 승인을 대기 중입니다.'
        };
    }

    // 2. [Tension Point 2] High Risk / Anomaly Logic
    const isOverThreshold = tx.amount >= thresholds.highRiskAmount;
    const isMissingEvidence = thresholds.requiresEvidence && tx.hasEvidence === false;

    if (tx.isHighRisk || isOverThreshold || isMissingEvidence || tx.isRecurringAnomaly) {
        let riskReason = 'HIGH_RISK_UNCLASSIFIED';
        let riskDesc = '고위험 항목으로 분류되어 CFO에게 즉시 보고되었습니다.';

        if (isMissingEvidence) {
            riskReason = 'EVIDENCE_MISSING';
            riskDesc = '주요 증빙이 누락되어 시스템 정책에 따라 CFO 검토가 필요합니다.';
        } else if (isOverThreshold) {
            riskReason = 'OVER_THRESHOLD';
            riskDesc = `지출 금액이 임계값(${thresholds.highRiskAmount.toLocaleString()}원)을 초과했습니다.`;
        }

        return {
            currentOwner: 'CFO',
            isImmutable: false,
            reason: riskReason,
            description: riskDesc
        };
    }

    // 3. [Tension Point 1] Normal Unclassified with Escalation
    return {
        currentOwner: 'FINANCE_STAFF',
        nextEscalation: 'CFO',
        escalationAfterDays: thresholds.escalationDays,
        isImmutable: false,
        reason: 'UNCLASSIFIED',
        description: `${thresholds.escalationDays}일 이내 미처리 시 CFO에게 지연 보고가 전달됩니다.`
    };
};
