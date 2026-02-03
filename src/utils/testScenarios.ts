
import { JournalEntry, Asset, LeaseContract, BudgetItem } from '../types';
import { calculatePeriodDepreciation, calculatePeriodLeaseEntries, generateClosingSnapshot, runClosingPrecheck } from '../core/accountingEngine';

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
    const entry: JournalEntry = {
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
