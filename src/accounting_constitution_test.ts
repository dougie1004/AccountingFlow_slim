
import { JournalEntry, AccountNature, ConstitutionViolationError } from './types';
import { getAccountCategory, getAccountNature, isArAccount, isApAccount, CashPolicy } from './constants/accounts';

/**
 * ⚖️ [ACCOUNTING CONSTITUTION] HARD-TEST SUITE
 * Standalone Test Version (Internal logic extraction)
 */

export const validateTransaction = (entry: JournalEntry) => {
    const errors: string[] = [];
    if (entry.amount < 0) errors.push(`[Hard Reject] Imbalance: Base amount cannot be negative (${entry.amount}).`);
    if (entry.debitAccount === entry.creditAccount) errors.push(`[Panic] Recursive Entry: Same accounts.`);
    if (!entry.recognitionDate) errors.push(`[Hard Reject] Accrual Violation: recognitionDate is required.`);

    return {
        isValid: !errors.some(e => e.includes('Hard Reject') || e.includes('Panic')),
        errors
    };
};

export function calculateFinancials(ledger: JournalEntry[]) {
    let revenue = 0, expenses = 0, vatPayable = 0, vatReceivable = 0, cash = 0, liabilities = 0;

    ledger.forEach(e => {
        const natureD = getAccountNature(e.debitAccount);
        const natureC = getAccountNature(e.creditAccount);

        if (natureC === AccountNature.REVENUE) revenue += e.amount;
        if (natureD === AccountNature.SG_AND_A || natureD === AccountNature.COGS) expenses += e.amount;

        if (e.vat > 0) {
            if (natureC === AccountNature.REVENUE) vatPayable += e.vat;
            else vatReceivable += e.vat;
        }

        if (CashPolicy.includes(e.debitAccount)) cash += (e.amount + e.vat);
        if (CashPolicy.includes(e.creditAccount)) cash -= (e.amount + e.vat);

        if (natureC === AccountNature.LIABILITY) liabilities += (e.amount + e.vat);
        if (natureD === AccountNature.LIABILITY) liabilities -= (e.amount + e.vat);
    });

    return { revenue, expenses, vatPayable, vatReceivable, cash, totalLiabilities: liabilities };
}

let passed = 0, failed = 0;
const assert = (condition: boolean, msg: string) => {
    if (condition) {
        console.log(`✅ PASS: ${msg}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${msg}`);
        failed++;
    }
};

const createEntry = (data: Partial<JournalEntry>): JournalEntry => ({
    id: "test-id",
    date: '2026-02-25',
    transactionDate: '2026-02-25',
    recognitionDate: '2026-02-25',
    description: 'Test Entry',
    debitAccount: '',
    creditAccount: '',
    amount: 0,
    vat: 0,
    type: 'Journal',
    status: 'Approved',
    ...data
} as JournalEntry);

console.log('\n🛡️ [회계 헌법] 10대 핵심 케이스 필드 테스트 시작...\n');

try {
    // 1. 과세 매출
    const case1 = createEntry({ description: '과세 매출', debitAccount: '보통예금', creditAccount: 'SaaS구독매출', amount: 1000000, vat: 100000, vatFlag: true, type: 'Revenue' });
    const f1 = calculateFinancials([case1]);
    assert(f1.revenue === 1000000 && f1.vatPayable === 100000, 'Case 1: 과세 매출 (공급가/VAT 분리)');

    // 2. 면세 매출
    const case2 = createEntry({ description: '면세 매출', debitAccount: '보통예금', creditAccount: '컨설팅 매출', amount: 500000, vat: 0, type: 'Revenue' });
    const f2 = calculateFinancials([case2]);
    assert(f2.revenue === 500000 && f2.vatPayable === 0, 'Case 2: 면세 매출 (부가세 0)');

    // 3. 영세율 매출
    const case3 = createEntry({ description: '영세율 매출', debitAccount: '외상매출금', creditAccount: 'SaaS구독매출', amount: 2000000, vat: 0, vatFlag: true, type: 'Revenue' });
    const f3 = calculateFinancials([case3]);
    assert(f3.revenue === 2000000 && f3.vatPayable === 0, 'Case 3: 영세율 매출 (Zero Tax)');

    // 4. 단순 비용
    const case4 = createEntry({ description: '식비', debitAccount: '식비', creditAccount: '보통예금', amount: 10000, vat: 1000, type: 'Expense' });
    const v4 = validateTransaction(case4);
    assert(v4.isValid, 'Case 4: 단순 비용 (판관비) 검증');

    // 5. 감가상각
    const case5 = createEntry({ description: '감가상각', debitAccount: '감가상각비', creditAccount: '감가상각누계액', amount: 150000, vat: 0, type: 'Expense' });
    const f5 = calculateFinancials([case5]);
    assert(f5.expenses === 150000 && f5.cash === 0, 'Case 5: 감가상각 (비현금 비용)');

    // 6. 선수수익 인식
    const case6 = createEntry({ description: '선수수익인식', debitAccount: '선수금', creditAccount: 'SaaS구독매출', amount: 1000000, vat: 0, type: 'Revenue' });
    const f6 = calculateFinancials([case6]);
    assert(f6.revenue === 1000000 && f6.totalLiabilities < 0, 'Case 6: 선수수익 인식 (부채 감소)');

    // 7. 보조금 이연수익
    const case7 = createEntry({ description: '보조금인식', debitAccount: '국고보조금(이연)', creditAccount: '국고보조금수익', amount: 1000000, vat: 0, type: 'Revenue' });
    assert(getAccountNature('국고보조금수익') === AccountNature.REVENUE, 'Case 7: 보조금 이연수익 성격 확인');

    // 8. 외화 거래
    const case8 = createEntry({ description: '환차익', debitAccount: '보통예금', creditAccount: '잡이익', amount: 50000, vat: 0, type: 'Revenue' });
    assert(validateTransaction(case8).isValid, 'Case 8: 외화 거래 (환차익) 통과');

    // 9. 매입 VAT
    const case9 = createEntry({ description: '비품매입', debitAccount: '비품', creditAccount: '미지급금', amount: 2000000, vat: 200000, type: 'Asset' });
    const f9 = calculateFinancials([case9]);
    assert(f9.vatReceivable === 200000, 'Case 9: 매입 VAT (대급금 인식)');

    // 10. 잘못된 입력
    const case10 = createEntry({ description: '에러케이스', amount: -5000 });
    assert(!validateTransaction(case10).isValid, 'Case 10: 음수 금액 거부 (Protection)');

} catch (e) {
    console.error('Test execution error:', e);
}

console.log(`\n-----------------------------------------`);
console.log(`최종 결과: ${passed} PASS, ${failed} FAIL`);
console.log(`-----------------------------------------\n`);
