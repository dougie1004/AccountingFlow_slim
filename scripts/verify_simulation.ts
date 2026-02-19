
import { generateThreeYearSimulation } from '../src/utils/mockDataGenerator';
import { calculateFinancials } from '../src/core/accountingEngine';

// Polyfill for crypto if needed (for Node environments)
if (!globalThis.crypto) {
    globalThis.crypto = { randomUUID: () => Math.random().toString(36).substring(2) } as any;
}

console.log('🚀 Starting Simulation Verification...');

const ledger = generateThreeYearSimulation();

console.log(`\n📊 Total Entries Generated: ${ledger.length.toLocaleString()}`);

// 1. Check CEO Injections (가수금)
const injections = ledger.filter(e => e.creditAccount === '단기차입금' && e.description.includes('가수금'));
console.log(`\n💰 CEO Liquidity Injections (가수금) detected: ${injections.length} times`);
if (injections.length > 0) {
    console.log('   Recent Injections:');
    injections.slice(-3).forEach(e => console.log(`   - [${e.date}] ${e.amount.toLocaleString()} KRW`));
} else {
    console.log('   ❌ No injections found (Cash might be too high?)');
}

// 2. Check Voucher Burden (VAT)
const vatPayments = ledger.filter(e => e.description.includes('자부담') && e.debitAccount === '부가가치세대급금');
console.log(`\n🧾 Voucher VAT Payments (자부담) detected: ${vatPayments.length} times`);
if (vatPayments.length > 0) {
    console.log('   Sample Payments:');
    vatPayments.slice(0, 3).forEach(e => console.log(`   - [${e.date}] ${e.description}: ${e.amount.toLocaleString()} KRW`));
}

// 3. Analyze Cash Flow for "J-Curve Growth" (2027 H2 - 2028)
console.log('\n📈 J-Curve & Golden Cross Check (Monthly End):');
const monthsToCheck = [
    '2027-06', '2027-09', '2027-12',
    '2028-03', '2028-06', '2028-09', '2028-12'
];

monthsToCheck.forEach(month => {
    // Filter ledger up to end of this month
    const endOfMonth = `${month}-31`;
    // Cumulative Cash
    const subLedger = ledger.filter(e => e.date <= endOfMonth);
    const fin = calculateFinancials(subLedger);

    // Monthly Revenue (Just for this month)
    const monthEntries = ledger.filter(e => e.date.startsWith(month));
    const monthlyRevenue = monthEntries
        .filter(e => e.type === 'Revenue')
        .reduce((sum, e) => sum + e.amount, 0);

    const entDeal = monthEntries.find(e => e.description.includes('Enterprise'));

    console.log(`Month: ${month}, Cash: ${fin.cash}, Revenue: ${monthlyRevenue} ${entDeal ? '[ENT_ACTIVE]' : ''}`);
});

console.log('\n✅ Verification Complete.');
