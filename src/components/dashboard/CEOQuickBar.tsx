import React, { useMemo } from 'react';
import { ShieldCheck, Calendar, Wallet, ReceiptText, Zap, Activity, Banknote, Coins, PiggyBank } from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CEOQuickBarProps {
    financials: any;
    avgMonthlyBurn: number;
    isProfitable?: boolean;
    hasActivity?: boolean;
}

export const CEOQuickBar: React.FC<CEOQuickBarProps> = ({ financials }) => {
    // Zero Logic Here. Only Render.

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Net Income (Profitability) */}
            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0 duration-700"><Activity size={120} /></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Activity size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Income (YTD)</span>
                        </div>
                        <h3 className={`text-3xl font-black tracking-tight ${financials.isProfit ? 'text-white' : 'text-rose-400'}`}>
                            {financials.displayNetIncome || '-'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 mt-2">
                            당기순이익 (법인세 차감 전)
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Cash Position */}
            <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] transition-transform group-hover:scale-110 duration-500"><Banknote size={100} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                            <Wallet size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Cash</span>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{financials.displayCash || '-'}</h3>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-black text-emerald-400 uppercase">Liquid</span>
                        <span className="text-[10px] font-bold text-slate-500">가용 현금 자산</span>
                    </div>
                </div>
            </div>

            {/* 3. Total Expenses (YTD) */}
            <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                            <Zap size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Expenses</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-black text-white tracking-tight">
                            {financials.displayExpenses}
                        </h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">
                        {financials.hasActivity ? '올해 누적 지출 합계' : '데이터가 없습니다.'}
                    </p>
                </div>
            </div>

            {/* 4. Quick Pending Overview */}
            <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                            <ReceiptText size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">미수금 (AR)</span>
                            <span className="text-xs font-black text-emerald-400">{financials.displayAr || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">미지급금 (AP)</span>
                            <span className="text-xs font-black text-rose-400">{financials.displayAp || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
