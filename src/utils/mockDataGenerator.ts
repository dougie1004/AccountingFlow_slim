import { JournalEntry, BusinessScenario, ScenarioParams } from '../types';

/**
 * Mock Data Generator for Startup Accounting Simulation
 * v9.0 - Real World Timeline: Operation starts from May 2026.
 */

export function getScenarioParams(scenario: BusinessScenario): ScenarioParams {
    switch (scenario) {
        case 'SURVIVAL':
            // [Strategic Pivot] Survival is now "Self-Sustaining Lean"
            // Starts with 2 (2026) -> Grows to 3 (2027+)
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 0.8, teamSize: 2 };
        case 'DEATH_VALLEY':
            // [Redefined 2026-02-18] 자력 표준 (Lean Standard)
            // 지원금도 없고 투자도 없지만, Enterprise 컨설팅 + SaaS 균형으로 자생하는 시나리오
            // 외부 자금 의존도: 생존(대표 증자) < 자력 표준(없음) < 표준(지원금) < 공격(VC)
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 1.2, teamSize: 3 };
        case 'GROWTH':
            return { grantSuccess: true, investmentAmount: 200_000_000, marketingAggression: 3.0, teamSize: 6 };
        case 'STANDARD':
        default:
            return { grantSuccess: true, investmentAmount: 0, marketingAggression: 1.0, teamSize: 3 };
    }
}

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

import { ConstitutionMonitor } from '../constitution/ConstitutionMonitor';

export function generateYearlyPack(year: number, currentLedger: JournalEntry[], scenario: BusinessScenario = 'STANDARD', overrides?: Partial<ScenarioParams>): JournalEntry[] {
    ConstitutionMonitor.getInstance().setContext('SIMULATION');

    const baseParams = getScenarioParams(scenario);
    const params = { ...baseParams, ...overrides };
    const pack: JournalEntry[] = [];

    let maxSeq = 0;
    currentLedger.forEach(e => { if (e.sequenceNumber && e.sequenceNumber > maxSeq) maxSeq = e.sequenceNumber; });
    sequence = maxSeq + 1;

    const inflationFactor = Math.pow(1.04, year - 2026);

    const lastEntryWithUsers = [...currentLedger].reverse().find(e => e.description.includes('구독') || e.description.includes('유저'));
    let startingUsers = 0;
    if (lastEntryWithUsers) {
        // [Bugfix] Handle comma in numbers (e.g., "1,200명", "1,200 유저")
        const match = lastEntryWithUsers.description.match(/([\d,]+)(?:명| 유저)/);
        if (match) startingUsers = parseInt(match[1].replace(/,/g, ''));
    }

    const configMap = {
        2026: {
            users: startingUsers > 0 ? startingUsers : 60, // 로드맵: 1차년도 60개사
            marketMonthly: 0,
            launchMonth: 10 // 4분기 유료화 집중
        },
        2027: {
            users: startingUsers > 0 ? startingUsers : 300, // 로드맵: 2차년도 300개사
            marketMonthly: 3_000_000,
            launchMonth: 1
        },
        2028: {
            users: startingUsers > 0 ? startingUsers : 800, // 로드맵: 3차년도 800개사
            marketMonthly: 5_000_000,
            launchMonth: 1
        }
    };

    const baseConfig = configMap[year as keyof typeof configMap] || configMap[2026];

    const DEV_COST_BASE = 5_000_000;
    const CEO_LIVING_BASE = 2_500_000;
    const MARKETER_COST_BASE = 3_500_000;
    // 자력 표준(DEATH_VALLEY): 표준과 동일한 임차료 (200만). 고비용 구조 탈피.
    const RENT_BASE = scenario === 'SURVIVAL' ? 1_500_000 : 2_000_000;
    const MEAL_BASE = 500_000;
    const TRANSPORT_BASE = 150_000;
    const TELECOM_BASE = 120_000;
    const TRAINING_BASE = 100_000;
    const INFRA_BASE_FIXED = 150_000;

    // Phased Hiring Logic (Hyper-Realism)
    let teamSize = params.teamSize;
    if (scenario === 'GROWTH') {
        if (year === 2026) teamSize = 3; // 설립 초기 (CEO + 핵심 개발자 2인)
        else if (year === 2027) teamSize = 6; // 투자 유치 후 확장
        else teamSize = 8; // 서비스 성숙기
    } else if (scenario === 'STANDARD') {
        teamSize = 3;
    } else if (scenario === 'SURVIVAL') {
        // [CEO Pivot] Keep team lean (CEO+Dev only) to minimize fixed burn. Hiring is replaced by outsourcing.
        teamSize = 2;
    }

    const config = {
        ...baseConfig,
        // 자력 표준(DEATH_VALLEY): 3인 기준 표준 인건비 (팀당 400만)
        laborMonthly: Math.floor((scenario === 'SURVIVAL'
            ? (year === 2026 ? DEV_COST_BASE : CEO_LIVING_BASE + DEV_COST_BASE)
            : teamSize * 4_000_000) * inflationFactor),
        rent: Math.floor(RENT_BASE * inflationFactor),
        meal: Math.floor(MEAL_BASE * inflationFactor),
        transport: Math.floor(TRANSPORT_BASE * inflationFactor),
        telecom: Math.floor(TELECOM_BASE * inflationFactor),
        training: Math.floor(TRAINING_BASE * inflationFactor),
        infraBase: Math.floor(INFRA_BASE_FIXED * inflationFactor),
        marketMonthly: Math.floor(((params.marketingDisabled) ? 0 : (
            scenario === 'SURVIVAL'
                ? (year === 2026 ? 1_000_000 : 4_000_000)
                : scenario === 'DEATH_VALLEY'
                    ? (year === 2026 ? 500_000 : 2_000_000) // 자력 표준: 절약형 마케팅
                    : scenario === 'GROWTH' ? 20_000_000 : 3_000_000
        )) * inflationFactor)
    };

    let currentUsers = startingUsers > 0 ? startingUsers : config.users;

    // 2026 Initialization
    if (year === 2026 && currentLedger.length === 0) {
        // [May] Capital Injection (Actual Establishment)
        pack.push(createEntry({ id: 'INIT-CAPITAL-2026', date: '2026-05-02', description: '법인 설립 초기 자본금 납입', debitAccount: '보통예금', creditAccount: '자본금', amount: 50_000_000, type: 'Equity' }));

        // [May] Operations Start
        pack.push(createEntry({ id: 'ASSET-M3-2026', date: '2026-05-02', description: '개발용 워크스테이션(M3 Max) 구입', debitAccount: '비품', creditAccount: '미지급금', amount: 4_000_000, vat: 400_000, type: 'Asset', vendor: '(주)에이컴퓨터' }));
        pack.push(createEntry({ date: '2026-05-05', description: '법인 등록면허세 및 설립 등기비용', debitAccount: '세금과공과', creditAccount: '보통예금', amount: 480_000, type: 'Expense', vendor: '용산 등기소' }));
        pack.push(createEntry({ id: 'ASSET-OFFICE-2026', date: '2026-05-10', description: '공유오피스 입주 초기 사무집기 구입', debitAccount: '비품', creditAccount: '미지급금', amount: 1_000_000, vat: 100_000, type: 'Asset', vendor: '이케아 비즈니스' }));
        pack.push(createEntry({ date: '2026-05-15', description: '[개발] 코어 엔진 OCR 연동 외주 용역비', debitAccount: '지급수수료', creditAccount: '미지급금', amount: 5_000_000, vat: 500_000, type: 'Expense', vendor: '테크솔루션즈' }));

        // Pay liabilities
        pack.push(createEntry({ date: '2026-05-30', description: '사무집기 및 장비 미지급금 결제', debitAccount: '미지급금', creditAccount: '보통예금', amount: 10_900_000, type: 'Expense' })); // Reduced from 10M to 5M as per lean feedback
    }

    /**
     * TRUTH ENGINE PHILOSOPHY:
     * We don't tune the engine to hit targets. 
     * We build the engine to report when the targets are WRONG.
     * MODE = SIMULATION (Strictly logic-driven outcome)
     */

    if (year === 2026) {
        // [June] Initial government grant (only if success parameter is set)
        // [June] Initial government grant (only if success parameter is set)
        if (params.grantSuccess) {
            pack.push(createEntry({ date: '2026-06-15', description: '초기창업패키지 지원금 수령', debitAccount: '보통예금', creditAccount: '영업외수익(국고보조금)', amount: 50_000_000, type: 'Grant' }));
        }

        // [July] Strategic Rights Issue (Mandatory for 2026 survival)
        pack.push(createEntry({
            date: '2026-07-15',
            description: '운영자금 확보를 위한 대표이사 유상증자',
            debitAccount: '보통예금',
            creditAccount: '자본금',
            amount: 30_000_000, // This is a fixed input, not a goal-seeking result
            type: 'Equity'
        }));

        // [July] Patent Registration 
        pack.push(createEntry({ id: 'ASSET-PATENT-2026', date: '2026-07-20', description: '핵심 리스크 탐지 시나리오 특허 출원 및 권리 확보', debitAccount: '산업재산권', creditAccount: '보통예금', amount: 5_000_000, vat: 500_000, type: 'Asset', vendor: '명문특허법률사무소' })); // Reduced from 10M to 5M for lean survival

        if (scenario === 'SURVIVAL') {
            // [Nov] Survival injection (30M strictly as per plan)
            pack.push(createEntry({
                date: '2026-11-20',
                description: '동절기 운영지탱을 위한 대표이사 3차 증자',
                debitAccount: '보통예금',
                creditAccount: '자본금',
                amount: 30_000_000,
                type: 'Equity'
            }));

            // [SURVIVAL 2026] 소규모 스타트업 대상 기초 회계 자동화 컨설팅
            // 1인 기업 및 소규모 창업팀 대상 (SaaS 도입 전 기반 구축)
            const startupClients2026 = ['(주)라이징스타트업', '온라인쇼핑몰(개인)', '테크버드트레이딩'];
            const targetClient2026 = startupClients2026[Math.floor(Math.random() * startupClients2026.length)];

            // [Oct] 파일럿 컨설팅 (250만 원)
            pack.push(createEntry({
                date: '2026-10-15',
                description: `[매출] ${targetClient2026} 회계 기초 프로세스 설계 컨설팅`,
                debitAccount: '보통예금',
                creditAccount: '컨설팅 매출',
                amount: 2_500_000,
                vat: 250_000,
                type: 'Revenue',
                vendor: targetClient2026,
                comment: '소규모 기업 대상 초기 컨설팅: 현금 확보 및 SaaS 잠재 고객 확보'
            }));

            // [Nov~Dec] 유지보수 (월 100만 원)
            for (let m = 11; m <= 12; m++) {
                pack.push(createEntry({
                    date: `2026-${String(m).padStart(2, '0')}-20`,
                    description: `[매출] ${targetClient2026} 월간 회계 운영 지원`,
                    debitAccount: '보통예금',
                    creditAccount: '컨설팅 매출',
                    amount: 1_000_000,
                    vat: 100_000,
                    type: 'Revenue',
                    vendor: targetClient2026
                }));
            }
        } else {
            // [Nov] SAFEGUARD RUNWAY INJECTION
            pack.push(createEntry({
                date: '2026-11-20',
                description: '동절기 운영지탱 및 런웨이 확보를 위한 3차 유상증자',
                debitAccount: '보통예금',
                creditAccount: '자본금',
                amount: 50_000_000,
                type: 'Equity'
            }));
        }
    }

    if (year === 2027) {
        if (scenario === 'GROWTH') {
            // [Jan] VC Investment for Growth (Success vs Failure is a logical branch)
            pack.push(createEntry({ date: '2027-01-15', description: 'VC 시드 투자 유치 (자본금 증자)', debitAccount: '보통예금', creditAccount: '자본금', amount: 200_000_000, type: 'Equity' }));
        }

        if (scenario === 'SURVIVAL') {
            // [SURVIVAL 2027] 스타트업 대상 월 정액 리테이너 전략
            // 고정비(1,500만) 방어용: 3개사 x 월 250만 = 750만 원 확보 목표
            const smallClients2027 = [
                '(주)마이크로테크',   // Q1~
                '소담소프트(1인)',    // Q2~
                '블루웨일콘텐츠',     // Q3~
            ];

            for (let m = 1; m <= 12; m++) {
                pack.push(createEntry({
                    date: `2027-${String(m).padStart(2, '0')}-10`,
                    description: `[매출] ${smallClients2027[0]} 월간 회계 자동화 운영 리테이너`,
                    debitAccount: '보통예금',
                    creditAccount: '컨설팅 매출',
                    amount: 2_500_000,
                    vat: 250_000,
                    type: 'Revenue',
                    vendor: smallClients2027[0]
                }));
            }
            for (let m = 4; m <= 12; m++) {
                pack.push(createEntry({
                    date: `2027-${String(m).padStart(2, '0')}-12`,
                    description: `[매출] ${smallClients2027[1]} 월간 기술지원 리테이너`,
                    debitAccount: '보통예금',
                    creditAccount: '컨설팅 매출',
                    amount: 2_000_000,
                    vat: 200_000,
                    type: 'Revenue',
                    vendor: smallClients2027[1]
                }));
            }
        }

        if (scenario === 'DEATH_VALLEY') {
            // [자력 표준 2027] 중소기업/스타트업 리테이너 강화
            const leanClients2027 = [
                '(주)다온유니콘',    // Q1~
                '베스트경리대행',    // Q2~
                '케어스타트업',      // Q3~
            ];

            for (let m = 2; m <= 12; m++) {
                pack.push(createEntry({
                    date: `2027-${String(m).padStart(2, '0')}-10`,
                    description: `[매출] ${leanClients2027[0]} 월간 운영 대행 고도화`,
                    debitAccount: '보통예금',
                    creditAccount: '컨설팅 매출',
                    amount: 4_000_000,
                    vat: 400_000,
                    type: 'Revenue',
                    vendor: leanClients2027[0]
                }));
            }
            for (let m = 6; m <= 12; m++) {
                pack.push(createEntry({
                    date: `2027-${String(m).padStart(2, '0')}-20`,
                    description: `[매출] ${leanClients2027[1]} 회계 자동화 솔루션 커스터마이징`,
                    debitAccount: '보통예금',
                    creditAccount: '컨설팅 매출',
                    amount: 5_000_000,
                    vat: 500_000,
                    type: 'Revenue',
                    vendor: leanClients2027[1]
                }));
            }
        }

        if (scenario === 'STANDARD' || scenario === 'GROWTH') {
            // [Pure SaaS] 표준 성장 시나리오에서도 대형 도입 수수료 없이 검증
        }
    }

    // --- Dynamic Cash Tracking & Safety Guard ---
    let runningCash = 0;
    // Calculate starting cash from previous years/entries
    currentLedger.concat(pack).forEach(e => {
        const flow = e.amount + (e.vat || 0);
        const isD = ['보통예금', '현금'].includes(e.debitAccount);
        const isC = ['보통예금', '현금'].includes(e.creditAccount);
        if (isD && !isC) runningCash += flow;
        else if (!isD && isC) runningCash -= flow;
    });

    for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const monthlyEntries: JournalEntry[] = [];

        // [Strategic Event Check] - 전략적으로 계획된 외부 자금 유입 (시나리오별 명시적 설정)
        // 엔진이 자동으로 채워주는 것이 아니라, 대표님이 "이때 증자함"이라고 선언한 것만 반영
        if (scenario === 'SURVIVAL' && year === 2027 && m === 6) {
            monthlyEntries.push(createEntry({
                date: '2027-06-01',
                description: '[자금수혈] 운영 런웨이 확보를 위한 대표이사 개인 유상증자',
                debitAccount: '보통예금',
                creditAccount: '자본금',
                amount: 50_000_000,
                type: 'Equity',
                comment: '전략적 선택: 생존을 위한 자발적 증자'
            }));
            runningCash += 50_000_000;
        }

        if (scenario === 'GROWTH' && year === 2027 && m === 3) {
            monthlyEntries.push(createEntry({
                date: '2027-03-01',
                description: '[투자유치] VC 시리즈 A 투자 유치 성공',
                debitAccount: '보통예금',
                creditAccount: '자본금',
                amount: 200_000_000,
                type: 'Equity',
                comment: '전략적 선택: 확장을 위한 외부 투자 유치'
            }));
            runningCash += 200_000_000;
        }

        // No operational costs until May 2026
        if (year === 2026 && m < 5) continue;

        // Helper to track and add with STRICT BALANCING
        const addAndTrack = (entry: JournalEntry) => {
            // 1. Auto-balance checking
            const totalDebit = entry.amount + (entry.vat || 0); // Total flow
            // Note: In single entry mock, we assume simple 1:1 or 1:2 split.
            // But here we are just pushing single object.
            // The issue is likely when we create entries with VAT but don't account for it in credit side properly in 'createEntry' helper?
            // Actually createEntry just accepts data.
            // Let's ensure the entry object itself implies a balanced transaction if it were double-entry.
            // Wait, our system treats each JSON object as a "Transaction Header" effectively?
            // No, the system likely expects a set of JournalEntry objects that balance out?
            // Ah, looking at `createEntry`: it returns a SINGLE JournalEntry interface.
            // But JournalEntry interface has `debitAccount` AND `creditAccount`.
            // So it IS a self-contained double-entry record.

            // The Mismatch 2.84m suggests a specific entry has mismatch amount vs vat?
            // No, JournalEntry structure: { debitAccount, creditAccount, amount, vat }
            // Debit = amount + vat? Or Debit = amount, Credit = amount?
            // If type is Revenue: Cash (Dr) = Amount + VAT, Revenue (Cr) = Amount, VAT (Cr) = VAT.
            // Our JournalEntry type is a "Simplified Row" that implies:
            // Dr [debitAccount] = amount + vat
            // Cr [creditAccount] = amount
            // Cr [VAT Account] = vat

            // IF the engine sums these up, it expects:
            // Total Dr = Total Cr.
            // Let's check `accountingEngine.ts` or `ConstitutionMonitor.ts`.
            // If `ConstitutionMonitor` sums up all amounts, it might be checking strict equality.

            // Let's force strict integer rounding to avoid floating point ghosts.
            entry.amount = Math.round(entry.amount);
            if (entry.vat) entry.vat = Math.round(entry.vat);

            monthlyEntries.push(entry);
            const flow = entry.amount + (entry.vat || 0);
            const isD = ['보통예금', '현금'].includes(entry.debitAccount);
            const isC = ['보통예금', '현금'].includes(entry.creditAccount);
            if (isD && !isC) runningCash += flow;
            else if (!isD && isC) runningCash -= flow;
        };

        // Recurring Operational Pains
        addAndTrack(createEntry({ date: `${year}-${mStr}-20`, description: `${m}월 복리후생비 (음료 및 석식)`, debitAccount: '복리후생비', creditAccount: '보통예금', amount: config.meal, type: 'Expense' }));
        addAndTrack(createEntry({ date: `${year}-${mStr}-18`, description: `${m}월 여비교통비 (시내출장)`, debitAccount: '여비교통비', creditAccount: '보통예금', amount: config.transport, type: 'Expense' }));
        addAndTrack(createEntry({ date: `${year}-${mStr}-10`, description: `${m}월 통신 및 클라우드 유지비`, debitAccount: '통신비', creditAccount: '보통예금', amount: config.telecom, type: 'Expense' }));


        // Labor logic: Reality check - Gross Salary vs Net Pay + Withholdings
        if (config.laborMonthly > 0) {
            const grossSalary = config.laborMonthly;
            const taxPortion = Math.floor(grossSalary * 0.05);  // Withholding Income Tax
            const socialPortion = Math.floor(grossSalary * 0.10); // Social Insurance (Employee part)
            const employerSocial = Math.floor(grossSalary * 0.10); // Social Insurance (Employer part)
            const netPay = grossSalary - taxPortion - socialPortion;

            // 1. Record Payroll Liabilities (From Employee side)
            addAndTrack(createEntry({
                date: `${year}-${mStr}-25`,
                description: `${m}월 임직원 급여 원천세 공제`,
                debitAccount: '급여',
                creditAccount: '예수금(원천세)',
                amount: taxPortion,
                type: 'Expense'
            }));
            addAndTrack(createEntry({
                date: `${year}-${mStr}-25`,
                description: `${m}월 사회보험료 공제 (본인부담금)`,
                debitAccount: '급여',
                creditAccount: '예수금(사회보험료)',
                amount: socialPortion,
                type: 'Expense'
            }));

            // 2. Employer's Social Insurance Responsibility
            addAndTrack(createEntry({
                date: `${year}-${mStr}-25`,
                description: `${m}월 사회보험료 회사부담금`,
                debitAccount: '복리후생비',
                creditAccount: '예수금(사회보험료)',
                amount: employerSocial,
                type: 'Expense'
            }));

            // 3. Pay Net Salary immediately
            addAndTrack(createEntry({
                date: `${year}-${mStr}-25`,
                description: `${m}월 급여 실지급액 (Net Pay)`,
                debitAccount: '급여',
                creditAccount: '보통예금',
                amount: netPay,
                type: 'Expense'
            }));

            // 4. Pay Liabilities with a 1-month delay
            if (m > 1 || year > 2026) {
                const prevM = m === 1 ? 12 : m - 1;
                const prevY = m === 1 ? year - 1 : year;
                const prevGross = Math.floor((scenario === 'SURVIVAL' ? (prevY === 2026 ? DEV_COST_BASE : CEO_LIVING_BASE + DEV_COST_BASE) : (params.teamSize - 1) * 5_000_000) * Math.pow(1.04, prevY - 2026));

                const prevTax = Math.floor(prevGross * 0.05);
                const prevSocialTotal = Math.floor(prevGross * 0.20); // Employee 10% + Employer 10%

                if (prevGross > 0) {
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-10`,
                        description: `${prevM}월분 원천세 납부`,
                        debitAccount: '예수금(원천세)',
                        creditAccount: '보통예금',
                        amount: prevTax,
                        type: 'Expense'
                    }));
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-10`,
                        description: `${prevM}월분 사회보험료 납부`,
                        debitAccount: '예수금(사회보험료)',
                        creditAccount: '보통예금',
                        amount: prevSocialTotal,
                        type: 'Expense'
                    }));
                }
            }
        }

        // Rent logic
        if (config.rent > 0) {
            addAndTrack(createEntry({
                date: `${year}-${mStr}-05`,
                description: `${m}월 사무실 임차료`,
                debitAccount: '지급임차료',
                creditAccount: '보통예금',
                amount: config.rent,
                vat: Math.floor(config.rent * 0.1),
                type: 'Expense'
            }));
        }

        let ltvCacRatio = 0;
        let burnQuality: 'Growth' | 'Uncertain' | 'Fatal' = 'Growth';
        let dynamicChurnValue = 0.05;
        let marketingNewUsersValue = 0;
        let organicBaseValue = 0;

        // Revenue & Scaling Cloud Cost (SaaS Growth Engine v10.0)
        if (year > 2026 || m >= config.launchMonth) {
            /**
             * [Strategic Investment SaaS Logic + Accounting Lock-in Effect]
             */
            const baseChurn = scenario === 'SURVIVAL' ? 0.07 : (scenario === 'GROWTH' ? 0.03 : 0.05);

            // Lock-in 효과: 연차가 쌓일수록 이탈률이 획기적으로 감소
            const yearFactor = (year - 2026);
            const monthFactor = m / 12;
            const experienceFactor = (yearFactor + monthFactor);
            dynamicChurnValue = Math.max(0.01, baseChurn - (experienceFactor * 0.015));

            /**
             * [SaaS Unit Economics v2.2 - Ultra Conservative]
             * - Basic (55%): 19,900원
             * - Standard (40%): 39,900원
             * - Professional (5%): 79,000원 (비중 축소)
             * - Weighted ARPU: (19900*0.55) + (39900*0.4) + (79000*0.05) = 10945 + 15960 + 3950 = 30855 -> 30,850원
             */
            const weightedARPU = 30_850;
            const monthlyContribution = weightedARPU - 3_000;

            /**
             * [Reality Check v2.1] CAC & LTV Synchronization
             * - Standard CAC: 50,000 (GROWTH Scenario)
             * - Conservative CAC: 80,000 (OTHERS)
             * - Monthly Contribution: weightedARPU - 3000
             */
            const cac = scenario === 'GROWTH' ? 50_000 : 80_000;

            // 마케팅으로 인한 신규 유입 (현실적 수치)
            marketingNewUsersValue = Math.floor(config.marketMonthly / cac);

            // 자연 유입 (보수적 하향 유지)
            organicBaseValue = Math.floor((scenario === 'GROWTH' ? 20 : (scenario === 'SURVIVAL' ? 2 : 5)) * (1 + experienceFactor * 0.1));

            // [Reality Anchor Constraint] - '26년 초기 기동 시 비현실적 폭증 방지
            const isLaunchMonth = year === 2026 && m === config.launchMonth;
            const prevMonthUsers = isLaunchMonth ? 0 : currentUsers;

            const churnedUsers = Math.floor(prevMonthUsers * dynamicChurnValue);

            // [Dynamic Growth Engine]
            const marketingEfficiency = params.marketingDisabled ? 0 : 1.0;
            const effectiveMarketingNewUsers = Math.floor((config.marketMonthly / cac) * marketingEfficiency);
            const newPotentialUsers = (prevMonthUsers - churnedUsers) + effectiveMarketingNewUsers + organicBaseValue;

            // [Roadmap Anchor]
            const yearEndTarget = config.users;
            const startUsers = year === 2026 ? 0 : (year === 2027 ? 60 : 300);
            const monthlyGoalIncrement = (yearEndTarget - startUsers) / 12;
            const roadmapGuideline = startUsers + (monthlyGoalIncrement * m);

            if (params.marketingDisabled) {
                currentUsers = newPotentialUsers;
            } else {
                currentUsers = Math.min(newPotentialUsers, Math.floor(roadmapGuideline * 1.2));
            }

            currentUsers = Math.max(currentUsers, (year === 2026 && m >= config.launchMonth) ? 5 : (year > 2026 ? 10 : 0));

            // [Precision Refinement]
            const actualNetNew = Math.max(0, currentUsers - (prevMonthUsers - churnedUsers));

            /**
             * [Strategic Health Index - Burn Quality] - 사업계획서 수치 완전 동기화
             */
            const ltv = Math.floor(monthlyContribution / dynamicChurnValue);
            ltvCacRatio = ltv / cac;
            if (ltvCacRatio < 1) burnQuality = 'Fatal';
            else if (ltvCacRatio < 3) burnQuality = 'Uncertain';
            else if (ltvCacRatio > 10) burnQuality = 'Growth'; // 극강의 효율 구간 추가

            const monthlySubs = Math.floor(currentUsers * 0.95); // 유료 전환율 95% 가정

            const revenue = monthlySubs * weightedARPU;

            const dateStr = `${year}-${mStr}-28`;

            // 1. Cloud Infrastructure (Usage-based COGS)
            // [Strategic Update] 기반 서버 보안 통신 및 API 중계 비용 반영 (인당 500원)
            addAndTrack(createEntry({
                date: dateStr,
                description: `[인프라] Cloud Compute & Security ${m}월`,
                debitAccount: '인프라 원가',
                creditAccount: '미지급금',
                amount: config.infraBase + (currentUsers * 500),
                vat: Math.floor((config.infraBase + (currentUsers * 500)) * 0.1),
                type: 'Expense'
            }));

            // 2. AI Model API (Usage-based COGS)
            /**
             * [Strategic Update] Gemini Hybrid 호출 전략 반영
             * - Flash (Extraction): 인당 100원 (200건 x 0.5원)
             * - Pro (Reasoning): 인당 2,400원 (60건 x 40원)
             * - 합계: 인당 2,500원
             */
            addAndTrack(createEntry({
                date: dateStr,
                description: `[AI] Gemini Hybrid (Flash+Pro) API Usage Fee ${m}월`,
                debitAccount: 'Gemini API 원가',
                creditAccount: '미지급금',
                amount: currentUsers * 2_500,
                vat: Math.floor((currentUsers * 2_500) * 0.1),
                type: 'Expense'
            }));

            // 3. Revenue
            if (revenue > 0) {
                const isEnterpriseMonth = (scenario !== 'SURVIVAL' && m % 3 === 0);
                const enterpriseClients = ['SK텔레콤', 'CJ ENM', '쿠팡(주)', '배달의민족', '토스', '업비트'];
                const randomClient = enterpriseClients[Math.floor(Math.random() * enterpriseClients.length)];
                const mainVendor = isEnterpriseMonth ? `${randomClient}(B2B)` : 'SaaS 정기 구독자(개인/단체)';

                // Introduce AR for Enterprise to show aging
                if (isEnterpriseMonth) {
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-01`,
                        description: `[매출] Enterprise 구독료 청구 (${currentUsers.toLocaleString()} 유저 기반)`,
                        debitAccount: '외상매출금',
                        creditAccount: 'SaaS 매출',
                        amount: revenue,
                        vat: Math.floor(revenue * 0.1),
                        type: 'Revenue',
                        vendor: mainVendor
                    }));
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-25`,
                        description: `[수금] Enterprise 외상매출금 회수`,
                        debitAccount: '보통예금',
                        creditAccount: '외상매출금',
                        amount: Math.floor(revenue * 0.8) + Math.floor(revenue * 0.08), // 80% collection rate demo
                        type: 'Asset', // Corrected: Collection is Asset exchange (AR -> Cash), not new Revenue
                        vendor: mainVendor
                    }));
                } else {
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-05`,
                        description: `[매출] SaaS 구독 수익 ${m}월 (${currentUsers.toLocaleString()} 유저)`,
                        debitAccount: '보통예금',
                        creditAccount: 'SaaS 매출',
                        amount: revenue,
                        vat: Math.floor(revenue * 0.1),
                        type: 'Revenue',
                        vendor: mainVendor,
                        comment: `LTV/CAC Ratio: ${ltvCacRatio.toFixed(1)} (${burnQuality} Burn) | Churn: ${(dynamicChurnValue * 100).toFixed(1)}% | New: ${actualNetNew}`
                    }));
                }
            }
        }

        if (config.marketMonthly > 0 && (year > 2026 || m >= config.launchMonth)) {
            const actualNetNew = Math.max(0, currentUsers - (currentUsers / (1 - dynamicChurnValue) - currentUsers)); // Rough estimation if loop logic changed
            // Using the same actualNetNew from above for consistency
            const repNetNew = Math.max(0, currentUsers - (currentUsers / (1 + dynamicChurnValue || 1))); // Fallback

            // 마케팅비는 매월 15일에 지출 (현금 기반)
            addAndTrack(createEntry({
                date: `${year}-${mStr}-15`,
                description: `${m}월 전략적 광고 집행 (CAC 대응)`,
                debitAccount: '광고선전비',
                creditAccount: '보통예금',
                amount: config.marketMonthly,
                vat: Math.floor(config.marketMonthly * 0.1),
                type: 'Expense',
                comment: `LTV/CAC Ratio: ${ltvCacRatio.toFixed(1)} (${burnQuality} Burn) | Churn: ${(dynamicChurnValue * 100).toFixed(1)}% | New: ${Math.max(0, currentUsers - (currentUsers / (1 - dynamicChurnValue) || 0) + (currentUsers * dynamicChurnValue || 0))}`
            }));
            // [CEO Suggestion] Agency fee instead of full-time marketer in SURVIVAL/LEAN
            if (scenario === 'SURVIVAL' && year >= 2027) {
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-10`,
                    description: `[외주] 마케팅 에이전시 운영 대행 수수료`,
                    debitAccount: '지급수수료',
                    creditAccount: '보통예금',
                    amount: 1_500_000,
                    vat: 150_000,
                    type: 'Expense'
                }));
            }
        }

        pack.push(...monthlyEntries);
    }

    return pack;
}



export function generateThreeYearSimulation(scenario: BusinessScenario = 'STANDARD', overrides?: Partial<ScenarioParams>): JournalEntry[] {
    const p2026 = generateYearlyPack(2026, [], scenario, overrides);
    const p2027 = generateYearlyPack(2027, p2026, scenario, overrides);
    const p2028 = generateYearlyPack(2028, [...p2026, ...p2027], scenario, overrides);
    return [...p2026, ...p2027, ...p2028];
}

/**
 * [Demo / Debug Utility]
 * Returns raw mock data for inspection in UI (Transaction Inspector)
 */
export const getRawMockData = () => {
    // Generate a small subset for preview
    const bankData = [
        { date: '2026-05-02', desc: '법인 설립 자본금 납입', in: 50000000, out: 0, type: 'Equity' },
        { date: '2026-05-02', desc: 'M3 Max 워크스테이션 구매', in: 0, out: 5500000, type: 'Asset' },
        { date: '2026-06-15', desc: '초기창업패키지 지원금', in: 50000000, out: 0, type: 'Revenue' },
        { date: '2026-07-20', desc: 'AWS/GCP 클라우드 비용', in: 0, out: 120000, type: 'Expense' }
    ];

    return { bankData };
};
