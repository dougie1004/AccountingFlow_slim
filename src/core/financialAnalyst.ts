
import { ClosingRecord, MonthlyBudget, JournalEntry } from '../types';
import { formatCurrency } from '../utils/formatUtils';

/**
 * Phase 3: AI Financial Analyst
 * Rule-based logic to generate financial briefings based on closing data.
 */

export const generateClosingBriefing = (
    current: ClosingRecord,
    previous: ClosingRecord | null,
    budget?: MonthlyBudget,
    currentLedger?: JournalEntry[]
): string => {
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
        const revGrowth = ((s.revenue - p.revenue) / p.revenue) * 100;
        const profitGrowth = p.profit !== 0 ? ((s.profit - p.profit) / Math.abs(p.profit)) * 100 : 0;

        const revIcon = revGrowth > 0 ? '📈' : '📉';
        const profitIcon = profitGrowth > 0 ? '📈' : '📉';

        lines.push(`- **매출**: 전월 대비 **${Math.abs(revGrowth).toFixed(1)}% ${revGrowth >= 0 ? '증가' : '감소'}** ${revIcon}`);
        lines.push(`- **이익**: 전월 대비 **${Math.abs(profitGrowth).toFixed(1)}% ${profitGrowth >= 0 ? '증가' : '감소'}** ${profitIcon}`);
    } else {
        lines.push(`- *전월 데이터가 없어 비교 분석을 생략합니다.*`);
    }

    // 3. Asset & Liability Health (Phase 2 Integration)
    lines.push(``);
    // 3. Asset & Liability Health (Phase 2 Integration)
    lines.push(``);
    lines.push(`🏦 자산 및 리스 건전성`);

    // Fixed Assets & Depreciation
    if (s.fixedAssetsGross > 0) {
        const deprRatio = (s.fixedAssetsAccumDep / s.fixedAssetsGross) * 100;
        lines.push(`- **고정자산**: 총 취득원가 ${formatCurrency(s.fixedAssetsGross)}원 중 **${deprRatio.toFixed(1)}%**가 상각되었습니다.`);
    }

    // Leases (Key for Phase 2)
    if (s.leaseLiability > 0) {
        const debtRatio = (s.leaseLiability / s.totalLiabilities) * 100;
        lines.push(`- **리스 부채**: 현재 리스 부채 잔액은 **${formatCurrency(s.leaseLiability)}원**이며, 전체 부채의 **${debtRatio.toFixed(1)}%**를 차지합니다.`);

        if (s.leaseInterestExp > 0) {
            lines.push(`- **금융 비용**: 이번 달 리스 이자비용으로 **${formatCurrency(s.leaseInterestExp)}원**이 발생했습니다.`);
        }
    } else {
        lines.push(`- *현재 인식된 리스 부채가 없습니다.*`);
    }

    // 4. Budget vs Actual Analysis (Phase 3)
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
                lines.push(`- ⚠️ **${item.accountCategory}**: 예산 ${formatCurrency(item.budgetAmount)}원 대비 **${percentage.toFixed(0)}%** 지출 (${formatCurrency(variance)}원 초과)`);
            } else if (percentage >= 80) {
                lines.push(`- 🔸 ${item.accountCategory}: 예산의 **${percentage.toFixed(0)}%** 소진`);
            }
        });

        if (!hasOverBudget) {
            lines.push(`- ✅ 모든 항목이 예산 범위 내에서 관리되고 있습니다.`);
        }
    }

    // 5. Strategic Recommendation
    lines.push(``);
    lines.push(`💡 AI 제언`);
    if (s.profit < 0) {
        lines.push(`손익 개선이 필요합니다. 고정비(리스료 등) 비중을 점검하고 매출 증대 방안을 모색하세요.`);
    } else if (profitMargin < 5) {
        lines.push(`흑자이지만 이익률이 낮습니다(5% 미만). 원가 절감이나 마진율 개선이 필요할 수 있습니다.`);
    } else {
        lines.push(`안정적인 수익 구조를 보이고 있습니다. 현금 유동성을 확보하여 투자를 고려해볼 시점입니다.`);
    }

    return lines.join('\n');
};
