import { JournalEntry } from '../types';

export const generateComprehensiveMockData = (): JournalEntry[] => {
    const entries: JournalEntry[] = [];
    const today = new Date();

    const formatDate = (daysAgo: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    };

    const add = (
        daysAgo: number,
        description: string,
        debitAccount: string,
        creditAccount: string,
        amount: number,
        type: string,
        vendor: string,
        extra: Partial<JournalEntry> = {}
    ) => {
        entries.push({
            id: crypto.randomUUID(),
            date: formatDate(Math.abs(daysAgo)),
            description,
            debitAccount,
            creditAccount,
            amount,
            vat: extra.vat || 0,
            type,
            vendor,
            status: 'Approved',
            controlTrail: [`[${new Date().toLocaleTimeString()}] System generated mock data`],
            ...extra
        });
    };

    // --- 1. 자금 조달 (Capitalization) ---
    add(-45, '초기 자본금 유입', '보통예금', '자본금', 100000000, 'Equity', '창업자');

    // --- 2. 고정자산 취득 (Assets) ---
    add(-40, '사무용 고성능 워크스테이션', '비품', '보통예금', 3500000, 'Asset', '삼성전자', { vat: 350000, isSettled: true });
    add(-38, '디자인팀 태블릿 구매', '비품', '미지급금', 1200000, 'Asset', '애플코리아', { vat: 120000, isSettled: false, dueDate: formatDate(8) });

    // --- 3. 운영 비용 (Operating Expenses) ---
    add(-30, '1월 사무실 임차료', '임차료', '보통예금', 5000000, 'Expense', '강남빌딩', { isSettled: true });
    add(-25, '클라우드 서버 비용 (AWS)', '지급수수료', '미지급금', 1200000, 'Expense', 'Amazon Web Services', { isSettled: false, dueDate: formatDate(5) });
    add(-20, '팀 점심 식대 (스타벅스)', '복리후생비', '보통예금', 45000, 'Expense', '스타벅스', { vat: 4500, isSettled: true });
    add(-15, '마케팅 대행 수수료', '광고선전비', '미지급금', 3000000, 'Expense', '구글 코리아', { vat: 300000, isSettled: false, dueDate: formatDate(2) });
    add(-10, '사무용품 구입 (볼펜 등)', '소모품비', '보통예금', 25000, 'Expense', '알파문구', { vat: 2500, isSettled: true });
    add(-5, '야간 택시비 (업무용)', '여비교통비', '보통예금', 18500, 'Expense', '카카오T', { isSettled: true });

    // --- 4. 매출 발생 (Revenue) ---
    add(-28, 'SaaS 솔루션 연간 구독 (A사)', '보통예금', '매출', 12000000, 'Revenue', 'A사', { vat: 1200000, isSettled: true });
    add(-12, '컨설팅 서비스 제공 (B사)', '외상매출금', '매출', 5000000, 'Revenue', 'B사', { vat: 500000, isSettled: false, dueDate: formatDate(-10) });
    add(-2, 'SaaS 솔루션 월간 구독 (C사)', '보통예금', '매출', 450000, 'Revenue', 'C사', { vat: 45000, isSettled: true });

    return entries;
};

export const getRawMockData = () => {
    return {
        revenueData: [
            { date: '2024-01', amount: 12000000 },
            { date: '2024-02', amount: 8500000 },
            { date: '2024-03', amount: 15000000 }
        ],
        expenseData: [
            { date: '2024-01', amount: 4500000 },
            { date: '2024-02', amount: 5200000 },
            { date: '2024-03', amount: 4800000 }
        ]
    };
};
