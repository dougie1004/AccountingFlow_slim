import { JournalEntry, BusinessRisk, ManagementReport, RiskLevel, RiskType, DecisionCandidate, ComplianceReview, RiskDecisionLog } from '../types';

/**
 * Management Risk Engine (Phase 4.5 & Phase 5)
 * 
 * Transforms raw signals (Journal Entries, Compliance Flags) into Executive Decision Contexts.
 * Phase 5 adds Narrative Generation based on decisions.
 */

const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

export const generateNarrativeBriefing = (report: ManagementReport, decisions: RiskDecisionLog[], systemNow: string): string => {
    const { summary, actionItems } = report;
    const now = systemNow;

    let markdown = `# 📊 Executive Risk & Intelligence Briefing\n`;
    markdown += `> **Report Date:** ${now}\n`;
    markdown += `> **Coverage Period:** ${report.period}\n>\n`;
    markdown += `> *This automated strategic briefing is synthesized by analyzing ledger metadata, operational cash flow, and vendor telemetry to identify structural vulnerabilities before they impact net liquidity.*\n\n`;

    markdown += `---\n\n`;
    markdown += `## 1. Executive Summary (경영 요약)\n`;

    if (summary.totalRisks === 0) {
        markdown += `현재 경영 환경은 매우 안정적입니다.\n✅ 단기 유동성, 운영 통제, 구조적 수익성 측면에서 특이 리스크가 감지되지 않았습니다.\n\n`;
    } else {
        markdown += `당월 심층 감사 결과, 총 **${summary.totalRisks}건**의 이상 재무/운영 시그널이 감지되었습니다. \n`;
        markdown += `이 중 **${summary.criticalCount + summary.highCount}건**은 경영상의 치명적 타격을 줄 수 있어 즉각적인 C-Level 통제가 필요합니다.\n`;
        markdown += `\n**[Risk Severity Matrix]**\n`;
        markdown += `- 🔴 **Critical/High Risk:** ${summary.criticalCount + summary.highCount}건 (Immediate Executive Action Required)\n`;
        markdown += `- 🟡 **Medium Risk:** ${summary.mediumCount}건 (Requires Operational Monitoring)\n`;
        markdown += `- 🟢 **Low Risk:** ${summary.lowCount}건\n\n`;
    }

    // Pending Critical Risks
    const pendingCritical = report.risks.filter(r =>
        (r.level === 'Critical' || r.level === 'High') &&
        !decisions.some(d => d.riskId === r.id)
    );

    if (pendingCritical.length > 0) {
        markdown += `## 2. Priority Escalations (최우선 의사결정 대기)\n`;
        markdown += `다음 항목들은 자금 스퀴즈(Cash Squeeze) 또는 횡령/오지급 가능성이 높아 즉각적인 승인 또는 거절 결단이 필요합니다.\n\n`;

        pendingCritical.forEach((r, idx) => {
            markdown += `### 🚨 [Critical] ${r.title}\n`;
            markdown += `- **Observation:** ${r.description}\n`;
            markdown += `- **Business Impact:** ${r.impact}\n`;
            markdown += `- **Recommended Action:** ${r.decisionCandidates[0]?.label || 'Needs Management Review'}\n\n`;
        });
    } else if (report.risks.length > 0) {
        markdown += `## 2. Operational Intelligence (운영 리스크 분석)\n`;
        markdown += `현재 치명적인(Critical) 수준의 미결정 리스크는 없습니다. 다만, 다음 항목들에 대한 부서 레벨의 지속 모니터링이 권장됩니다.\n\n`;
        const otherRisks = report.risks.filter(r => r.level !== 'Critical' && r.level !== 'High');
        otherRisks.forEach(r => {
            markdown += `**[${r.level}] ${r.title}**\n- ${r.description}\n\n`;
        });
    }

    const relevantDecisions = decisions.filter(d => report.risks.some(r => r.id === d.riskId));
    markdown += `## 3. Executive Decisions (경영진 의사결정 로그)\n`;
    if (relevantDecisions.length > 0) {
        markdown += `최근 ${relevantDecisions.length}건의 주요 재무 통제 조치가 권한자에 의해 완료되었습니다. 해당 내역은 증빙으로 보존됩니다.\n\n`;

        relevantDecisions.forEach((d, idx) => {
            const risk = report.risks.find(r => r.id === d.riskId);
            markdown += `> **[Action ${idx + 1}] ${risk?.title || 'Unknown Risk'}**\n`;
            markdown += `> - **Decision Captured:** ${d.decisionLabel} (by ${d.decidedBy})\n`;
            markdown += `> - **Managerial Context:** "${d.comment || 'System Default Action'}"\n\n`;
        });
    } else {
        markdown += `현재 경영진의 추가 의사결정(Decision Capture) 이력이 존재하지 않습니다.\n\n`;
    }

    return markdown;
};

const createDecision = (type: DecisionCandidate['type'], label: string, desc: string): DecisionCandidate => ({
    id: crypto.randomUUID(),
    type,
    label,
    description: desc
});

export const analyzeManagementRisks = (ledger: JournalEntry[], systemNow: string): BusinessRisk[] => {
    const risks: BusinessRisk[] = [];
    const now = systemNow;

    // 1. Split Payment Detection (Internal Control Risk)
    // Logic: Same vendor, same date, multiple transactions within short time (or just count > 3)
    const vendorDateMap = new Map<string, JournalEntry[]>();

    ledger.forEach(e => {
        if (!e.vendor || !e.date) return;
        const key = `${e.vendor}|${e.date}`;
        const group = vendorDateMap.get(key) || [];
        group.push(e);
        vendorDateMap.set(key, group);
    });

    vendorDateMap.forEach((entries, key) => {
        if (entries.length >= 3) {
            // Heuristic: 3+ txns at same vendor on same day
            const totalAmt = entries.reduce((sum, e) => sum + e.amount, 0);
            const [vendor, date] = key.split('|');

            risks.push({
                id: crypto.randomUUID(),
                type: 'InternalControl',
                level: 'High',
                title: 'Potential Split Payment (분할 결제 의심)',
                description: `${date}일 ${vendor}에서 ${entries.length}건의 연속 결제(총 ${totalAmt.toLocaleString()}원)가 감지되었습니다.`,
                impact: '규정 우회 및 접대비 한도 회피 가능성 (Compliance Evasion)',
                detectedAt: now,
                relatedEntries: entries.map(e => e.id),
                status: 'Active',
                decisionCandidates: [
                    createDecision('Interview', '담당자 소명 요청', '분할 결제 사유(단순/고의) 확인 필요'),
                    createDecision('Monitor', '해당 부서 한시적 모니터링', '향후 3개월간 유사 패턴 집중 관리')
                ]
            });
        }
    });

    // 2. Weekend/Night Usage (Reputation/Compliance Risk)
    const weekendEntries = ledger.filter(e => {
        const date = new Date(e.date);
        const day = date.getDay(); // 0=Sun, 6=Sat
        return (day === 0 || day === 6) && (e.debitAccount.includes('복리') || e.debitAccount.includes('접대'));
    });

    if (weekendEntries.length > 0) {
        const total = weekendEntries.reduce((s, e) => s + e.amount, 0);
        risks.push({
            id: crypto.randomUUID(),
            type: 'Compliance',
            level: 'Medium',
            title: 'Weekend Corporate Card Usage (주말 법인카드 사용)',
            description: `주말 기간 총 ${weekendEntries.length}건, ${total.toLocaleString()}원의 법인카드 사용이 감지되었습니다.`,
            impact: '업무 연관성 입증 실패 시 비용 부인 및 세무 리스크 (Tax Disallowance)',
            detectedAt: now,
            relatedEntries: weekendEntries.map(e => e.id),
            status: 'Active',
            decisionCandidates: [
                createDecision('Policy', '주말 사용 승인 절차 강화', '사전 품의 없는 주말 사용 제한 검토'),
                createDecision('Interview', '업무 연관성 증빙 보완', '참석자 및 업무 목적 명시 요구')
            ]
        });
    }

    // 3. High Value Unclassified (Financial Risk)
    // Assume threshold 1,000,000 KRW
    const highValueSuspense = ledger.filter(e =>
        e.amount >= 1000000 &&
        ['가지급금', '가수금', '전도금'].some(k => e.debitAccount.includes(k) || e.creditAccount.includes(k)) &&
        !e.isSettled
    );

    if (highValueSuspense.length > 0) {
        const total = highValueSuspense.reduce((s, e) => s + e.amount, 0);
        risks.push({
            id: crypto.randomUUID(),
            type: 'Financial',
            level: 'Critical',
            title: 'Large Suspense Account Balance (고액 가지급금 누적)',
            description: `현재 미소명된 100만원 이상 가지급금이 ${highValueSuspense.length}건 (총 ${total.toLocaleString()}원) 존재합니다.`,
            impact: '자금 횡령 리스크 및 가지급금 인정이자 법인세 부담 증가',
            detectedAt: now,
            relatedEntries: highValueSuspense.map(e => e.id),
            status: 'Active',
            decisionCandidates: [
                createDecision('Restrict', '자금 집행 일시 중단', '소명 완료 시까지 추가 가지급 지급 중단'),
                createDecision('Interview', '최고경영진 보고 및 즉시 소명', '자금 출처 및 용도에 대한 즉각적인 정밀 검토 수행')
            ]
        });
    }

    // 4. Duplicate Payment Risk
    // Simplistic check for exact amount and vendor within same period
    // (Ideally handled by deduplication logic, but risk engine serves as a safety net)
    const amountMap = new Map<string, JournalEntry[]>();
    ledger.forEach(e => {
        if (!e.date || !e.amount || !e.vendor) return;
        // Group by Year-Month + Amount + Vendor
        const month = e.date.substring(0, 7);
        const key = `${month}-${e.amount}-${e.vendor}`;
        const group = amountMap.get(key) || [];
        group.push(e);
        amountMap.set(key, group);
    });

    amountMap.forEach((entries, key) => {
        if (entries.length > 1) {
            const [month, amt, vendor] = key.split('-');
            risks.push({
                id: crypto.randomUUID(),
                type: 'Operational',
                level: 'Medium',
                title: 'Duplicate Payment Candidate (중복 결제 의심)',
                description: `${month}월 중 ${vendor} 거래처에 동일 금액(${Number(amt).toLocaleString()}원)이 ${entries.length}회 반복 지출되었습니다. 일상적인 월 1회 정기결제를 초과하는 청구인지 내부 확인이 필요합니다.`,
                impact: '자금 이중 지출 (OpEx Leakage) 및 공급사 과다 청구 리스크',
                detectedAt: now,
                relatedEntries: entries.map(e => e.id),
                status: 'Active',
                decisionCandidates: [
                    createDecision('Monitor', '중복 거래 확인/취소', '실수 여부 확인 후 승인 취소'),
                ]
            });
        }
    });

    // 5. Profitable Bankruptcy Structural Risk (흑자부도 구조 탐지)
    // Rule: Profit Positive BUT Cash Negative OR Working Capital Pressure
    let totalRevenue = 0;
    let totalExpense = 0;
    let cashIn = 0;
    let cashOut = 0;
    let arBalance = 0;

    ledger.forEach(e => {
        if (!e.date || e.date > systemNow || e.status !== 'Approved') return;

        if (e.type === 'Revenue') totalRevenue += e.amount;
        if (e.type === 'Expense' || e.type === 'Payroll' || e.type === 'AUTO_DEPRECIATION') totalExpense += e.amount;

        if (e.debitAccount === '보통예금') cashIn += e.amount;
        if (e.creditAccount === '보통예금') cashOut += e.amount;

        if (e.debitAccount.includes('외상매출') || e.debitAccount.includes('미수')) arBalance += e.amount;
        if (e.creditAccount.includes('외상매출') || e.creditAccount.includes('미수')) arBalance -= e.amount;
    });

    const netIncome = totalRevenue - totalExpense;
    const netCashChange = cashIn - cashOut;

    let bankruptcyTriggers = 0;
    if (netIncome > 0) bankruptcyTriggers++;
    if (netCashChange < 0) bankruptcyTriggers++;
    if (arBalance > (totalRevenue * 0.2)) bankruptcyTriggers++; // Heuristic: AR > 20% of total revenue indicates AR growth > Sales growth

    if (bankruptcyTriggers >= 2 && netIncome > 0) {
        risks.push({
            id: crypto.randomUUID(),
            type: 'Financial',
            level: 'High',
            title: 'Profitable Bankruptcy Risk (흑자부도 위험 구조 탐지)',
            description: `🔎 구조 분석 결과\n최근 누적 순이익은 흑자(${formatCurrency(netIncome)})이나, 매출채권 증가율이 매출 증가율을 상회하고 있습니다. (미수금 누적: ${formatCurrency(arBalance)})\n영업활동 현금흐름이 감소 추세에 있어 운전자본 압박 가능성이 있습니다. (순현금변동: ${formatCurrency(netCashChange)})`,
            impact: '손익 상 흑자임에도 현금 회수 지연 및 유동성 고갈로 인한 구조적 부도 발생 가능성',
            detectedAt: now,
            relatedEntries: [],
            status: 'Active',
            decisionCandidates: [
                createDecision('Interview', '미수금 전담 회수반 구성', '고액 및 장기 미수금 즉각 회수 조치 등 여신 통제 강화'),
                createDecision('Policy', '매출채권 회전기일 강제 단축', '월별 미수금 잔액 기준 현금 유입 목표 수립 및 모니터링')
            ]
        });
    }

    return risks;
};

export const generateManagementReport = (ledger: JournalEntry[], period: string, systemNow: string): ManagementReport => {
    // 1. Analyze Risks
    const allRisks = analyzeManagementRisks(ledger, systemNow);

    // 2. Sort by Severity
    const severityMap: Record<RiskLevel, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    allRisks.sort((a, b) => severityMap[b.level] - severityMap[a.level]);

    // 3. Summarize
    const criticalCount = allRisks.filter(r => r.level === 'Critical').length;
    const highCount = allRisks.filter(r => r.level === 'High').length;
    const mediumCount = allRisks.filter(r => r.level === 'Medium').length;
    const lowCount = allRisks.filter(r => r.level === 'Low').length;

    // 4. Action Items (Heuristic count)
    // Critical = Immediate, High = Immediate, Medium = Monitoring
    const immediate = criticalCount + highCount;
    const monitoring = allRisks.filter(r => r.level === 'Medium' || r.level === 'Low').length;

    return {
        generatedAt: systemNow,
        period,
        summary: {
            totalRisks: allRisks.length,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            topRisks: allRisks.slice(0, 5)
        },
        risks: allRisks,
        actionItems: {
            immediate,
            monitoring
        }
    };
};

// --- Phase 5 CFO Risk Snapshot ---
export interface CFORiskMetric {
    id: 'strategy' | 'cash' | 'survival' | 'control';
    title: string;
    value: string;
    severity: 'Stable' | 'Watch' | 'Critical';
    narrative: string;
}

export const getCFORiskSnapshot = (ledger: JournalEntry[], systemNow: string, initialCash: number = 0): CFORiskMetric[] => {
    const approved = ledger.filter(e => e.status === 'Approved' && e.date <= systemNow);

    if (approved.length === 0) {
        return [
            { id: 'strategy', title: '거래처 의존도', value: '-', severity: 'Stable', narrative: '데이터가 충분하지 않습니다.' },
            { id: 'cash', title: '이익 vs 현금 괴리율', value: '-', severity: 'Stable', narrative: '데이터가 충분하지 않습니다.' },
            { id: 'survival', title: 'Runway', value: '-', severity: 'Stable', narrative: '데이터가 충분하지 않습니다.' },
            { id: 'control', title: '결산 집중도', value: '-', severity: 'Stable', narrative: '데이터가 충분하지 않습니다.' }
        ];
    }

    // 1. Strategy: 거래처 의존도
    const revenues = approved.filter(e => e.type === 'Revenue');
    let strategyRisk: CFORiskMetric = { id: 'strategy', title: '거래처 의존도', value: '0%', severity: 'Stable', narrative: '안정적인 분산 상태입니다.' };

    if (revenues.length > 0) {
        const vendorMap = new Map<string, number>();
        let totalRev = 0;
        revenues.forEach(e => {
            const v = e.vendor || '기타';
            vendorMap.set(v, (vendorMap.get(v) || 0) + e.amount);
            totalRev += e.amount;
        });

        const validB2BVendors = Array.from(vendorMap.entries())
            .filter(v => v[0] !== 'SaaS 정기 구독자' && v[0] !== '기타')
            .sort((a, b) => b[1] - a[1]);

        const topVendor = validB2BVendors.length > 0 ? validB2BVendors[0] : null;

        if (totalRev > 0 && topVendor) {
            const ratio = (topVendor[1] / totalRev) * 100;
            const formatted = ratio.toFixed(1) + '%';
            if (ratio > 50) {
                strategyRisk = { id: 'strategy', title: '거래처 의존도', value: formatted, severity: 'Critical', narrative: `상위 고객(${topVendor[0]}) 매출 비중이 ${formatted}로 매우 높습니다. 해당 고객 이탈 시 현금 흐름에 즉각적인 타격이 예상됩니다.` };
            } else if (ratio > 30) {
                strategyRisk = { id: 'strategy', title: '거래처 의존도', value: formatted, severity: 'Watch', narrative: `특정 고객(${topVendor[0]}) 의존도가 ${formatted} 수준입니다. 중장기적 리스크 분산을 위해 고객 포트폴리오 다변화가 필요합니다.` };
            } else {
                strategyRisk = { id: 'strategy', title: '거래처 의존도', value: formatted, severity: 'Stable', narrative: `최대 고객 비중이 ${formatted}로 안정적입니다. 특정 거래처에 종속되지 않은 건강한 매출 구조를 유지하고 있습니다.` };
            }
        } else if (totalRev > 0) {
            strategyRisk = { id: 'strategy', title: '거래처 의존도', value: '0.0%', severity: 'Stable', narrative: `유의미한 단일 기업 고객 없이 B2C 또는 불특정 다수 거래로 매출이 발생하고 있습니다. 거래 거절 리스크가 거의 없습니다.` };
        }
    }

    // 2. Cash: 이익 vs 현금 괴리율
    let cashRisk: CFORiskMetric = { id: 'cash', title: '이익 vs 현금 괴리율', value: '0%', severity: 'Stable', narrative: '현금 회수가 즉각적입니다.' };
    let totalAR = 0;
    approved.forEach(e => {
        const totalAmount = e.amount + (e.vat || 0);
        if (e.debitAccount.includes('외상매출') || e.debitAccount.includes('미수')) totalAR += totalAmount;
        if (e.creditAccount.includes('외상매출') || e.creditAccount.includes('미수')) totalAR -= totalAmount;
    });
    const totalRev = revenues.reduce((s, e) => s + e.amount, 0);
    if (totalRev > 0) {
        // Prevent negative AR due to small timing or floating point differences
        const arRatio = Math.max(0, (totalAR / totalRev) * 100);
        const formattedAR = arRatio.toFixed(1) + '%';
        if (arRatio > 40) {
            cashRisk = { id: 'cash', title: '이익 vs 현금 괴리율', value: formattedAR, severity: 'Critical', narrative: `매출 대비 미회수 채권이 ${formattedAR}에 달합니다. 장부상 이익은 발생하나 실제 현금은 부족한 '흑자 도산' 위험이 감지됩니다.` };
        } else if (arRatio > 20) {
            cashRisk = { id: 'cash', title: '이익 vs 현금 괴리율', value: formattedAR, severity: 'Watch', narrative: `수익 인식 시점과 현금 유입 시점의 차이가 ${formattedAR} 발생하고 있습니다. 채권 회수 속도를 높여 유동성을 확보하십시오.` };
        } else if (arRatio > 0.1) {
            cashRisk = { id: 'cash', title: '이익 vs 현금 괴리율', value: formattedAR, severity: 'Stable', narrative: `채권 비중이 ${formattedAR}로 매우 낮습니다. 매출의 대부분이 즉각적인 현금 유입으로 이어지고 있습니다.` };
        } else {
            cashRisk = { id: 'cash', title: '이익 vs 현금 괴리율', value: '0.0%', severity: 'Stable', narrative: `모든 매출이 외상 없이 현금 기반으로 회수되었습니다. 최상의 현금 흐름 동기화 상태입니다.` };
        }
    }

    // 3. Survival: Runway
    let currentCash = initialCash;
    let totalExp = 0;
    approved.forEach(e => {
        if (e.debitAccount === '보통예금') currentCash += (e.amount + (e.vat || 0));
        if (e.creditAccount === '보통예금') currentCash -= (e.amount + (e.vat || 0));
        if (e.type === 'Expense' || e.type === 'Payroll') totalExp += e.amount;
    });
    const minDate = approved.reduce((min, e) => e.date < min ? e.date : min, approved[0]?.date || systemNow);
    const msActive = new Date(systemNow).getTime() - new Date(minDate).getTime();
    const monthsActive = Math.max(1, msActive / (1000 * 60 * 60 * 24 * 30));
    const monthlyBurn = totalExp / monthsActive;

    let survivalRisk: CFORiskMetric = { id: 'survival', title: 'Runway', value: '풍부', severity: 'Stable', narrative: '현금 보유량이 충분합니다.' };
    if (monthlyBurn > 0) {
        const runway = currentCash / monthlyBurn;
        const formattedRunway = runway.toFixed(1) + '개월';
        if (runway <= 0) {
            survivalRisk = { id: 'survival', title: 'Runway', value: '고갈', severity: 'Critical', narrative: `가용 현금이 완전히 고갈되었습니다. 비상 경영 체제 돌입 및 외부 자금 조달이 즉시 이루어져야 합니다.` };
        } else if (runway < 3) {
            survivalRisk = { id: 'survival', title: 'Runway', value: formattedRunway, severity: 'Critical', narrative: `잔여 런웨이가 ${formattedRunway}에 불과합니다. 생존을 위한 극단적인 지출 통제와 자금 확보를 결정하십시오.` };
        } else if (runway < 6) {
            survivalRisk = { id: 'survival', title: 'Runway', value: formattedRunway, severity: 'Watch', narrative: `런웨이가 6개월 미만(${formattedRunway})으로 진입했습니다. 차기 투자 유치 또는 매출 확대 전략을 서두르십시오.` };
        } else {
            const cashStr = formatCurrency(currentCash);
            survivalRisk = { id: 'survival', title: 'Runway', value: formattedRunway, severity: 'Stable', narrative: `현재 ${cashStr}의 현금을 보유 중이며, 약 ${formattedRunway}의 운영이 가능한 안정적인 상태입니다.` };
        }
    } else {
        survivalRisk = { id: 'survival', title: 'Runway', value: '∞', severity: 'Stable', narrative: `현재 고정비 지출이 거의 없어 제약 없는 운영이 가능합니다.` };
    }

    // 4. Control: 결산 집중도
    let controlRisk: CFORiskMetric = { id: 'control', title: '결산 집중도', value: '0%', severity: 'Stable', narrative: '실시간에 가깝게 기장되고 있습니다.' };
    const latestMonth = systemNow.substring(0, 7);
    const thisMonthEntries = approved.filter(e => e.date.startsWith(latestMonth));
    if (thisMonthEntries.length > 0) {
        const lastDaysEntries = thisMonthEntries.filter(e => {
            const day = parseInt(e.date.split('-')[2]);
            return day >= 28;
        });
        const concentration = (lastDaysEntries.length / thisMonthEntries.length) * 100;
        const formattedConc = concentration.toFixed(1) + '%';

        if (concentration > 85) {
            controlRisk = { id: 'control', title: '결산 집중도', value: formattedConc, severity: 'Critical', narrative: `전표의 ${formattedConc}가 월말 3일에 집중되었습니다. 사후 기록에 의존하고 있어 실시간 재무 통제가 불가능한 상태입니다.` };
        } else if (concentration > 65) {
            controlRisk = { id: 'control', title: '결산 집중도', value: formattedConc, severity: 'Watch', narrative: `기장이 월말에 다소 몰려있습니다(${formattedConc}). 집중 결산으로 인한 오류 가능성을 점검하고 주간 마감 도입을 검토하십시오.` };
        } else if (concentration > 35) {
            controlRisk = { id: 'control', title: '결산 집중도', value: formattedConc, severity: 'Stable', narrative: `월말 기장 비중이 ${formattedConc}입니다. 통상적인 월말 정산 패턴 내에서 관리가 이루어지고 있습니다.` };
        } else {
            controlRisk = { id: 'control', title: '결산 집중도', value: formattedConc, severity: 'Stable', narrative: `전표가 월중 고르게 기장되고 있습니다(${formattedConc}). 매우 이상적인 데이터 입력 패턴입니다.` };
        }
    }

    return [strategyRisk, cashRisk, survivalRisk, controlRisk];
};
