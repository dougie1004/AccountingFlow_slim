import React, { useMemo } from 'react';
import { ShieldCheck, Calendar, Wallet, ReceiptText, Zap, Activity, Banknote, Coins, PiggyBank } from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CEOQuickBarProps {
    financials: any;
    avgMonthlyBurn: number;
    runwayMonths?: number;
    isProfitable?: boolean;
    hasActivity?: boolean;
    onNavigate?: (tab: string) => void;
    timeRange?: 'day' | 'week' | 'month' | 'year';
}

export const CEOQuickBar: React.FC<CEOQuickBarProps> = ({ financials, avgMonthlyBurn, runwayMonths, isProfitable, hasActivity, onNavigate, timeRange = 'day' }) => {
    const cashBalance = financials.currentCash !== undefined ? financials.currentCash : financials.cash;
    const runway = runwayMonths !== undefined ? runwayMonths : (avgMonthlyBurn > 0 ? Math.floor((cashBalance || 0) / avgMonthlyBurn) : 0);
    const margin = financials.revenue > 0 ? Math.round(((financials.netIncome || 0) / financials.revenue) * 100) : 0;

    const rangeLabel = timeRange === 'day' ? '14 Days' : timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Yearly';

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Net Income (Profitability) */}
            <button
                onClick={() => {
                    localStorage.setItem('fs_initial_tab', 'pl');
                    if (financials.startDate) localStorage.setItem('fs_start_date', financials.startDate);
                    if (financials.endDate) localStorage.setItem('fs_end_date', financials.endDate);
                    onNavigate?.('trial-balance');
                }}
                className="text-left bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all"
            >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0 duration-700"><Activity size={120} /></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Activity size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Income ({rangeLabel})</span>
                            <InfoTooltip
                                title="Net Income (당기순이익)"
                                content="전체 수익에서 모든 비용을 차감한 순이익입니다. 장부에 기록된 Revenue와 Expense 항목을 기반으로 계산됩니다."
                                contextualTip="이 수치가 양수이면 이익, 음수이면 손실을 의미합니다."
                            />
                        </div>
                        <h3 className={`text-3xl font-black tracking-tight ${financials.isProfit ? 'text-white' : 'text-rose-400'}`}>
                            {financials.displayNetIncome || '-'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 mt-2">
                            당기순이익 (법인세 차감 전)
                        </p>
                    </div>
                </div>
            </button>

            {/* 2. Cash Position */}
            <button
                onClick={() => onNavigate?.('daily-cash')}
                className="text-left bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all"
            >
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] transition-transform group-hover:scale-110 duration-500"><Banknote size={100} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                            <Wallet size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Cash {financials.endDate && <span className="text-slate-600">({financials.endDate})</span>}</span>
                        <InfoTooltip
                            title="Current Cash (가용 현금)"
                            content="현재 즉시 사용 가능한 모든 현금 및 예금 계좌의 잔액 합계입니다."
                            contextualTip="일간 현금 보고서의 기말 잔액과 일치해야 합니다."
                        />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">₩{(cashBalance || 0).toLocaleString()}</h3>
                    {/* Breakdown by Dr/Cr as requested */}
                    <div className="flex flex-col gap-1 mt-2 w-full pr-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-white/5 pb-1">
                            <span>Inflow (Dr)</span>
                            <span className="text-emerald-400 font-mono tracking-tight">+₩{(financials.cashInflow || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-0.5">
                            <span>Outflow (Cr)</span>
                            <span className="text-rose-400 font-mono tracking-tight">-₩{(financials.cashOutflow || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </button>

            {/* 3. Monthly Burn Rate */}
            <button
                onClick={() => {
                    localStorage.setItem('fs_initial_tab', 'pl');
                    localStorage.setItem('fs_selected_account', 'GROUP:BURN_RATE');
                    // Burn rate is calculated over a longer baseline, show 'All' time to see the reference
                    localStorage.setItem('fs_start_date', '2023-01-01');
                    localStorage.setItem('fs_end_date', financials.endDate || new Date().toISOString().split('T')[0]);
                    onNavigate?.('trial-balance');
                }}
                className="text-left bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                            <Zap size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. Monthly Burn</span>
                        <InfoTooltip
                            title="Avg. Monthly Burn (월평균 지출액)"
                            content="선택된 기간 동안의 총 지출액을 월간(30.41일) 기준으로 환산한 수치입니다."
                            contextualTip="이 수치가 낮을수록 기업의 생존 기간(Runway)이 길어집니다."
                        />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">
                        ₩{Math.round(avgMonthlyBurn || 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">
                        {hasActivity ? '최근 30일 기준 평균 지출액' : '데이터가 없습니다.'}
                    </p>
                </div>
            </button>

            {/* 4. Runway & Efficiency */}
            <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                            <ReceiptText size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency & Runway</span>
                        <InfoTooltip
                            title="Efficiency & Runway (효율성 및 생존기간)"
                            content="현재의 현금 잔액과 지출 속도를 바탕으로 기업이 버틸 수 있는 예상 기간과 매출 대비 수익성을 나타냅니다."
                        />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase">현금 소진 기간</span>
                                <InfoTooltip
                                    title="Runway (현금 소진 기간)"
                                    content="현재 가용 현금을 월평균 지출액으로 나눈 값입니다. 추가 수입이 없을 때 얼마나 더 유지 가능한지 보여줍니다."
                                    contextualTip="안정적인 운영을 위해 최소 6개월 이상의 Runway 확보를 권장합니다."
                                />
                            </div>
                            <span className="text-xs font-black text-blue-400">{runway > 0 ? `${runway}개월` : '분석중'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase">순이익률</span>
                                <InfoTooltip
                                    title="Net Profit Margin (순이익률)"
                                    content="매출액에서 순이익이 차지하는 비율입니다. (순이익 / 매출액 * 100)"
                                    contextualTip="이익률이 높을수록 사업 모델의 효율성이 높음을 의미합니다."
                                />
                            </div>
                            <span className={`text-xs font-black ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {margin}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
