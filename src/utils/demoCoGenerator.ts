import { JournalEntry, ScenarioParams } from '../types';

let sequence = 1000;
function createEntry(data: Partial<JournalEntry>): JournalEntry {
    const d = data.date || '';
    return {
        id: crypto.randomUUID(),
        date: d,
        transactionDate: data.transactionDate || d,
        recognitionDate: data.recognitionDate || d,
        description: data.description || '',
        debitAccount: data.debitAccount || '',
        creditAccount: data.creditAccount || '',
        amount: data.amount || 0,
        vat: data.vat || 0,
        vatFlag: data.vatFlag ?? (data.vat ? data.vat > 0 : false),
        type: data.type || 'Expense',
        status: data.status || 'Approved',
        vendor: data.vendor || '',
        sequenceNumber: sequence++,
        journalNumber: `JE-${d.replace(/-/g, '').substring(0, 6)}-${String(sequence).padStart(4, '0')}`,
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

            // 매출원가 (COGS - Scale with revenue)
            const infraAmt = Math.floor(rev * 0.12);
            const apiAmt = Math.floor(rev * 0.03);
            addAndTrack(createEntry({ date, description: '클라우드 인프라 원가', debitAccount: '인프라 원가', creditAccount: '보통예금', amount: infraAmt, type: 'Expense', vendor: 'AWS Cloud' }));
            addAndTrack(createEntry({ date, description: 'LLM API 사용 원가', debitAccount: 'Gemini API 원가', creditAccount: '보통예금', amount: apiAmt, type: 'Expense', vendor: 'Google Cloud' }));

            // 판관비 (SG&A - Scale with time)
            const expenseMultiplier = year === 2026 ? 1 : (year === 2027 ? 1.2 : 1.5);
            addAndTrack(createEntry({ date, description: '월 급여', debitAccount: '급여', creditAccount: '보통예금', amount: 25_000_000 * expenseMultiplier, type: 'Payroll', vendor: '임직원급여' }));
            addAndTrack(createEntry({ date, description: '임차료', debitAccount: '지급임차료', creditAccount: '보통예금', amount: 3_000_000 * expenseMultiplier, type: 'Expense', vendor: '패스트파이브' }));
            addAndTrack(createEntry({ date, description: '지급수수료', debitAccount: '지급수수료', creditAccount: '보통예금', amount: 2_000_000 * expenseMultiplier, type: 'Expense', vendor: '토스페이먼츠' }));

            // 정산 (외상매출금 회수)
            const prevMonth = m === 1 ? 12 : m - 1;
            const prevYear = m === 1 ? year - 1 : year;
            if (year > 2026 || m > 5) {
                // [CONSISTENCY FIX] Collection must match billing logic exactly
                let prevRev = prevYear === 2026 ? (startup_revenue[prevMonth] || 0) : base_monthly_revenue[prevMonth];
                if (prevYear === 2028) prevRev *= 1.5;

                if (prevRev > 0) {
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-05`,
                        description: '전월 SaaS 매출 채권 회수 완료',
                        debitAccount: '보통예금',
                        creditAccount: '외상매출금',
                        amount: prevRev * 0.4,
                        type: 'Asset',
                        vendor: 'B2B Enterprise Clients'
                    }));
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

export function getDemoCoPartners(): { name: string; regNo: string }[] {
    return [
        { name: 'Altos Ventures', regNo: '120-81-12345' },
        { name: 'Stripe Payments', regNo: '107-86-54321' },
        { name: 'Founder', regNo: '101-01-00001' },
        { name: 'B2B Enterprise Clients', regNo: '211-81-99999' },
        { name: '임직원급여', regNo: '000-00-00000' },
        { name: '패스트파이브', regNo: '220-88-22334' },
        { name: 'AWS Cloud', regNo: '105-87-77889' },
        { name: '토스페이먼츠', regNo: '110-81-11223' },
        { name: 'Google Ads', regNo: '107-87-12345' },
        { name: 'Meta Platforms', regNo: '120-86-98765' }
    ];
}
