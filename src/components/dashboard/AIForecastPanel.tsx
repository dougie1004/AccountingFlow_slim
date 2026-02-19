
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, AlertTriangle, Sparkles, Activity, HelpCircle, Calendar, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useAccounting } from '../../hooks/useAccounting';
import { isCashAccount, CashPolicy } from '../../constants/accounts';
import { ProjectedCashFlow, RunwayAnalysis, ScenarioType } from '../../types';
import { Tooltip as MyTooltip } from '../common/Tooltip';
import { formatCurrency } from '../../utils/formatUtils';

export const AIForecastPanel: React.FC<{ referenceDate?: string }> = ({ referenceDate }) => {
    const { getForecast, getRunway, ledger, simulationViewMode, setSimulationViewMode } = useAccounting();

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
        // Simulate "AI Thinking" delay
        setTimeout(() => {
            try {
                // Use referenceDate if available, otherwise fallback to system today
                // CRITICAL: Ensure baseDate is valid to prevent RangeError in toISOString
                let baseDate = referenceDate ? new Date(referenceDate) : new Date();
                if (isNaN(baseDate.getTime())) {
                    baseDate = new Date();
                }

                const targetDate = new Date(baseDate);
                targetDate.setDate(1); // Reset to 1st to avoid rollover
                targetDate.setMonth(targetDate.getMonth() + 1);
                const targetPeriod = targetDate.toISOString().substring(0, 7);

                const proj = getForecast(targetPeriod, scenario);
                const run = getRunway(scenario);

                setProjection(proj);
                setRunway(run);
            } catch (err) {
                console.error("Critical error in AI Forecast Engine:", err);
                // Fallback to empty state instead of crashing
                setProjection(null);
                setRunway(null);
            } finally {
                setIsLoading(false);
            }
        }, 500);
    }, [ledger.length, scenario, getForecast, getRunway, referenceDate, simulationViewMode]);

    // --- REAL DATA ENGINE: Calculate History & Future Simulation ---
    const chartData = useMemo(() => {
        try {
            if (!projection || !runway || ledger.length === 0) return [];

            const baseDate = referenceDate ? new Date(referenceDate) : new Date();
            if (isNaN(baseDate.getTime())) return [];

            // [PERFORMANCE OPS] Pre-calculate Monthly Totals (O(N))
            // Instead of filtering the ledger 16 times, we iterate ONCE.
            const monthlyStats = new Map<string, { inflow: number; outflow: number }>();

            ledger.forEach(e => {
                if (e.status !== 'Approved' && e.status !== 'Pending Review') return;
                const period = e.date.substring(0, 7);

                const current = monthlyStats.get(period) || { inflow: 0, outflow: 0 };
                const total = (e.amount || 0) + (e.vat || 0);
                const type = CashPolicy.isExternalFlow(e.debitAccount, e.creditAccount);

                if (type === 'INFLOW') current.inflow += total;
                else if (type === 'OUTFLOW') current.outflow += total;

                monthlyStats.set(period, current);
            });

            // Define range: -3 months (History) to +12 months (Future Simulation)
            const range = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

            const getDataForMonth = (offset: number) => {
                const d = new Date(baseDate);
                d.setDate(1); // Anchor to 1st
                d.setMonth(d.getMonth() + offset);
                const periodStr = d.toISOString().substring(0, 7);
                const isFuture = offset > 0;

                // 1. Get from Map (O(1))
                const stats = monthlyStats.get(periodStr);

                // If it's future and no real data exists, use AI Projection
                // (Or if we want to combine both? Simulation usually implies AI replaces empty future)
                const useAI = isFuture && (!stats || (stats.inflow === 0 && stats.outflow === 0));

                let inflow = 0;
                let outflow = 0;

                if (useAI) {
                    inflow = projection.expectedInflow;
                    outflow = projection.expectedOutflow;
                } else if (stats) {
                    inflow = stats.inflow;
                    outflow = stats.outflow;
                }

                return {
                    name: periodStr,
                    inflow,
                    outflow,
                    net: inflow - outflow,
                    isFuture,
                    isGoldenCross: false
                };
            };

            const flowData = range.map(offset => getDataForMonth(offset));

            // Calculate Balances
            let runningBalance = runway.currentBalance;

            // 1. Forward Pass
            const futureWithBalance = flowData.filter(d => d.isFuture).map(d => {
                runningBalance += d.net;
                // Golden Cross: Net > 0 and Inflow > Outflow * 1.1 (Healthy Surplus)
                const isGoldenCross = d.net > 0 && d.inflow > d.outflow * 1.1;
                return { ...d, balance: runningBalance, isGoldenCross };
            });

            // 2. Backward Pass (Approximate History)
            let backwardBalance = runway.currentBalance;
            const currentAndHistory = flowData.filter(d => !d.isFuture).reverse().map(d => {
                const snapshot = backwardBalance;
                backwardBalance -= d.net; // Reverse the net flow
                return { ...d, balance: snapshot };
            }).reverse();

            return [...currentAndHistory, ...futureWithBalance];

        } catch (error) {
            console.error("Chart Data Calculation Failed:", error);
            return [];
        }
    }, [ledger, referenceDate, projection, runway]);

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
                        <h3 className="text-lg font-black text-white">AI 현금 흐름 예측</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5 flex gap-1">
                            자동화 예측 엔진: <span className={getScenarioColor(scenario)}>{getScenarioLabel(scenario)}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#0B1221] p-1.5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setSimulationViewMode('REALITY')}
                            title="현실적 가디언: 성장이 정체되고 지출이 예상보다 늘어나는 스트레스 테스트 상황"
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${simulationViewMode === 'REALITY'
                                ? 'bg-slate-700 text-white shadow-lg shadow-slate-900/40'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            REALITY
                        </button>
                        <button
                            onClick={() => setSimulationViewMode('ROSE')}
                            title="장밋빛 희망: 공격적 성장과 비용 절감이 동시에 달성되는 낙관적 상황"
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${simulationViewMode === 'ROSE'
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            ROSE-COLORED
                        </button>
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
            </div>

            {/* Strategy Context Footnote */}
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#0B1221] border border-white/5">
                <HelpCircle size={12} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-500">
                    과거 지표는 실제 기록(Fact)이며, 미래 구간은 선택하신 시나리오 모델에 의해 계측된 시뮬레이션입니다.
                </span>
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
                        <p className={`text-2xl font-black ${runway.runwayMonths >= 99 ? 'text-emerald-400' : (runway.runwayMonths < 3 ? 'text-rose-400' : 'text-amber-400')
                            }`}>
                            {runway.runwayMonths >= 99 ? '안정적' : `${runway.runwayMonths}`}
                        </p>
                        {runway.runwayMonths < 99 && <span className="text-sm font-bold text-slate-500 mb-1">개월 남음</span>}
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                        <p className="text-[10px] text-slate-400 font-bold flex justify-between">
                            <span>순 현금 소진액:</span>
                            <span className="text-white">{formatCurrency(runway.burnRate)}</span>
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold flex justify-between border-t border-white/5 pt-1">
                            <span>총 지출액:</span>
                            <span>{formatCurrency((runway as any).grossBurnRate)}</span>
                        </p>
                    </div>
                </div>

                {/* 3. Recurring Costs */}
                <div className="bg-[#0B1221] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <RefreshCw size={12} className="text-indigo-400" />
                            자동 감지된 고정비
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
            <div className="h-[240px] bg-[#0B1221]/50 rounded-2xl p-2 border border-white/5 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                            interval={1} // Show every 2nd label if crowded
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}
                            formatter={(value: any, name: any) => {
                                const label = name.includes('잔액') ? '현금 잔액' : (name.includes('유입') ? '현금 유입' : '현금 유출');
                                return [formatCurrency(value as number), label];
                            }}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', bottom: -5 }} />

                        {/* Reference Line for Zero Balance (Bankruptcy Line) */}
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />

                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke={scenario === 'Conservative' ? '#f43f5e' : scenario === 'Optimistic' ? '#10b981' : '#6366f1'}
                            strokeWidth={3}
                            // Custom Dot for Golden Cross
                            dot={(props: any) => {
                                const isGolden = props.payload.isGoldenCross;
                                if (isGolden) return (
                                    <svg x={props.cx - 6} y={props.cy - 6} width={12} height={12} fill="#fbbf24" viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                );
                                return <circle cx={props.cx} cy={props.cy} r={3} fill={props.stroke} />;
                            }}
                            name="현금 잔액 (Global Simulation)"
                        />
                        <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="유입 (Inflow)" />
                        <Line type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} name="유출 (Outflow)" />
                    </LineChart>
                </ResponsiveContainer>

                {/* Overlay Badge for Golden Cross if detected */}
                {chartData.some(d => d.isGoldenCross) && (
                    <div className="absolute top-2 left-2 bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 animate-pulse">
                        <Sparkles size={10} />
                        GOLDEN CROSS DETECTED
                    </div>
                )}
            </div>

            {/* AI Insight Text */}
            <div className={`border rounded-2xl p-4 transition-colors ${scenario === 'Conservative' ? 'bg-rose-500/5 border-rose-500/10' :
                scenario === 'Optimistic' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    'bg-indigo-500/5 border-indigo-500/10'
                }`}>
                <div className="flex items-start gap-3">
                    <Sparkles size={16} className={`mt-1 shrink-0 ${runway.runwayMonths > 12 ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div>
                        <p className={`text-xs font-bold leading-relaxed ${scenario === 'Conservative' ? 'text-rose-200' :
                            scenario === 'Optimistic' ? 'text-emerald-200' :
                                'text-indigo-200'
                            }`}>
                            {projection.details.simulationDisclaimer}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-2">
                            분석 결과: {runway.runwayMonths < 3 ? "위험 (CRITICAL)" : runway.runwayMonths > 24 ? "성장 궤도 진입 (GROWTH)" : "양호 (STABLE)"} (Runway: {runway.runwayMonths} 개월)
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
