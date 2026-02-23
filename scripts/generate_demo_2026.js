
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = [];
let journal_id = 1;

function add_entry(date, account_code, account_name, debit, credit, description) {
    data.push({
        "journal_id": journal_id,
        "journal_date": date,
        "account_code": account_code,
        "account_name": account_name,
        "debit": debit,
        "credit": credit,
        "description": description
    });
}

function next_journal() {
    journal_id += 1;
}

const accounts = {
    "cash": ["1110", "보통예금"], "ar": ["1120", "외상매출금"],
    "capital": ["3110", "자본금"], "apic": ["3120", "자본잉여금"],
    "revenue": ["4110", "SaaS구독매출"], "salary": ["5110", "급여"],
    "rent": ["5120", "임차료"], "server": ["5130", "서버비"],
    "marketing": ["5140", "마케팅비"], "fee": ["5150", "지급수수료"]
};

// 배포용 1년치 (2026) DemoCo 로직
const YEAR = "2026";
add_entry(`${YEAR}-01-01`, accounts.cash[0], accounts.cash[1], 350000000, 0, "Seed 투자 유입");
add_entry(`${YEAR}-01-01`, accounts.capital[0], accounts.capital[1], 0, 50000000, "자본금 설정");
add_entry(`${YEAR}-01-01`, accounts.apic[0], accounts.apic[1], 0, 300000000, "자본잉여금 설정");
next_journal();

const monthly_revenue = { 1: 5000000, 2: 5000000, 3: 5000000, 4: 15000000, 5: 15000000, 6: 15000000, 7: 40000000, 8: 40000000, 9: 40000000, 10: 60000000, 11: 60000000, 12: 60000000 };

for (let m = 1; m <= 12; m++) {
    const date = `${YEAR}-${String(m).padStart(2, '0')}-28`;
    const rev = monthly_revenue[m];
    add_entry(date, accounts.cash[0], accounts.cash[1], rev * 0.6, 0, "구독매출 현금");
    add_entry(date, accounts.ar[0], accounts.ar[1], rev * 0.4, 0, "구독매출 외상");
    add_entry(date, accounts.revenue[0], accounts.revenue[1], 0, rev, "매출 인식");
    next_journal();
    add_entry(date, accounts.salary[0], accounts.salary[1], 25000000, 0, "월 급여");
    add_entry(date, accounts.rent[0], accounts.rent[1], 3000000, 0, "임차료");
    add_entry(date, accounts.server[0], accounts.server[1], 1500000, 0, "서버비");
    add_entry(date, accounts.fee[0], accounts.fee[1], 2000000, 0, "지급수수료");
    add_entry(date, accounts.cash[0], accounts.cash[1], 0, 31500000, "고정비 지급");
    next_journal();
    if (m === 8) { add_entry(date, accounts.marketing[0], accounts.marketing[1], 30000000, 0, "마케팅 캠페인 집행"); add_entry(date, accounts.cash[0], accounts.cash[1], 0, 30000000, "마케팅비 지급"); next_journal(); }
    if (m === 12) { add_entry(date, accounts.salary[0], accounts.salary[1], 25000000, 0, "연말 보너스"); add_entry(date, accounts.cash[0], accounts.cash[1], 0, 25000000, "보너스 지급"); next_journal(); }
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'DemoCo_2026');

// 배포용 파일은 VC_Distribution 으로!
const distPath = path.resolve(process.cwd(), 'VC_Distribution', 'real_data_sample.xlsx');
XLSX.writeFile(wb, distPath);
console.log('✅ 배포용 1년치 DemoCo 데이터 생성 완료 (VC_Distribution).');
