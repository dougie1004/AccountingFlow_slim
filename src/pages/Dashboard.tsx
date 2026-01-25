import React, { useMemo, useState } from 'react';
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
    ShieldCheck,
    Terminal,
    Zap,
    HelpCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AIForecastPanel } from '../components/dashboard/AIForecastPanel';
import { ManagementReportPanel } from '../components/dashboard/ManagementReportPanel';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { Tooltip } from '../components/common/Tooltip';
import { generateShowcaseData, generateSystemWideMockData } from '../utils/mockDataGenerator';
import { formatCLevel } from '../utils/formatUtils';

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials, config, resetData, loadSimulation } = useAccounting();

    // Layout stability fix for Recharts
    const [isMounted, setIsMounted] = useState(false);
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const [isSimulating, setIsSimulating] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const handleRunSimulation = () => {
        const results = generateSystemWideMockData();
        loadSimulation(results);
    };

    const toggleDemoMode = () => {
        if (!isDemoMode) {
            handleRunSimulation();
        } else {
            resetData();
        }
        setIsDemoMode(!isDemoMode);
    };

    // 1. Real-time Aggregation Logic
    const analytics = useMemo(() => {
        // 1. 실제 과거 6개월 데이터 집계 (연도-월 기준)
        const today = new Date();
        const past6MonthsKeys: string[] = [];
        const monthlyData: Record<string, { income: number; expense: number }> = {};
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            past6MonthsKeys.push(key);
            monthlyData[key] = { income: 0, expense: 0 };
        }

        ledger.forEach(entry => {
            const date = new Date(entry.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (monthlyData[key]) {
                if (entry.type === 'Revenue') monthlyData[key].income += entry.amount;
                if (entry.type === 'Expense' || entry.type === 'Payroll') monthlyData[key].expense += entry.amount;
            }
        });

        const cashFlowData = past6MonthsKeys.map(key => {
            const [year, month] = key.split('-');
            const label = `${year.slice(2)}년 ${parseInt(month)}월`;
            return {
                name: label,
                income: monthlyData[key].income,
                expense: monthlyData[key].expense
            };
        });

        let rndAssetValue = 0;
        let stockOptionExpense = 0;
        let fxGainLoss = 0;
        let fxExposure = 0;

        ledger.forEach(e => {
            if (e.description.includes('[R&D]')) rndAssetValue += e.amount;
            if (e.description.includes('Stock Option')) stockOptionExpense += e.amount;
            if (e.vendor === 'Forex') {
                fxGainLoss += (e.amount * 0.05);
                fxExposure += e.amount;
            }
        });

        const estimatedTaxCredit = rndAssetValue * 0.25;
        const totalRevenueLast3m = cashFlowData.slice(-3).reduce((sum, d) => sum + d.income, 0);
        const totalExpenseLast3m = cashFlowData.slice(-3).reduce((sum, d) => sum + d.expense, 0);
        const averageMonthlyBurn = totalExpenseLast3m / Math.min(3, cashFlowData.length || 1);
        const averageMonthlyRevenue = totalRevenueLast3m / Math.min(3, cashFlowData.length || 1);

        // 흑자 여부는 매출이 발생하고, 그 매출이 비용보다 클 때만 true로 설정
        const isProfitable = averageMonthlyRevenue > 0 && averageMonthlyRevenue >= averageMonthlyBurn;
        const hasActivity = ledger.length > 0;

        return {
            cashFlowData,
            totalRndInvestment: rndAssetValue,
            stockOptionExpense,
            fxGainLoss,
            fxExposure,
            estimatedTaxCredit,
            averageMonthlyBurn,
            averageMonthlyRevenue,
            isProfitable,
            hasActivity
        };
    }, [ledger]);

    const briefing = useMemo(() => {
        if (!analytics.hasActivity) {
            return {
                status: 'READY',
                cashText: `₩${financials.realAvailableCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                schedule: "데이터 연동 대기 중",
                message: "현재 분석할 경영 데이터가 존재하지 않습니다. 전표 데이터 또는 시뮬레이션 데이터셋을 가동하여 분석을 시작하십시오."
            };
        }

        // More conservative runway calculation (Enterprise Standard)
        // If profitable, runway is effectively infinite
        const runway = analytics.isProfitable ? 999 : (analytics.averageMonthlyBurn > 0 ? financials.realAvailableCash / analytics.averageMonthlyBurn : 24);

        let status = 'CRITICAL';
        let message = "유동성 위기 단계입니다. 즉각적인 비용 절감 및 자금 조달 전략이 시급합니다.";

        if (analytics.isProfitable) {
            status = 'GROWTH';
            message = "안정적인 흑자 구조를 유지하고 있습니다. 잉여 현금 흐름을 통한 재투자 전략 수립이 권장됩니다.";
        } else if (runway >= 12) {
            status = 'STABLE';
            message = "자금 흐름이 안정적입니다. 장기적인 투자 및 재무 전략 추진이 가능합니다.";
        } else if (runway >= 6) {
            status = 'MONITOR';
            message = "현금 흐름 모니터링이 필요한 구간입니다. 고정비 지출 속도를 조절하십시오.";
        }

        return {
            status,
            cashText: `₩${financials.realAvailableCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            schedule: "금일 실시간 전표 처리: 0건 대기 중",
            message
        };
    }, [financials, analytics]);

    const kpiCards = [
        { label: '현금 및 현금성 자산', description: 'BS 상의 총 현금 및 예금 계정 잔액 합계입니다.', value: financials.cash, icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: '매출채권 (AR)', description: '발생주의 기준 매출 중 아직 현금으로 회수되지 않은 미수금 총액입니다.', value: financials.ar, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: '매입채무 (AP)', description: '확정된 비용 중 아직 지급되지 않은 채무이며, 상환 시 가용 자금이 감소합니다.', value: financials.ap, icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: '현금 연소율 (Burn Rate)', description: '최근 3개월간의 평균 월간 현금 유출액으로, 런웨이(Runway) 분석의 핵심 지표입니다.', value: analytics.averageMonthlyBurn, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
    ];

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 animate-in fade-in duration-500 pb-12">
            <header className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Activity className="text-indigo-400" size={32} />
                            경영 관리 대시보드
                        </h2>
                        <p className="text-slate-400 font-bold mt-2 ml-1 text-xs md:text-sm uppercase tracking-wider">Enterprise Financial Controller Console</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setTab?.('migration')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                        >
                            <Zap size={16} />
                            신규 데이터 인계 및 연동
                        </button>
                        <button
                            onClick={toggleDemoMode}
                            disabled={isSimulating}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${isDemoMode ? 'bg-[#1e293b] text-white border border-white/10 shadow-lg' : 'bg-[#151D2E] text-slate-400 border border-white/5'
                                }`}
                        >
                            <Terminal size={16} />
                            {isDemoMode ? '데이터 프로젝션 가동 중' : '엔터프라이즈 데이터셋 프로젝션'}
                        </button>
                    </div>
                </div>
            </header>

            <CEOQuickBar
                financials={financials}
                avgMonthlyBurn={analytics.averageMonthlyBurn}
                isProfitable={analytics.isProfitable}
                hasActivity={analytics.hasActivity}
            />

            <div className="flex items-center gap-2 px-6 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl w-fit">
                <ShieldCheck className="text-indigo-400" size={16} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Secured Local-First Architecture: AES-256 GCM Encryption</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
                <div className="md:col-span-2 lg:col-span-4">
                    <ManagementReportPanel ledger={ledger} />
                </div>

                <div className="lg:col-span-3 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-[450px] shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">최근 6개월 현금 흐름 추이 (Historical Cash Flow)</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-w-0">
                        {/* Recharts dimension fix: Ensure container is mounted before calculating size */}
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.cashFlowData}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: 'none' }}
                                        formatter={(v: any) => `₩${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    />
                                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <CFOReportCard
                        metrics={analytics}
                        onViewReport={() => setTab('reports')}
                        certifications={{
                            hasRDDept: config.entityMetadata?.hasRDDept,
                            hasRDLab: config.entityMetadata?.hasRDLab
                        }}
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiCards.map((kpi, idx) => (
                        <div key={idx} className="bg-[#151D2E] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all group overflow-hidden">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <kpi.icon size={20} className="sm:size-6" />
                            </div>
                            <Tooltip key={kpi.label} content={kpi.description} position="top">
                                <div className="p-2 -m-2 inline-block">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 cursor-help flex items-center gap-1 border-b border-white/10 w-fit pointer-events-none">
                                        {kpi.label} <HelpCircle size={10} className="text-slate-600" />
                                    </p>
                                </div>
                            </Tooltip>
                            <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter truncate">{formatCLevel(kpi.value)}</h4>
                        </div>
                    ))}
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                    <AIForecastPanel
                        ledger={ledger}
                        currentBalance={financials.realAvailableCash}
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-4 h-[400px]">
                    <RecentTransactions
                        transactions={ledger}
                        onNavigate={setTab}
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                    <div className="bg-[#151D2E] border border-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-indigo-500/40 transition-all shadow-xl gap-6">
                        <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                            <div className="p-3 sm:p-4 bg-indigo-600 rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-600/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Activity className="text-white" size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
                                    CFO Strategic Performance Report
                                    <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full ${['STABLE', 'GROWTH'].includes(briefing.status) ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                        {briefing.status}
                                    </span>
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-300 text-xs sm:text-sm font-bold">
                                    <Tooltip content="총 현금에서 확정 부채(AP, VAT) 및 사용 제한 보조금을 차감한, 경영진이 실질적으로 즉시 집행 가능한 자금입니다." position="top">
                                        <span className="flex items-center gap-1 cursor-help border-b border-indigo-400/20"><Wallet size={12} className="text-indigo-400" /> 실가용자금: {briefing.cashText} <HelpCircle size={10} className="text-indigo-500/50" /></span>
                                    </Tooltip>
                                    <span className="flex items-center gap-1"><Calendar size={12} className="text-indigo-400" /> {briefing.schedule}</span>
                                </div>
                                <p className="text-slate-400 font-bold text-xs sm:text-sm pt-2 leading-relaxed">
                                    {briefing.message}
                                </p>
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <button
                                onClick={() => setTab?.('advanced-ledger')}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/10 transition-all active:scale-95"
                            >
                                상세 전략 모듈 가동 <ArrowUpRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
