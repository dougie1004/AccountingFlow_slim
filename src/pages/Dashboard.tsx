import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { runPhase2IntegrationTest, runPhase3BvATest } from '../utils/testScenarios';
import { ClosingInsightWidget } from '../components/dashboard/ClosingInsightWidget';
import {
    Activity,
    Terminal,
    TrendingUp,
    TrendingDown,
    Zap,
    CreditCard,
    Wallet,
    Search,
    Filter,
    Clock,
    DollarSign,
    ShieldAlert,
    Calendar,
    Lock,
    RefreshCw,
    Target
} from 'lucide-react';
import { isArAccount, isApAccount, isCashAccount } from '../constants/accounts';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { calculateFinancials } from '../core/accountingEngine';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { AIForecastPanel } from '../components/dashboard/AIForecastPanel';
import { ManagementRiskReport } from '../components/dashboard/ManagementRiskReport';
import { generateThreeYearSimulation, generateStressTestData } from '../utils/mockDataGenerator';
import { formatCLevel } from '../utils/formatUtils';
import { InfoTooltip } from '../components/ui/InfoTooltip';

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, addEntries, clearAllData, periods, closingRecords, seedThreeYearSimulation, addAsset, addLease, performClosing, setBudget } = useAccounting();
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
    const [showRiskReport, setShowRiskReport] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const analytics = useMemo(() => {
        const hasActivity = ledger.length > 0;
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        // 1. Group by Day with specialized buckets
        const dailyStats = new Map<string, { income: number; expense: number; sales: number }>();
        approvedLedger.forEach(entry => {
            const key = entry.date;
            const current = dailyStats.get(key) || { income: 0, expense: 0, sales: 0 };

            const amount = entry.amount || 0;
            const vat = entry.vat || 0;
            const total = amount + vat;

            // Actual Cash Flow (Liquid Basis)
            if (isCashAccount(entry.debitAccount)) current.income += total;
            if (isCashAccount(entry.creditAccount)) current.expense += total;

            // Accrual Sales (Business Performance Basis)
            if (entry.type === 'Revenue') current.sales += amount;

            dailyStats.set(key, current);
        });

        // 2. Continuous Data based on Range
        let rawData: any[] = [];
        if (hasActivity) {
            const sortedDates = approvedLedger.map(e => e.date).sort();
            const startLimit = new Date(sortedDates[0]);
            const today = new Date();
            const endLimit = new Date(sortedDates[sortedDates.length - 1]) > today ? new Date(sortedDates[sortedDates.length - 1]) : today;

            const rangeStart = new Date(endLimit);
            if (timeRange === 'week') rangeStart.setDate(endLimit.getDate() - 7);
            else if (timeRange === 'month') rangeStart.setMonth(endLimit.getMonth() - 1);
            else if (timeRange === 'year') rangeStart.setFullYear(endLimit.getFullYear() - 1);
            else rangeStart.setDate(endLimit.getDate() - 14);

            const effectiveStart = rangeStart > startLimit ? rangeStart : startLimit;

            for (let d = new Date(effectiveStart); d <= endLimit; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().split('T')[0];
                const stats = dailyStats.get(key) || { income: 0, expense: 0, sales: 0 };
                rawData.push({
                    name: key,
                    income: stats.income,
                    expense: stats.expense,
                    sales: stats.sales
                });
            }
        } else {
            rawData = [{ name: new Date().toISOString().split('T')[0], income: 0, expense: 0, sales: 0 }];
        }

        // 3. Trend (7-day MA of SALES, not cash income)
        const cashFlowData = rawData.map((d, idx, arr) => {
            const window = arr.slice(Math.max(0, idx - 6), idx + 1);
            const trend = window.reduce((s, x) => s + x.sales, 0) / window.length;
            return { ...d, trend: Math.round(trend) };
        });

        // 4. Advanced Burn Rate & Runway Analysis (CFO Logic)
        const outEntries = approvedLedger.filter(e => e.type === 'Expense' || e.type === 'Payroll');
        const totalOut = outEntries.reduce((s, e) => s + ((e.amount || 0) + (e.vat || 0)), 0);

        let avgBurnRate = 0;
        let activityDays = 0;

        if (outEntries.length > 0) {
            const sorted = outEntries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
            const start = sorted[0];
            const end = sorted[sorted.length - 1];
            // Minimum 1 day to avoid division by zero. 
            // Also adds a 30-day lookback logic if only a single day of data exists.
            activityDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

            // If data spans less than a week, we use a 30-day baseline for safer estimation
            const denominator = activityDays < 7 ? 30 : activityDays;
            avgBurnRate = totalOut / denominator;
        }

        return { cashFlowData, hasActivity, avgBurnRate, activityDays };
    }, [ledger, timeRange]);

    const unsettledMetrics = useMemo(() => {
        // We include both Approved and Unconfirmed for "Managerial Visibility" (Gemini feedback #1)
        const relevant = ledger.filter(e =>
            (e.status === 'Approved' || e.status === 'Unconfirmed') &&
            !e.isSettled
        );

        const ar = relevant.filter(e => isArAccount(e.debitAccount)).reduce((sum, e) => sum + ((e.amount || 0) + (e.vat || 0)), 0);
        const ap = relevant.filter(e => isApAccount(e.creditAccount)).reduce((sum, e) => sum + ((e.amount || 0) + (e.vat || 0)), 0);

        console.debug(`[Dashboard] AP Calculation: Found ${relevant.length} relevant entries. Total AP: ${ap}`);
        return { ar, ap };
    }, [ledger]);

    const rangeFinancials = useMemo(() => {
        const approvedLedger = ledger.filter(e => e.status === 'Approved');
        if (approvedLedger.length === 0) return financials;

        const sortedDates = approvedLedger.map(e => e.date).sort();
        const endLimitDay = new Date(sortedDates[sortedDates.length - 1]);
        const rangeStart = new Date(endLimitDay);

        if (timeRange === 'week') rangeStart.setDate(endLimitDay.getDate() - 7);
        else if (timeRange === 'month') rangeStart.setMonth(endLimitDay.getMonth() - 1);
        else if (timeRange === 'year') rangeStart.setFullYear(endLimitDay.getFullYear() - 1);
        else rangeStart.setDate(endLimitDay.getDate() - 14);

        const startStr = rangeStart.toISOString().split('T')[0];
        const endStr = endLimitDay.toISOString().split('T')[0];

        // Filter ledger for calculating range-specific metrics
        const rangeLedger = approvedLedger.filter(e => e.date >= startStr && e.date <= endStr);

        // We calculate P/L metrics for the range, but for Cash/AR/AP, 
        // we might want the cumulative state at the end of the range.
        const rangeStats = calculateFinancials(rangeLedger);
        const cumulativeAtEnd = calculateFinancials(approvedLedger.filter(e => e.date <= endStr));

        return {
            ...rangeStats,
            cash: cumulativeAtEnd.cash,
            displayCash: cumulativeAtEnd.displayCash,
            cashInflow: rangeStats.cashInflow,
            cashOutflow: rangeStats.cashOutflow
        };
    }, [ledger, timeRange, financials]);

    const latestPeriod = useMemo(() => {
        const closed = periods.filter(p => p.status === 'CLOSED').sort((a, b) => b.period.localeCompare(a.period));
        return closed.length > 0 ? closed[0] : null;
    }, [periods]);

    const latestRecord = useMemo(() => {
        if (!latestPeriod) return null;
        return closingRecords.find(r => r.period === latestPeriod.period) || null;
    }, [latestPeriod, closingRecords]);

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 rotate-12 transition-transform hover:rotate-0 cursor-pointer">
                        <Activity className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">경영 대시보드 (Dashboard)</h1>
                        <p className="text-slate-500 font-bold mt-1 flex items-center gap-2">
                            마지막 결산 확정일: <span className="text-indigo-400">{closingRecords.length > 0 ? `${closingRecords[closingRecords.length - 1].period} (CLOSED)` : '내역 없음'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-[#151D2E] p-1 rounded-2xl border border-white/5 shadow-xl">
                        {(['day', 'week', 'month', 'year'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                {r === 'day' ? '14일' : r === 'week' ? '주간' : r === 'month' ? '월간' : '연간'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => runPhase2IntegrationTest([], clearAllData, addAsset, addLease, addEntries, performClosing)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#151D2E] text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase rounded-2xl transition-all border border-emerald-500/20"
                    >
                        <ShieldAlert size={16} />
                        Phase 2 엔진 검증
                    </button>

                    <button
                        onClick={() => runPhase3BvATest(addEntries, setBudget, performClosing)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#151D2E] text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase rounded-2xl transition-all border border-rose-500/20"
                    >
                        <Target size={16} />
                        Phase 3 엔진 검증 (BvA)
                    </button>

                    <button
                        onClick={() => setTab('closing-manager')}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 border border-white/10"
                    >
                        <Lock size={16} />
                        실시간 월마감 실행
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm('기존 데이터를 모두 삭제하고 3개년 시뮬레이션 데이터를 생성하시겠습니까?\n(33개월 자동 결산 포함)')) {
                                seedThreeYearSimulation();
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 border border-white/10"
                    >
                        <RefreshCw size={16} />
                        Phase 1 시나리오
                    </button>

                    <button
                        onClick={() => setShowRiskReport(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-rose-600/20 active:scale-95 border border-white/10 animate-pulse"
                    >
                        <Target size={16} />
                        Risk Briefing (Phase 4.5)
                    </button>
                </div>
            </header>

            {showRiskReport && <ManagementRiskReport onClose={() => setShowRiskReport(false)} />}

            <CEOQuickBar
                financials={rangeFinancials}
                avgMonthlyBurn={analytics.avgBurnRate * 30.41}
                isProfitable={rangeFinancials.netIncome > 0}
                hasActivity={analytics.hasActivity}
                onNavigate={setTab}
                timeRange={timeRange}
            />

            <AIForecastPanel />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CFOReportCard
                    metrics={{
                        overdueReceivables: unsettledMetrics.ar,
                        upcomingPayments: unsettledMetrics.ap
                    }}
                    onViewReport={() => setTab('arap-management')}
                />
                <ManagementReportPanel ledger={ledger} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-[480px] relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white">현금 흐름 및 매출 추세</h3>
                                <InfoTooltip
                                    title="Cash Flow & Sales Trend (현금 흐름 및 매출 추세)"
                                    content="선택한 기간 동안의 실제 자금 유입/유출과 장부상 매출액의 흐름을 보여줍니다."
                                    contextualTip="Area(영역)는 실제 현금의 움직임을, Line(선)은 수익 인식을 나타냅니다."
                                />
                            </div>
                            <p className="text-xs font-bold text-slate-500 mt-1">실제 자금 유출입(Area)과 매출 추세(Line) 분석</p>
                        </div>
                        <div className="flex bg-[#0B1221] p-1 rounded-xl border border-white/5">
                            {(['day', 'week', 'month', 'year'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                                        } `}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-full pb-20">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.cashFlowData}>
                                    <defs>
                                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        minTickGap={30}
                                        tickFormatter={(str) => str.split('-').slice(1).join('/')}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)} 만`} />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: '#111827',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '1.25rem',
                                            padding: '16px'
                                        }}
                                        itemStyle={{ fontSize: '13px', fontWeight: '900' }}
                                        labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}
                                        formatter={(value: any, name?: string) => [`${(Number(value) || 0).toLocaleString()} 원`, name || '']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        name="유입"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fill="url(#colorInc)"
                                        fillOpacity={1}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        name="유출"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fill="url(#colorExp)"
                                        fillOpacity={1}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="trend"
                                        name="매출 추세 (7일 평균)"
                                        stroke="#6366f1"
                                        strokeDasharray="5 5"
                                        strokeWidth={2}
                                        fill="none"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-1 h-[480px]">
                    <ClosingInsightWidget
                        latestRecord={latestRecord}
                        latestPeriod={latestPeriod}
                        onNavigate={setTab}
                    />
                </div>
            </div>

            <div className="h-[450px]">
                <RecentTransactions transactions={ledger} onNavigate={setTab} />
            </div>
        </div>
    );
};
