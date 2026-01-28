import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    TrendingUp,
    CreditCard,
    Activity,
    Wallet,
    Terminal,
    Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { generateComprehensiveMockData } from '../utils/mockDataGenerator';
import { generateCanonicalData } from '../utils/canonicalData';
import { formatCLevel } from '../utils/formatUtils';

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, addEntries, clearAllData } = useAccounting();
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const analytics = useMemo(() => {
        const hasActivity = ledger.length > 0;
        const monthlyStats = new Map<string, { income: number; expense: number }>();

        // 1. Group by Month
        ledger.forEach(entry => {
            // Dashboard should show Approved financials primarily, but let's include all for 'Activity' overview
            // or stick to Approved for financial accuracy. Let's use Approved for consistecy with Reports.
            if (entry.status !== 'Approved') return;

            const date = new Date(entry.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const current = monthlyStats.get(key) || { income: 0, expense: 0 };

            if (entry.type === 'Revenue') current.income += entry.amount;
            if (entry.type === 'Expense') current.expense += entry.amount;

            monthlyStats.set(key, current);
        });

        // 2. Sort Keys & Generate Data
        const sortedKeys = Array.from(monthlyStats.keys()).sort();

        // If no data, show at least current month empty
        if (sortedKeys.length === 0) {
            const today = new Date();
            const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            sortedKeys.push(key);
            monthlyStats.set(key, { income: 0, expense: 0 });
        }

        const cashFlowData = sortedKeys.map(key => ({
            name: key,
            income: monthlyStats.get(key)!.income,
            expense: monthlyStats.get(key)!.expense
        }));

        // 3. Burn Rate (Last 3 Months)
        const recentMonths = sortedKeys.slice(-3);
        const totalBurn = recentMonths.reduce((sum, key) => sum + (monthlyStats.get(key)?.expense || 0), 0);
        const avgBurnRate = recentMonths.length > 0 ? totalBurn / recentMonths.length : 0;

        return { cashFlowData, hasActivity, avgBurnRate };
    }, [ledger]);

    const kpiCards = [
        { label: '현금 잔액', value: financials.cash, icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: '매출채권', value: financials.ar, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: '매입채무', value: financials.ap, icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: '당기순이익', value: financials.netIncome, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
    ];

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
                    {/* Public Demo Button */}
                    <button
                        onClick={() => {
                            if (confirm('일반 시뮬레이션 데이터를 추가하시겠습니까?')) {
                                addEntries(generateComprehensiveMockData());
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Terminal size={16} /> 시뮬레이션 (Demo)
                    </button>

                    {/* Internal Diagnostic Button - Segregated */}
                    <button
                        onClick={() => {
                            if (confirm('⚠️ [ENGINE DIAGNOSTIC MODE]\n\nInitialize Canonical A-Z Dataset?\nCurrent data will be wiped.')) {
                                clearAllData();
                                setTimeout(() => {
                                    const canonicalEntries = generateCanonicalData();
                                    addEntries(canonicalEntries);

                                    // Cold, Mechanical Report
                                    alert(
                                        `[ENGINE DIAGNOSTIC REPORT]\n` +
                                        `-----------------------------------\n` +
                                        `TARGET       : AccountingFlow Core Engine\n` +
                                        `DATASET      : Canonical A-Z (v0.x)\n` +
                                        `LOGIC        : SPL (Standard Posting Logic)\n` +
                                        `-----------------------------------\n` +
                                        `EVENTS       : 16 (Defined)\n` +
                                        `ENTRIES      : ${canonicalEntries.length} (Generated)\n` +
                                        `-----------------------------------\n` +
                                        `STATUS       : INJECTED\n` +
                                        `ACTION       : VERIFY BALANCE SHEET NOW.`
                                    );
                                }, 100);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-mono hover:bg-rose-500/10 transition-colors active:scale-95"
                    >
                        <Zap size={14} /> ENGINE DIAGNOSTIC
                    </button>
                </div>
            </header>

            <CEOQuickBar
                financials={financials}
                avgMonthlyBurn={analytics.avgBurnRate}
                isProfitable={financials.netIncome > 0}
                hasActivity={analytics.hasActivity}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CFOReportCard
                    metrics={{
                        overdueReceivables: ledger
                            .filter(e => e.dueDate && new Date(e.dueDate) < new Date() && !e.isSettled && (e.type === 'Revenue' || e.debitAccount.includes('미수')))
                            .reduce((sum, e) => sum + e.amount, 0),
                        upcomingPayments: ledger
                            .filter(e => e.dueDate && !e.isSettled && (e.type === 'Expense' || e.creditAccount.includes('미지급')))
                            // Look ahead 30 days roughly, or just take all unsettled upcoming
                            .reduce((sum, e) => sum + e.amount, 0)
                    }}
                    onViewReport={() => setTab('daily-cash')}
                />
                <ManagementReportPanel ledger={ledger} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-4 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-[400px]">
                    <h3 className="text-xl font-black text-white mb-6">현금 흐름 추이</h3>
                    <div className="h-full pb-10">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.cashFlowData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6">
                    {kpiCards.map((kpi, idx) => (
                        <div key={idx} className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5">
                            <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-6`}>
                                <kpi.icon size={24} />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
                            <h4 className="text-2xl font-black text-white">{formatCLevel(kpi.value)}</h4>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-4 h-[400px]">
                    <RecentTransactions transactions={ledger} onNavigate={setTab} />
                </div>
            </div>
        </div>
    );
};
