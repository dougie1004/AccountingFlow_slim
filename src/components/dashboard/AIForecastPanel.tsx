
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Sparkles, Activity, HelpCircle, Calendar, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAccounting } from '../../hooks/useAccounting';
import { ProjectedCashFlow, RunwayAnalysis, ScenarioType } from '../../core/forecastingEngine';
import { Tooltip as MyTooltip } from '../common/Tooltip';
import { formatCurrency } from '../../utils/formatUtils';

export const AIForecastPanel: React.FC = () => {
    const { getForecast, getRunway, ledger } = useAccounting();

    // State
    const [projection, setProjection] = useState<ProjectedCashFlow | null>(null);
    const [runway, setRunway] = useState<RunwayAnalysis | null>(null);
    const [scenario, setScenario] = useState<ScenarioType>('Baseline');
    const [isLoading, setIsLoading] = useState(false);

    // Effect: Load Forecast Logic
    useEffect(() => {
        if (ledger.length === 0) {
            setProjection(null);
            return;
        }

        setIsLoading(true);
        // Simulate "AI Thinking" delay (reduced for scenario switching)
        setTimeout(() => {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const targetPeriod = nextMonth.toISOString().substring(0, 7);

            const proj = getForecast(targetPeriod, scenario);
            const run = getRunway(scenario);

            setProjection(proj);
            setRunway(run);
            setIsLoading(false);
        }, 500);
    }, [ledger.length, scenario, getForecast, getRunway]);

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center justify-center h-[400px] animate-pulse">
                <div className="bg-indigo-500/20 p-4 rounded-full mb-4">
                    <Sparkles size={32} className="text-indigo-400 animate-spin" />
                </div>
                <p className="text-sm font-bold text-slate-400">AI Financial Engine이 미래 현금 흐름을 예측 중입니다...</p>
                <p className="text-xs font-bold text-slate-600 mt-2 uppercase tracking-wider">{scenario === 'Baseline' ? '기본' : scenario === 'Optimistic' ? '낙관적' : '보수적'} 시나리오 분석 중...</p>
            </div>
        );
    }

    // Empty State
    if (!projection || !runway) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center justify-center h-[400px]">
                <Activity size={48} className="text-slate-600 mb-4" />
                <p className="text-sm font-bold text-slate-500">예측을 위한 충분한 데이터가 없습니다.</p>
            </div>
        );
    }

    // Chart Data Preparation (History + Projection)
    const chartData = [
        { name: 'M-2', balance: runway.currentBalance * 0.9 + 5000000, revenue: projection.expectedInflow * 0.9, expenses: projection.expectedOutflow * 0.95 }, // Mock history for visual
        { name: 'M-1', balance: runway.currentBalance * 0.95 + 2000000, revenue: projection.expectedInflow * 0.95, expenses: projection.expectedOutflow * 1.05 },
        { name: 'Current', balance: runway.currentBalance, revenue: projection.expectedInflow, expenses: projection.expectedOutflow },
        { name: 'Projected', balance: projection.projectedBalance, revenue: projection.expectedInflow, expenses: projection.expectedOutflow, isProjected: true },
    ];

    const riskColor = runway.runwayMonths < 3 ? 'text-rose-400 bg-rose-500/10' :
        runway.runwayMonths < 6 ? 'text-amber-400 bg-amber-500/10' :
            'text-emerald-400 bg-emerald-500/10';

    const getScenarioColor = (s: ScenarioType) => {
        if (s === 'Optimistic') return 'text-emerald-400';
        if (s === 'Conservative') return 'text-rose-400';
        return 'text-indigo-400';
    };

    const getScenarioLabel = (s: ScenarioType) => {
        if (s === 'Baseline') return '기본 (Baseline)';
        if (s === 'Optimistic') return '낙관적 (Optimistic)';
        if (s === 'Conservative') return '보수적 (Conservative)';
        return s;
    };

    return (
        <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 space-y-6 transition-colors duration-500">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${scenario === 'Conservative' ? 'bg-rose-500/10 text-rose-400' :
                            scenario === 'Optimistic' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-indigo-500/10 text-indigo-400'
                        }`}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">AI 현금 흐름 예측 (Cash Flow Prediction)</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5 flex gap-1">
                            자동화 예측 엔진: <span className={getScenarioColor(scenario)}>{getScenarioLabel(scenario)}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-[#0B1221] p-1.5 rounded-xl border border-white/5">
                    {(['Baseline', 'Optimistic', 'Conservative'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setScenario(s)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${scenario === s
                                    ? s === 'Optimistic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-900/20'
                                        : s === 'Conservative' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-lg shadow-rose-900/20'
                                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {s === 'Baseline' ? '기본' : s === 'Optimistic' ? '낙관적' : '보수적'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Projected Balance */}
                <div className="bg-[#0B1221] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                        <DollarSign size={80} className="text-white" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">예상 현금 잔액 ({projection.period})</p>
                    <p className={`text-2xl font-black tracking-tight transition-colors ${scenario === 'Optimistic' ? 'text-emerald-100' :
                            scenario === 'Conservative' ? 'text-rose-100' : 'text-white'
                        }`}>
                        {formatCurrency(projection.projectedBalance)}
                    </p>
                    <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${projection.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {projection.netCashFlow >= 0 ? '+' : ''}{formatCurrency(projection.netCashFlow)} (순현금흐름)
                    </div>
                </div>

                {/* 2. Runway Metric */}
                <div className="bg-[#0B1221] p-5 rounded-2xl border border-white/5 flex flex-col justify-center relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1">
                        <Activity size={12} className={runway.runwayMonths < 6 ? 'text-amber-400' : 'text-emerald-400'} />
                        런웨이(Runway) 분석
                    </p>
                    <div className="flex items-end gap-2">
                        <p className={`text-2xl font-black ${runway.runwayMonths < 3 ? 'text-rose-400' :
                                runway.runwayMonths < 6 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                            {runway.runwayMonths >= 99 ? 'Stable' : `${runway.runwayMonths}`}
                        </p>
                        <span className="text-sm font-bold text-slate-500 mb-1">개월 (Month)</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold mt-2">
                        월 평균 소진율: {formatCurrency(runway.burnRate)} 기준
                    </p>
                </div>

                {/* 3. Recurring Costs */}
                <div className="bg-[#0B1221] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <RefreshCw size={12} className="text-indigo-400" />
                            자동 감지된 고정비 (Fixed Costs)
                        </p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {projection.details.recurringExpenses.length > 0 ? (
                            projection.details.recurringExpenses.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex-shrink-0 bg-[#151D2E] px-3 py-2 rounded-xl border border-white/5 min-w-[100px]">
                                    <div className="text-[9px] text-slate-400 truncate font-bold">{item.name}</div>
                                    <div className="text-xs font-black text-white">{formatCurrency(item.amount)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-slate-600 font-bold italic">고정비 패턴 없음</div>
                        )}
                        {projection.details.recurringExpenses.length > 2 && (
                            <div className="flex-shrink-0 bg-[#151D2E] px-3 py-2 rounded-xl border border-white/5 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-slate-500">+{projection.details.recurringExpenses.length - 2}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] bg-[#0B1221]/50 rounded-2xl p-2 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}
                            formatter={(value: any) => formatCurrency(value)}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke={scenario === 'Conservative' ? '#f43f5e' : scenario === 'Optimistic' ? '#10b981' : '#6366f1'}
                            strokeWidth={3}
                            dot={{ r: 4, fill: scenario === 'Conservative' ? '#f43f5e' : scenario === 'Optimistic' ? '#10b981' : '#6366f1' }}
                            name="현금 잔액 (Cash Balance)"
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="유입 (Inflow)" />
                        <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} name="유출 (Outflow)" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* AI Insight Text */}
            <div className={`border rounded-2xl p-4 transition-colors ${scenario === 'Conservative' ? 'bg-rose-500/5 border-rose-500/10' :
                    scenario === 'Optimistic' ? 'bg-emerald-500/5 border-emerald-500/10' :
                        'bg-indigo-500/5 border-indigo-500/10'
                }`}>
                <div className="flex items-start gap-3">
                    <Sparkles size={16} className={`mt-1 shrink-0 ${scenario === 'Conservative' ? 'text-rose-400' :
                            scenario === 'Optimistic' ? 'text-emerald-400' :
                                'text-indigo-400'
                        }`} />
                    <div>
                        <p className={`text-xs font-bold leading-relaxed ${scenario === 'Conservative' ? 'text-rose-200' :
                                scenario === 'Optimistic' ? 'text-emerald-200' :
                                    'text-indigo-200'
                            }`}>
                            {scenario === 'Baseline' && "과거 3개월 데이터 기반으로 예측된 표준 시나리오입니다. 현재의 수입/지출 추세가 지속될 경우를 가정합니다."}
                            {scenario === 'Optimistic' && "매출이 15% 성장하고 비용 효율성이 유지되는 긍정적인 시나리오입니다. 공격적인 투자가 가능할 수 있습니다."}
                            {scenario === 'Conservative' && "매출 감소(-10%) 및 물가 상승(+10%)을 가정한 스트레스 테스트입니다. 이 시나리오에서도 Runway가 6개월 이상 유지되는지 확인하세요."}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-2">
                            분석 결과: {runway.runwayMonths < 3 ? "위험 (CRITICAL RISK)" : runway.runwayMonths < 6 ? "주의 (CAUTION)" : "양호 (STABLE)"} (Runway: {runway.runwayMonths} 개월)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icon Helper
const DollarSign = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
);
