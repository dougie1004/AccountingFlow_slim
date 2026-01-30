import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
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
    Calendar
} from 'lucide-react';
import { isArAccount, isApAccount, isCashAccount } from '../constants/accounts';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { generateComprehensiveMockData } from '../utils/mockDataGenerator';
import { formatCLevel } from '../utils/formatUtils';
import { InfoTooltip } from '../components/ui/InfoTooltip';

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, addEntries, clearAllData } = useAccounting();
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');

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
        const totalOut = outEntries.reduce((s, e) => s + (e.amount || 0), 0);

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

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 pb-12">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Activity className="text-indigo-400" size={32} />
                        경영 관리 대시보드
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (confirm('시뮬레이션 데이터를 추가하시겠습니까?')) {
                                addEntries(generateComprehensiveMockData());
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <Terminal size={16} /> 시뮬레이션
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('데이터를 초기화하시겠습니까?')) {
                                clearAllData();
                            }
                        }}
                        className="px-4 py-2.5 border border-white/10 text-slate-400 rounded-xl text-xs font-bold hover:bg-white/5 transition-all"
                    >
                        데이터 리셋
                    </button>
                </div>
            </header>

            <CEOQuickBar
                financials={financials}
                avgMonthlyBurn={analytics.avgBurnRate * 30.41}
                isProfitable={financials.netIncome > 0}
                hasActivity={analytics.hasActivity}
                onNavigate={setTab}
            />

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

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-[480px] relative overflow-hidden">
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
                                    className={`px - 4 py - 1.5 rounded - lg text - xs font - black uppercase tracking - widest transition - all ${timeRange === range ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
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

                <div className="h-[450px]">
                    <RecentTransactions transactions={ledger} onNavigate={setTab} />
                </div>
            </div>
        </div>
    );
};
