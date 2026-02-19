import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { calculateFinancials } from '../bridge/StrategicBridge';
import { getAccountNature } from '../constants/accounts';
import { ArrowLeft, Table, Download, X, Search, Filter, FileText, ChevronRight, Activity, Calendar, Zap, TrendingUp, CheckCircle2, Snail, Flag } from 'lucide-react';
import { JournalEntry, BusinessScenario } from '../types';
import { formatCurrency } from '../utils/formatUtils';

export const SimulationReport: React.FC = () => {
    const { ledger, systemNow, seedThreeYearSimulation, seedScenarioSimulation, activeScenario } = useAccounting();
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
        let runningCash = 0;

        const results = sortedMonths.map(month => {
            const rangeEntries = buckets[month] || [];

            // Financials for this month (Delta)
            const periodFin = calculateFinancials(rangeEntries);

            // Running Balance
            runningCash += periodFin.cash;

            // Detailed Breakdown
            const revenue = rangeEntries.filter(e => e.type === 'Revenue').reduce((s, e) => s + e.amount, 0);

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

            // Funding / Capital Injection
            const funding = rangeEntries.filter(e => e.creditAccount === '자본금' || e.creditAccount === '자본잉여금').reduce((s, e) => s + e.amount, 0);

            // Grant Receipt (Cash Inflow, Liability booking)
            const grantReceived = rangeEntries.filter(e => e.creditAccount === '국고보조금(이연)').reduce((s, e) => s + e.amount, 0);

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
                grantReceived,
                cash: runningCash,
                // Burn Quality Signals
                burnQuality: rangeEntries.find(e => e.comment?.includes('Burn'))?.comment?.match(/\((\w+) Burn\)/)?.[1] || null,
                ltvCac: rangeEntries.find(e => e.comment?.includes('Ratio'))?.comment?.match(/Ratio: ([\d.]+)/)?.[1] || null,
                churnRate: rangeEntries.find(e => e.comment?.includes('Churn'))?.comment?.match(/Churn: ([\d.]+)%/)?.[1] || null,
                newUsers: rangeEntries.find(e => e.comment?.includes('New'))?.comment?.match(/New: (\d+)/)?.[1] || null,
                totalUsers: rangeEntries.find(e => e.description.includes('유저'))?.description?.match(/\(([\d,]+) 유저\)/)?.[1]?.replace(/,/g, '') || null
            };
        });

        if (selectedYear === 'all') return results;
        return results.filter(r => r.period.startsWith(selectedYear));
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
            cash: row.cash // Cash is cumulative, so take the last one
        }), {
            period: 'Total',
            revenue: 0, cogs: 0, grossProfit: 0,
            labor: 0, marketing: 0, rent: 0, depr: 0, otherExp: 0,
            opProfit: 0, grantIncome: 0, netIncome: 0,
            funding: 0, grantReceived: 0, cash: 0
        });
    }, [monthlyData]);


    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">월별 손익 현황 (Monthly P&L)</h1>
                    <p className="text-slate-400 font-bold mt-2">사업계획 검증을 위한 월별 상세 손익 및 현금 흐름 분석표</p>
                </div>
                <div className="bg-[#0B1221] p-1 rounded-xl flex border border-white/10">
                    {[
                        { id: 'SURVIVAL', label: '생존 (Survival)' },
                        { id: 'STANDARD', label: '표준 (Standard)' },
                        { id: 'GROWTH', label: '확장 (Growth)' },
                        { id: 'DEATH_VALLEY', label: '☠️ 데스 밸리 (Death Valley)' }
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleScenarioChange(s.id as any)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeScenario === s.id
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleStressTest}
                    className={`px-4 py-2 rounded-xl font-bold transition-all border flex items-center gap-2 ${isMarketingOff
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'
                        }`}
                >
                    <Activity className="w-4 h-4" />
                    {isMarketingOff ? '마케팅 중단됨 (Stress Test ON)' : '마케팅 중단 테스트'}
                </button>

                <button
                    onClick={handleFullSimulation}
                    className="px-4 py-2 bg-[#1E293B] text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white rounded-xl transition-all font-black text-xs flex items-center gap-2"
                >
                    <Zap size={14} />
                    3개년 전체 시뮬레이션
                </button>
                <div className="bg-[#0B1221] p-1 rounded-xl flex border border-white/10">
                    {['all', '2026', '2027', '2028'].map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedYear === year
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {year === 'all' ? '전체 보기' : `${year}년`}
                        </button>
                    ))}
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] text-slate-300 hover:text-white rounded-xl transition-colors font-bold text-sm">
                    <Download size={16} />
                    Excel
                </button>
            </header>

            {/* [BEP Analysis Dashboard] */}
            {monthlyData.length > 0 && (() => {
                let cumulativeNetIncome = 0;
                let firstMonthlyProfit: string | null = null;
                let firstCumulativeProfit: string | null = null;
                let lastMonthRevenue = 0;
                let lastMonthExpense = 0;

                monthlyData.forEach((row, idx) => {
                    cumulativeNetIncome += row.netIncome;
                    if (row.netIncome > 0 && !firstMonthlyProfit) firstMonthlyProfit = row.period;
                    if (cumulativeNetIncome > 0 && !firstCumulativeProfit) firstCumulativeProfit = row.period;

                    if (idx === monthlyData.length - 1) {
                        lastMonthRevenue = row.revenue;
                        // Expense = Rev - NetIncome (approx for projection)
                        lastMonthExpense = row.revenue - row.netIncome;
                    }
                });

                // Projection Logic
                let projectionMsg = "";
                let projectionColor = "text-slate-500";

                if (firstCumulativeProfit) {
                    projectionMsg = `🎉 이미 누적 손익분기점(BEP)을 달성했습니다! (${firstCumulativeProfit})`;
                    projectionColor = "text-emerald-400";
                } else if (lastMonthRevenue > lastMonthExpense) {
                    const monthlyProfit = lastMonthRevenue - lastMonthExpense;
                    const monthsNeeded = Math.abs(cumulativeNetIncome) / monthlyProfit;
                    const targetDate = new Date();
                    targetDate.setFullYear(2028, 11 + Math.ceil(monthsNeeded), 1); // Add to Dec 2028
                    const dateStr = targetDate.toISOString().substring(0, 7);
                    projectionMsg = `🔭 현재 추세라면 ${dateStr}경 누적 적자가 모두 해소될 것으로 예측됩니다.`;
                    projectionColor = "text-indigo-400";
                } else {
                    projectionMsg = "⚠️ 현재 구조로는 누적 적자 해소 시점을 예측할 수 없습니다. (매출 < 비용)";
                    projectionColor = "text-rose-400";
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <TrendingUp size={120} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Monthly BEP</div>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {firstMonthlyProfit ? (
                                        <span className="text-emerald-400 flex items-center gap-2">
                                            <CheckCircle2 size={24} /> {firstMonthlyProfit}
                                        </span>
                                    ) : <span className="text-slate-500">Not Reached</span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-2 font-bold">월 단위 흑자 전환 시점</div>
                            </div>
                        </div>

                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-500 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <Snail size={120} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Cumulative BEP</div>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {firstCumulativeProfit ? (
                                        <span className="text-indigo-400 flex items-center gap-2">
                                            <Flag size={24} /> {firstCumulativeProfit}
                                        </span>
                                    ) : <span className="text-slate-500">Not Reached</span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-2 font-bold">누적 손실 전액 회수 시점 (투자금 회수)</div>
                            </div>
                        </div>

                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-center text-center relative overflow-hidden">
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">AI Projection (2029+)</div>
                            <div className={`text-sm font-bold ${projectionColor} break-keep leading-relaxed`}>
                                {projectionMsg}
                            </div>
                            {!firstCumulativeProfit && (
                                <div className="mt-3 text-[10px] text-slate-600 font-mono bg-black/20 py-1 px-2 rounded-lg inline-block mx-auto">
                                    누적 결손금: {formatCurrency(cumulativeNetIncome)}
                                </div>
                            )}
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
                                <th className="px-4 py-4 text-right font-bold text-yellow-400">보조금수령</th>
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
