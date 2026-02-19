import { describe, it, expect } from 'vitest';
import { generateYearlyPack } from '../src/utils/mockDataGenerator';
import { JournalEntry } from '../src/types';

describe('Detailed Audit: 2026 SURVIVAL', () => {
    it('should track monthly cash flow for SURVIVAL and ensure liquidity', () => {
        const scenario = 'SURVIVAL';
        const year = 2026;
        const entries = generateYearlyPack(year, [], scenario);

        console.log(`\n=== 📊 2026 ${scenario} 월별 현금 흐름 정밀 보고서 ===`);
        console.log(`(정부지원금 제외, 2인 체제, 지출 최소화)`);

        let cumulativeCash = 0;

        // Months 5 to 12
        for (let m = 5; m <= 12; m++) {
            const mStr = String(m).padStart(2, '0');
            const monthEntries = entries.filter(e => e.date.startsWith(`2026-${mStr}`));

            let cashIn = 0;
            let cashOut = 0;

            monthEntries.forEach(e => {
                if (e.debitAccount === '보통예금') cashIn += e.amount;
                if (e.creditAccount === '보통예금') cashOut += e.amount;
            });

            cumulativeCash += (cashIn - cashOut);

            console.log(`[2026-${mStr}]`);
            console.log(`  유입: +${(cashIn / 10000).toFixed(0)}만 원 | 유출: -${(cashOut / 10000).toFixed(0)}만 원`);
            console.log(`  월말 잔액: ${(cumulativeCash / 10000).toFixed(0)}만 원`);

            if (cumulativeCash < 0) {
                console.log(`  ❌ CRITICAL: ${m}월 현금 마이너스 발생! (잔액: ${cumulativeCash})`);
            }
        }

        expect(cumulativeCash).toBeGreaterThan(0);
        console.log(`\n✅ 2026년 SURVIVAL 검증 완료: 기말 잔액 ${(cumulativeCash / 10000).toFixed(0)}만 원`);
    });
});
