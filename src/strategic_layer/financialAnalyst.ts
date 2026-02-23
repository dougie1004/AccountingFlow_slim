
import { ClosingRecord, MonthlyBudget, JournalEntry } from '../types';
import { formatCurrency } from '../utils/formatUtils';
import { safeInvoke } from '../lib/tauri-bridge';

/**
 * Phase 3: AI Financial Analyst
 * Connects with Gemini 3.0 Pro to generate real C-Level insights.
 */

export const generateClosingBriefing = async (
    current: ClosingRecord,
    previous: ClosingRecord | null,
    budget?: MonthlyBudget,
    currentLedger?: JournalEntry[]
): Promise<string> => {
    const lines: string[] = [];
    const s = current.summary;
    const p = previous?.summary;

    // 1. Overall Performance (Revenue & Profit)
    const profitMargin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
    lines.push(`[${current.period}월 경영 브리핑]`);
    lines.push(``);

    if (s.profit > 0) {
        lines.push(`✅ 흑자 달성: 이번 달은 ${formatCurrency(s.profit)}원의 순이익을 기록했습니다. (이익률: ${profitMargin.toFixed(1)}%)`);
    } else if (s.profit < 0) {
        lines.push(`⚠️ 적자 발생: 이번 달은 ${formatCurrency(Math.abs(s.profit))}원의 순손실이 발생했습니다.`);
    } else {
        lines.push(`⚖️ 손익분기점(Break-even) 유지: 이번 달은 순이익 0원으로 손익분기점을 유지했습니다.`);
    }

    // 2. MoM Analysis (Month-over-Month)
    if (p) {
        const revGrowth = p.revenue !== 0 ? ((s.revenue - p.revenue) / p.revenue) * 100 : 0;
        const profitGrowth = p.profit !== 0 ? ((s.profit - p.profit) / Math.abs(p.profit)) * 100 : 0;

        const revIcon = revGrowth > 0 ? '📈' : (revGrowth < 0 ? '📉' : '➖');
        const profitIcon = profitGrowth > 0 ? '📈' : (profitGrowth < 0 ? '📉' : '➖');

        lines.push(`- 매출: 전월(${previous?.period}) 대비 ${Math.abs(revGrowth).toFixed(1)}% ${revGrowth >= 0 ? '증가' : '감소'} ${revIcon}`);
        lines.push(`- 이익: 전월(${previous?.period}) 대비 ${Math.abs(profitGrowth).toFixed(1)}% ${profitGrowth >= 0 ? '증가' : '감소'} ${profitIcon}`);

        if (previous?.aiBriefing) {
            lines.push(`- 전월 AI 진단 요약: ${previous.aiBriefing.split('\n').filter(l => l.includes('문제점') || l.includes('개선')).join(' | ').substring(0, 200)}...`);
        }
    } else {
        lines.push(`- 전월 결산 데이터가 존재하지 않아 단독 성과 분석을 수행합니다.`);
        lines.push(`- 누적 자산 현황: ${formatCurrency(s.totalAssets)} (순자산: ${formatCurrency(s.equity)})`);
    }

    // 3. Asset & Liability Health (Phase 2 Integration)
    lines.push(``);
    lines.push(`🏦 자산 및 리스 건전성`);

    // Fixed Assets & Depreciation
    if (s.fixedAssetsGross > 0) {
        const deprRatio = (s.fixedAssetsAccumDep / s.fixedAssetsGross) * 100;
        lines.push(`- 고정자산: 총 취득원가 ${formatCurrency(s.fixedAssetsGross)}원 중 ${deprRatio.toFixed(1)}%가 상각되었습니다.`);
    }

    // Leases (Key for Phase 2)
    if (s.leaseLiability > 0) {
        const debtRatio = (s.leaseLiability / s.totalLiabilities) * 100;
        lines.push(`- 리스 부채: 현재 리스 부채 잔액은 ${formatCurrency(s.leaseLiability)}원이며, 전체 부채의 ${debtRatio.toFixed(1)}%를 차지합니다.`);

        if (s.leaseInterestExp > 0) {
            lines.push(`- 금융 비용: 이번 달 리스 이자비용으로 ${formatCurrency(s.leaseInterestExp)}원이 발생했습니다.`);
        }
    } else {
        lines.push(`- 현재 인식된 리스 부채가 없습니다.`);
    }

    // 4. Activity Summary (Transactional Insights)
    if (currentLedger && currentLedger.length > 0) {
        lines.push(``);
        lines.push(`📑 주요 거래 활동 요약`);

        // Group by category (debitAccount for expenses, creditAccount for revenue)
        const categories: Record<string, number> = {};
        currentLedger.forEach(e => {
            const cat = e.type === 'Revenue' ? e.creditAccount : e.debitAccount;
            categories[cat] = (categories[cat] || 0) + e.amount;
        });

        Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .forEach(([cat, amt]) => {
                lines.push(`- ${cat}: ${formatCurrency(amt)}원`);
            });
    }

    // 5. Budget vs Actual Analysis (Phase 3)
    if (budget && currentLedger) {
        lines.push(``);
        lines.push(`🎯 예산 대비 실적 (BvA Analysis)`);

        let hasOverBudget = false;

        budget.items.forEach(item => {
            // Calculate Actual for this category
            // Simple string matching for MVP. In real app, use Account Codes.
            const actual = currentLedger
                .filter(e => e.debitAccount === item.accountCategory || e.description.includes(item.accountCategory))
                .reduce((sum, e) => sum + e.amount, 0);

            const variance = actual - item.budgetAmount;
            const percentage = item.budgetAmount > 0 ? (actual / item.budgetAmount) * 100 : 0;

            if (percentage > 100) {
                hasOverBudget = true;
                lines.push(`- ⚠️ ${item.accountCategory}: 예산 ${formatCurrency(item.budgetAmount)}원 대비 ${percentage.toFixed(0)}% 지출 (${formatCurrency(variance)}원 초과)`);
            } else if (percentage >= 80) {
                lines.push(`- 🔸 ${item.accountCategory}: 예산의 ${percentage.toFixed(0)}% 소진`);
            }
        });

        if (!hasOverBudget) {
            lines.push(`- ✅ 모든 항목이 예산 범위 내에서 관리되고 있습니다.`);
        }
    }

    // 5. Compliance & Internal Control (Audit Ready)
    if (current.unsettled.complianceAmount > 0) {
        lines.push(``);
        lines.push(`⚖️ 컴플라이언스 및 내부통제`);
        lines.push(`- ⚠️ 미결 가계정: 현재 ${formatCurrency(current.unsettled.complianceAmount)}원의 가계정 항목이 정산되지 않은 채 마감되었습니다. 이는 차기 결산 전까지 반드시 증빙 매칭이 필요합니다.`);
    }

    // 5. Rule-based pre-processing text to send to AI
    const rawDataContext = lines.join('\n');

    // Call Gemini!
    try {
        const prompt = `
당신은 최고재무책임자(CFO)입니다. 다음은 이번 달 결산 요약 데이터입니다.
이 데이터를 바탕으로 경영진이 즉각적으로 이해하고 행동할 수 있는 핵심 통찰(Insight)과 경영 제언 3가지를 명확하게 작성해 주세요. 
특히 '전월 대비 변화'나 '이전 브리핑에서 제기된 문제의 개선 여부'가 데이터에 포함되어 있다면 이를 핵심적으로 다루어 결산의 연속성을 확보해 주세요.
불필요한 인사말 없이, '[AI 경영 브리핑]' 과 함께 곧바로 문제점, 개선 방향, 칭찬할 점을 포함해 주세요.

---결산 요약 데이터---
${rawDataContext}
`;
        const aiResponse = await safeInvoke<string>('generic_ai_chat', { prompt });

        // 품질 검증: 응답이 너무 짧거나 실제 분석 내용 없이 템플릿만 온 경우 Fallback 사용
        const isPlaceholder = aiResponse && (
            aiResponse.length < 50 ||
            aiResponse.includes('...') ||
            (aiResponse.includes('문제점:') && aiResponse.split('문제점:')[1].trim().startsWith('...'))
        );

        if (aiResponse && !isPlaceholder) {
            return aiResponse;
        }
    } catch (e) {
        console.error("Gemini AI Briefing Failed:", e);
    }

    lines.push(``);
    lines.push(`💡 AI 제언 (Fallback Mode)`);
    if (s.profit < 0) {
        lines.push(`손익 개선이 필요합니다. 고정비(리스료 등) 비중을 점검하고 매출 증대 방안을 모색하세요.`);
    } else if (profitMargin < 5) {
        lines.push(`흑자이지만 이익률이 낮습니다(5% 미만). 원가 절감이나 마진율 개선이 필요할 수 있습니다.`);
    } else {
        lines.push(`안정적인 수익 구조를 보이고 있습니다. 현금 유동성을 확보하여 투자를 고려해볼 시점입니다.`);
    }

    return lines.join('\n');
};
