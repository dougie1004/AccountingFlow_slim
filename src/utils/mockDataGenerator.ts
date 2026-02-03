import { JournalEntry } from '../types';

export const generateThreeYearSimulation = (): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    startDate.setDate(1);

    const vendors = ['블루테크', '하이퍼클라우드', '글로벌솔루션', '강남빌딩', '스타벅스', '서울에너지', '네이버클라우드', 'A서비스', 'B유통', 'C통신'];

    // 0. Initial Capital
    entries.push({
        id: crypto.randomUUID(),
        date: startDate.toISOString().split('T')[0],
        description: '법인 설립 초기 자본금 납입',
        debitAccount: '보통예금',
        creditAccount: '자본금',
        amount: 5000000000, // 5B KRW
        vat: 0,
        type: 'Equity',
        vendor: '창업자A',
        status: 'Approved'
    });

    for (let month = 0; month < 36; month++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(currentDate.getMonth() + month);
        const year = Math.floor(month / 12) + 1;
        const dateStr = (d: number) => {
            const dt = new Date(currentDate);
            dt.setDate(d);
            return dt.toISOString().split('T')[0];
        };

        // Growth Factor (More Realistic Scaling)
        const revenueBase = (year === 1 ? 1200000000 : year === 2 ? 2800000000 : 4500000000) / 4;
        const cogsRatio = 0.35; // 35% COGS for infrastructure/license
        const salaryBase = (year === 1 ? 12 : year === 2 ? 25 : 40) * 4500000;

        // 1. Recurring SG&A (Day 1)
        entries.push({
            id: crypto.randomUUID(),
            date: dateStr(1),
            description: `${currentDate.getMonth() + 1}월 사무실 임차료`,
            debitAccount: '임차료',
            creditAccount: '보통예금',
            amount: 10000000 + (year * 3000000),
            vat: 0,
            type: 'Expense',
            vendor: '강남빌딩',
            status: 'Approved',
            isSettled: true
        });

        // 2. Weekly Sales & COGS Cycle
        for (let w = 1; w <= 4; w++) {
            const saleDate = dateStr(w * 7);
            const rawAmount = Math.round(revenueBase * (0.85 + Math.random() * 0.3));
            const vat = Math.round(rawAmount * 0.1);

            // [Revenue]
            const arEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: saleDate,
                description: `SaaS 라이선스 매출 (${vendors[w % 3]})`,
                debitAccount: '외상매출금',
                creditAccount: '매출',
                amount: Math.round(rawAmount * 0.6),
                vat: Math.round(vat * 0.6),
                type: 'Revenue',
                vendor: vendors[w % 3],
                status: 'Approved',
                isSettled: false,
                dueDate: dateStr(w * 7 + 45)
            };
            entries.push(arEntry);

            // [COGS] - Every sale has a cost (Infrastructure/Service)
            const cogsAmount = Math.round(rawAmount * cogsRatio);
            entries.push({
                id: crypto.randomUUID(),
                date: saleDate,
                description: `클라우드 인프라 사용료 (COGS - ${vendors[w % 3]})`,
                debitAccount: '매출원가',
                creditAccount: '외상매입금',
                amount: cogsAmount,
                vat: Math.round(cogsAmount * 0.1),
                type: 'Expense',
                vendor: '네이버클라우드',
                status: 'Approved',
                isSettled: true
            });

            // Auto-receive AR after 45 days
            const collectionDate = new Date(currentDate);
            collectionDate.setDate(collectionDate.getDate() + (w * 7) + 45);
            if (collectionDate < new Date()) {
                const collId = crypto.randomUUID();
                entries.push({
                    id: collId,
                    date: collectionDate.toISOString().split('T')[0],
                    description: `[수금] ${vendors[w % 3]} 외상대금 회수`,
                    debitAccount: '보통예금',
                    creditAccount: '외상매출금',
                    amount: Math.round(rawAmount * 0.6),
                    vat: Math.round(vat * 0.6),
                    type: 'Revenue',
                    vendor: vendors[w % 3],
                    status: 'Approved',
                    clearingRecord: {
                        sourceEntryId: arEntry.id,
                        clearingEntryId: collId,
                        reasonCode: 'AUTO_COLLECTION',
                        evidenceType: 'RECEIPT',
                        clearedAt: collectionDate.toISOString(),
                        status: 'CLEARED'
                    }
                });
                arEntry.isSettled = true;
                arEntry.settledDate = collectionDate.toISOString().split('T')[0];
            }

            // Unearned Revenue
            entries.push({
                id: crypto.randomUUID(),
                date: saleDate,
                description: `유지보수 선급금 수령 (${vendors[w % 3]})`,
                debitAccount: '보통예금',
                creditAccount: '선수금',
                amount: Math.round(rawAmount * 0.4),
                vat: Math.round(vat * 0.4),
                type: 'Liability',
                vendor: vendors[w % 3],
                status: 'Approved',
                isSettled: false
            });
        }

        // 3. Payroll Accrual (Day 25)
        const monthlySalary = Math.round(salaryBase);
        const payrollEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: dateStr(25),
            description: `${currentDate.getMonth() + 1}월분 임직원 급여 (미지급)`,
            debitAccount: '급여',
            creditAccount: '미지급금',
            amount: monthlySalary,
            vat: 0,
            type: 'Payroll',
            vendor: '임직원일괄',
            status: 'Approved',
            isSettled: false
        };
        entries.push(payrollEntry);

        // 4. Payroll Payment (Day 10 of next month)
        const payDate = new Date(currentDate);
        payDate.setMonth(payDate.getMonth() + 1);
        payDate.setDate(10);
        if (payDate < new Date()) {
            const clearingId = crypto.randomUUID();
            entries.push({
                id: clearingId,
                date: payDate.toISOString().split('T')[0],
                description: `[지급] ${currentDate.getMonth() + 1}월분 급여 이체`,
                debitAccount: '미지급금',
                creditAccount: '보통예금',
                amount: monthlySalary,
                vat: 0,
                type: 'Expense',
                vendor: '임직원일괄',
                status: 'Approved',
                clearingRecord: {
                    sourceEntryId: payrollEntry.id,
                    clearingEntryId: clearingId,
                    reasonCode: 'SALARY_PAYMENT',
                    evidenceType: 'APPROVAL',
                    clearedAt: payDate.toISOString(),
                    status: 'CLEARED'
                }
            });
            payrollEntry.isSettled = true;
            payrollEntry.settledDate = payDate.toISOString().split('T')[0];
        }

        // 5. Suspense Items (Compliance Stress)
        if (month % 3 === 0) { // Every quarter
            const susEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: dateStr(15),
                description: '영업활동비 가지급 (영업부)',
                debitAccount: '가지급금',
                creditAccount: '보통예금',
                amount: 5000000,
                vat: 0,
                type: 'Asset',
                vendor: '영업부',
                status: 'Approved',
                isSettled: false
            };
            entries.push(susEntry);

            // Some stay unsettled if in Year 3 (Compliance Risk)
            if (year < 3) {
                const settleId = crypto.randomUUID();
                const settleDate = dateStr(28);
                entries.push({
                    id: settleId,
                    date: settleDate,
                    description: '[정산] 영업활동비 증빙 정산',
                    debitAccount: '복리후생비',
                    creditAccount: '가지급금',
                    amount: 5000000,
                    vat: 0,
                    type: 'Expense',
                    vendor: '영업부',
                    status: 'Approved',
                    clearingRecord: {
                        sourceEntryId: susEntry.id,
                        clearingEntryId: settleId,
                        reasonCode: 'EXP_SETTLEMENT',
                        evidenceType: 'RECEIPT',
                        clearedAt: settleDate,
                        status: 'CLEARED'
                    }
                });
                susEntry.isSettled = true;
                susEntry.settledDate = settleDate;
            } else if (month === 30) {
                // Blocked intentionally
                susEntry.clearingRecord = {
                    sourceEntryId: susEntry.id,
                    reasonCode: 'EVIDENCE_MISSING',
                    reasonText: '3년차 영수증 미비로 인한 정산 보류',
                    evidenceType: 'NONE',
                    clearedAt: dateStr(28),
                    status: 'BLOCKED'
                };
            }
        }

        // 6. Unearned Revenue Settlement (Revenue Recognition over 3 months)
        // Simulate historical unearned revenue recognition for previous months
        if (month >= 3) {
            const amountToRecognize = Math.round(revenueBase * 0.5); // Recognize old amount
            entries.push({
                id: crypto.randomUUID(),
                date: dateStr(28),
                description: '[정산] 선수수익 매출 전환 인식',
                debitAccount: '선수금',
                creditAccount: '매출',
                amount: amountToRecognize,
                vat: 0,
                type: 'Revenue',
                vendor: 'System',
                status: 'Approved',
                isSettled: true
            });
        }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
};

export const generateComprehensiveMockData = () => generateThreeYearSimulation();

export const generateStressTestData = (count: number = 5000): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const today = new Date();

    const accounts = ['복리후생비', '여비교통비', '지급수수료', '소모품비', '임차료', '급여', '통신비', '광고선전비', '매출', '상품매출'];
    const vendors = ['구글 코리아', '스타벅스', '애플코리아', '삼성전자', '카카오T', '강남빌딩', 'Amazon Web Services', '네이버 클라우드'];
    const suspenseAccounts = ['가지급금', '가수금', '전도금'];

    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 120);
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split('T')[0];

        const isSuspense = Math.random() < 0.15;
        const amount = Math.floor(Math.random() * 1000) * 1000 + 10000;

        let debit, credit, type, desc, isSettled = true;
        let clearingRecord = undefined;

        if (isSuspense) {
            const susAcc = suspenseAccounts[Math.floor(Math.random() * suspenseAccounts.length)];
            const isDebitSus = susAcc === '가지급금' || susAcc === '전도금';
            debit = isDebitSus ? susAcc : '보통예금';
            credit = isDebitSus ? '보통예금' : susAcc;
            type = isDebitSus ? 'Asset' : 'Liability';
            desc = `[Stress] ${susAcc} 발생 건 (${i})`;

            const rand = Math.random();
            if (rand < 0.4) {
                isSettled = false;
            } else if (rand < 0.7) {
                isSettled = false;
                clearingRecord = {
                    sourceEntryId: 'mock-id',
                    reasonCode: 'EVIDENCE_MISSING',
                    reasonText: '스트레스 테스트용 증빙 누락 데이터',
                    evidenceType: 'NONE' as const,
                    clearedAt: dateStr,
                    status: 'BLOCKED' as const
                };
            } else {
                isSettled = true;
            }
        } else {
            const isRevenue = Math.random() < 0.3;
            debit = isRevenue ? '보통예금' : accounts[Math.floor(Math.random() * (accounts.length - 2))];
            credit = isRevenue ? '매출' : '보통예금';
            type = isRevenue ? 'Revenue' : 'Expense';
            desc = `[Stress] 일반 거래 (${i})`;
        }

        entries.push({
            id: `stress-${i}`,
            date: dateStr,
            description: desc,
            debitAccount: debit,
            creditAccount: credit,
            amount: amount,
            vat: Math.floor(amount * 0.1),
            type: type,
            vendor: vendors[Math.floor(Math.random() * vendors.length)],
            status: 'Approved',
            isSettled,
            clearingRecord
        });
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
};
