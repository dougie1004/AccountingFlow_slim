import { JournalEntry } from '../types';
import { calculateFinancials } from '../core_engine/trialBalance';
import { EXPECTED_BASELINE_RESULTS } from '../core_engine/baselineScenario';

export type DeviationSeverity = 'STABLE' | 'WATCH' | 'CRITICAL';
export type DeviationCategory = 'GROWTH' | 'PROFITABILITY' | 'STABILITY' | 'RISK';

export interface StrategicDeviation {
    id: string;
    metric: 'Revenue' | 'Expense' | 'Cash' | 'NetIncome' | 'BurnRate' | 'SalesConcentration' | 'InfraEfficiency';
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

        // Handle name mapping for Korean
        const metricNameMap: Record<StrategicDeviation['metric'], string> = {
            'Revenue': '매출',
            'Expense': '비용',
            'Cash': '현금',
            'NetIncome': '순이익',
            'BurnRate': '현금 연소율',
            'SalesConcentration': '매출 집중도',
            'InfraEfficiency': '인프라 효율성'
        };
        const metricKo = metricNameMap[metric] || metric;

        // Static Insight Generation (No AI yet)
        const direction = delta > 0 ? '초과' : '미달';
        const quality = (metric === 'Expense' || metric === 'BurnRate' || metric === 'SalesConcentration' || metric === 'InfraEfficiency')
            ? (delta > 0 ? '경계가 필요합니다 (Risk)' : '안정적입니다 (Safe)')
            : (delta > 0 ? '매우 양호합니다 (Good)' : '관리가 필요합니다 (Warning)');

        results.push({
            id: `DEV-${metric}-${Date.now()}`,
            metric,
            baseline,
            actual,
            delta,
            variancePercent: Math.round(variancePercent * 10) / 10,
            severity,
            category,
            insight: `${metricKo}이(가) 기준치 대비 ${Math.abs(Math.round(variancePercent))}% ${direction}하여 ${quality}.`
        });
    };

    // 1. Growth Metrics
    analyze('Revenue', actuals.revenue, EXPECTED_BASELINE_RESULTS.revenue, 'GROWTH', { watch: 10, critical: 20 });

    // 2. Profitability Metrics
    analyze('Expense', actuals.expenses, EXPECTED_BASELINE_RESULTS.expenses, 'PROFITABILITY', { watch: 5, critical: 15 }); // Tighter control on expenses
    analyze('NetIncome', actuals.netIncome, EXPECTED_BASELINE_RESULTS.netIncome, 'PROFITABILITY', { watch: 15, critical: 30 });

    // 3. Stability Metrics
    analyze('Cash', actuals.cash, EXPECTED_BASELINE_RESULTS.cash, 'STABILITY', { watch: 5, critical: 10 }); // Cash is King

    // 4. Advanced Risk Metrics

    // Burn Rate: Monthly average operating cash out (simplified as Expense - Revenue if losing money)
    const burnRate = actuals.expenses > actuals.revenue ? (actuals.expenses - actuals.revenue) : 0;
    // Assume baseline burn rate from standard scenario
    const baselineBurnRate = EXPECTED_BASELINE_RESULTS.expenses > EXPECTED_BASELINE_RESULTS.revenue
        ? EXPECTED_BASELINE_RESULTS.expenses - EXPECTED_BASELINE_RESULTS.revenue
        : 0;
    analyze('BurnRate', burnRate, baselineBurnRate, 'STABILITY', { watch: 10, critical: 20 });

    // Sales Concentration: Top vendor revenue / Total Revenue (Simulated as checking high impact transactions)
    // Basic calculation for visual impact
    const revenues = ledger.filter(e => e.type === 'Revenue' && e.status === 'Approved');
    const vendorSales: Record<string, number> = {};
    revenues.forEach(r => {
        const v = r.vendor || 'Unknown';
        vendorSales[v] = (vendorSales[v] || 0) + r.amount;
    });
    const topVendor = Object.entries(vendorSales).sort((a, b) => b[1] - a[1])[0];
    const topVendorAmount = topVendor ? topVendor[1] : 0;
    const salesConcentration = actuals.revenue > 0 ? (topVendorAmount / actuals.revenue) * 100 : 0;
    // Set baseline concentration to 30% ideally
    analyze('SalesConcentration', salesConcentration, 30, 'RISK', { watch: 20, critical: 50 });

    // Infrastructure Efficiency: IT/Infra costs / Total Revenue
    const infraCosts = ledger
        .filter(e => e.debitAccount.includes('통신비') || e.debitAccount.includes('소프트웨어') || e.debitAccount.includes('인프라'))
        .reduce((sum, e) => sum + e.amount, 0);
    const infraPerRev = actuals.revenue > 0 ? (infraCosts / actuals.revenue) * 100 : 0;
    // Target 5% infra to rev ratio
    analyze('InfraEfficiency', infraPerRev, 5, 'PROFITABILITY', { watch: 20, critical: 50 });

    return results;
};

// Internal mapping for legacy bridge (if needed)
export const analyzeIntelligence = (ledger: JournalEntry[]): any[] => {
    // Return empty array to deprecate old AI logic
    return [];
};
