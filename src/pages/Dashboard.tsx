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
    Play,
    ShieldCheck
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AIForecastPanel } from '../components/dashboard/AIForecastPanel';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { invoke } from '@tauri-apps/api/core';
import { SimulationResult } from '../types';

export const Dashboard: React.FC<{ setTab?: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, loadSimulation, resetData } = useAccounting();
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

        // B. Metrics & Inventory & Advanced
        let inventory = 0;
        let fixedAssets = 0;
        let rndAssetValue = 0;
        let stockOptionExpense = 0;
        let fxGainLoss = 0;
        let fxExposure = 0;

        ledger.forEach(entry => {
            const desc = entry.description.toLowerCase();
            const accountD = entry.debitAccount;
            const accountC = entry.creditAccount;

            if (accountD.includes('재고') || accountD.includes('상품') || desc.includes('stock')) {
                inventory += entry.amount;
            }

            if (entry.type === 'Asset' && (accountD.includes('비품') || accountD.includes('기계') || accountD.includes('장치'))) {
                fixedAssets += entry.amount;
            }

            // Advanced Ledger Metrics extraction
            if (accountD.includes('무형자산(개발비)')) {
                rndAssetValue += entry.amount;
            }
            if (accountD.includes('주식보상비용')) {
                stockOptionExpense += entry.amount;
            }
            if (accountD.includes('외화예금(평가)') || accountD.includes('외화환산')) {
                if (accountC.includes('외화환산이익')) fxGainLoss += entry.amount;
                if (accountD.includes('외화환산손실')) fxGainLoss -= entry.amount;
                fxExposure += entry.amount;
            }

            // Tax Credit Estimation (R&D 25%)
            if ((accountD.includes('급여') || accountD.includes('인건비')) && (desc.includes('연구') || desc.includes('개발'))) {
                rndAssetValue += 0; // Don't add twice
            }
        });

        // Simplified Tax Credit: 25% of R&D labor
        const estimatedTaxCredit = rndAssetValue * 0.25;

        // C. Burn Rate calculation (Average of last 3 months expense)
        const totalExpenseLast3m = cashFlowData.slice(-3).reduce((sum, d) => sum + d.expense, 0);
        const averageMonthlyBurn = totalExpenseLast3m / Math.min(3, cashFlowData.length || 1);

        return { cashFlowData, inventory, fixedAssets, rndAssetValue, stockOptionExpense, fxGainLoss, fxExposure, estimatedTaxCredit, averageMonthlyBurn };
    }, [ledger]);

    const positionData = [
        { name: 'Assets', value: financials.totalAssets, color: '#4f46e5' },
        { name: 'Liabilities', value: financials.totalLiabilities, color: '#e11d48' },
        { name: 'Equity', value: financials.totalEquity, color: '#10b981' }
    ];

    const kpiCards = [
        {
            label: '현금 및 현금성 자산',
            subLabel: 'Cash & Cash Equivalents',
            value: financials.cash,
            icon: Wallet,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            status: '가동 가능'
        },
        {
            label: '매출채권 (AR)',
            subLabel: 'Accounts Receivable',
            value: financials.ar,
            icon: TrendingUp,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            status: '입금 예정'
        },
        {
            label: '매입채무 (AP)',
            subLabel: 'Accounts Payable',
            value: financials.ap,
            icon: CreditCard,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
            status: '지급 대기'
        },
        {
            label: '순운전자본',
            subLabel: 'Net Working Capital',
            value: financials.ar - financials.ap,
            icon: Activity,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            status: '운영 자금'
        }
    ];

    if (ledger.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] bg-[#0B1221] animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                    <Activity className="relative text-indigo-400 mb-8 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" size={80} />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight text-center">
                    AccountingFlow에 오신 것을 환영합니다
                </h2>
                <p className="text-slate-400 text-lg mb-10 text-center max-w-md font-medium leading-relaxed">
                    아직 등록된 장부가 없습니다.<br />
                    <span className="text-indigo-400 font-bold">샘플 데이터</span>로 기능을 체험하거나,<br />
                    새로운 장부를 만들어 시작해 보세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => {
                            resetData();
                            if (setTab) setTab('migration');
                        }}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-lg font-black hover:scale-105 transition-all shadow-2xl shadow-indigo-500/40 active:scale-95 disabled:opacity-50 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Play size={20} className="fill-white" />
                        샘플 데이터로 체험하기 (시연 시작)
                    </button>
                    <button
                        onClick={() => {
                            resetData();
                            if (setTab) setTab('migration');
                        }}
                        className="px-8 py-4 bg-white/5 text-slate-400 rounded-2xl text-lg font-bold hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                        실제 데이터 업로드
                    </button>
                </div>
                <p className="mt-6 text-xs font-bold text-slate-600 uppercase tracking-widest">
                    Enterprise-Grade Security & AI Analysis
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-400" size={32} />
                        경영 관리 대시보드
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 ml-1 text-sm uppercase tracking-wider">AI Automated Accounting & Tax Overview</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#151D2E] text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-bold hover:bg-indigo-500/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSimulating ? (
                            <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                        ) : (
                            <Play size={16} />
                        )}
                        샘플 데이터 리셋
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="w-2 rounded-full h-2 bg-emerald-500 animate-pulse"></span>
                        Live Sync Active
                    </div>
                </div>
            </header>

            <CEOQuickBar
                financials={financials}
                avgMonthlyBurn={analytics.averageMonthlyBurn}
            />

            <div className="flex items-center gap-2 px-6 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl w-fit">
                <ShieldCheck className="text-indigo-400" size={16} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Local-First Architecture: Your data never leaves this machine.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
                <div className="md:col-span-2 lg:col-span-4">
                    <ManagementReportPanel ledger={ledger} />
                </div>

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

                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiCards.map((kpi, idx) => (
                        <div key={idx} className="bg-[#151D2E] p-7 rounded-[2.5rem] shadow-lg border border-white/5 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon size={24} />
                                </div>
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/5 text-slate-400 uppercase tracking-tighter">
                                    {kpi.status}
                                </span>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
                                <p className="text-xs font-bold text-slate-400 mb-3">{kpi.subLabel}</p>
                                <h4 className="text-3xl font-black text-white tracking-tighter">
                                    {(kpi as any).isPercentage ? `${kpi.value.toLocaleString()}%` : (kpi as any).isUnit ? `${kpi.value.toLocaleString()}${(kpi as any).isUnit}` : `₩${kpi.value.toLocaleString()}`}
                                </h4>
                            </div>
                            <div className={`absolute bottom-0 right-0 w-32 h-32 ${kpi.bg} blur-[60px] translate-x-10 translate-y-10 opacity-20 group-hover:opacity-40 transition-opacity`} />
                        </div>
                    ))}
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                    <CFOReportCard
                        metrics={{
                            rndAssetValue: analytics.rndAssetValue,
                            stockOptionExpense: analytics.stockOptionExpense,
                            fxGainLoss: analytics.fxGainLoss,
                            fxExposure: analytics.fxExposure,
                            estimatedTaxCredit: analytics.estimatedTaxCredit
                        }}
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                    <AIForecastPanel ledger={ledger} currentBalance={financials.realAvailableCash} />
                </div>

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
