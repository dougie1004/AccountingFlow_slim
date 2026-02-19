
import { generateThreeYearSimulation } from './src/utils/mockDataGenerator';

function analyzeScenario(name: string, scenario: any) {
    const ledger = generateThreeYearSimulation(scenario);

    // 1. Total Journals
    const totalCount = ledger.length;

    // 2. Grant Income Check (국고보조금수익)
    const grantIncome = ledger
        .filter(e => e.creditAccount === '국고보조금수익')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Investment Check (자본금 유입)
    const investment = ledger
        .filter(e => e.creditAccount === '자본금' && e.date.startsWith('2027-01'))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 4. Cash Movement (Initial: 50M)
    let cash = 50_000_000;
    ledger.forEach(e => {
        if (e.debitAccount === '보통예금') cash += (e.amount || 0);
        if (e.creditAccount === '보통예금') cash -= (e.amount || 0);
    });

    // 5. Major Expenses
    const labor = ledger.filter(e => e.debitAccount === '급여').reduce((sum, e) => sum + (e.amount || 0), 0);
    const marketing = ledger.filter(e => e.debitAccount === '광고선전비').reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
        name,
        totalCount,
        grantIncome: grantIncome.toLocaleString() + '원',
        investment: investment.toLocaleString() + '원',
        endCash: cash.toLocaleString() + '원',
        labor: labor.toLocaleString() + '원',
        marketing: marketing.toLocaleString() + '원'
    };
}

const reports = [
    analyzeScenario('생존 모드 (SURVIVAL)', 'SURVIVAL'),
    analyzeScenario('표준 성장 (STANDARD)', 'STANDARD'),
    analyzeScenario('공격 확장 (GROWTH)', 'GROWTH')
];

console.log('--- AccountingFlow Scenario Intelligence Report ---\n');
reports.forEach((r: any) => {
    console.log(`[${r.name}]`);
    console.log(`- 전체 생성 전표 수: ${r.totalCount}개`);
    console.log(`- 정부 지원금 수익: ${r.grantIncome}`);
    console.log(`- 2027 시드 투자금: ${r.investment}`);
    console.log(`- 인건비 총액: ${r.labor}`);
    console.log(`- 마케팅비 총액: ${r.marketing}`);
    console.log(`- 3년 뒤 최종 잔액: ${r.endCash}`);
    console.log('------------------------------------------');
});
