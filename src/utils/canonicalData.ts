import { JournalEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const generateCanonicalData = (): JournalEntry[] => {
    let entries: JournalEntry[] = [];

    // Helper to add entry (Simplified for Canonical Mapping)
    const add = (
        date: string,
        desc: string,
        debitAcc: string,
        creditAcc: string,
        amount: number,
        type: string = 'General',
        vat: number = 0,
        extra: Partial<JournalEntry> = {}
    ) => {
        entries.push({
            id: uuidv4(),
            date,
            description: desc,
            debitAccount: debitAcc,
            creditAccount: creditAcc,
            amount,
            vat,
            type,
            status: 'Approved',
            isSettled: true,
            createdAt: extra.createdAt || date,
            journalNumber: extra.journalNumber || 'DEMO-DATA',
            sequenceNumber: extra.sequenceNumber || 0,
            ...extra
        });
    };

    // Ⅰ. 개시 이벤트
    // E01. 자본금 납입 (Cash 100M / Capital 100M)
    add('2025-01-01', '설립 자본금 납입', '보통예금 (Bank)', '자본금 (Capital)', 100000000, 'Equity');

    // Ⅱ. 영업 활동
    // E02. 현금 매출 (Cash 1.1M / Revenue 1M / VAT Liab 0.1M)
    // SPL handles 'Revenue' type: Dr Cash (Total), Cr Rev (Net), Cr VAT (VAT)
    add('2025-01-05', '현금 매출 발생', '보통예금 (Bank)', '상품매출 (Revenue)', 1000000, 'Revenue', 100000);

    // E03. 외상 매출 (AR 2.2M / Revenue 2M / VAT Liab 0.2M)
    add('2025-01-10', '외상 매출', '외상매출금 (AR)', '상품매출 (Revenue)', 2000000, 'Revenue', 200000, { isSettled: false, dueDate: '2025-02-10' });

    // E04. 매입 (외상) (Cost 1.5M / VAT Asset 0.15M / AP 1.65M)
    // SPL handles 'Expense' type: Dr Cost (Net), Dr VAT (VAT), Cr AP (Total)
    add('2025-01-15', '외상 매입 (재고/원가)', '매출원가 (COGS)', '외상매입금 (AP)', 1500000, 'Expense', 150000, { isSettled: false, dueDate: '2025-02-15' });

    // E05. 매입채무 지급 (AP 1.65M / Cash 1.65M)
    add('2025-01-20', '매입채무 지급', '외상매입금 (AP)', '보통예금 (Bank)', 1650000, 'General', 0);

    // Ⅲ. 급여 / 원천세
    // E06. 급여 발생 (Salary 3M / Withholding 0.3M / Payable 2.7M)
    // SPL handles 'Payroll' type: Dr Salary (Gross), Cr Withholding (VAT field), Cr Payable (Net)
    // Corrected Target Account: '미지급비용' instead of Bank for Accrual? 
    // The previous SPL assumed 'Bank' as credit. To do Accrual, we use '미지급비용' as creditAccount.
    add('2025-01-31', '1월 급여 발생', '급여 (Salaries)', '미지급비용 (Accrued Exp)', 3000000, 'Payroll', 300000);

    // E07. 급여 지급 (Payable 2.7M / Cash 2.7M)
    add('2025-02-05', '1월 급여 지급', '미지급비용 (Accrued Exp)', '보통예금 (Bank)', 2700000, 'General');

    // E08. 원천세 납부 (Withholding 0.3M / Cash 0.3M)
    add('2025-02-10', '원천세 납부', '예수금(원천세)', '보통예금 (Bank)', 300000, 'General');

    // Ⅳ. 부가세 정산
    // E09. 부가세 납부 (Offsetting: Dr VAT Liab 300k, Cr VAT Asset 150k, Cr Cash 150k)
    // Map to 2 entries to satisfy 1:1 limit.
    // 1. Offset Input VAT: Dr VAT Liab 150k / Cr VAT Asset 150k
    add('2025-04-25', '부가세 정산 (매입세액 공제)', '부가가치세예수금', '부가가치세대급금', 150000, 'General');
    // 2. Pay Balance: Dr VAT Liab 150k / Cr Cash 150k
    add('2025-04-25', '부가세 납부', '부가가치세예수금', '보통예금 (Bank)', 150000, 'General');

    // Ⅴ. 투자 활동
    // E10. 장비 취득 (Asset 5M / Cash 5M)
    // Type 'Asset' SPL logic: if VAT=0, Dr Asset / Cr Cash directly.
    add('2025-02-01', '노트북 구입', '비품 (Equipment)', '보통예금 (Bank)', 5000000, 'Asset', 0);

    // E11. 감가상각 (Depreciation 1M / Contra-Asset 1M)
    add('2025-12-31', '감가상각비 인식', '감가상각비', '감가상각누계액', 1000000, 'General');

    // Ⅵ. 리스 (RoU)
    // E12. 리스 개시 (RoU Asset 24M / Lease Liab 24M)
    add('2025-03-01', '사무실 리스 개시', '사용권자산 (RoU)', '리스부채 (Lease Liab)', 24000000, 'General');

    // E13. 리스료 지급 (Interest 0.2M + Principal 1.8M = Cash 2.0M)
    // Split into 2 entries
    add('2025-03-31', '리스 이자비용 지급', '이자비용', '보통예금 (Bank)', 200000, 'General');
    add('2025-03-31', '리스 원금 상환', '리스부채 (Lease Liab)', '보통예금 (Bank)', 1800000, 'General');

    // E14. 사용권자산 상각
    add('2025-12-31', '사용권자산 감가상각', '감가상각비', '사용권자산누계액', 2000000, 'General');

    // Ⅶ. 결산
    // E15. 법인세 비용 (Tax Exp 0.5M / Tax Payable 0.5M)
    add('2025-12-31', '법인세 비용 인식', '법인세비용', '미지급법인세', 500000, 'General');

    // E16. 손익 대체 (Closing Entry)
    // Net Income = 3M (Rev) - 8.2M (Exp) = -5.2M (Loss)
    // Loss means Debit Retained Earnings, Credit Income Summary
    add('2025-12-31', '손익 대체 (결산)', '이익잉여금', '집합손익 (Income Summary)', 5200000, 'Closing');

    return entries;
};
