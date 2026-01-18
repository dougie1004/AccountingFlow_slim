import React, { useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    TrendingUp,
    CreditCard,
    Package,
    Building2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Wallet,
    Play
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AIForecastPanel } from '../components/dashboard/AIForecastPanel';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';


import { invoke } from '@tauri-apps/api/core';
import { SimulationResult } from '../types';

export const Dashboard: React.FC<{ setTab?: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, loadSimulation } = useAccounting();
    const [isSimulating, setIsSimulating] = React.useState(false);

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        try {
            const result = await invoke<SimulationResult>('run_simulation_data');
            loadSimulation(result);
            alert('Simulation Complete: Loaded 1-Year Data for AI Tech Corp.');
        } catch (e) {
            console.error(e);
            alert('Simulation Failed: ' + e);
        } finally {
            setIsSimulating(false);
        }
    };

    // 1. Real-time Aggregation Logic
    const analytics = useMemo(() => {
        // A. Cash Flow (Monthly)
        const monthlyData = new Map<string, { income: number, expense: number }>();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}`;
            monthlyData.set(key, { income: 0, expense: 0 });
        }

        // Aggregate
        ledger.forEach(entry => {
            const date = new Date(entry.date);
            const key = months[date.getMonth()];

            if (monthlyData.has(key)) {
                const current = monthlyData.get(key)!;
                if (entry.type === 'Revenue') {
                    current.income += entry.amount;
                } else if (entry.type === 'Expense') {
                    current.expense += entry.amount;
                }
                monthlyData.set(key, current);
            }
        });

        // Convert to Array
        const cashFlowData = Array.from(monthlyData.entries()).map(([name, val]) => ({
            name,
            income: val.income,
            expense: val.expense
        }));

        // B. Metrics & Inventory
        let inventory = 0;
        let fixedAssets = 0;

        ledger.forEach(entry => {
            const desc = entry.description.toLowerCase();
            const accountD = entry.debitAccount;

            // Inventory Logic: Assume specific accounts or descriptions
            if (accountD.includes('재고') || accountD.includes('상품') || desc.includes('stock')) {
                inventory += entry.amount;
            }

            // Fixed Asset Logic
            if (entry.type === 'Asset' && (accountD.includes('비품') || accountD.includes('기계') || accountD.includes('장치'))) {
                fixedAssets += entry.amount;
            }
        });

        return { cashFlowData, inventory, fixedAssets };
    }, [ledger]);

    // Financial Position Data (Directly from Context ensuring A = L + E)
    const positionData = [
        { name: 'Assets', value: financials.totalAssets, color: '#4f46e5' },
        { name: 'Liabilities', value: financials.totalLiabilities, color: '#e11d48' },
        { name: 'Equity', value: financials.totalEquity, color: '#10b981' }
    ];

    // Tax Calendar Logic
    const currentMonth = new Date().getMonth() + 1;
    const taxEvents = [
        { date: '1.25', title: 'VAT Filing (2nd Period)', type: 'MAJOR' },
        { date: `${currentMonth}.10`, title: 'Withholding Tax', type: 'COMPLIANCE' },
        { date: '3.31', title: 'Corporate Tax', type: 'MAJOR' }
    ];

    const kpiCards = [
        {
            label: 'Total AR (Receivables)',
            value: financials.ar,
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            trend: '+12.5%' // Logic to be refined with historical data comparison later
        },
        {
            label: 'Total AP (Payables)',
            value: financials.ap,
            icon: CreditCard,
            color: 'text-rose-500',
            bg: 'bg-rose-50',
            trend: '-2.4%'
        },
        {
            label: 'Cash Reserve',
            value: financials.cash,
            icon: Wallet,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            trend: '+8.2%'
        },
        {
            label: 'Fixed Assets',
            value: analytics.fixedAssets,
            icon: Building2,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            trend: '+5.0%'
        }
    ];

    if (ledger.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-20">
                <div className="text-center animate-pulse">
                    <Activity className="mx-auto text-indigo-300 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-700">Loading Financial Data...</h3>
                    <p className="text-slate-400">Synchronizing with ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-400" size={32} />
                        총괄 경영 대시보드
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 ml-1">실시간 재무 인텔리전스 및 회계 감사 준비 지표</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                    >
                        {isSimulating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Play size={16} />
                        )}
                        AI Tech Corp 데이터 로드 (시뮬레이션)
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-[#151D2E] px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        실시간 데이터 동기화됨
                    </div>
                </div>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">

                {/* AI 경영 분석 요약 (Full Width) */}
                <div className="md:col-span-2 lg:col-span-4">
                    <ManagementReportPanel ledger={ledger} />
                </div>

                {/* 1. Cash Flow Chart (Span 3) */}
                <div className="md:col-span-2 lg:col-span-3 bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-black text-white">매출 및 비용 트렌드</h3>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> 매출
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-rose-500" /> 비용
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', padding: '12px 16px' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value: any) => `₩${(value || 0).toLocaleString()}`}
                                    cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Financial Position (Span 1) */}
                <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col justify-center h-[400px]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100/10 rounded-xl text-slate-400">
                            <Building2 size={20} />
                        </div>
                        <h3 className="text-lg font-black text-white">재무 구조 분석</h3>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={positionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} formatter={(value: any) => `₩${(value || 0).toLocaleString()}`} />
                                <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={40}>
                                    {positionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-3xl font-black text-white tracking-tighter">
                            ₩{financials.totalAssets.toLocaleString()}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">자산 총계 (KRW)</p>
                    </div>
                </div>

                {/* 3. KPI Cards Row */}
                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiCards.map((kpi, idx) => (
                        <div key={idx} className="bg-[#151D2E] p-6 rounded-[2rem] shadow-lg border border-white/5 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${kpi.bg.replace('bg-', 'bg-')}/10 ${kpi.color}`}>
                                    <kpi.icon size={22} />
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${kpi.trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'}`}>
                                    {kpi.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{kpi.label === 'Total AR (Receivables)' ? '매출채권 (AR)' : kpi.label === 'Total AP (Payables)' ? '매입채무 (AP)' : kpi.label === 'Cash Reserve' ? '현금성 자산' : '고정 자산'}</p>
                                <h4 className="text-2xl font-black text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                    ₩{kpi.value.toLocaleString()}
                                </h4>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 4. AI Forecast Panel (Full Width) */}
                <div className="md:col-span-2 lg:col-span-4">
                    <AIForecastPanel ledger={ledger} currentBalance={financials.cash} />
                </div>

                {/* 5. Recent Transactions (Full Width) */}
                <div className="md:col-span-2 lg:col-span-4 h-[400px]">
                    <RecentTransactions
                        transactions={ledger}
                        onNavigate={setTab}
                    />
                </div>
            </div>
        </div>
    );
};
