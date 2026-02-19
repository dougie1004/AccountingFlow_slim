import { describe, it } from 'vitest';
import { generateThreeYearSimulation } from '../src/utils/mockDataGenerator';
import { JournalEntry, BusinessScenario } from '../src/types';

describe('Financial Audit Report', () => {
    it('should report status for all scenarios', () => {
        function auditScenario(scenario: BusinessScenario) {
            console.log(`\n=== AUDIT REPORT: ${scenario} ===`);
            const entries = generateThreeYearSimulation(scenario);

            const years = [2026, 2027, 2028];

            years.forEach(year => {
                const yearEntries = entries.filter(e => e.date.startsWith(year.toString()));

                let revenue = 0;
                let expenses = 0;
                let cashIn = 0;
                let cashOut = 0;

                yearEntries.forEach(e => {
                    // Revenue calculation
                    if (e.creditAccount.includes('매출') || e.creditAccount.includes('수익')) {
                        revenue += e.amount;
                    }

                    // Expense calculation (simplified)
                    if (e.type === 'Expense') {
                        expenses += e.amount;
                    }

                    // Cash flow
                    if (e.debitAccount === '보통예금') cashIn += e.amount;
                    if (e.creditAccount === '보통예금') cashOut += e.amount;
                });

                const netIncome = revenue - expenses;

                // Calculate cumulative cash balance
                const allEntriesUntilEndOfYear = entries.filter(e => {
                    const entryYear = parseInt(e.date.split('-')[0]);
                    return entryYear <= year;
                });

                let totalCashIn = 0;
                let totalCashOut = 0;
                allEntriesUntilEndOfYear.forEach(e => {
                    if (e.debitAccount === '보통예금') totalCashIn += e.amount;
                    if (e.creditAccount === '보통예금') totalCashOut += e.amount;
                });

                const closingCash = totalCashIn - totalCashOut;

                console.log(`[${year}]`);
                console.log(`  Revenue:    ${(revenue / 10000).toFixed(0)}만 원`);
                console.log(`  Net Income: ${(netIncome / 10000).toFixed(0)}만 원`);
                console.log(`  Closing Cash: ${(closingCash / 10000).toFixed(0)}만 원`);

                if (closingCash < 0) {
                    console.log(`  ❌ CRITICAL: Negative Cash Balance detected at end of ${year}!`);
                }
            });
        }

        const scenarios: BusinessScenario[] = ['SURVIVAL', 'STANDARD', 'GROWTH'];
        scenarios.forEach(auditScenario);
    });
});
