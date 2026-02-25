
import XLSX from 'xlsx';
import crypto from 'crypto';
import path from 'path';

/**
 * rebuild_demo_xlsx.js
 * Version: 2.3 (Constitution v2 Compliance)
 * 
 * FIXES:
 * 1. Added mandatory accrual columns: 거래발생일 (transactionDate), 인식일 (recognitionDate).
 * 2. Hardened Double-Entry integrity for DemoCo.
 * 3. Enforced VAT separation at the data level.
 */

function saveToExcel(rows, filename, sheetName = "Sheet1") {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.t === 'n') cell.z = '#,##0';
        }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    console.log(`✅ Saved: ${filename}`);
}

// --- 1. REAL DATA (Bank Statement) ---
function createRealData() {
    const rows = [['거래일자', '가맹점명', '출금금액', '입금금액', '적요', '카드번호']];
    rows.push(['2026-05-01', '창업자', 0, 50000000, '법인 설립 자본금 납입', '']);
    const vendors = [
        { name: '(주)애플코리아', in: 5000000, out: 0, desc: 'App Store 매출 정산' },
        { name: 'Amazon Web Services', in: 0, out: 1200000, desc: '클라우드 인프라 비용', card: '9400-****-1122' },
        { name: '위워크코리아(유)', in: 0, out: 4500000, desc: '강남점 사무실 임차료', card: '4518-****-8899' }
    ];
    for (let year = 2026; year <= 2027; year++) {
        for (let month = 1; month <= 12; month++) {
            if (year === 2026 && month < 5) continue;
            const mStr = String(month).padStart(2, '0');
            vendors.forEach(v => {
                rows.push([`${year}-${mStr}-15`, v.name, v.out, v.in, v.desc, v.card || '']);
            });
        }
    }
    return rows;
}

// --- 2. DEMO CO (General Ledger with Constitution v2) ---
function createDemoCoData() {
    const rows = [['거래일자', '거래발생일', '인식일', '전표번호', '거래처', '적요', '계정과목', '차변금액', '대변금액', '비고']];
    const getJid = (date, nature, seq) => `JE-${date.replace(/-/g, '').substring(0, 6)}-${nature}-${String(seq).padStart(4, '0')}`;
    let journalSeq = 1;

    const pushLeg = (date, transDate, recDate, jid, vendor, desc, account, dr, cr, remark) => {
        rows.push([date, transDate, recDate, jid, vendor, desc, account, dr, cr, remark]);
    };

    // Seed Investment
    const invDate = '2026-05-01';
    const invId = getJid(invDate, 'INV', journalSeq++);
    pushLeg(invDate, invDate, invDate, invId, 'Altos Ventures', 'Seed 투자 유입 (총액)', '보통예금', 350000000, 0, 'INVESTMENT');
    pushLeg(invDate, invDate, invDate, invId, 'Founder', 'Seed 투자 유입 (자본금)', '자본금', 0, 50000000, 'INVESTMENT');
    pushLeg(invDate, invDate, invDate, invId, 'Altos Ventures', 'Seed 투자 유입 (주식발행초과금)', '자본잉여금', 0, 300000000, 'INVESTMENT');

    for (let m = 5; m <= 12; m++) {
        const date = `2026-${String(m).padStart(2, '0')}-28`;
        const revAmount = 50000000 + (m * 8000000);
        const vat = Math.floor(revAmount * 0.1);

        // 1. Revenue (Accrual: Service provided in month M)
        const revId = getJid(date, 'SALES', m);
        pushLeg(date, date, date, revId, 'Stripe Payments', 'SaaS 구독 매출 (현금분)', '보통예금', Math.floor((revAmount + vat) * 0.6), 0, 'REVENUE');
        pushLeg(date, date, date, revId, 'Enterprise Clients', 'SaaS 구독 매출 (외상분)', '외상매출금', Math.floor((revAmount + vat) * 0.4), 0, 'AR_INCR');
        pushLeg(date, date, date, revId, 'Stripe/Clients', 'SaaS 서비스 제공 매출액', 'SaaS구독매출', 0, revAmount, 'REVENUE');
        pushLeg(date, date, date, revId, '강남세무서', '매출 부가가치세', '부가세예수금', 0, vat, 'TAX');

        // 2. AR Collection
        if (m > 5) {
            const collDate = `2026-${String(m).padStart(2, '0')}-05`;
            const prevRev = 50000000 + ((m - 1) * 8000000);
            const collAmount = Math.floor((prevRev + Math.floor(prevRev * 0.1)) * 0.4);
            const collId = getJid(collDate, 'SETTLE', m);
            pushLeg(collDate, collDate, collDate, collId, 'Enterprise Clients', `[정산] ${m - 1}월 매출 채권 회수`, '보통예금', collAmount, 0, 'SETTLEMENT');
            pushLeg(collDate, collDate, collDate, collId, 'Enterprise Clients', `[정산] ${m - 1}월 매출 채권 회수`, '외상매출금', 0, collAmount, 'SETTLEMENT');
        }

        // 3. COGS
        const infraAmt = Math.floor(revAmount * 0.12);
        const apiAmt = Math.floor(revAmount * 0.03);
        const cogsId = getJid(date, 'COGS', m);
        pushLeg(date, date, date, cogsId, 'AWS Cloud', `${m}월 인프라 사용료`, '인프라 원가', infraAmt, 0, 'COGS');
        pushLeg(date, date, date, cogsId, 'OpenAI', `${m}월 API 인퍼런스 비용`, 'Gemini API 원가', apiAmt, 0, 'COGS');
        pushLeg(date, date, date, cogsId, '보통예금', `${m}월 매출원가 출금`, '보통예금', 0, infraAmt + apiAmt, 'COGS');

        // 4. SG&A
        const sgaId = getJid(date, 'SGA', m);
        pushLeg(date, date, date, sgaId, '임직원일동', `${m}월 급여`, '급여', 25000000, 0, 'EXPENSE');
        pushLeg(date, date, date, sgaId, '보통예금', `${m}월 판관비 출금`, '보통예금', 0, 25000000, 'EXPENSE');
    }
    return rows;
}

try {
    const realData = createRealData();
    const demoData = createDemoCoData();
    saveToExcel(realData, 'real_data_sample.xlsx');
    saveToExcel(demoData, 'DemoCo_Sample_2026.xlsx');
} catch (e) {
    console.error('❌ ERROR:', e.message);
}
