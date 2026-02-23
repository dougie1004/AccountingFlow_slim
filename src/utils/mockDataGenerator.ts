import { JournalEntry, BusinessScenario, ScenarioParams } from '../types';
import { ConstitutionMonitor } from '../constitution/ConstitutionMonitor';

/**
 * Mock Data Generator for Startup Accounting Simulation
 * v11.8 - Corporate Establishment & Voucher Matching
 */

export function getScenarioParams(scenario: BusinessScenario): ScenarioParams {
    switch (scenario) {
        case 'SURVIVAL':
            return { grantSuccess: false, investmentAmount: 0, marketingAggression: 0.8, teamSize: 2 };
        case 'DEATH_VALLEY':
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
        if (e.creditAccount === 'SaaS 매출') {
            const match = e.description.match(/(\d+[,]?\d*) 유저/);
            if (match) currentUsers = parseInt(match[1].replace(/,/g, ''));
        }
    });

    // [CONSTITUTION Art 13] Grant Expiration & Limit Setting
    const GRANT_EXPIRY_DATE = '2027-05-31'; // Support ends 1 year after founding
    if (year === 2026 && params.grantSuccess && currentLedger.length === 0) {
        remainingGrantVoucher = 50_000_000; // 50M is a significant/realistic amount for early stage
    }

    const configMap = {
        2026: { marketMonthly: 0, launchMonth: 10, startMonth: 5 },
        2027: { marketMonthly: 4_000_000, launchMonth: 1, startMonth: 1 },
        2028: { marketMonthly: 6_000_000, launchMonth: 1, startMonth: 1 }
    };
    const baseConfig = configMap[year as keyof typeof configMap] || configMap[2026];

    // [CFO Context] Human Capital is our primary asset. 
    // Market rate for expert service personnel is increased to 6.5M/mo (Fully loaded).
    const BASE_SALARY_PER_PERSON = 6_500_000;
    const laborMonthly = Math.floor((
        scenario === 'SURVIVAL' ? (year === 2026 ? 8_000_000 : 12_000_000) :
            scenario === 'STANDARD' && year === 2026 ? 13_000_000 :
                params.teamSize * BASE_SALARY_PER_PERSON
    ) * inflationFactor);
    const rent = Math.floor((scenario === 'SURVIVAL' ? 1_500_000 : 3_000_000) * inflationFactor);
    const marketMonthly = params.marketingDisabled
        ? 0
        : Math.floor((baseConfig.marketMonthly) * (params.marketingAggression || 1.0) * inflationFactor);

    for (let m = baseConfig.startMonth; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');

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
            while (runningCash < requiredAmt) {
                const injection = 50_000_000; // v11.0 Standard: 50M increments
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-01`,
                    description: `[헌법 제10조: 자금 보호] 운영 런웨이 확보를 위한 자본금 납입 (유상증자)`,
                    debitAccount: '보통예금',
                    creditAccount: '자본금',
                    amount: injection,
                    type: 'Equity'
                }));
            }
        };

        const monthlyFixedBurn = laborMonthly + rent + marketMonthly;
        const totalVatExpected = (rent + marketMonthly) * 0.1;
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

        payExpense(`${year}-${mStr}-25`, `${m}월 임직원 급여`, '급여', laborMonthly, false, '임직원일동');
        payExpense(`${year}-${mStr}-05`, `${m}월 사무실 임차료`, '지급임차료', rent, true, '지식산업센터');


        if (marketMonthly > 0) payExpense(`${year}-${mStr}-15`, `${m}월 마케팅 광고비`, '광고선전비', marketMonthly, true, '구글코리아');

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

        // 4. [Growth]
        if (year > 2026 || m >= baseConfig.launchMonth) {
            const monthsPassed = (year - 2026) * 12 + (m - 5);
            const dynamicCAC = Math.max(scenario === 'GROWTH' ? 40_000 : 60_000, (scenario === 'GROWTH' ? 50_000 : 90_000) - (monthsPassed * 1000));
            const dynamicChurn = Math.max(scenario === 'GROWTH' ? 0.02 : 0.03, (scenario === 'SURVIVAL' ? 0.06 : 0.05) - (monthsPassed * 0.001));
            const mktFlow = Math.floor((marketMonthly / dynamicCAC) * (scenario === 'STANDARD' ? 0.95 : 0.65));
            const organic = Math.floor((scenario === 'GROWTH' ? 25 : (scenario === 'STANDARD' ? 15 : 8)) * (currentUsers > 600 ? 1.2 : 0.6) * (1 + (year - 2026) * 0.2));
            const churnedUsers = Math.floor(currentUsers * dynamicChurn);
            const newUsers = mktFlow + organic;
            currentUsers = Math.max(10, (currentUsers - churnedUsers) + newUsers);
            const revenue = Math.floor(currentUsers * 30_850);
            if (revenue > 0) {
                // [ACCRUAL] Record as Accounts Receivable
                addAndTrack(createEntry({
                    date: `${year}-${mStr}-28`,
                    description: `SaaS 솔루션 라이선스 매출 (총 ${currentUsers.toLocaleString()}명 / 신규 +${newUsers}명 / 이탈 -${churnedUsers}명)`,
                    debitAccount: '외상매출금',
                    creditAccount: 'SaaS 매출',
                    amount: revenue,
                    vat: Math.floor(revenue * 0.1),
                    type: 'Revenue'
                }));
                // [COGS] - Infrastructure costs linked to active users
                const infraCost = Math.floor((currentUsers * 850 + 500_000) * inflationFactor);
                payExpense(`${year}-${mStr}-20`, `${m}월 서버 인프라 원가 (AWS/GCP)`, '인프라 원가', infraCost, true, 'AWS코리아');
            }

            // [SETTLEMENT] Pay previous month's payables and collect receivables
            const settlementDate = `${year}-${mStr}-10`;
            const prevM = m === 1 ? 12 : m - 1;
            const prevY = m === 1 ? year - 1 : year;
            const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;

            // Collect Receivables from EXACTLY 1 month ago
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
                    type: 'Revenue'
                }));
            }

            // Pay Payables from EXACTLY 1 month ago
            const payablesToSettle = currentLedger.concat(pack)
                .filter(e => e.creditAccount === '미지급금' && e.date.startsWith(prevMonthPrefix))
                .reduce((sum, e) => sum + e.amount + (e.vat || 0), 0);

            if (payablesToSettle > 0) {
                // [CONSTITUTION] Payables cannot be paid if it results in negative cash
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
