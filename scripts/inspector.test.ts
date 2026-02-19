import { describe, it } from 'vitest';
import { generateYearlyPack } from '../src/utils/mockDataGenerator';

describe('Transaction Inspector', () => {
    it('dump survival entries', () => {
        const entries = generateYearlyPack(2026, [], 'SURVIVAL');
        console.log(`\n=== 🔍 [SURVIVAL 모드] 2026년 초기 거래 명세 (첫 15건) ===`);

        entries.slice(0, 15).forEach(e => {
            console.log(`[${e.date}] ${e.description}`);
            console.log(`    차변: ${e.debitAccount.padEnd(12)} | 합계: ${(e.amount + (e.vat || 0)).toLocaleString().padStart(12)}원`);
            console.log(`    대변: ${e.creditAccount.padEnd(12)} | (공급가: ${e.amount.toLocaleString().padStart(10)} / 부가세: ${(e.vat || 0).toLocaleString().padStart(8)})`);
            console.log('----------------------------------------------------------------------');
        });
    });
});
