import { generateYearlyPack } from './src/utils/mockDataGenerator';
import { BusinessScenario } from './src/types';

function dumpTransactions(scenario: BusinessScenario, count: number) {
    const entries = generateYearlyPack(2026, [], scenario);
    console.log(`\n=== 🔍 [${scenario} 모드] 초기 주요 거래 내역 (Top ${count}) ===`);

    entries.slice(0, count).forEach(e => {
        console.log(`[${e.date}] ${e.description}`);
        console.log(`    차변: ${e.debitAccount.padEnd(15)} | 금액: ${(e.amount + (e.vat || 0)).toLocaleString()}원`);
        console.log(`    대변: ${e.creditAccount.padEnd(15)} | (부가세: ${(e.vat || 0).toLocaleString()}원 포함)`);
        console.log('----------------------------------------------------');
    });
}

dumpTransactions('SURVIVAL', 15);
