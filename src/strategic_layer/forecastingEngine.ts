
import { JournalEntry, MonthlyBudget, SimulationViewMode, ScenarioType, ProjectedCashFlow, RunwayAnalysis } from '../types';
import { isCashAccount, CashPolicy } from '../constants/accounts';

/**
 * --- Financial Forecasting Engine (Phase 4) ---
 * Provides cash flow projections and runway analysis using
 * historical data patterns.
 */



// 2. Helper: Calculate Monthly Totals (Now Cash-Based)
const getMonthlyCashTotals = (entries: JournalEntry[], flowType: 'INFLOW' | 'OUTFLOW', typeFilter?: string): Map<string, number> => {
    const totals = new Map<string, number>();
    entries
        .filter(e => e.status === 'Approved')
        .forEach(e => {
            if (typeFilter && e.type !== typeFilter) return;

            const month = e.date.substring(0, 7);
            const type = CashPolicy.isExternalFlow(e.debitAccount, e.creditAccount);
            if (type === flowType) {
                const total = (e.amount || 0) + (e.vat || 0);
                totals.set(month, (totals.get(month) || 0) + total);
            }
        });
    return totals;
};

// 3. Logic: Recurring Pattern Detection (Smart Grouping)
const detectRecurringExpenses = (entries: JournalEntry[]): { name: string; amount: number }[] => {
    const normalize = (desc: string) => {
        let key = desc.replace(/[_#].*$/, '').trim();
        key = key.replace(/\(.*\)/, '').trim();
        key = key.replace(/\d+월/, '').trim();
        key = key.replace(/\d+년/, '').trim();

        if (key.includes('급여') || key.includes('Payroll')) return '인건비 (4대보험/급여)';
        if (key.includes('AWS') || key.includes('API')) return '클라우드 인프라 (AWS/API)';
        if (key.includes('구독')) return 'SaaS 구독료';
        if (key.includes('임대료') || key.includes('월세')) return '사무실 임대료';

        return key.trim();
    };

    const monthlyCategoryTotals = new Map<string, Map<string, number>>();
    const recurring: { name: string; amount: number }[] = [];

    entries
        .filter(e => e.type === 'Expense' && e.status === 'Approved')
        .forEach(e => {
            const month = e.date.substring(0, 7);
            const cat = normalize(e.description);
            const isOneTimeKeyword =
                cat.includes('용역') || cat.includes('구입') || cat.includes('고지서') ||
                cat.includes('취득') || cat.includes('Asset') || cat.includes('비품') ||
                cat.includes('계약') || cat.includes('설립') || cat.includes('외주');

            if (isOneTimeKeyword) return;

            if (!monthlyCategoryTotals.has(month)) monthlyCategoryTotals.set(month, new Map());
            const catMap = monthlyCategoryTotals.get(month)!;
            catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
        });

    const categorySums = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    monthlyCategoryTotals.forEach((catMap) => {
        catMap.forEach((amount, cat) => {
            categorySums.set(cat, (categorySums.get(cat) || 0) + amount);
            categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        });
    });

    categorySums.forEach((totalSum, cat) => {
        const monthsActive = categoryCounts.get(cat) || 0;
        const isCorePattern = cat.includes('인건비') || cat.includes('보험') || cat.includes('임차') || cat.includes('구독') || cat.includes('통신');

        if (isCorePattern || monthsActive >= 2) {
            const avgMonthly = Math.round(totalSum / (monthsActive || 1));
            if (avgMonthly > 100000) {
                recurring.push({ name: cat, amount: avgMonthly });
            }
        }
    });

    return recurring.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount).slice(0, 5);
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
    budget?: MonthlyBudget,
    viewMode: SimulationViewMode = 'REALITY' // [Phase 2 Swicth]
): ProjectedCashFlow => {

    // A. Detect Recurring Fixed Costs (For Insight)
    const recurring = detectRecurringExpenses(ledger);
    const fixedCostTotal = recurring.reduce((sum, item) => sum + item.amount, 0);

    // B. Estimate Inflow and Outflow History (CASH BASED)
    const monthlyInflowMap = getMonthlyCashTotals(ledger, 'INFLOW');
    const monthlyRevenueMap = getMonthlyCashTotals(ledger, 'INFLOW', 'Revenue');
    const monthlyOutflowMap = getMonthlyCashTotals(ledger, 'OUTFLOW');

    // DECISION: For future PROJECTION, only assume REVENUE recurs. 
    // One-time capital (Equity) or Grants (Liability) are historical flows.
    const revenueHistory = Array.from(monthlyRevenueMap.values());
    const outflowHistory = Array.from(monthlyOutflowMap.values());

    let historicalAvgRevenue = projectNextValue(revenueHistory);
    let historicalAvgOutflow = projectNextValue(outflowHistory);

    // DECISION: Use Budget if available for outflows
    let baseOutflow = 0;
    let isBudgetBased = false;

    if (budget && budget.items.length > 0) {
        baseOutflow = budget.items.reduce((sum, item) => sum + item.budgetAmount, 0);
        isBudgetBased = true;
    } else {
        baseOutflow = Math.max(historicalAvgOutflow, fixedCostTotal * 1.05);
    }

    // Apply Scenario & View Mode Multipliers
    let projectedInflow = historicalAvgRevenue;
    let projectedOutflow = baseOutflow;

    // [PHASE 2] ROSE vs REALITY logic
    if (viewMode === 'ROSE') {
        projectedInflow = projectedInflow * 1.25; // Aggressive Growth
        projectedOutflow = projectedOutflow * 0.95; // Efficiency assumption
    } else {
        // REALITY: "Strategic Pessimism"
        projectedInflow = projectedInflow * 1.0; // Stagnant growth assumption
        projectedOutflow = projectedOutflow * 1.05; // Moderated buffer for hidden costs
    }

    // Secondary scenario tweaks if needed
    if (scenario === 'Optimistic') projectedInflow *= 1.1;
    if (scenario === 'Conservative') projectedOutflow *= 1.1;

    const variableEstimate = Math.max(0, projectedOutflow - fixedCostTotal);
    const netCashFlow = projectedInflow - projectedOutflow;

    return {
        period: targetPeriod,
        scenario,
        expectedInflow: Math.round(projectedInflow),
        expectedOutflow: Math.round(projectedOutflow),
        netCashFlow: Math.round(netCashFlow),
        projectedBalance: currentCashBalance + netCashFlow,
        confidenceLevel: isBudgetBased || outflowHistory.length > 3 ? 'High' : 'Low',
        details: {
            recurringExpenses: recurring,
            variableExpensesEstimate: Math.round(variableEstimate),
            revenueEstimate: Math.round(projectedInflow),
            isBudgetBased,
            unplannedLiabilityAmount: 0, // Placeholder to be overriden by bridge if needed
            simulationDisclaimer: viewMode === 'ROSE'
                ? '가정: 공격적 성장 및 비용 효율화가 달성된 장밋빛 시나리오입니다.'
                : '가정: 성장이 정체되고 운영 비용이 상승하는 현실적 가디언 시나리오입니다.'
        }
    };
};

// 6. Main Function: Runway Analysis
export const calculateRunway = (
    currentBalance: number,
    ledger: JournalEntry[],
    scenario: ScenarioType = 'Baseline',
    budget?: MonthlyBudget,
    viewMode: SimulationViewMode = 'REALITY' // [Phase 2]
): RunwayAnalysis & { grossBurnRate: number } => {

    const monthlyInflowMap = getMonthlyCashTotals(ledger, 'INFLOW');
    const monthlyRevenueMap = getMonthlyCashTotals(ledger, 'INFLOW', 'Revenue');
    const monthlyOutflowMap = getMonthlyCashTotals(ledger, 'OUTFLOW');

    const revenueHistory = Array.from(monthlyRevenueMap.values());
    const outflowHistory = Array.from(monthlyOutflowMap.values());

    let projectedInflow = projectNextValue(revenueHistory);

    // 2. Identify Burn Rate
    let avgNetBurnRate = 0;
    let avgGrossBurnRate = 0;
    let isBudgetBased = false;

    // Calculate Gross Burn (Average Monthly Cash Outflow)
    avgGrossBurnRate = outflowHistory.length > 0
        ? outflowHistory.reduce((a, b) => a + b, 0) / outflowHistory.length
        : 0;

    if (budget && budget.items.length > 0) {
        // Use Budgeted Outflow
        const budgetedOutflow = budget.items.reduce((sum, item) => sum + item.budgetAmount, 0);
        avgGrossBurnRate = budgetedOutflow;

        // Net Burn = Outflow - Inflow
        const net = budgetedOutflow - projectedInflow;
        avgNetBurnRate = net > 0 ? net : 0;
        isBudgetBased = true;
    } else {
        // Use Historical Net Burn
        let totalNetBurn = 0;
        let burnMonths = 0;

        monthlyOutflowMap.forEach((out, month) => {
            const inf = monthlyInflowMap.get(month) || 0;
            const net = out - inf; // Consumption of cash
            if (net > 0) {
                totalNetBurn += net;
                burnMonths++;
            }
        });
        avgNetBurnRate = burnMonths > 0 ? totalNetBurn / burnMonths : 0;
    }

    // Apply Scenario Multipliers
    // [PHASE 2] Simulation Engine
    if (viewMode === 'ROSE') {
        avgNetBurnRate *= 0.7; // 30% Efficiency Gain
        avgGrossBurnRate *= 0.8;
    } else {
        // REALITY: Stress test
        avgNetBurnRate *= 1.1; // Moderated stress test
        avgGrossBurnRate *= 1.05;
    }

    if (scenario === 'Optimistic') {
        avgNetBurnRate = avgNetBurnRate * 0.8; // 20% Reduction
        avgGrossBurnRate = avgGrossBurnRate * 0.9;
    } else if (scenario === 'Conservative') {
        avgNetBurnRate = avgNetBurnRate * 1.25; // 25% Increase
        avgGrossBurnRate = avgGrossBurnRate * 1.15;
    }

    // Runway Calculation Logic:
    // If we have inflow covers outflow (avgNetBurnRate <= 0), it's safe.
    const runway = avgNetBurnRate > 0 ? currentBalance / avgNetBurnRate : 99;

    return {
        currentBalance,
        burnRate: Math.round(avgNetBurnRate),
        grossBurnRate: Math.round(avgGrossBurnRate),
        runwayMonths: Math.min(99, Math.floor(runway)),
        scenario,
        isBudgetBased
    };
};
