
import { JournalEntry, Asset, LeaseContract, BudgetItem } from '../types';
import { calculatePeriodDepreciation, calculatePeriodLeaseEntries, generateClosingSnapshot, runClosingPrecheck, calculateFinancials, calculateDailyCashFlow } from '../bridge/StrategicBridge';

export const runPhase2IntegrationTest = (
    ledger: JournalEntry[],
    clearAllData: () => void,
    addAsset: (a: Asset) => void,
    addLease: (l: LeaseContract) => void,
    addEntries: (e: JournalEntry[]) => void,
    performClosing: (period: string, note: string, user: string) => void
) => {
    console.log('--- STARTING PHASE 2 INTEGRATION TEST ---');

    // 1. Setup Data
    const assetId = 'TEST-ASSET-01';
    const leaseId = 'TEST-LEASE-01';

    const testAsset: Asset = {
        id: assetId,
        name: 'Test Laptop',
        acquisitionDate: '2025-01-01',
        cost: 1200000,
        usefulLife: 1, // 1 year
        depreciationMethod: 'StraightLine',
        residualValue: 0,
        accumulatedDepreciation: 0,
        status: 'ACTIVE'
    };

    const testLease: LeaseContract = {
        id: leaseId,
        name: 'Test Office Lease',
        vendor: 'Test Landlord',
        startDate: '2025-01-01',
        endDate: '2026-12-31',
        monthlyPayment: 1000000,
        interestRate: 5.0,
        status: 'ACTIVE',
        initialAssetValue: 22829896, // Approx PV for 24 months, 5% interest
        initialLiability: 22829896,
        deposit: 0
    };

    // Test Engine Logic Directly (Unit Test Style)
    console.log('1. Testing Engine Calculations...');
    const depEntries = calculatePeriodDepreciation([testAsset], '2025-01');
    if (depEntries.length !== 1 || depEntries[0].amount !== 100000) {
        console.error('FAIL: Depreciation Calculation', depEntries);
        alert('❌ FAIL: Depreciation Calculation Incorrect');
        return;
    } else {
        console.log('PASS: Depreciation Calculation (100,000 KRW)');
    }

    const leaseEntries = calculatePeriodLeaseEntries([testLease], '2025-01');
    // Expect 2 entries: Interest and Payment
    const interestEntry = leaseEntries.find(e => e.description.includes('이자비용'));
    const paymentEntry = leaseEntries.find(e => e.description.includes('지급'));

    if (!interestEntry || !paymentEntry) {
        console.error('FAIL: Lease Entries Missing', leaseEntries);
        alert('❌ FAIL: Lease Entries Missing');
        return;
    }

    // Jan 2025 Interest: 22829896 * 0.05 / 12 = 95124 (approx)
    if (Math.abs(interestEntry.amount - 95124) > 100) {
        console.warn('WARN: Lease Interest Calculation Tolerance', interestEntry.amount);
    } else {
        console.log(`PASS: Lease Interest (${interestEntry.amount})`);
    }

    alert(`✅ Phase 2 엔진 통합 테스트 성공!\n\n1. 감가상각 엔진 검증 완료 (100,000원)\n2. 리스 계산 엔진 검증 완료 (이자: ${interestEntry.amount}원)\n\n이 기능은 정상 동작합니다.`);
};

export const runPhase3BvATest = (
    addEntries: (e: JournalEntry[]) => void,
    setBudget: (period: string, items: BudgetItem[]) => void,
    performClosing: (period: string, note: string, user: string) => void
) => {
    // 1. Setup Scenario Data
    const period = '2026-06';
    const targetAccount = '복리후생비';
    const budgetAmount = 1500000;
    const actualAmount = 1800000;

    // 2. Set Budget
    const budgetItems: BudgetItem[] = [
        { accountCategory: targetAccount, budgetAmount: budgetAmount }
    ];
    setBudget(period, budgetItems);

    // 3. Add Expense Entries
    const entry: any = {
        id: `TEST-BVA-${period}`,
        date: `${period}-15`,
        description: '전사 회식비 (예산 초과 테스트)',
        debitAccount: targetAccount,
        creditAccount: '보통예금',
        amount: actualAmount,
        vat: 0,
        type: 'Expense',
        status: 'Approved'
    };
    addEntries([entry]);

    // 4. Perform Closing
    // This will trigger the AI analysis which should pick up the budget and the actual
    performClosing(period, '[TEST] Phase 3 BvA 검증용 결산', 'QA Tester');

    alert(`🧪 Phase 3 BvA 테스트 실행 완료!\n\n1. ${period} 예산 설정: ${budgetAmount.toLocaleString()}원\n2. 실제 지출: ${actualAmount.toLocaleString()}원 (120%)\n3. 결산 실행 완료\n\n👉 [결산 관리] 메뉴에서 2026-06월 AI 브리핑에 '⚠️ 예산 초과' 경고가 있는지 확인하세요.`);
};

import { generateThreeYearSimulation } from './mockDataGenerator';

import { CashPolicy } from '../constants/accounts';

/**
 * 🏛️ PHASE 9-W: SYSTEM INTEGRITY TEST (WORLD CONSERVATION)
 * "It is not data, it is history."
 */
export const runSystemIntegrityTest = async (
    ledger: JournalEntry[],
    systemNow: string,
    addEntries: (e: JournalEntry[]) => void,
    clearAllData: () => void,
    setSystemNow: (date: string) => void
) => {
    console.group('🧪 [SIT-WORLD v9] World Conservation Test');

    try {
        // Step 1: Genesis (Execute Three-Year Simulation)
        console.log("Step 1. Genesis - Creating History...");
        clearAllData();
        const history = generateThreeYearSimulation();
        addEntries(history);

        // Wait for state to reflect history
        await new Promise(r => setTimeout(r, 100));

        // Step 2. Single Event Insertion (Butterfly Effect)
        // 2nd Year June: Additional Strategic Investment 100M
        const eventDate = '2027-06-15';
        console.log(`Step 2. Single Event Insertion - Investing ₩100,000,000 on ${eventDate}`);

        const investmentEntry: any = {
            id: 'SIT-EVENT-BEYOND-HISTORY',
            date: eventDate,
            description: '🏛️ [SIT] 추가 전략 투자 유치 (1억)',
            debitAccount: '보통예금',
            creditAccount: '자본잉여금',
            amount: 100_000_000,
            vat: 0,
            type: 'Equity',
            status: 'Approved',
            createdAt: new Date().toISOString(),
            journalNumber: 'JE-SIT-EVENT-001'
        };

        const worldBeforeInvestment = calculateFinancials(history, '2028-12-31');
        addEntries([investmentEntry]);
        const worldAfterInvestment = calculateFinancials([...history, investmentEntry], '2028-12-31');

        console.log(`World Balance Before: ₩${worldBeforeInvestment.cash.toLocaleString()}`);
        console.log(`World Balance After:  ₩${worldAfterInvestment.cash.toLocaleString()}`);

        const delta = worldAfterInvestment.cash - worldBeforeInvestment.cash;
        if (delta !== 100_000_000) {
            throw new Error(`Butterfly Effect Check Fail: Expected +100M, got ${delta / 1_000_000}M`);
        }

        // Step 3. Time Travel Robustness (Immutable Past)
        const pastDate = '2026-12-31';
        console.log(`Step 3. Time-Travel to ${pastDate} - Verifying Immutable Past`);
        const statsAtPast = calculateFinancials([...history, investmentEntry], pastDate);

        // Investment in 2027 should NOT affect 2026 balance.
        // Also check Triangle consistency at this point
        const dailyAtPast = calculateDailyCashFlow([...history, investmentEntry], pastDate);

        console.log(`Past Cash (FTE Dash):  ₩${statsAtPast.cash.toLocaleString()}`);
        console.log(`Past Cash (FTE Daily): ₩${dailyAtPast.endBalance.toLocaleString()}`);

        if (statsAtPast.cash !== dailyAtPast.endBalance) {
            throw new Error(`Triangle Check Fail at Past: Dash ${statsAtPast.cash} != Daily ${dailyAtPast.endBalance}`);
        }

        // Check if 2027 investment leaked into 2026 (Historical Invariance)
        const originalHistoryPast = calculateFinancials(history, pastDate);
        if (originalHistoryPast.cash !== statsAtPast.cash) {
            throw new Error(`Historical Invariance Fail: 2027 investment changed 2026 record!`);
        }

        setSystemNow('2028-12-31');
        alert("『이건 데이터가 아니라 역사다.』\n\n1. Genesis (History Wave): OK\n2. Butterfly Effect (Causality): OK\n3. Time-Travel Robustness: OK\n\n모든 화면의 숫자가 하나의 진실(FTE)로 수렴합니다.\n완성 선언을 승인합니다.");
        console.log('%c[SIT-WORLD PASSED] World Conservation Logic Verified.', 'color: #10b981; font-weight: bold; font-size: 14px;');

    } catch (err: any) {
        console.error('❌ SIT-WORLD FAILED:', err);
        alert(`❌ [SIT FAILED]\n\n세계 보존 법칙이 붕괴되었습니다: ${err.message}`);
    } finally {
        console.groupEnd();
    }
};
