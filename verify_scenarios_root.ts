
// verify_scenarios_root.ts
// 실행: npx ts-node verify_scenarios_root.ts

import { generateThreeYearSimulation } from './src/utils/mockDataGenerator';
import { calculateFinancials } from './src/core_engine/trialBalance';
import { BusinessScenario } from './src/types';

// Polyfill for crypto in Node environment
if (!globalThis.crypto) {
    globalThis.crypto = { randomUUID: () => Math.random().toString(36).substring(2) } as any;
}

const scenarios: Record<string, BusinessScenario> = {
    '1. 생존 모드 (Survival)': 'SURVIVAL',
    '3. 표준 성장 (Standard)': 'STANDARD',
    '4. 공격 확장 (Growth)': 'GROWTH'
};

// '2. 자력 표준'은 'DEATH_VALLEY' 시나리오에 해당 (mockDataGenerator 로직 확인 결과)
// params in mockDataGenerator: case 'DEATH_VALLEY': return { ... marketingAggression: 2.0 ... }
scenarios['2. 자력 표준 (Lean Standard)'] = 'DEATH_VALLEY';

console.log('----------------------------------------------------------------');
console.log(' 전략 시나리오별 재무 시뮬레이션 검증 (2026-2028)');
console.log('----------------------------------------------------------------\n');

Object.entries(scenarios).forEach(([label, scenarioKey]) => {
    console.log(`\n🔵 [${label}] 분석 중...`);

    try {
        const ledger = generateThreeYearSimulation(scenarioKey);

        // 연도별 분석
        const years = [2026, 2027, 2028];
        const yearResults = years.map(year => {
            // 해당 연도까지의 누적 데이터 (BS용)
            const cumLedger = ledger.filter(e => e.date <= `${year}-12-31`);
            const cumFinancials = calculateFinancials(cumLedger);

            // 해당 연도만의 데이터 (PL용 - 매출 등)
            const yearLedger = ledger.filter(e => e.date.startsWith(year.toString()));
            // calculateFinancials for PEROID (Requires careful handling of Opening, but for Revenue it's fine)
            // Revenue is purely flow.

            let revenue = 0;
            let expense = 0;

            // Simple PL Summing for the period
            yearLedger.forEach(e => {
                if (e.type === 'Revenue') revenue += e.amount;
                if (e.type === 'Expense' || e.type === 'Payroll' || e.type === 'COGS') expense += e.amount;
                // Note: mockDataGenerator types might be 'Expense', 'Revenue', 'Asset', 'Equity', 'Liability'
                // We should rely on Account Category logic ideally, but 'type' field is used in mock generator.
            });

            // Net Income for the YEAR = Revenue - Expense
            // (Note: This assumes simple cash/accrual match provided by the mock generator)
            const netIncome = revenue - expense;

            return {
                year,
                revenue,
                netIncome, // Period Net Income
                endingCash: cumFinancials.cash, // BS Item
                retainedEarnings: cumFinancials.netIncome // BS Item (Cumulative Net Income)
            };
        });

        // 결과 출력 (표 형식와 유사하게)
        console.table(yearResults.reduce((acc, curr) => {
            acc[curr.year] = {
                '연 매출': Math.round(curr.revenue / 10000).toLocaleString() + '만원',
                '당기순이익': Math.round(curr.netIncome / 10000).toLocaleString() + '만원',
                '기말현금': Math.round(curr.endingCash / 10000).toLocaleString() + '만원',
                '누적(이익잉여금)': Math.round(curr.retainedEarnings / 10000).toLocaleString() + '만원'
            };
            return acc;
        }, {} as any));

    } catch (e) {
        console.error(`❌ [${label}] 시뮬레이션 실패:`, e);
    }
});

console.log('\n✅ 검증 완료. (Worklog에 기록 필요)');
