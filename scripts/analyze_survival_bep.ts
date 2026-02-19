import { generateThreeYearSimulation } from '../src/utils/mockDataGenerator';
import { calculateFinancials } from '../src/bridge/StrategicBridge';
import { webcrypto } from 'node:crypto';

// Polyfill
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

function analyzeSurvivalBEP() {
    console.log('🔍 [SURVIVAL SCENARIO] BEP BREAKDOWN ANALYSIS');
    console.log('================================================================');

    // 1. Generate Data
    const ledger = generateThreeYearSimulation('SURVIVAL');

    // 2. Group by Month
    const monthlyGroups: Record<string, any[]> = {};
    ledger.forEach(e => {
        const m = e.date.substring(0, 7);
        if (!monthlyGroups[m]) monthlyGroups[m] = [];
        monthlyGroups[m].push(e);
    });

    const periods = Object.keys(monthlyGroups).sort();

    let cumulativeNetIncome = 0;
    let firstMonthlyProfit: string | null = null;
    let firstCumulativeProfit: string | null = null;

    let lastMonthRevenue = 0;
    let lastMonthExpense = 0;
    let lastMonthGrowthRate = 0;

    console.log('| Period  | Users | Revenue     | Expense     | Net Income   | Cash Balance  | Status');
    console.log('|---------|-------|-------------|-------------|--------------|---------------|--------');

    periods.forEach((m, index) => {
        const entries = monthlyGroups[m];
        const fins = calculateFinancials(entries);

        // Calculate basic metrics from entries directly to match SimulationReport logic
        const revenue = entries.reduce((s, e) => s + (e.type === 'Revenue' ? e.amount : 0), 0);
        const expense = entries.reduce((s, e) => s + (e.type === 'Expense' ? e.amount : 0), 0);
        // Net Income includes Grants
        const netIncome = revenue - expense + entries.filter(e => e.creditAccount === '국고보조금수익' || e.creditAccount === '잡이익').reduce((s, e) => s + e.amount, 0);

        cumulativeNetIncome += netIncome;

        // User Count Extraction
        const userEntry = entries.find(e => e.description.includes('유저'));
        const userCount = userEntry
            ? parseInt(userEntry.description.match(/\((\d+(?:,\d+)*) 유저\)/)?.[1]?.replace(/,/g, '') || '0')
            : 0;

        // BEP Check
        if (netIncome > 0 && !firstMonthlyProfit) {
            firstMonthlyProfit = m;
        }
        if (cumulativeNetIncome > 0 && !firstCumulativeProfit) {
            firstCumulativeProfit = m;
        }

        // Data for projection
        if (index === periods.length - 1) {
            lastMonthRevenue = revenue;
            lastMonthExpense = expense;
            // Simple Month-over-Month growth of Revenue
            const prevEntries = monthlyGroups[periods[index - 1]];
            const prevRev = prevEntries.reduce((s, e) => s + (e.type === 'Revenue' ? e.amount : 0), 0);
            lastMonthGrowthRate = (revenue - prevRev) / prevRev;
        }

        const status = netIncome > 0 ? '🟢 PROFIT' : '🔴 LOSS';
        console.log(`| ${m} | ${userCount.toString().padStart(5)} | ${revenue.toLocaleString().padStart(11)} | ${expense.toLocaleString().padStart(11)} | ${netIncome.toLocaleString().padStart(12)} | ${fins.cash.toLocaleString().padStart(13)} | ${status}`);
    });

    console.log('================================================================');
    console.log(`🏷️  FIRST MONTHLY PROFIT (BEP): ${firstMonthlyProfit || 'Not reached in 2028'}`);
    console.log(`💰 FIRST CUMULATIVE PROFIT    : ${firstCumulativeProfit || 'Not reached in 2028'}`);
    console.log(`📉 Ending Cumulative Deficit  : ${cumulativeNetIncome.toLocaleString()} KRW`);

    if (!firstCumulativeProfit && lastMonthRevenue > lastMonthExpense) {
        // Simple Projection
        const monthlyProfit = lastMonthRevenue - lastMonthExpense;
        const monthsNeeded = Math.abs(cumulativeNetIncome) / monthlyProfit;
        const yearsNeeded = (monthsNeeded / 12).toFixed(1);
        console.log(`🔮 PROJECTION: Based on Dec 2028 run-rate (Pure Profit ${monthlyProfit.toLocaleString()}/mo),`);
        console.log(`   It will take approx ${Math.ceil(monthsNeeded)} more months (${yearsNeeded} years) to recover losses.`);
    } else if (!firstCumulativeProfit) {
        console.log(`⚠️  CRITICAL: Structure is not profitable yet. Cannot project recovery.`);
    }
}

analyzeSurvivalBEP();
