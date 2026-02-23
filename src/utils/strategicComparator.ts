
import { FinancialMetrics } from '../core_engine/trialBalance';

export interface ComparisonDelta {
    id: string;
    label: string;
    base: number;
    target: number;
    delta: number;
    percentChange: number;
}

export interface ScenarioComparisonResult {
    baseScenario: string;
    targetScenario: string;
    metrics: ComparisonDelta[];
    runwayDelta: number; // in months
    bepDelta: number;    // in currency
}

/**
 * [STRATEGIC COMPARATOR]
 * Calculates the exact divergence between two financial futures.
 */
export class StrategicComparator {
    static compare(baseName: string, base: any, targetName: string, target: any): ScenarioComparisonResult {
        const calculateRunway = (assets: number, expenses: number) => {
            const monthlyBurn = expenses / 12;
            return monthlyBurn <= 0 ? 99 : assets / monthlyBurn;
        };

        const baseRunway = calculateRunway(base.totalAssets, base.expenses);
        const targetRunway = calculateRunway(target.totalAssets, target.expenses);

        const keys = [
            { id: 'revenue', label: 'Revenue (Sales)' },
            { id: 'expenses', label: 'Expenses (Operational)' },
            { id: 'netIncome', label: 'Net Income (Profit)' },
            { id: 'totalAssets', label: 'Capital/Assets' }
        ];

        const metrics = keys.map(k => {
            const bVal = base[k.id] || 0;
            const tVal = target[k.id] || 0;
            const delta = tVal - bVal;
            const percentChange = bVal !== 0 ? (delta / Math.abs(bVal)) * 100 : 0;
            return { id: k.id, label: k.label, base: bVal, target: tVal, delta, percentChange };
        });

        return {
            baseScenario: baseName,
            targetScenario: targetName,
            metrics,
            runwayDelta: targetRunway - baseRunway,
            bepDelta: (target.revenue - target.expenses) - (base.revenue - base.expenses)
        };
    }
}

/**
 * [SENSITIVITY ENGINE]
 * Calculates the "Impact Factor" of specific variables on the bottom line.
 */
export class SensitivityAnalyzer {
    static analyzeImpact(
        baseMetrics: any,
        variableName: string,
        changeFactor: number, // e.g. 1.1 for +10%
        impactedValue: number
    ) {
        const delta = impactedValue - baseMetrics.netIncome;

        // Use absolute values for the coefficient to show magnitude, 
        // but preserve the sign for the true relationship.
        const sensitivity = delta / (Math.abs(baseMetrics.netIncome) * (changeFactor - 1));

        return {
            variable: variableName,
            change: `${((changeFactor - 1) * 100).toFixed(0)}%`,
            netIncomeImpact: delta,
            sensitivityCoefficient: sensitivity.toFixed(2),
            isNegativeInitial: baseMetrics.netIncome < 0
        };
    }
}
