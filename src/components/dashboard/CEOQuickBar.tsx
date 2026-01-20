import React, { useMemo } from 'react';
import { ShieldCheck, Calendar, Wallet, ReceiptText, Zap, ArrowRight, Activity, HelpCircle } from 'lucide-react';
import { FinancialSummary } from '../../types';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CEOQuickBarProps {
    financials: FinancialSummary;
    avgMonthlyBurn: number;
}

export const CEOQuickBar: React.FC<CEOQuickBarProps> = ({ financials, avgMonthlyBurn }) => {
    const runway = useMemo(() => {
        if (avgMonthlyBurn <= 0) return 0;
        return financials.realAvailableCash / avgMonthlyBurn;
    }, [financials.realAvailableCash, avgMonthlyBurn]);

    const taxReserve = financials.vatNet > 0 ? financials.vatNet : 0;

    const runwayEndDate = useMemo(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + Math.floor(runway));
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    }, [runway]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Life Expectancy (Runway) */}
            <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-500/30">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Calendar size={120} />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-indigo-100 font-black text-xs uppercase tracking-widest">
                                <Activity size={12} /> Survival Engine
                            </div>
                            <InfoTooltip
                                title="Runway"
                                content="수입이 0일 때, 지금 잔액으로 버틸 수 있는 개월 수입니다."
                                contextualTip={`현재 현금 흐름 기준, ${runwayEndDate}까지 운영 가능합니다.`}
                            />
                        </div>
                        <h4 className="text-white/80 font-bold text-sm tracking-tight mb-4">현재 비즈니스 생존 일수 (Runway)</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white tracking-tighter">{(runway * 30.4).toFixed(0)}</span>
                            <span className="text-2xl font-bold text-indigo-200">일</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black text-white uppercase">
                            {runway.toFixed(1)} Months Left
                        </span>
                        <p className="text-indigo-200 text-[10px] font-bold">평균 지단 지출 기준 실시간 예측</p>
                    </div>
                </div>
            </div>

            {/* 2. Real Disposable Cash */}
            <div className="bg-[#151D2E] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full group-hover:bg-emerald-500/20 transition-all" />
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck size={12} /> True Liquid Assets
                    </div>
                    <InfoTooltip
                        title="Real Cash"
                        content="통장 잔고에서 '내 돈 아닌 것'을 뺀 진짜 쓸 수 있는 돈입니다."
                        contextualTip="부채와 세금을 제외하고 대표님이 즉시 인출하거나 투자할 수 있는 순수 기초 체력입니다."
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-sm tracking-tight mb-4">대표님이 지금 바로 쓸 수 있는 돈</h4>
                <div className="flex flex-col gap-1">
                    <span className="text-4xl font-black text-white tracking-tighter">₩{financials.realAvailableCash.toLocaleString()}</span>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">부채 및 세금 리저브 제외 완료</p>
                    </div>
                </div>
            </div>

            {/* 3. Tax Reserve Warning */}
            <div className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group shadow-xl ${taxReserve > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[#151D2E] border-white/5'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                        <Zap size={12} /> Tax Reserve
                    </div>
                    <InfoTooltip
                        title="Tax Reserve"
                        content="나중에 세금 폭탄 맞지 않게 미리 떼어놓아야 할 돈입니다."
                        contextualTip={taxReserve > 0 ? "이 돈은 통장에 있지만 국가의 돈입니다. 함부로 사용하면 현금 흐름에 타격이 올 수 있습니다." : "현재 안전한 상태입니다."}
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-sm tracking-tight mb-4">모르고 쓰면 안 되는 세금 (부가세 등)</h4>
                <div className="flex flex-col gap-1">
                    <span className={`text-4xl font-black tracking-tighter ${taxReserve > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        ₩{taxReserve.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                        {taxReserve > 0 ? (
                            <ArrowRight size={14} className="text-amber-500" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        )}
                        <p className={`text-[10px] font-bold uppercase tracking-tight ${taxReserve > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                            {taxReserve > 0 ? '통장에 있어도 대표님 돈이 아닙니다' : '현재 납부 대기 세액이 없습니다'}
                        </p>
                    </div>
                </div>
                {taxReserve > 0 && (
                    <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform`}>
                        <ReceiptText size={100} />
                    </div>
                )}
            </div>
        </div>
    );
};
