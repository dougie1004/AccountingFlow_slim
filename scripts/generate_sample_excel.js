
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = [
    ['거래일자', '가맹점명', '이용금액', '적요', '카드번호'],
    ['2026-01-25', '스타벅스 강남점', '5500', '커피 구매', '1234-****-****-5678'],
    ['2026-01-26', 'OpenAI', '28000', 'ChatGPT Subscription', '1234-****-****-5678'],
    ['2026-01-27', 'GS25 편의점', '3500', '사무용품(볼펜)', '1234-****-****-5678'],
    ['2026-01-28', '카카오 T 택시', '12500', '업무용 이동', '1234-****-****-5678'],
    ['2026-01-29', 'SK텔레콤', '88000', '1월 통신요금', '1234-****-****-5678'],
    ['2026-01-30', '김밥천국', '8500', '점심 식사', '1234-****-****-5678'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

const outputPath = path.resolve(process.cwd(), 'real_data_sample.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
