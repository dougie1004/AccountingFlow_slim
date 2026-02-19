
import { generateThreeYearSimulation } from './src/utils/mockDataGenerator';

function analyze(name: string, scenario: any) {
    const ledger = generateThreeYearSimulation(scenario);
    const count = ledger.length;
    const grants = ledger.filter(e => e.creditAccount === '국고보조금수익').reduce((s, e) => s + (e.amount || 0), 0);
    const invest = ledger.filter(e => e.creditAccount === '자본금' && e.date.startsWith('2027-01')).reduce((s, e) => s + (e.amount || 0), 0);
    const labor = ledger.filter(e => e.debitAccount === '급여').reduce((s, e) => s + (e.amount || 0), 0);
    const mkt = ledger.filter(e => e.debitAccount === '광고선전비').reduce((s, e) => s + (e.amount || 0), 0);

    let cash = 50_000_000;
    ledger.forEach(e => {
        if (e.debitAccount === '보통예금') cash += (e.amount || 0);
        if (e.creditAccount === '보통예금') cash -= (e.amount || 0);
    });

    return `
SCENARIO: ${name}
- Total Journals: ${count} entries
- Grant Revenue (2026): ${grants.toLocaleString()} KRW
- Investment In (2027): ${invest.toLocaleString()} KRW
- Total Labor Cost:   ${labor.toLocaleString()} KRW
- Total Marketing:    ${mkt.toLocaleString()} KRW
- FINAL CASH (3Y):    ${cash.toLocaleString()} KRW
------------------------------------------`;
}

console.log('--- SCENARIO ANALYSIS (EN VERSION) ---');
console.log(analyze('SURVIVAL', 'SURVIVAL'));
console.log(analyze('STANDARD', 'STANDARD'));
console.log(analyze('GROWTH', 'GROWTH'));
