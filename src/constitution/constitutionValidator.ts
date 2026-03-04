/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONSTITUTION VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 기준 시나리오로 엔진을 검증한다.
 * 불일치 시 throw Error로 즉시 중단.
 */

import { calculateFinancials } from '../bridge/StrategicBridge';
import { BASELINE_SCENARIO, EXPECTED_BASELINE_RESULTS } from '../core_engine/baselineScenario';

export function validateConstitution(): void {
    console.log('🔍 [CONSTITUTION VALIDATOR] Starting validation...');

    try {
        const result = calculateFinancials(BASELINE_SCENARIO);

        // Check Cash
        if (result.cash !== EXPECTED_BASELINE_RESULTS.cash) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Cash mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.cash.toLocaleString()}\n` +
                `Got: ₩${result.cash.toLocaleString()}\n` +
                `Difference: ₩${(result.cash - EXPECTED_BASELINE_RESULTS.cash).toLocaleString()}`
            );
        }

        // Check Cash Inflow
        if (result.cashInflow !== EXPECTED_BASELINE_RESULTS.cashInflow) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Cash Inflow mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.cashInflow.toLocaleString()}\n` +
                `Got: ₩${result.cashInflow.toLocaleString()}`
            );
        }

        // Check Cash Outflow
        if (result.cashOutflow !== EXPECTED_BASELINE_RESULTS.cashOutflow) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Cash Outflow mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.cashOutflow.toLocaleString()}\n` +
                `Got: ₩${result.cashOutflow.toLocaleString()}`
            );
        }

        // Check Revenue
        if (result.revenue !== EXPECTED_BASELINE_RESULTS.revenue) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Revenue mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.revenue.toLocaleString()}\n` +
                `Got: ₩${result.revenue.toLocaleString()}`
            );
        }

        // Check Expenses
        if (result.expenses !== EXPECTED_BASELINE_RESULTS.expenses) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Expenses mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.expenses.toLocaleString()}\n` +
                `Got: ₩${result.expenses.toLocaleString()}`
            );
        }

        // Check Net Income
        if (result.netIncome !== EXPECTED_BASELINE_RESULTS.netIncome) {
            throw new Error(
                `[CONSTITUTION VIOLATION] Net Income mismatch!\n` +
                `Expected: ₩${EXPECTED_BASELINE_RESULTS.netIncome.toLocaleString()}\n` +
                `Got: ₩${result.netIncome.toLocaleString()}`
            );
        }

        console.log('✅ [CONSTITUTION VALIDATOR] All checks passed!');
        console.log('📊 Results:', {
            cash: `₩${result.cash.toLocaleString()}`,
            cashInflow: `₩${result.cashInflow.toLocaleString()}`,
            cashOutflow: `₩${result.cashOutflow.toLocaleString()}`,
            revenue: `₩${result.revenue.toLocaleString()}`,
            expenses: `₩${result.expenses.toLocaleString()}`,
            netIncome: `₩${result.netIncome.toLocaleString()}`
        });

    } catch (error) {
        console.error('🚨 [CONSTITUTION VALIDATOR] VALIDATION FAILED!');
        throw error; // Re-throw to stop execution
    }
}

// Validation is now called explicitly in main.tsx
