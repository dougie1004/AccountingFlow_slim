
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rows = [['거래일자', '가맹점명', '출금금액', '입금금액', '적요', '카드번호']];

const vendors = {
    revenue: [{ name: 'SaaS 정기구독 정산 (M-Care)', basePrice: 3000000, desc: 'SaaS 구독 서비스 매출 정산' }],
    cogs: [{ name: 'Microsoft Azure', basePrice: 800000, desc: 'Infrastructure Cost (COGS)', card: '1234-****-****-5678' }],
    sga: [
        { name: '임차료 (위워크 강남)', basePrice: 4500000, desc: '사무실 임차료', card: '' },
        { name: '급여지급', basePrice: 25000000, desc: '임직원 급여', card: '' }
    ]
};

// 개발용 3년치 (2026-2028)
for (let year = 2026; year <= 2028; year++) {
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        let growth = 1.0;
        if (year === 2026) growth = 1.0 + (month / 12);
        else if (year === 2027) growth = 3.0 + (month / 2);
        else growth = 10.0 + month;

        rows.push([`${year}-${monthStr}-25`, vendors.revenue[0].name, '', Math.floor(vendors.revenue[0].basePrice * growth).toString(), vendors.revenue[0].desc, '']);
        rows.push([`${year}-${monthStr}-05`, vendors.cogs[0].name, Math.floor(vendors.cogs[0].basePrice * growth).toString(), '', vendors.cogs[0].desc, vendors.cogs[0].card]);
        rows.push([`${year}-${monthStr}-15`, vendors.sga[1].name, vendors.sga[1].basePrice.toString(), '', vendors.sga[1].desc, '']);
    }
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'M-Care_3Year_Dev');

const outputPath = path.resolve(process.cwd(), 'real_data_sample.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('✅ 개발용 3년치 M-Care 데이터 복구 완료.');
