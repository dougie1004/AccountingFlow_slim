import { JournalEntry } from '../types';
import { calculateFinancials } from '../core_engine/trialBalance';
import { EXPECTED_BASELINE_RESULTS } from '../core_engine/baselineScenario';

export type DeviationSeverity = 'STABLE' | 'WATCH' | 'CRITICAL';
export type DeviationCategory = 'GROWTH' | 'PROFITABILITY' | 'STABILITY';

export interface StrategicDeviation {
    id: string;
    metric: 'Revenue' | 'Expense' | 'Cash' | 'NetIncome' | 'BurnRate';
    baseline: number;
    actual: number;
    delta: number;
    variancePercent: number;
    severity: DeviationSeverity;
    category: DeviationCategory;
    insight: string; // Static template-based description
}

export const analyzeStrategicDeviation = (ledger: JournalEntry[]): StrategicDeviation[] => {
    const actuals = calculateFinancials(ledger);
    const results: StrategicDeviation[] = [];

    // Helper to standardize deviation logic
    const analyze = (
        metric: StrategicDeviation['metric'],
        actual: number,
        baseline: number,
        category: DeviationCategory,
        thresholds: { watch: number, critical: number } = { watch: 10, critical: 20 }
    ) => {
        const delta = actual - baseline;
        // Avoid division by zero
        const variancePercent = baseline !== 0 ? (delta / baseline) * 100 : (actual > 0 ? 100 : 0);
        const absVar = Math.abs(variancePercent);

        let severity: DeviationSeverity = 'STABLE';
        if (absVar >= thresholds.critical) severity = 'CRITICAL';
        else if (absVar >= thresholds.watch) severity = 'WATCH';

        // Static Insight Generation (No AI yet)
        const direction = delta > 0 ? '초과' : '미달';
        const quality = (metric === 'Expense' || metric === 'BurnRate')
            ? (delta > 0 ? '악화' : '개선')
            : (delta > 0 ? '호조' : '부진');

        results.push({
            id: `DEV-${metric}-${Date.now()}`,
            metric,
            baseline,
            actual,
            delta,
            variancePercent: Math.round(variancePercent * 10) / 10,
            severity,
            category,
            insight: `${metric}이(가) 목표 대비 ${Math.abs(Math.round(variancePercent))}% ${direction}하여 ${quality} 상태입니다.`
        });
    };

    // 1. Growth Metrics
    analyze('Revenue', actuals.revenue, EXPECTED_BASELINE_RESULTS.revenue, 'GROWTH', { watch: 10, critical: 20 });

    // 2. Profitability Metrics
    analyze('Expense', actuals.expenses, EXPECTED_BASELINE_RESULTS.expenses, 'PROFITABILITY', { watch: 5, critical: 15 }); // Tighter control on expenses
    analyze('NetIncome', actuals.netIncome, EXPECTED_BASELINE_RESULTS.netIncome, 'PROFITABILITY', { watch: 15, critical: 30 });

    // 3. Stability Metrics
    analyze('Cash', actuals.cash, EXPECTED_BASELINE_RESULTS.cash, 'STABILITY', { watch: 5, critical: 10 }); // Cash is King
    // Burn Rate (Proxy: Expense - Revenue, if negative)
    // For now, simpler implementation handled via Cash/NetIncome

    return results;
};

// Internal mapping for legacy bridge (if needed)
export const analyzeIntelligence = (ledger: JournalEntry[]): any[] => {
    // Return empty array to deprecate old AI logic
    return [];
};
