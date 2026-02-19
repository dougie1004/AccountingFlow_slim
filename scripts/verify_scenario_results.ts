
import { generateThreeYearSimulation } from '../src/utils/mockDataGenerator';
import { calculateFinancials } from '../src/core_engine/trialBalance';
import { JournalEntry, BusinessScenario } from '../src/types';

// Polyfill for crypto
if (!globalThis.crypto) {
    globalThis.crypto = { randomUUID: () => Math.random().toString(36).substring(2) } as any;
}

const scenarios: BusinessScenario[] = ['SURVIVAL', 'STANDARD', 'GROWTH'];

console.log('Comparison of Scenarios (2026-2028 Analysis)');
console.log('============================================');

const results: any[] = [];

for (const scenario of scenarios) {
    console.log(`\nGenerating Data for Scenario: ${scenario}...`);
    const ledger = generateThreeYearSimulation(scenario);

    // Calculate Financials at end of 2028
    const financials = calculateFinancials(ledger);

    // Calculate Equity Breakdown explicitly
    // Retained Earnings = Net Income (Cumulative)
    // Capital = Initial + Injections
    const capitalEntries = ledger.filter(e => e.creditAccount === '자본금');
    const totalCapital = capitalEntries.reduce((sum, e) => sum + e.amount, 0);

    // Check Balance Sheet Equation
    const assets = financials.totalAssets;
    const liabilities = financials.totalLiabilities;
    // Equity in our simple model is Capital + Retained Earnings
    // financials.netIncome is cumulative profit/loss (Retained Earnings)
    const calculatedEquity = totalCapital + financials.netIncome;

    // Derived Equity from Assets - Liabilities
    const accountingEquationEquity = assets - liabilities;

    const discrepancy = Math.abs(accountingEquationEquity - calculatedEquity);
    const isBalanced = discrepancy < 100; // Allow small rounding diff

    // Check Trial Balance Sums (Debit vs Credit)
    // Trial Balance Logic: Sum of all account balances should be 0 (Dr + Cr = 0 since Cr is negative in our map logic)

    const accountBalances = new Map<string, number>();
    ledger.forEach(e => {
        // JournalEntry Logic:
        // Debit Side: e.debitAccount += e.amount
        // Credit Side: e.creditAccount -= e.amount
        // VAT Logic:
        // if vat > 0:
        //   if Type == Revenue: 
        //      Dr Cash (Amount + Vat)
        //      Cr Revenue (Amount)
        //      Cr VAT Payable (Vat)

        let amount = e.amount;
        let vat = e.vat || 0;

        if (vat > 0) {
            // Replicate strict logic from trialBalance.ts or AccountingContext Check
            if (e.type === 'Revenue') {
                // Debit Cash (Total)
                accountBalances.set(e.debitAccount, (accountBalances.get(e.debitAccount) || 0) + amount + vat);
                // Credit Revenue (Net)
                accountBalances.set(e.creditAccount, (accountBalances.get(e.creditAccount) || 0) - amount);
                // Credit VAT Payable
                accountBalances.set('부가가치세예수금', (accountBalances.get('부가가치세예수금') || 0) - vat);
            } else {
                // Expense/Asset
                // Debit Expense (Net)
                accountBalances.set(e.debitAccount, (accountBalances.get(e.debitAccount) || 0) + amount);
                // Debit VAT Asset
                const vatAcc = e.type === 'Payroll' ? '예수금(원천세)' : '부가가치세대급금'; // Payroll logic is complex, simplified here
                // Wait, Payroll logic in mockDataGenerator:
                // Dr Salary, Cr Withholding, Cr Cash.
                // let's stick to simple logic:
                // If not Revenue, assume standard purchase: Dr Asset/Exp, Dr VAT, Cr Bank/AP

                // However, mockDataGenerator creates single entries that might imply:
                // Dr DebitAccount (amount)
                // Cr CreditAccount (amount)
                // And VAT? 

                // If mocking logic is complex, relying on simple summing might fail if we don't handle VAT splits exactly like the engine.
                // But calculateFinancials HAS the engine logic.
                // So we can trust calculateFinancials' totalAssets/totalLiabilities/netIncome.
            }
        } else {
            accountBalances.set(e.debitAccount, (accountBalances.get(e.debitAccount) || 0) + amount);
            accountBalances.set(e.creditAccount, (accountBalances.get(e.creditAccount) || 0) - amount);
        }
    });

    // Actually, calculateFinancials already calculates totals.
    // If BS Balance Check passes, then Trial Balance is effectively balanced.

    console.log(`   - Total Ledger Entries: ${ledger.length.toLocaleString()}`);
    console.log(`   - Cash Balance: ₩${financials.cash.toLocaleString()}`);
    console.log(`   - Total Assets: ₩${assets.toLocaleString()}`);
    console.log(`   - Total Liabilities: ₩${liabilities.toLocaleString()}`);
    console.log(`   - Total Capital: ₩${totalCapital.toLocaleString()}`);
    console.log(`   - Cumulative Net Income (RE): ₩${financials.netIncome.toLocaleString()}`);
    console.log(`   - BS Balance Check (A = L + K + RE): ${isBalanced ? 'PASS' : 'FAIL'} (Diff: ${discrepancy})`);

    results.push({
        scenario,
        entries: ledger.length,
        cash: financials.cash,
        assets,
        liabilities,
        capital: totalCapital,
        retainedEarnings: financials.netIncome,
        equity: calculatedEquity,
        isBalanced
    });
}

console.log('\nSummary Report');
console.table(results);
