
import { calculateFinancials } from '../bridge/StrategicBridge';
import { JournalEntry } from '../types';
import * as fs from 'fs';

const logBuffer: string[] = [];
function log(msg: string) {
    console.log(msg);
    logBuffer.push(msg);
}

log('════════════════════════════════════════════════════════');
log('     STRATEGIC SCENARIO SIMULATION: 2027 (DEATH VALLEY CHALLENGE) ');
log('════════════════════════════════════════════════════════');

// 2027 Scenario Assumptions:
// 1. Government Support Ends (No Grants) -> Death Valley Begins
// 2. Rent Starts: 2.5m/month * 12 = 30m
// 3. Goal: Break Even Point (Net Income > 0)

const SCENARIO_2027_DATA: JournalEntry[] = [
    // [1] Carryover Cash from 2026 (Approx 45m)
    // We inject this as Equity/Retained Earnings for simulation balance
    {
        id: 'SIM-2027-000', date: '2027-01-01', description: '2026 Carryover Cash',
        debitAccount: '보통예금', creditAccount: '이월이익잉여금', amount: 45_000_000, vat: 0,
        type: 'Equity', status: 'Approved'
    },

    // [2] Revenue Growth Target: 200m KRW (Aggressive Growth to survive)
    {
        id: 'SIM-2027-100', date: '2027-12-31', description: '2027 Total Revenue',
        debitAccount: '보통예금', creditAccount: '매출', amount: 200_000_000, vat: 20_000_000,
        type: 'Revenue', status: 'Approved'
    },

    // [3] Fixed Costs: Office Rent (30m)
    {
        id: 'SIM-2027-200', date: '2027-12-31', description: 'Annual Office Rent (2.5m/mo)',
        debitAccount: '임차료', creditAccount: '보통예금', amount: 30_000_000, vat: 3_000_000,
        type: 'Expense', status: 'Approved'
    },

    // [4] Fixed Costs: Salaries (Increase to 100m for team stability)
    {
        id: 'SIM-2027-201', date: '2027-12-31', description: 'Annual Salaries (Team Expansion)',
        debitAccount: '급여', creditAccount: '보통예금', amount: 100_000_000, vat: 0,
        type: 'Expense', status: 'Approved'
    },

    // [5] Variable Costs: Ops & Marketing (30m)
    {
        id: 'SIM-2027-202', date: '2027-12-31', description: 'Ops & Marketing',
        debitAccount: '지급수수료', creditAccount: '보통예금', amount: 30_000_000, vat: 3_000_000,
        type: 'Expense', status: 'Approved'
    }
];

// Run Calculation
try {
    const result = calculateFinancials(SCENARIO_2027_DATA);

    log(`\n[Input 2027 Data]`);
    log(`- Total Transactions: ${SCENARIO_2027_DATA.length}`);

    log(`\n[Simulation Result: 2027 Financials]`);
    log(`▶ Revenue    : ${result.revenue.toLocaleString()} KRW`);
    log(`▶ Expenses   : ${result.expenses.toLocaleString()} KRW`);
    log(`▶ Net Income : ${result.netIncome.toLocaleString()} KRW (Target: > 0)`);

    // Cash Verification
    // In: 45(Start) + 200(Rev) + 20(VAT) = 265
    // Out: 30(Rent) + 3(VAT) + 100(Sal) + 30(Ops) + 3(VAT) = 166
    // Ending: 99

    const cashIn = 45_000_000 + 200_000_000 + 20_000_000;
    const cashOut = 30_000_000 + 3_000_000 + 100_000_000 + 30_000_000 + 3_000_000;
    const endingCash = cashIn - cashOut;

    log(`\n[Cash Flow Projection]`);
    log(`▶ Ending Cash: ${endingCash.toLocaleString()} KRW`);

    if (result.netIncome > 0) {
        log(`\n✅ STATUS: SURVIVED DEATH VALLEY (Profit Achieved)`);
    } else {
        log(`\n⚠️ STATUS: FAILED (Still in Deficit)`);
    }

} catch (e: any) {
    log(`\n❌ SIMULATION FAILED: ${e.message}`);
    if (e.name === 'ConstitutionViolationError') {
        log('>> Violation of Account Nature or Accounting Principles detected.');
    }
}
log('════════════════════════════════════════════════════════');
fs.writeFileSync('simulation_result_2027.log', logBuffer.join('\n'), 'utf8');
console.log('Log saved to simulation_result_2027.log');
