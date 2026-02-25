import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rows = [['거래일자', '가맹점명', '출금금액', '입금금액', '적요', '비고']];

const vendors = {
    equity: [
        { name: 'Altos Ventures', amount: 300000000, desc: 'Seed Series-A 투자금 납입' },
        { name: '대표이사(창업자)', amount: 50000000, desc: '초기 설립 자본금' }
    ],
    revenue: [
        { name: '(주)애플코리아', basePrice: 5000000, desc: 'App Store 구독 매출 정산' },
        { name: '구글코리아(유)', basePrice: 3000000, desc: 'Play Store 구독 매출 정산' },
        { name: '주식회사 카카오', basePrice: 1500000, desc: '카카오페이 결제 정산금' }
    ],
    cogs: [
        { name: 'Amazon Web Services (AWS)', basePrice: 1500000, desc: '서버 인프라 구축 및 클라우드 원가' },
        { name: 'Google Cloud (Gemini API)', basePrice: 600000, desc: 'AI 모델 인퍼런스 및 API 사용 원가' }
    ],
    sga: [
        { name: '패스트파이브(주)', basePrice: 3500000, desc: '강남점 스마트오피스 임차료' },
        { name: '임직원 급여 (홍길동 외)', basePrice: 18500000, desc: '정기 급여 지급' },
        { name: '(주)우아한형제들', basePrice: 120000, desc: '야근 식대 정산 (배달의민족)' },
        { name: '구글코리아 (광고)', basePrice: 2450000, desc: 'Google Ads 마케팅 집행' },
        { name: 'Meta Platforms (Facebook)', basePrice: 1580000, desc: 'SNS 타겟 마케팅 광고비' }
    ]
};

// 1. Initial Investment (May 2026)
vendors.equity.forEach(eq => {
    rows.push(['2026-05-02', eq.name, '', eq.amount.toString(), eq.desc, '초기투자']);
});

// 2. Monthly Operations (2026-05 to 2028-12)
for (let year = 2026; year <= 2028; year++) {
    const startMonth = year === 2026 ? 5 : 1;
    for (let month = startMonth; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');

        // Growth Multiplier (SSOT matched with internal engine)
        let growth = 1.0;
        if (year === 2026) growth = 1.0 + (month / 12);
        else if (year === 2027) growth = 2.5 + (month / 12);
        else growth = 5.0 + (month / 12);

        // A. Revenue (Deposits)
        vendors.revenue.forEach(rev => {
            const amt = Math.floor(rev.basePrice * growth);
            rows.push([`${year}-${monthStr}-25`, rev.name, '', amt.toString(), rev.desc, '매출']);
        });

        // B. COGS (Withdrawals - Infrastructure)
        vendors.cogs.forEach(cog => {
            const amt = Math.floor(cog.basePrice * growth);
            rows.push([`${year}-${monthStr}-05`, cog.name, amt.toString(), '', cog.desc, '매출원가']);
        });

        // C. SGA (Withdrawals - Operations)
        vendors.sga.forEach(exp => {
            const randomVar = 0.95 + (Math.random() * 0.1);
            const amt = Math.floor(exp.basePrice * (exp.name.includes('급여') ? 1 : growth) * randomVar);
            rows.push([`${year}-${monthStr}-15`, exp.name, amt.toString(), '', exp.desc, '판관비']);
        });
    }
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'AccountingFlow_Trial_Data');

const outputPath = path.resolve(process.cwd(), 'real_data_sample.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('✅ AccountingFlow 체험판용 3년치 엑셀 데이터 생성 완료 (real_data_sample.xlsx)');
