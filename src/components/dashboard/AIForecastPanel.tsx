import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, DollarSign, Calendar, Zap, Loader2, Sparkles, Activity, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { invoke } from '@tauri-apps/api/core';
import { JournalEntry } from '../../types';
import { parseAIList } from '../../utils/textUtils';
import { Tooltip as MyTooltip } from '../common/Tooltip';

interface CashFlowForecast {
    currentBalance: number;
    monthlyBurnRate: number;
    projectedMonths: MonthlyProjection[];
    governmentFundDepletionDate: string | null;
    riskLevel: string;
    recommendations: string[];
    aiInsights: string;
}

interface MonthlyProjection {
    month: string;
    projectedBalance: number;
    expectedRevenue: number;
    expectedExpenses: number;
    netCashFlow: number;
}

interface AIForecastPanelProps {
    ledger: JournalEntry[];
    currentBalance: number;
}

export const AIForecastPanel: React.FC<AIForecastPanelProps> = ({ ledger, currentBalance }) => {
    const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadForecast = async () => {
        if (ledger.length === 0) return;

        setIsLoading(true);
        try {
            const result = await invoke<CashFlowForecast>('generate_cash_flow_forecast', {
                ledger,
                currentBalance
            });
            setForecast(result);
        } catch (error) {
            console.error('[AI Forecast] 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadForecast();
    }, [ledger.length]);

    if (isLoading) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2rem] shadow-2xl border border-white/5 flex items-center justify-center h-[500px]">
                <div className="text-center">
                    <Loader2 size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400">시계열 분석 엔진 기반 현금 흐름 프로젝션 생성 중...</p>
                </div>
            </div>
        );
    }

    if (!forecast) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2rem] shadow-2xl border border-white/5 flex items-center justify-center h-[500px]">
                <div className="text-center">
                    <Zap size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-500">AI 분석을 위한 충분한 재무 데이터가 수집되지 않았습니다. (Demo Data 사용 권장)</p>
                    <button
                        onClick={loadForecast}
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    const chartData = forecast.projectedMonths.map(m => ({
        name: m.month,
        balance: m.projectedBalance,
        revenue: m.expectedRevenue,
        expenses: m.expectedExpenses
    }));

    const riskColor = forecast.riskLevel === 'High' ? 'text-rose-400 bg-rose-500/10' :
        forecast.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10' :
            'text-emerald-400 bg-emerald-500/10';

    return (
        <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Cash Flow Projection</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">Gemini 1.5 Pro Enterprise Engine</p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase ${riskColor}`}>
                    {forecast.riskLevel} Risk
                </div>
            </div>

            {/* Chart */}
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                            tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '12px'
                            }}
                            formatter={(value: any) => `₩${(value || 0).toLocaleString()}`}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            iconType="circle"
                        />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#6366f1' }}
                            name="예상 잔액"
                        />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="예상 수익"
                        />
                        <Line
                            type="monotone"
                            dataKey="expenses"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="예상 지출"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <MyTooltip content="총 현금에서 확정 부채(AP, VAT) 및 사용 제한 보조금을 차감한, 경영진이 실질적으로 즉시 집행 가능한 순자산입니다." position="top">
                    <div className="bg-[#0B1221] p-4 rounded-2xl border border-white/5 border-indigo-500/30 cursor-help">
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                            <Sparkles size={12} /> 실질 가용 자산 <HelpCircle size={10} className="text-indigo-500/50" />
                        </p>
                        <p className="text-xl font-black text-white">₩{currentBalance.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-through opacity-30">Cash - 확정부채 - 보조금</p>
                    </div>
                </MyTooltip>
                <div className="bg-[#0B1221] p-4 rounded-2xl border border-white/5">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">월평균 지출</p>
                    <p className="text-xl font-black text-rose-400">₩{forecast.monthlyBurnRate.toLocaleString()}</p>
                </div>
                <div className="bg-[#0B1221] p-4 rounded-2xl border border-white/5">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">정부지원금 소진</p>
                    <p className="text-xl font-black text-amber-400">
                        {forecast.governmentFundDepletionDate || 'N/A'}
                    </p>
                </div>
            </div>

            {/* AI Strategic Intelligence Summary */}
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Activity className="text-indigo-400" size={18} />
                        </div>
                        <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">Financial Intelligence Summary</span>
                    </div>
                    <p className="text-md font-bold text-slate-200 leading-relaxed max-w-3xl">
                        {forecast.riskLevel === 'High'
                            ? "유동성 위기가 우려되는 긴급 상황입니다. 현재의 현금 연소 속도로는 단기 내 운영 자금 고갈 위험이 매우 크므로, 즉각적인 자금 확보 계획 수립이 시급합니다."
                            : forecast.riskLevel === 'Medium'
                                ? "현금 흐름 모니터링이 필요한 주의 단계입니다. 지출 효율화가 진행 중이나, 예기치 못한 매출 감소에 대비한 유동성 버퍼 확보를 권장합니다."
                                : "재무 데이터 분석 결과, 현재 기업의 현금 흐름은 안정적인 궤도에 진입한 것으로 판단됩니다. 현재의 리스크 수준에서 체계적인 전략 실행이 가능한 상태입니다."
                        }
                    </p>
                </div>
            </div>

            {/* AI Insights (Technical) */}
            <div className="bg-[#0B1221] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-slate-500" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Technical Performance Data</span>
                </div>
                <div className="space-y-4">
                    {parseAIList(forecast.aiInsights).map((part, idx) => (
                        <div key={idx} className="flex gap-4">
                            <span className="flex-shrink-0 text-indigo-400 font-black text-xs pt-1">0{idx + 1}</span>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                {part}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            {forecast.recommendations.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-xs font-black text-amber-400 uppercase">권장 사항</span>
                    </div>
                    {forecast.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm font-bold text-slate-300 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{rec}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
