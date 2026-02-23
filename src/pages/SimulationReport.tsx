import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { calculateFinancials } from '../bridge/StrategicBridge';
import { getAccountNature } from '../constants/accounts';
import { ArrowLeft, Table, Download, X, Search, Filter, FileText, ChevronRight, Activity, Calendar, Zap, TrendingUp, CheckCircle2, Snail, Flag } from 'lucide-react';
import { JournalEntry, BusinessScenario } from '../types';
import { formatCurrency } from '../utils/formatUtils';
import { exportFinancialSummary } from '../utils/excelExporter';
import { StrategicComparator, SensitivityAnalyzer } from '../utils/strategicComparator';

export const SimulationReport: React.FC = () => {
    const { ledger, systemNow, seedThreeYearSimulation, seedScenarioSimulation, activeScenario, initialCashBalance } = useAccounting();
    const [selectedYear, setSelectedYear] = useState<string>('all');
    // Map BusinessScenario ID to Label
    const scenarioLabels = {
        'SURVIVAL': '자생적 생존 (Lean/Survival)',
        'STANDARD': '표준 성장 (Standard)',
        'GROWTH': '공격 확장 (Growth)',
        'DEATH_VALLEY': '☠️ 데스밸리 (Death Valley)'
    };

    const [isMarketingOff, setIsMarketingOff] = useState(false);
    const [drillDown, setDrillDown] = useState<{ month: string, type: string, title: string } | null>(null);

    const handleScenarioChange = (scenarioId: BusinessScenario) => {
        // Intelligence: Detect current established years to maintain simulation continuity
        const currentYears = Array.from(new Set(ledger.map(e => parseInt(e.date.substring(0, 4)))));
        const targetYears = currentYears.length > 0 ? currentYears : [2026];

        seedScenarioSimulation(scenarioId, targetYears, { marketingDisabled: isMarketingOff });
    };

    const handleFullSimulation = () => {
        if (window.confirm('3개년 전체 사업 시나리오를 시뮬레이션하시겠습니까?\n(2026~2028년 전체 데이터가 생성됩니다)')) {
            seedThreeYearSimulation(activeScenario, { marketingDisabled: isMarketingOff });
        }
    };

    const handleStressTest = () => {
        const nextState = !isMarketingOff;
        setIsMarketingOff(nextState);

        const currentYears = Array.from(new Set(ledger.map(e => parseInt(e.date.substring(0, 4)))));
        const targetYears = currentYears.length > 0 ? currentYears : [2026];

        seedScenarioSimulation(activeScenario, targetYears, { marketingDisabled: nextState });
    };

    const monthlyData = useMemo(() => {
        // 1. Group by Month (Single Pass Bucketing)
        // Optimized: O(N) instead of O(N^2)
        const buckets: Record<string, typeof ledger> = {};
        const allMonthsSet = new Set<string>();

        ledger.forEach(e => {
            const m = e.date.substring(0, 7);
            if (!buckets[m]) buckets[m] = [];
            buckets[m].push(e);
            allMonthsSet.add(m);
        });

        const sortedMonths = Array.from(allMonthsSet).sort();
        let runningCash = initialCashBalance || 0;

        const lifetimeResults = sortedMonths.map(month => {
            const rangeEntries = buckets[month] || [];

            // Financials for this month (Delta) - bypass Sign Convention Check since it's a delta
            const periodFin = calculateFinancials(rangeEntries, undefined, 0, undefined, true);

            // Running Balance
            runningCash += periodFin.cash;

            // Detailed Breakdown - Real Sales Revenue (Exclude non-operating grants)
            const revenue = rangeEntries.filter(e =>
                e.type === 'Revenue' &&
                e.creditAccount !== '국고보조금수익' &&
                e.creditAccount !== '영업외수익(국고보조금)' &&
                e.creditAccount !== '잡이익'
            ).reduce((s, e) => s + e.amount, 0);

            // [CONSTITUTIONAL NATURE] COGS
            const cogs = rangeEntries.filter(e => getAccountNature(e.debitAccount) === 'COGS').reduce((s, e) => s + e.amount, 0);

            const grossProfit = revenue - cogs;

            // Expenses breakdown (SG&A)
            const labor = rangeEntries.filter(e => e.debitAccount === '급여' || e.debitAccount === '퇴직급여').reduce((s, e) => s + e.amount, 0);
            const marketing = rangeEntries.filter(e => e.debitAccount === '광고선전비').reduce((s, e) => s + e.amount, 0);
            const rent = rangeEntries.filter(e => e.debitAccount === '지급임차료' || e.debitAccount === '임차료').reduce((s, e) => s + e.amount, 0);
            const depr = rangeEntries.filter(e => e.debitAccount === '감가상각비').reduce((s, e) => s + e.amount, 0);

            // Other SG&A
            const sgaTotal = rangeEntries.filter(e => getAccountNature(e.debitAccount) === 'SG&A').reduce((s, e) => s + e.amount, 0);
            const otherExp = sgaTotal - (labor + marketing + rent + depr);

            const opProfit = grossProfit - sgaTotal;

            // Grants (Subsidy Income)
            const grantIncome = rangeEntries.filter(e => e.creditAccount === '국고보조금수익' || e.creditAccount === '잡이익').reduce((s, e) => s + e.amount, 0);

            // Net Income (Pre-tax)
            const netIncome = opProfit + grantIncome;
            const expenses = sgaTotal;

            // Funding / Capital Injection
            const funding = rangeEntries.filter(e => e.creditAccount === '자본금' || e.creditAccount === '자본잉여금').reduce((s, e) => s + e.amount, 0);

            // Asset Related Grant Liability (Deferred) - Only NEW deferrals this month
            const deferredGrant = rangeEntries.filter(e => e.creditAccount === '국고보조금(이연)').reduce((s, e) => s + e.amount, 0);

            // Only count grant income that is NOT from amortization (to avoid double counting with deferred grant)
            const directGrantIncome = rangeEntries.filter(e =>
                e.creditAccount === '국고보조금수익' &&
                !e.description.includes('감가상각 대응')
            ).reduce((s, e) => s + e.amount, 0);

            const grantUsage = directGrantIncome + deferredGrant;

            return {
                period: month,
                revenue,
                cogs,
                grossProfit,
                labor,
                marketing,
                rent,
                depr,
                otherExp,
                opProfit,
                grantIncome,
                netIncome,
                funding,
                grantReceived: grantUsage,
                expenses,
                cash: runningCash,
                // Burn Quality Signals
                burnQuality: rangeEntries.find(e => e.comment?.includes('Burn'))?.comment?.match(/\((\w+) Burn\)/)?.[1] || null,
                ltvCac: rangeEntries.find(e => e.comment?.includes('Ratio'))?.comment?.match(/Ratio: ([\d.]+)/)?.[1] || null,
                churnRate: rangeEntries.find(e => e.comment?.includes('Churn'))?.comment?.match(/Churn: ([\d.]+)%/)?.[1] || null,
                newUsers: rangeEntries.find(e => e.comment?.includes('New'))?.comment?.match(/New: (\d+)/)?.[1] || null,
                totalUsers: rangeEntries.find(e => e.description.includes('유저'))?.description?.match(/\(([\d,]+) 유저\)/)?.[1]?.replace(/,/g, '') || null
            };
        });

        // Store lifetime results for dashboard analytics separately
        (window as any)._simulation_lifetime = lifetimeResults;

        if (selectedYear === 'all') return lifetimeResults;
        return lifetimeResults.filter(r => r.period.startsWith(selectedYear));
    }, [ledger, selectedYear]);

    // Calculate Totals using useMemo to avoid recalculation on every render
    const totalData = useMemo(() => {
        return monthlyData.reduce((acc, row) => ({
            period: 'Total',
            revenue: acc.revenue + row.revenue,
            cogs: acc.cogs + row.cogs,
            grossProfit: acc.grossProfit + row.grossProfit,
            labor: acc.labor + row.labor,
            marketing: acc.marketing + row.marketing,
            rent: acc.rent + row.rent,
            depr: acc.depr + row.depr,
            otherExp: acc.otherExp + row.otherExp,
            opProfit: acc.opProfit + row.opProfit,
            grantIncome: acc.grantIncome + row.grantIncome,
            netIncome: acc.netIncome + row.netIncome,
            funding: acc.funding + row.funding,
            grantReceived: acc.grantReceived + row.grantReceived,
            expenses: acc.expenses + row.expenses,
            cash: row.cash // Cash is cumulative, so take the last one
        }), {
            period: 'Total',
            revenue: 0, cogs: 0, grossProfit: 0,
            labor: 0, marketing: 0, rent: 0, depr: 0, otherExp: 0,
            opProfit: 0, grantIncome: 0, netIncome: 0,
            funding: 0, grantReceived: 0, expenses: 0, cash: 0
        });
    }, [monthlyData]);


    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sticky Page Header & Controls */}
            <header className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-4 -mt-4 border-b border-white/5 flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-black text-white tracking-tight">월별 손익 현황 (Monthly P&L)</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Monthly Financial Simulation & Strategic Forecast</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-[#151D2E] p-1 rounded-xl flex border border-white/10">
                        {[
                            { id: 'SURVIVAL', label: '생존 (Survival)' },
                            { id: 'STANDARD', label: '표준 (Standard)' },
                            { id: 'GROWTH', label: '확장 (Growth)' },
                            { id: 'DEATH_VALLEY', label: '☠️ 데스 밸리 (Death Valley)' }
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleScenarioChange(s.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeScenario === s.id
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleStressTest}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center gap-2 ${isMarketingOff
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        {isMarketingOff ? 'Stress Test ON' : 'Marketing Stress Test'}
                    </button>

                    <button
                        onClick={handleFullSimulation}
                        className="px-4 py-2 bg-[#1E293B] text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase flex items-center gap-2"
                    >
                        <Zap size={14} />
                        Full Forecast
                    </button>

                    <div className="bg-[#151D2E] p-1 rounded-xl flex border border-white/10">
                        {['all', '2026', '2027', '2028'].map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${selectedYear === year
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {year === 'all' ? 'All' : `${year}Y`}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => exportFinancialSummary(monthlyData, scenarioLabels[activeScenario])}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 hover:text-white rounded-xl transition-colors font-black text-[10px] uppercase border border-white/10"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </header>

            {/* [Strategic Intelligence & BEP Dashboard] */}
            {monthlyData.length > 0 && (() => {
                const lifetimeData = (window as any)._simulation_lifetime || monthlyData;
                let cumulativeNetIncome = 0;
                let firstMonthlyProfit: string | null = null;
                let firstCumulativeProfit: string | null = null;
                let lastMonthRevenue = 0;
                let lastMonthExpense = 0;

                lifetimeData.forEach((row: any, idx: number) => {
                    cumulativeNetIncome += row.netIncome;
                    // Monthly BEP: First month of positive P&L (excluding zero-activity startup months)
                    if (row.netIncome > 0 && !firstMonthlyProfit && (row.revenue > 0 || row.expenses > 0)) {
                        firstMonthlyProfit = row.period;
                    }
                    // Cumulative BEP: When total lifetime P&L crosses zero
                    if (cumulativeNetIncome > 0 && !firstCumulativeProfit) {
                        firstCumulativeProfit = row.period;
                    }

                    if (idx === lifetimeData.length - 1) {
                        lastMonthRevenue = row.revenue;
                        lastMonthExpense = row.revenue - row.netIncome;
                    }
                });

                // Sensitivity Analysis
                // 1. OPEX Sensitivity: How 10% increase in total expenses impacts Net Income (Loss)
                const opexImpact = SensitivityAnalyzer.analyzeImpact({ netIncome: totalData.netIncome }, "Total OPEX", 1.1, totalData.netIncome - (totalData.expenses * 0.1));

                // 2. Revenue Leverage: How 10% increase in sales scales the bottom line
                const revImpact = SensitivityAnalyzer.analyzeImpact({ netIncome: totalData.netIncome }, "Revenue", 1.1, totalData.netIncome + (totalData.revenue * 0.1));

                // Projection
                let projectionMsg = "";
                let projectionColor = "text-slate-500";
                if (firstCumulativeProfit) {
                    projectionMsg = `🎉 누적 BEP 달성 (${firstCumulativeProfit})`;
                    projectionColor = "text-emerald-400";
                } else if (lastMonthRevenue > lastMonthExpense) {
                    const monthlyProfit = lastMonthRevenue - lastMonthExpense;
                    const monthsNeeded = Math.abs(cumulativeNetIncome) / monthlyProfit;
                    projectionMsg = `🔭 결손금 회수까지 약 ${Math.ceil(monthsNeeded)}개월 소요 예상`;
                    projectionColor = "text-indigo-400";
                } else {
                    projectionMsg = "⚠️ 수익성 개선 필수 (회수 예측 불가)";
                    projectionColor = "text-rose-400";
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* 1. Monthly BEP */}
                        <div className="bg-[#151D2E] p-5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                                <TrendingUp size={80} />
                            </div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Monthly BEP</div>
                            <div className="text-xl font-black text-white">
                                {firstMonthlyProfit ? <span className="text-emerald-400">{firstMonthlyProfit}</span> : <span className="text-slate-600">N/A</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">월 단위 흑자 시점</p>

                            {/* BEP Tooltip */}
                            <div className="absolute inset-0 bg-[#0B1221]/95 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-center rounded-[2.5rem]">
                                <div className="text-[9px] font-black text-emerald-400 mb-1">월간 손익분기 (Monthly BEP)</div>
                                <div className="text-[8px] text-slate-400 leading-tight">
                                    영업 활동을 통해 <br />
                                    매월 발생하는 비용보다 <br />
                                    더 많은 매출을 올리기 <br />
                                    시작하는 첫 번째 달입니다.<br />
                                    (시뮬레이션 범위 기간 기준)
                                </div>
                            </div>
                        </div>

                        {/* 2. Cumulative BEP */}
                        <div className="bg-[#151D2E] p-5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-500 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                                <Snail size={80} />
                            </div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cumulative BEP</div>
                            <div className="text-xl font-black text-white">
                                {firstCumulativeProfit ? <span className="text-indigo-400">{firstCumulativeProfit}</span> : <span className="text-slate-600">N/A</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">누적 손익분기점</p>

                            {/* Cumulative Tooltip */}
                            <div className="absolute inset-0 bg-[#0B1221]/95 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-center rounded-[2.5rem]">
                                <div className="text-[9px] font-black text-indigo-400 mb-1">누적 손익분기 (Cumulative BEP)</div>
                                <div className="text-[8px] text-slate-400 leading-tight">
                                    설립 이후(또는 시뮬레이션 시작일) <br />
                                    투입된 모든 비용(결손금)을 <br />
                                    사업 이익으로 모두 회수하여 <br />
                                    누적 이익이 (+)로 전환되는 <br />
                                    진정한 성장의 결과값입니다.
                                </div>
                            </div>
                        </div>

                        {/* 3. Sensitivity (OPEX) */}
                        <div className="bg-[#151D2E] p-5 rounded-[2.5rem] border border-white/5 group relative hover:border-rose-500/30 transition-all cursor-help">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">OPEX Sensitivity</div>
                            <div className="text-xl font-black text-rose-400">{opexImpact.sensitivityCoefficient}x</div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">판관비 10% 변동 영향</p>

                            {/* Calculation Basis Tooltip */}
                            <div className="absolute inset-0 bg-[#0B1221]/95 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-center rounded-[2.5rem]">
                                <div className="text-[9px] font-black text-rose-400 mb-1">산출 근거 (Elasticity)</div>
                                <div className="text-[8px] text-slate-400 leading-tight">
                                    비용이 1% 오를 때<br />
                                    손익이 변동하는 폭.<br />
                                    값이 클수록 비용 통제가<br />
                                    재무에 치명적임을 의미.
                                </div>
                            </div>
                        </div>

                        {/* 4. Leverage (Revenue) */}
                        <div className="bg-[#151D2E] p-5 rounded-[2.5rem] border border-white/5 group relative hover:border-emerald-500/30 transition-all cursor-help">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Revenue Leverage</div>
                            <div className="text-xl font-black text-emerald-400">{revImpact.sensitivityCoefficient}x</div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">매출 10% 증량 탄력성</p>

                            <div className="absolute inset-0 bg-[#0B1221]/95 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-center rounded-[2.5rem]">
                                <div className="text-[9px] font-black text-emerald-400 mb-1">산출 근거 (Leverage)</div>
                                <div className="text-[8px] text-slate-400 leading-tight">
                                    매출 1% 증가 시 <br />
                                    {totalData.netIncome < 0 ? '결손금이 감소하는 효율' : '이익이 증폭되는 배율'}.<br />
                                    현재 결손 구간이므로 {parseFloat(revImpact.sensitivityCoefficient) < 0 ? '(-)는 효율 개선' : '(+)는 스케일링'} 의미.
                                </div>
                            </div>
                        </div>

                        {/* 5. Strategy Meta (Composite) */}
                        <div className="bg-indigo-600/5 p-5 rounded-[2.5rem] border border-indigo-500/20 flex flex-col justify-center text-center group relative overflow-hidden transition-all hover:border-indigo-500/40 cursor-help">
                            <div className={`text-xs font-black mb-1 ${projectionColor}`}>{projectionMsg}</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                누적 결손: {formatCurrency(cumulativeNetIncome)}
                            </div>

                            {/* Payback Intelligence Tooltip */}
                            <div className="absolute inset-0 bg-[#0B1221]/95 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-center rounded-[2.5rem]">
                                <div className="text-[9px] font-black text-indigo-400 mb-1 italic">전략적 회수 분석 (Payback Analysis)</div>
                                <div className="text-[8px] text-slate-400 leading-tight">
                                    현재 시뮬레이션의 <br />
                                    마지막 달 '영업 흑자 폭'이 <br />
                                    유지된다는 가정하에, <br />
                                    남은 누적 결손을 모두 터는 <br />
                                    시점을 역산한 결과입니다.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#0B1221] text-slate-400 border-b border-white/5">
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider sticky left-0 bg-[#0B1221] z-10 w-24">Period</th>
                                <th className="px-4 py-4 text-right font-black text-emerald-500">매출액 (Rev)</th>
                                <th className="px-4 py-4 text-center font-black text-emerald-400">성장 (User Growth)</th>
                                <th className="px-4 py-4 text-right font-bold text-slate-500">매출원가</th>
                                <th className="px-4 py-4 text-right font-black text-white border-r border-white/5">매출총이익</th>

                                <th className="px-4 py-4 text-right text-rose-300">인건비</th>
                                <th className="px-4 py-4 text-right text-rose-300">마케팅비</th>
                                <th className="px-4 py-4 text-right text-rose-300">임차료</th>
                                <th className="px-4 py-4 text-right text-slate-500">감가상각</th>
                                <th className="px-4 py-4 text-right text-slate-500 border-r border-white/5">기타비용</th>

                                <th className="px-4 py-4 text-right font-black text-indigo-400">영업이익</th>
                                <th className="px-4 py-4 text-right font-bold text-cyan-400">보조금수익</th>
                                <th className="px-4 py-4 text-right font-black text-white border-r border-white/5 bg-indigo-900/10">당기순이익</th>

                                <th className="px-4 py-4 text-right font-bold text-fuchsia-400">투자/자본금</th>
                                <th className="px-4 py-4 text-right font-bold text-yellow-400" title="바우처 총 사용액 (수익형 + 자산형 합계)">보조금 집행(바우처)</th>
                                <th className="px-4 py-4 text-right font-black text-emerald-400 bg-[#0B1221]">월말현금</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {monthlyData.map((row) => (
                                <tr key={row.period} className="hover:bg-white/5 transition-colors group">
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'ALL', title: `${row.period} 전체 내역` })}
                                        className="px-6 py-3 font-black text-white sticky left-0 bg-[#151D2E] group-hover:bg-[#1E293B] z-10 border-r border-white/5 cursor-pointer hover:text-indigo-400"
                                    >
                                        {row.period}
                                    </td>

                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'REVENUE', title: `${row.period} 매출 상세` })}
                                        className="px-4 py-3 text-right font-bold text-white cursor-pointer hover:bg-emerald-500/10"
                                    >
                                        {row.revenue.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center border-x border-white/5 bg-emerald-500/5">
                                        {row.totalUsers ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-emerald-400 font-black text-lg">{Number(row.totalUsers).toLocaleString()} <span className="text-[10px] opacity-70">명</span></span>
                                                {row.newUsers && row.churnRate && (
                                                    <div className="flex items-center gap-2 mt-1 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">Growth Info:</span>
                                                        <span className="text-[10px] font-bold text-emerald-400" title="실제 순증 유입 고객 (Actual Net New Inflow)">
                                                            [신규] +{row.newUsers}명
                                                        </span>
                                                        <div className="w-[1px] h-2 bg-white/10" />
                                                        <span className="text-[10px] font-bold text-rose-400" title="월간 이탈률 (Monthly Churn Rate)">
                                                            [이탈] {row.churnRate}%
                                                        </span>
                                                        <div className={`w-1.5 h-1.5 rounded-full ml-1 ${Number(row.newUsers) > (Number(row.totalUsers) * (Number(row.churnRate) / 100))
                                                            ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                                            : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                                                            }`} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : <span className="text-slate-600">-</span>}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'COGS', title: `${row.period} 매출원가 상세` })}
                                        className="px-4 py-3 text-right text-slate-400 cursor-pointer hover:bg-white/10"
                                    >
                                        ({row.cogs.toLocaleString()})
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'ALL', title: `${row.period} 손익 요약` })}
                                        className="px-4 py-3 text-right font-black text-white border-r border-white/5 bg-white/5 cursor-pointer hover:bg-white/10"
                                    >
                                        {row.grossProfit.toLocaleString()}
                                    </td>

                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'LABOR', title: `${row.period} 인건비 상세` })}
                                        className="px-4 py-3 text-right text-slate-300 cursor-pointer hover:bg-rose-500/10"
                                    >
                                        {row.labor.toLocaleString()}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'MARKETING', title: `${row.period} 마케팅비 상세` })}
                                        className="px-4 py-3 text-right text-slate-300 cursor-pointer hover:bg-rose-500/10"
                                    >
                                        {row.marketing.toLocaleString()}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'RENT', title: `${row.period} 임차료 상세` })}
                                        className="px-4 py-3 text-right text-slate-300 cursor-pointer hover:bg-rose-500/10"
                                    >
                                        {row.rent.toLocaleString()}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'DEPR', title: `${row.period} 감가상각 상세` })}
                                        className="px-4 py-3 text-right text-slate-500 cursor-pointer hover:bg-white/10"
                                    >
                                        {row.depr.toLocaleString()}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'OTHER', title: `${row.period} 기타비용 상세` })}
                                        className="px-4 py-3 text-right text-slate-500 border-r border-white/5 cursor-pointer hover:bg-white/10"
                                    >
                                        {row.otherExp.toLocaleString()}
                                    </td>

                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'ALL', title: `${row.period} 영업손익 상술` })}
                                        className={`px-4 py-3 text-right font-black cursor-pointer hover:bg-indigo-500/10 ${row.opProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}
                                    >
                                        {row.opProfit.toLocaleString()}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'GRANT_INC', title: `${row.period} 보조금 수익 상세` })}
                                        className="px-4 py-3 text-right text-cyan-500 font-bold cursor-pointer hover:bg-cyan-500/10"
                                    >
                                        {row.grantIncome > 0 ? `+${row.grantIncome.toLocaleString()}` : '-'}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'ALL', title: `${row.period} 당기순이익 상세` })}
                                        className={`px-4 py-3 text-right font-black border-r border-white/5 bg-indigo-900/10 cursor-pointer hover:bg-indigo-500/20 ${row.netIncome >= 0 ? 'text-white' : 'text-rose-400'}`}
                                    >
                                        {row.netIncome.toLocaleString()}
                                    </td>

                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'FUNDING', title: `${row.period} 자본 유입 상세` })}
                                        className="px-4 py-3 text-right text-fuchsia-400 font-bold cursor-pointer hover:bg-fuchsia-500/10"
                                    >
                                        {row.funding > 0 ? `+${row.funding.toLocaleString()}` : '-'}
                                    </td>
                                    <td
                                        onClick={() => setDrillDown({ month: row.period, type: 'GRANT_REC', title: `${row.period} 보조금 수령 상세` })}
                                        className="px-4 py-3 text-right text-yellow-500 font-bold cursor-pointer hover:bg-yellow-500/10"
                                    >
                                        {row.grantReceived > 0 ? `+${row.grantReceived.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-400 bg-emerald-900/10">
                                        {row.cash.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {/* Grand Total Row */}
                            {monthlyData.length > 0 && (
                                <tr className="bg-[#1E293B] border-t-2 border-white/20 font-black">
                                    <td className="px-6 py-4 text-left text-white sticky left-0 bg-[#1E293B] z-10 border-r border-white/5 uppercase tracking-wider">Total</td>

                                    <td className="px-4 py-4 text-right text-emerald-400">{totalData.revenue.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-center text-slate-600 bg-[#1E293B]">-</td>
                                    <td className="px-4 py-4 text-right text-slate-400">({totalData.cogs.toLocaleString()})</td>
                                    <td className="px-4 py-4 text-right text-white border-r border-white/5">{totalData.grossProfit.toLocaleString()}</td>

                                    <td className="px-4 py-4 text-right text-rose-300">{totalData.labor.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-rose-300">{totalData.marketing.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-rose-300">{totalData.rent.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-slate-500">{totalData.depr.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-slate-500 border-r border-white/5">{totalData.otherExp.toLocaleString()}</td>

                                    <td className={`px-4 py-4 text-right ${totalData.opProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                                        {totalData.opProfit.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right text-cyan-400">
                                        {totalData.grantIncome > 0 ? `+${totalData.grantIncome.toLocaleString()}` : '-'}
                                    </td>
                                    <td className={`px-4 py-4 text-right border-r border-white/5 bg-indigo-900/20 ${totalData.netIncome >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                        {totalData.netIncome.toLocaleString()}
                                    </td>

                                    <td className="px-4 py-4 text-right text-fuchsia-400">
                                        {totalData.funding > 0 ? `+${totalData.funding.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-right text-yellow-400">
                                        {totalData.grantReceived > 0 ? `+${totalData.grantReceived.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-right text-emerald-400 bg-emerald-900/20">
                                        {totalData.cash.toLocaleString()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drill-down Modal (Ledger View) */}
            {
                drillDown && (() => {
                    // Filter Logic
                    const filtered = ledger.filter(e => {
                        const m = e.date.substring(0, 7);
                        if (m !== drillDown.month) return false;

                        switch (drillDown.type) {
                            case 'REVENUE': return e.type === 'Revenue' || getAccountNature(e.creditAccount) === 'NON_OPERATING';
                            case 'COGS': return getAccountNature(e.debitAccount) === 'COGS';
                            case 'LABOR': return e.debitAccount === '급여' || e.debitAccount === '퇴직급여';
                            case 'MARKETING': return e.debitAccount === '광고선전비';
                            case 'RENT': return e.debitAccount === '지급임차료' || e.debitAccount === '임차료';
                            case 'DEPR': return e.debitAccount === '감가상각비';
                            case 'GRANT_INC': return e.creditAccount === '국고보조금수익' || e.creditAccount === '잡이익';
                            case 'GRANT_REC': return e.creditAccount === '국고보조금(이연)';
                            case 'FUNDING': return e.creditAccount === '자본금' || e.creditAccount === '자본잉여금';
                            case 'OTHER':
                                const nature = getAccountNature(e.debitAccount);
                                const isSpecific = (nature === 'COGS') ||
                                    (e.debitAccount === '급여' || e.debitAccount === '퇴직급여') ||
                                    (e.debitAccount === '광고선전비') ||
                                    (e.debitAccount === '지급임차료' || e.debitAccount === '임차료') ||
                                    (e.debitAccount === '감가상각비');
                                return nature === 'SG&A' && !isSpecific;
                            case 'ALL': return true;
                            default: return true;
                        }
                    });

                    // Grouping Logic for UI (Same as FinancialStatements)
                    const grouped = filtered.reduce((acc, row) => {
                        const key = row.journalNumber || `NO_SLIP_${row.id}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(row);
                        return acc;
                    }, {} as Record<string, JournalEntry[]>);

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrillDown(null)} />
                            <div className="relative bg-[#0F1623] w-full max-w-5xl h-[85vh] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col scale-in-center">
                                {/* Modal Header */}
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#151D2E]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
                                            <Table className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white tracking-tight">{drillDown.title}</h2>
                                            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} /> {drillDown.month} Period Analysis
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDrillDown(null)}
                                        className="p-3 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all transform hover:rotate-90"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                                    {Object.keys(grouped).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                            <Search size={48} className="opacity-20" />
                                            <p className="font-bold">해당 조건의 전표가 없습니다.</p>
                                        </div>
                                    ) : (
                                        Object.entries(grouped).map(([journalNo, entries]) => (
                                            <div key={journalNo} className="bg-[#151D2E]/50 rounded-2xl border border-white/5 overflow-hidden group">
                                                <div className="px-4 py-2 bg-white/5 flex items-center justify-between border-b border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-slate-500 font-mono tracking-tighter">REF: {journalNo}</span>
                                                        <div className="h-1 w-1 rounded-full bg-slate-700" />
                                                        <span className="text-[10px] font-bold text-indigo-400">{entries[0].date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded font-black">
                                                            {entries[0].type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <table className="w-full text-xs">
                                                    <tbody>
                                                        {entries.map((ent) => (
                                                            <tr key={ent.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                                                <td className="p-3 w-1/2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white font-bold text-sm tracking-tight">{ent.description}</span>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-slate-500">{ent.debitAccount} / {ent.creditAccount}</span>
                                                                            {ent.vendor && (
                                                                                <>
                                                                                    <div className="h-1 w-1 rounded-full bg-slate-700" />
                                                                                    <span className="text-indigo-400 font-bold">{ent.vendor}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-white font-black text-sm">{formatCurrency(ent.amount)}</span>
                                                                        {ent.vat > 0 && <span className="text-[10px] text-slate-500">VAT {formatCurrency(ent.vat)} 별도</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <ChevronRight className="text-slate-700" size={16} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-4 bg-[#0B1221] border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selected Period</span>
                                            <span className="text-sm font-black text-white">{drillDown.month}</span>
                                        </div>
                                        <div className="h-8 w-[1px] bg-white/10" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction Count</span>
                                            <span className="text-sm font-black text-indigo-400">{filtered.length} 건</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</p>
                                            <p className="text-xl font-black text-indigo-400">{formatCurrency(filtered.reduce((s, e) => s + (e.amount || 0), 0))}</p>
                                        </div>
                                        <Activity className="text-indigo-600 opacity-30" size={32} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
        </div >
    );
};
