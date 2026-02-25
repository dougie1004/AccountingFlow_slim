import { JournalEntry, BusinessScenario, ScenarioParams } from '../types';
import { ConstitutionMonitor } from '../constitution/ConstitutionMonitor';

/**
 * Mock Data Generator for Startup Accounting Simulation
 * v11.8 - Corporate Establishment & Voucher Matching
 */

export function getScenarioParams(scenario: BusinessScenario): ScenarioParams {
    switch (scenario) {
        case 'SURVIVAL':
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 0.5, teamSize: 2 };
        case 'DEATH_VALLEY':
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 1.2, teamSize: 3 };
        case 'GROWTH':
            return { grantSuccess: true, investmentAmount: 200_000_000, marketingAggression: 4.5, teamSize: 6 };
        case 'LEAN_STANDARD':
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 1.5, teamSize: 3 };
        case 'STANDARD':
        default:
            return { grantSuccess: true, investmentAmount: 50_000_000, marketingAggression: 1.2, teamSize: 3 };
    }
}

let sequence = 1000;

function createEntry(data: Partial<JournalEntry>): JournalEntry {
    const d = data.date || '';
    const entry = {
        id: crypto.randomUUID(),
        date: d,
        transactionDate: d,
        recognitionDate: d,
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
        journalNumber: '',
        createdAt: new Date().toISOString(),
        ...data
    } as JournalEntry;

    // Post-spread fallback to ensure mandatory fields are never empty
    if (!entry.transactionDate) entry.transactionDate = d;
    if (!entry.recognitionDate) entry.recognitionDate = d;
    if (!entry.journalNumber && d) {
        entry.journalNumber = `JE-${d.replace(/-/g, '').substring(0, 6)}-${String(entry.sequenceNumber).padStart(4, '0')}`;
    }

    return entry;
}

export function generateYearlyPack(year: number, currentLedger: JournalEntry[], scenario: BusinessScenario = 'STANDARD', overrides?: Partial<ScenarioParams>): JournalEntry[] {
    ConstitutionMonitor.getInstance().setContext('SIMULATION');

    const baseParams = getScenarioParams(scenario);
    const params = { ...baseParams, ...overrides };
    const pack: JournalEntry[] = [];

    let maxSeq = 0;
    currentLedger.forEach(e => { if (e.sequenceNumber && e.sequenceNumber > maxSeq) maxSeq = e.sequenceNumber; });
    sequence = maxSeq + 1;

    const inflationFactor = Math.pow(1.04, year - 2026);

    let runningCash = 0;
    let remainingGrantVoucher = 0;
    let currentUsers = 0;

    currentLedger.forEach(e => {
        if (e.debitAccount === '보통예금') runningCash += (e.amount + (e.vat || 0));
        if (e.creditAccount === '보통예금') runningCash -= (e.amount + (e.vat || 0));
        if (e.creditAccount === '국고보조금수익') remainingGrantVoucher -= e.amount;
        if (e.creditAccount === 'SaaS 매출' || e.creditAccount === '매출') {
            const match = e.description.match(/(\d+[,]?\d*) 유저/);
            if (match) currentUsers = parseInt(match[1].replace(/,/g, ''));
        }
    });

    // [CONSTITUTION Art 13] Grant Expiration & Limit Setting
    const GRANT_EXPIRY_DATE = '2027-05-31';
    if (year === 2026 && params.grantSuccess && currentLedger.length === 0) {
        remainingGrantVoucher = 50_000_000;
        currentUsers = 20; // Start with 20 Beta Users to reach 60 by year-end 2026
    }

    const configMap = {
        2026: { marketMonthly: 4_500_000, launchMonth: 10, startMonth: 5 }, // Marketing starts at launch
        2027: { marketMonthly: 8_000_000, launchMonth: 1, startMonth: 1 },
        2028: { marketMonthly: 12_000_000, launchMonth: 1, startMonth: 1 }
    };
    const baseConfig = configMap[year as keyof typeof configMap] || configMap[2026];

    // [KOSA SW Technical Worker Avg Wages - 2024/25 Basis]
    const KOSA = {
        JUNIOR_DEV: 4_513_192, // 초급 응용SW개발자
        MIDDLE_DEV: 6_943_457, // 중급 응용SW개발자
        HIGH_DEV: 9_249_894,   // 고급 응용SW개발자
        PM: 9_145_473,
        MARKETER: 7_125_458,
        DESIGNER: 5_176_203
    };

    // [GPT Suggestion: Fully Loaded Factor]
    // Base + Company 4 insurance (approx 10%) + Retirement provision (approx 8.33%)
    const FULLY_LOADED_FACTOR = 1.183;

    interface Persona { role: string; baseSalary: number; isFounder: boolean; }

    const rentMonthlyFixed = Math.floor((scenario === 'GROWTH' ? 3_120_000 : 1_560_000) * inflationFactor);
    // otherOpsMonthlyFixed moved inside loop

    const getMarketMonthly = (m: number) => {
        if (params.marketingDisabled || (year === 2026 && m < baseConfig.launchMonth)) return 0;

        // Strategic Budgeting based on Scenario
        let baseAdSpend = 4_000_000;
        if (scenario === 'GROWTH') baseAdSpend = 15_000_000;
        if (scenario === 'SURVIVAL') baseAdSpend = 1_000_000;

        return Math.floor(baseAdSpend * (params.marketingAggression || 1.0) * inflationFactor);
    };


    for (let m = baseConfig.startMonth; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const monthsPassedTotal = (year - 2026) * 12 + (m - 5);

        // 0. [DYNAMIC TEAM] Realistic Hiring Thresholds
        const getDynamicTeam = (): Persona[] => {
            const ceo: Persona = { role: 'CEO', baseSalary: year === 2026 ? 0 : 5_000_000, isFounder: true };
            const junior: Persona = { role: 'JuniorDev', baseSalary: KOSA.JUNIOR_DEV, isFounder: false };

            // 1st Year (2026) is always Lean
            if (year === 2026) {
                // Survival mode only hires Junior at Month 9
                if (scenario === 'SURVIVAL' && m < 9) return [ceo];
                return [ceo, junior];
            }

            // 2nd Year+ (2027) - Hiring based on Strategy & Capital
            if (scenario === 'STANDARD') {
                // Founder's Principle: Hire only after substantial cash is secured (>120M) or late in the year
                if (m >= 7 || runningCash > 120_000_000) {
                    return [
                        ceo, junior,
                        { role: 'MidDev', baseSalary: KOSA.MIDDLE_DEV, isFounder: false },
                        { role: 'Marketer', baseSalary: KOSA.MARKETER, isFounder: false }
                    ];
                }
                return [ceo, junior];
            }

            if (scenario === 'GROWTH') {
                // Growth hiring also tied to capital runway (>150M)
                if (m >= 6 || runningCash > 150_000_000) {
                    return [
                        ceo, junior,
                        { role: 'MidDev', baseSalary: KOSA.MIDDLE_DEV, isFounder: false },
                        { role: 'SeniorDev', baseSalary: KOSA.HIGH_DEV, isFounder: false },
                        { role: 'PM', baseSalary: KOSA.PM, isFounder: false },
                        { role: 'Marketer', baseSalary: KOSA.MARKETER, isFounder: false }
                    ];
                }
                return [ceo, junior, { role: 'MidDev', baseSalary: KOSA.MIDDLE_DEV, isFounder: false }];
            }

            // Survival keeps it tight
            return [ceo, junior];
        };

        const currentTeam = getDynamicTeam();
        const laborMonthlyBase = currentTeam.reduce((sum, p) => sum + p.baseSalary, 0);
        const laborMonthlyLoaded = Math.floor(laborMonthlyBase * FULLY_LOADED_FACTOR * inflationFactor);
        const otherOpsMonthlyFixed = Math.floor((currentTeam.length * 666_666) * inflationFactor);

        const addAndTrack = (entry: JournalEntry) => {
            pack.push(entry);
            if (entry.debitAccount === '보통예금') runningCash += (entry.amount + (entry.vat || 0));
            if (entry.creditAccount === '보통예금') runningCash -= (entry.amount + (entry.vat || 0));
        };

        // 1. [Inflow] Corporate Formation & Grant Initialization (May 2026)
        if (year === 2026 && m === 5 && pack.length === 0) {
            const initialCapital = 50_000_000; // Aligned with Business Plan
            addAndTrack(createEntry({ date: '2026-05-02', description: '주식회사 어카운팅플로우 설립 자본금 납입', debitAccount: '보통예금', creditAccount: '자본금', amount: initialCapital, type: 'Equity' }));
            addAndTrack(createEntry({ date: '2026-05-03', description: '법인 설립 등록면허세 및 지방교육세 납부', debitAccount: '세금과공과', creditAccount: '보통예금', amount: 480_000, type: 'Expense', vendor: '용산구청' }));
            addAndTrack(createEntry({ date: '2026-05-04', description: '법무사 설립 대행 수수료 및 법인인감 제작', debitAccount: '지급수수료', creditAccount: '보통예금', amount: 500_000, vat: 50_000, type: 'Expense', vendor: '참좋은법무사사무소' }));

            // Asset Related Grant Logic: 5M Workstation + 3M Patent (Total 8M Voucher)
            if (params.grantSuccess && remainingGrantVoucher >= 8_000_000) {
                // A. Workstation (5,000,000)
                addAndTrack(createEntry({
                    date: '2026-05-10',
                    description: '개발용 워크스테이션 구입 (보조금 바우처)',
                    debitAccount: '비품',
                    creditAccount: '국고보조금(이연)',
                    amount: 5_000_000,
                    type: 'Asset',
                    vendor: '애플코리아'
                }));
                addAndTrack(createEntry({
                    date: '2026-05-10',
                    description: '워크스테이션 부가가치세 자부담',
                    debitAccount: '부가가치세대급금',
                    creditAccount: '보통예금',
                    amount: 500_000,
                    type: 'Expense',
                    vendor: '애플코리아'
                }));

                // B. Patent (3,000,000) - Intangible Asset
                addAndTrack(createEntry({
                    date: '2026-05-12',
                    description: 'BM특허 출원 및 우선심사 (보조금 바우처)',
                    debitAccount: '산업재산권',
                    creditAccount: '국고보조금(이연)',
                    amount: 3_000_000,
                    type: 'Asset',
                    vendor: '아이디어특허법률사무소'
                }));
                addAndTrack(createEntry({
                    date: '2026-05-12',
                    description: '특허출원 대행비 부가가치세 자부담',
                    debitAccount: '부가가치세대급금',
                    creditAccount: '보통예금',
                    amount: 300_000,
                    type: 'Expense',
                    vendor: '아이디어특허법률사무소'
                }));

                remainingGrantVoucher -= 8_000_000;
            } else {
                addAndTrack(createEntry({ date: '2026-05-10', description: '개발용 워크스테이션 구입', debitAccount: '비품', creditAccount: '보통예금', amount: 5_000_000, vat: 500_000, type: 'Asset', vendor: '애플코리아' }));
                addAndTrack(createEntry({ date: '2026-05-12', description: 'BM특허 출원', debitAccount: '산업재산권', creditAccount: '보통예금', amount: 3_000_000, vat: 300_000, type: 'Asset', vendor: '아이디어특허법률사무소' }));
            }
        }

        // 1.1 [Investment] GROWTH Scenario VC Funding (Jan 2027)
        if (year === 2027 && m === 1 && scenario === 'GROWTH' && (params.investmentAmount || 0) > 0) {
            addAndTrack(createEntry({
                date: '2027-01-15',
                description: 'Seed-A VC 투자 유치 (Growth Scenario)',
                debitAccount: '보통예금',
                creditAccount: '자본잉여금',
                amount: params.investmentAmount || 0,
                type: 'Equity',
                vendor: '그로스캐피탈'
            }));
        }

        // 2. [CONSTITUTIONAL CASH GUARD] - Reverted to v11.0 Standard
        const ensureLiquidity = (requiredAmt: number) => {
            if (runningCash < requiredAmt) {
                // [Strategic Decision] Shift from Liability (Gasoogeum) back to Equity (Paid-in Capital)
                // Strengthening the capital base for future VC/Angel rounds as per Founder's directive.
                let amount = Math.max(50_000_000, requiredAmt - runningCash);
                let desc = `[Art.10] 자본금 확보 (유상증자)`;
                let creditAccount = '자본금';
                let type = 'Equity';

                if (scenario === 'SURVIVAL' || scenario === 'STANDARD') {
                    amount = Math.floor(requiredAmt - runningCash + (scenario === 'SURVIVAL' ? 3_000_000 : 10_000_000)); // Minimal gap filler
                    desc = `[${scenario === 'SURVIVAL' ? '생존' : '표준'}] 운영자금 확보를 위한 추가 자본금 납입 (유상증자)`;
                    creditAccount = '자본금';
                    type = 'Equity';
                } else if (scenario === 'GROWTH' && year >= 2027) {
                    amount = 300_000_000; // Realistic Series A for ~2.5k user scale
                    desc = `[Growth] VC Series A 투자 유치 (경영권 유지 수준)`;
                    creditAccount = '자본잉여금';
                    type = 'Equity';
                }

                addAndTrack(createEntry({
                    date: `${year}-${mStr}-01`,
                    description: desc,
                    debitAccount: '보통예금',
                    creditAccount: creditAccount,
                    amount: amount,
                    type: type,
                    vendor: (scenario === 'SURVIVAL' || scenario === 'STANDARD') ? '대표이사' : undefined
                }));
            }
        };

        const currentMarketMonthly = getMarketMonthly(m);

        const monthlyFixedBurn = laborMonthlyLoaded + rentMonthlyFixed + currentMarketMonthly + otherOpsMonthlyFixed;
        const totalVatExpected = (rentMonthlyFixed + currentMarketMonthly + otherOpsMonthlyFixed) * 0.1;
        const safetyMargin = (params.grantSuccess && remainingGrantVoucher > 5_000_000)
            ? (monthlyFixedBurn + totalVatExpected + 1_000_000)
            : (monthlyFixedBurn + totalVatExpected * 2);

        ensureLiquidity(safetyMargin);

        // 3. [Expenses] - Prioritize Grant usage before Expiry
        const payExpense = (date: string, desc: string, account: string, amt: number, hasVat: boolean, vendor?: string) => {
            const vat = hasVat ? Math.floor(amt * 0.1) : 0;
            const isGrantApplicable = params.grantSuccess && date <= GRANT_EXPIRY_DATE;

            if (isGrantApplicable && remainingGrantVoucher >= amt) {
                addAndTrack(createEntry({ date, description: `${desc} (보조금 집행/수익 상계)`, debitAccount: account, creditAccount: '국고보조금수익', amount: amt, type: 'Expense', vendor: vendor || '국가보조금사업단' }));
                remainingGrantVoucher -= amt;
                if (vat > 0) addAndTrack(createEntry({ date, description: `${desc} (부가세 자부담)`, debitAccount: '부가가치세대급금', creditAccount: '미지급금', amount: vat, type: 'Expense', vendor: vendor || 'Unknown' }));
            } else {
                // [ACCRUAL] Record as Payable first
                addAndTrack(createEntry({ date, description: `${desc} (미지급 인식)`, debitAccount: account, creditAccount: '미지급금', amount: amt, vat: vat, type: 'Expense', vendor: vendor || 'Unknown' }));
            }
        };

        // [ACCRUAL] Record Payroll (Separated into Salary, Insurance, Retirement)
        const recordPayrollAccrual = (d: string) => {
            currentTeam.forEach(p => {
                if (p.baseSalary === 0) return; // CEO 무급 처리

                // [Strategic Adjustment] Survival Mode: Hires Junior Dev from SEP to save runway
                if (scenario === 'SURVIVAL' && p.role === 'JuniorDev' && year === 2026 && m < 9) return;

                const base = Math.floor(p.baseSalary * inflationFactor);
                const insurance = Math.floor(base * 0.1);
                const retirement = Math.floor(base * 0.083);

                addAndTrack(createEntry({
                    date: d,
                    description: `[급여인식] ${p.role} 월 급여 (KOSA 기준)`,
                    debitAccount: '급여',
                    creditAccount: '미지급금',
                    amount: base,
                    type: 'Payroll',
                    comment: p.isFounder ? 'CEO Unpaid (Strategic Foundation)' : 'KOSA Middle-Level Benchmark'
                }));

                addAndTrack(createEntry({
                    date: d,
                    description: `[보험인식] ${p.role} 4대보험 법인부담금`,
                    debitAccount: '복리후생비',
                    creditAccount: '미지급금',
                    amount: insurance,
                    type: 'Expense'
                }));

                addAndTrack(createEntry({
                    date: d,
                    description: `[퇴직인식] ${p.role} 퇴직급여 충당금`,
                    debitAccount: '퇴직급여',
                    creditAccount: '퇴직급여충당부채',
                    amount: retirement,
                    type: 'Expense'
                }));
            });
        };

        recordPayrollAccrual(`${year}-${mStr}-25`);

        payExpense(`${year}-${mStr}-05`, `${m}월 사무실 임차료`, '지급임차료', rentMonthlyFixed, true, '지식산업센터');

        const mkMonthly = getMarketMonthly(m);
        if (mkMonthly > 0) payExpense(`${year}-${mStr}-15`, `${m}월 마케팅 광고비`, '광고선전비', mkMonthly, true, '구글코리아');

        // [Operational Overhead] - Business Plan 5-3: Consolidated Other Ops
        payExpense(`${year}-${mStr}-28`, `${m}월 기타 운영비용 (식대/운영/통신)`, '식비', otherOpsMonthlyFixed, true, '오피스디포');

        // 3.1 [Automatic Depreciation & Grant Amortization Mapping]
        // [Logic] Fixed Assets linear depreciation AND Matching Grant Release
        const allEntries = [...currentLedger, ...pack];
        const assets = allEntries.filter(e => e.debitAccount === '비품' || e.debitAccount === '산업재산권');
        const deferredGrants = allEntries.filter(e => e.creditAccount === '국고보조금(이연)');

        assets.forEach(asset => {
            if (asset.date < `${year}-${mStr}-01`) {
                const monthlyDepr = Math.floor(asset.amount / 60); // 5년 정액법

                // 3.1.1 Depreciation Expense
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-30`,
                    description: `[자동] 감가상각비 인식 (${asset.description.split(' (')[0]})`,
                    debitAccount: '감가상각비',
                    creditAccount: '감가상각누계액',
                    amount: monthlyDepr,
                    type: 'Expense'
                }));

                // 3.1.2 Matching Grant Amortization (If the asset was grant-funded)
                // Look for related deferred grant entry by date/amount
                const matchedGrant = deferredGrants.find(dg => dg.amount === asset.amount && dg.date === asset.date);
                if (matchedGrant) {
                    addAndTrack(createEntry({
                        date: `${year}-${mStr}-30`,
                        description: `[자동] 보조금 수익 인식 (자산 감가상각 대응 - ${asset.description.split(' (')[0]})`,
                        debitAccount: '국고보조금(이연)',
                        creditAccount: '국고보조금수익',
                        amount: monthlyDepr,
                        type: 'Revenue'
                    }));
                }
            }
        });

        // 4. [Growth & Settlement]
        // Settlement (paying bills) should happen EVERY month from the start, regardless of launch status.
        // COLLECTING revenue happens only after launch.
        if (true) {
            const settlementDate = `${year}-${mStr}-10`;
            const prevM = m === 1 ? 12 : m - 1;
            const prevY = m === 1 ? year - 1 : year;
            const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;

            // Collect Receivables (Only if launch occurred)
            if (year > 2026 || m >= baseConfig.launchMonth) {
                const receivablesToCollect = currentLedger.concat(pack)
                    .filter(e => e.debitAccount === '외상매출금' && e.date.startsWith(prevMonthPrefix))
                    .reduce((sum, e) => sum + e.amount + (e.vat || 0), 0);

                if (receivablesToCollect > 0) {
                    addAndTrack(createEntry({
                        date: settlementDate,
                        description: `[정산] ${prevM}월 SaaS 매출 채권 회수 완료`,
                        debitAccount: '보통예금',
                        creditAccount: '외상매출금',
                        amount: receivablesToCollect,
                        type: 'Asset'
                    }));
                }
            }

            // Pay Payables (Always happens monthly)
            const payablesToSettle = currentLedger.concat(pack)
                .filter(e => e.creditAccount === '미지급금' && e.date.startsWith(prevMonthPrefix))
                .reduce((sum, e) => sum + e.amount + (e.vat || 0), 0);

            if (payablesToSettle > 0) {
                ensureLiquidity(payablesToSettle + 10_000_000);
                addAndTrack(createEntry({
                    date: settlementDate,
                    description: `[정산] ${prevM}월 미지급 비용 및 급여 지급 완료`,
                    debitAccount: '미지급금',
                    creditAccount: '보통예금',
                    amount: payablesToSettle,
                    type: 'Expense'
                }));
            }
        }

        if (year > 2026 || m >= baseConfig.launchMonth) {
            const monthsPassed = (year - 2026) * 12 + (m - 5);

            // [CONSTITUTION Art 17 & 18] CAC 50k - 100k
            // Growth has slightly better efficiency but higher spend depth
            const baseCAC = scenario === 'GROWTH' ? 70_000 : 80_000;
            const dynamicCAC = Math.max(50_000, baseCAC - (monthsPassed * 800));

            const dynamicChurn = Math.max(scenario === 'GROWTH' ? 0.02 : 0.03, 0.05 - (monthsPassed * 0.001));

            const currentMkMonthly = getMarketMonthly(m);
            const mktFlow = Math.floor((currentMkMonthly / dynamicCAC));

            // Calibration to hit Constitution Targets (2028 DEC):
            // Survival/Standard: ~800 | Growth: ~2500
            let organic = 0;
            if (scenario === 'GROWTH') {
                const growthFactor = year === 2026 ? 0.6 : (year === 2027 ? 1.0 : 1.8);
                organic = Math.floor(25 * growthFactor * (1 + monthsPassed * 0.04));
            } else {
                const growthFactor = year === 2026 ? 0.3 : (year === 2027 ? 0.8 : 1.4);
                organic = Math.floor(15 * growthFactor * (1 + monthsPassed * 0.025));
            }

            // Adjust marketing budget impact to prevent exploding numbers
            const limitedMktFlow = Math.min(mktFlow, currentUsers * 0.15); // Cannot grow by more than 15% via ads per month
            const churnedUsers = Math.floor(currentUsers * dynamicChurn);
            const newUsers = limitedMktFlow + organic;
            currentUsers = Math.max(10, (currentUsers - churnedUsers) + newUsers);

            // Business Plan 5-1 & 5-2: Blended ARPU and Variable Costs
            // Blended ARPU = (19900*0.4)+(39900*0.5)+(79000*0.1) = 35,810 KRW
            const blendedARPU = 35_810;
            const revenue = Math.floor(currentUsers * blendedARPU);

            if (revenue > 0) {
                // [ACCRUAL] Record as Accounts Receivable
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-28`,
                    description: `SaaS 라이선스 매출 (${Math.floor(currentUsers).toLocaleString()} 유저)`,
                    debitAccount: '외상매출금',
                    creditAccount: 'SaaS 매출',
                    vendor: 'SaaS 정기 구독자',
                    amount: revenue,
                    vat: Math.floor(revenue * 0.1),
                    type: 'Revenue',
                    comment: `[Status] New: ${newUsers}, Churn: ${(dynamicChurn * 100).toFixed(1)}%, LTV/CAC Ratio: 3.2`
                }));
                // Business Plan 5-2: Variable costs ~ 3,000 KRW per customer
                const infraCost = Math.floor((currentUsers * 3_000) * inflationFactor);
                payExpense(`${year}-${mStr}-20`, `${m}월 AI API 및 인프라 원가`, '인프라 원가', infraCost, true, 'Gemini/Infrastructure');
            }

            // [New] Strategic Intelligence Data: B2B Enterprise Client for Growth Scenario
            // Hits Concentration Risk (if > 30% of total) or just adds realism
            if (scenario === 'GROWTH' && m % 2 === 0) {
                const b2bRev = 15_000_000;
                const isUnpaid = m >= 11; // Nov, Dec are unpaid (AR)
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-27`,
                    description: `[매출] B2B 기업수주 (하이테크솔루션 외 1건)`,
                    debitAccount: isUnpaid ? '외상매출금' : '보통예금',
                    creditAccount: 'SaaS 매출',
                    amount: b2bRev,
                    vat: Math.floor(b2bRev * 0.1),
                    type: 'Revenue',
                    vendor: '하이테크솔루션',
                    isSettled: !isUnpaid,
                    dueDate: isUnpaid ? `${year + (m === 12 ? 1 : 0)}-0${(m % 12) + 1}-27` : undefined
                }));
            }
            // 5. [Unsettled Liabilities - AP & AR] Realism for Year-end
            if (m === 12) {
                const adjustmentFee = 2_000_000; // Realistic fee for tax adjustment (not external audit)
                addAndTrack(createEntry({
                    date: `${year}-12-31`,
                    description: '기말 결산 및 법인세 세무조정 수수료 (미지급)',
                    debitAccount: '지급수수료',
                    creditAccount: '미지급금',
                    amount: adjustmentFee,
                    vat: adjustmentFee * 0.1,
                    type: 'Expense',
                    vendor: '참좋은세무회계',
                    isSettled: false,
                    dueDate: `${year + 1}-01-31`
                }));
            }
        }
    }

    return pack;
}

export function generateThreeYearSimulation(scenario: BusinessScenario = 'STANDARD', overrides?: Partial<ScenarioParams>): JournalEntry[] {
    const p2026 = generateYearlyPack(2026, [], scenario, overrides);
    const p2027 = generateYearlyPack(2027, p2026, scenario, overrides);
    const p2028 = generateYearlyPack(2028, [...p2026, ...p2027], scenario, overrides);
    return [...p2026, ...p2027, ...p2028];
}

export const getRawMockData = () => ({ bankData: [] });
