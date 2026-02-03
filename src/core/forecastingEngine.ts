
import { JournalEntry, MonthlyBudget } from '../types';

/**
 * --- Financial Forecasting Engine (Phase 4) ---
 * Provides cash flow projections and runway analysis using
 * historical data patterns.
 */

// 1. Types
export type ScenarioType = 'Baseline' | 'Optimistic' | 'Conservative';

export interface ProjectedCashFlow {
    period: string; // YYYY-MM (Next Month)
    scenario: ScenarioType;
    expectedInflow: number;
    expectedOutflow: number;
    netCashFlow: number;
    projectedBalance: number;
    confidenceLevel: 'High' | 'Medium' | 'Low';
    details: {
        recurringExpenses: { name: string; amount: number }[];
        variableExpensesEstimate: number;
        revenueEstimate: number;
        isBudgetBased?: boolean;
    };
}

export interface RunwayAnalysis {
    currentBalance: number;
    burnRate: number; // Average monthly net cash outflow (positive implies burn)
    runwayMonths: number; // calculated months left
    scenario: ScenarioType;
    isBudgetBased?: boolean;
}

// 2. Helper: Calculate Monthly Totals
const getMonthlyTotals = (entries: JournalEntry[], type: 'Revenue' | 'Expense'): Map<string, number> => {
    const totals = new Map<string, number>();
    entries
        .filter(e => e.type === type && e.status === 'Approved')
        .forEach(e => {
            const month = e.date.substring(0, 7);
            totals.set(month, (totals.get(month) || 0) + e.amount);
        });
    return totals;
};

// 3. Logic: Recurring Pattern Detection (Simple Heuristic)
const detectRecurringExpenses = (entries: JournalEntry[]): { name: string; amount: number }[] => {
    const groups = new Map<string, number[]>();

    entries
        .filter(e => e.type === 'Expense' && e.status === 'Approved')
        .forEach(e => {
            const key = e.description.trim();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)?.push(e.amount);
        });

    const recurring: { name: string; amount: number }[] = [];

    groups.forEach((amounts, desc) => {
        if (amounts.length >= 2) {
            const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const isStable = amounts.every(a => Math.abs(a - avg) / avg < 0.1);
            if (isStable) {
                recurring.push({ name: desc, amount: Math.ceil(avg) });
            }
        }
    });

    return recurring;
};

// 4. Logic: Linear Projection (Slope)
const projectNextValue = (history: number[]): number => {
    if (history.length < 2) return history.length === 1 ? history[0] : 0;

    // Simple Average for now
    const recent = history.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return avg;
};

// 5. Main Function: Generate Forecast
export const generateCashForecast = (
    ledger: JournalEntry[],
    currentCashBalance: number,
    targetPeriod: string, // YYYY-MM
    scenario: ScenarioType = 'Baseline',
    budget?: MonthlyBudget
): ProjectedCashFlow => {

    // A. Detect Recurring Fixed Costs (For Insight)
    const recurring = detectRecurringExpenses(ledger);
    const fixedCostTotal = recurring.reduce((sum, item) => sum + item.amount, 0);

    // B. Estimate Variable/Total Costs
    const monthlyExpenses = getMonthlyTotals(ledger, 'Expense');
    const expenseHistory = Array.from(monthlyExpenses.values());
    const historicalAvgExpense = projectNextValue(expenseHistory);

    // DECISION: Use Budget if available
    let baseOutflow = 0;
    let isBudgetBased = false;

    if (budget && budget.items.length > 0) {
        baseOutflow = budget.items.reduce((sum, item) => sum + item.budgetAmount, 0);
        isBudgetBased = true;
    } else {
        baseOutflow = Math.max(historicalAvgExpense, fixedCostTotal * 1.05);
    }

    // C. Estimate Revenue
    const monthlyRevenue = getMonthlyTotals(ledger, 'Revenue');
    const revenueHistory = Array.from(monthlyRevenue.values());
    let projectedInflow = projectNextValue(revenueHistory);

    // Apply Scenario Multipliers
    let projectedOutflow = baseOutflow;

    if (scenario === 'Optimistic') {
        projectedInflow = projectedInflow * 1.15; // +15% Revenue Growth
        // Optimistic: Keep cost base same or slightly improved?
        // User implied Optimistic is mainly Revenue focused.
    } else if (scenario === 'Conservative') {
        projectedInflow = projectedInflow * 0.90; // -10% Revenue Shock
        projectedOutflow = projectedOutflow * 1.10; // +10% Cost Increase
    }

    const variableEstimate = Math.max(0, projectedOutflow - fixedCostTotal);
    const netCashFlow = projectedInflow - projectedOutflow;

    return {
        period: targetPeriod,
        scenario,
        expectedInflow: Math.round(projectedInflow),
        expectedOutflow: Math.round(projectedOutflow),
        netCashFlow: Math.round(netCashFlow),
        projectedBalance: currentCashBalance + netCashFlow,
        confidenceLevel: isBudgetBased || expenseHistory.length > 3 ? 'High' : 'Low',
        details: {
            recurringExpenses: recurring,
            variableExpensesEstimate: Math.round(variableEstimate),
            revenueEstimate: Math.round(projectedInflow),
            isBudgetBased
        }
    };
};

// 6. Main Function: Runway Analysis
export const calculateRunway = (
    currentBalance: number,
    ledger: JournalEntry[],
    scenario: ScenarioType = 'Baseline',
    budget?: MonthlyBudget
): RunwayAnalysis => {

    // 1. Revenue Projection
    const monthlyRevenue = getMonthlyTotals(ledger, 'Revenue');
    const revenueHistory = Array.from(monthlyRevenue.values());
    let projectedRevenue = projectNextValue(revenueHistory);

    // 2. Identify Burn Rate
    let avgBurnRate = 0;
    let isBudgetBased = false;

    if (budget && budget.items.length > 0) {
        // Use Budgeted Expense
        const budgetedExpense = budget.items.reduce((sum, item) => sum + item.budgetAmount, 0);

        // Burn = Expenses - Revenue.
        const net = projectedRevenue - budgetedExpense;
        avgBurnRate = net < 0 ? Math.abs(net) : 0;
        isBudgetBased = true;
    } else {
        // Use Historical Burn
        const monthlyExpenses = getMonthlyTotals(ledger, 'Expense');
        let totalBurn = 0;
        let burnMonths = 0;

        monthlyExpenses.forEach((exp, month) => {
            const rev = monthlyRevenue.get(month) || 0;
            const net = rev - exp;
            if (net < 0) {
                totalBurn += Math.abs(net);
                burnMonths++;
            }
        });
        avgBurnRate = burnMonths > 0 ? totalBurn / burnMonths : 0;
    }

    // Apply Scenario to Burn Rate
    if (scenario === 'Optimistic') {
        avgBurnRate = avgBurnRate * 0.9; // 10% Burn Reduction
    } else if (scenario === 'Conservative') {
        avgBurnRate = avgBurnRate * 1.1; // 10% Burn Increase
    }

    // If profitable (avgBurnRate <= 0), runway is infinite
    const runway = avgBurnRate > 0 ? currentBalance / avgBurnRate : 99;

    return {
        currentBalance,
        burnRate: Math.round(avgBurnRate),
        runwayMonths: parseFloat(runway.toFixed(1)),
        scenario,
        isBudgetBased
    };
};
