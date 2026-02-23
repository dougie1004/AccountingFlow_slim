import { JournalEntry, ScenarioParams } from '../types';

let sequence = 1000;
function createEntry(data: Partial<JournalEntry>): JournalEntry {
    return {
        id: crypto.randomUUID(),
        date: data.date || '',
        description: data.description || '',
        debitAccount: data.debitAccount || '',
        creditAccount: data.creditAccount || '',
        amount: data.amount || 0,
        vat: data.vat || 0,
        type: data.type || 'Expense',
        status: data.status || 'Approved',
        vendor: data.vendor || '',
        sequenceNumber: sequence++,
        journalNumber: `JE-${data.date?.replace(/-/g, '').substring(0, 6)}-${sequence}`,
        createdAt: new Date().toISOString(),
        ...data
    } as JournalEntry;
}

export function generateDemoCoPack(params?: Partial<ScenarioParams>): JournalEntry[] {
    const pack: JournalEntry[] = [];
    sequence = 1000;

    const addAndTrack = (entry: JournalEntry) => pack.push(entry);

    // 5월 설립 전표 (CFO 지침 적용) - 2026년 시작 기준
    addAndTrack(createEntry({ date: '2026-05-01', description: 'Seed 투자 유입', debitAccount: '보통예금', creditAccount: '자본잉여금', amount: 300_000_000, type: 'Equity', vendor: 'Altos Ventures' }));
    addAndTrack(createEntry({ date: '2026-05-01', description: 'Seed 투자 유입(자본금)', debitAccount: '보통예금', creditAccount: '자본금', amount: 50_000_000, type: 'Equity', vendor: 'Founder' }));

    const years = [2026, 2027, 2028];
    const base_monthly_revenue: Record<number, number> = {
        1: 60_000_000, 2: 65_000_000, 3: 70_000_000, 4: 75_000_000,
        5: 80_000_000, 6: 85_000_000, 7: 90_000_000, 8: 95_000_000,
        9: 100_000_000, 10: 110_000_000, 11: 120_000_000, 12: 130_000_000
    };

    // 2026 early months (pre-launch)
    const startup_revenue: Record<number, number> = {
        5: 5_000_000, 6: 5_000_000, 7: 15_000_000, 8: 15_000_000,
        9: 40_000_000, 10: 40_000_000, 11: 60_000_000, 12: 60_000_000
    };

    years.forEach(year => {
        const startMonth = year === 2026 ? 5 : 1;

        for (let m = startMonth; m <= 12; m++) {
            const mStr = String(m).padStart(2, '0');
            const date = `${year}-${mStr}-28`;

            // Revenue scaling
            let rev = year === 2026 ? (startup_revenue[m] || 0) : base_monthly_revenue[m];
            if (year === 2028) rev *= 1.5; // Scale up in year 3

            // 매출 (60% 현금, 40% 외상)
            if (rev > 0) {
                addAndTrack(createEntry({ date, description: `구독매출 현금`, debitAccount: '보통예금', creditAccount: 'SaaS구독매출', amount: rev * 0.6, type: 'Revenue', vendor: 'Stripe Payments' }));
                addAndTrack(createEntry({ date, description: `구독매출 외상`, debitAccount: '외상매출금', creditAccount: 'SaaS구독매출', amount: rev * 0.4, type: 'Revenue', isSettled: false, dueDate: `${year}-${String((m % 12) + 1).padStart(2, '0')}-28`, vendor: 'B2B Enterprise Clients' }));
            }

            // 고정비 (Scale with time)
            const expenseMultiplier = year === 2026 ? 1 : (year === 2027 ? 1.2 : 1.5);
            addAndTrack(createEntry({ date, description: '월 급여', debitAccount: '급여', creditAccount: '보통예금', amount: 25_000_000 * expenseMultiplier, type: 'Payroll', vendor: '임직원급여' }));
            addAndTrack(createEntry({ date, description: '임차료', debitAccount: '지급임차료', creditAccount: '보통예금', amount: 3_000_000 * expenseMultiplier, type: 'Expense', vendor: '패스트파이브' }));
            addAndTrack(createEntry({ date, description: '서버비', debitAccount: '인프라 원가', creditAccount: '보통예금', amount: 1_500_000 * expenseMultiplier, type: 'Expense', vendor: 'AWS Cloud' }));
            addAndTrack(createEntry({ date, description: '지급수수료', debitAccount: '지급수수료', creditAccount: '보통예금', amount: 2_000_000 * expenseMultiplier, type: 'Expense', vendor: '토스페이먼츠' }));

            // 정산 (외상매출금 회수)
            const prevMonth = m === 1 ? 12 : m - 1;
            const prevYear = m === 1 ? year - 1 : year;
            if (year > 2026 || m > 5) {
                const prevRev = prevYear === 2026 ? (startup_revenue[prevMonth] || 0) : base_monthly_revenue[prevMonth] * (prevYear === 2028 ? 1.5 : 1.2);
                if (prevRev > 0) {
                    addAndTrack(createEntry({ date: `${year}-${mStr}-05`, description: '전월 SaaS 매출 채권 회수 완료', debitAccount: '보통예금', creditAccount: '외상매출금', amount: prevRev * 0.4, type: 'Revenue', vendor: 'B2B Enterprise Clients' }));
                }
            }

            // 마케팅 비용 (Monthly Base + Stress test impact)
            if (!params?.marketingDisabled) {
                const baseMarketing = 2_000_000 * expenseMultiplier;
                addAndTrack(createEntry({ date, description: '정기 마케팅 집행', debitAccount: '광고선전비', creditAccount: '보통예금', amount: baseMarketing, type: 'Expense', vendor: 'Google Ads' }));

                // 8월 마케팅 스파이크
                if (m === 8) {
                    addAndTrack(createEntry({ date, description: '마케팅 캠페인 스파이크', debitAccount: '광고선전비', creditAccount: '보통예금', amount: 30_000_000 * expenseMultiplier, type: 'Expense', vendor: 'Meta Platforms' }));
                }
            }

            // 12월 보너스
            if (m === 12) {
                addAndTrack(createEntry({ date, description: '연말 보너스', debitAccount: '급여', creditAccount: '보통예금', amount: 25_000_000 * expenseMultiplier, type: 'Payroll', vendor: '임직원급여' }));
            }
        }
    });

    return pack;
}
