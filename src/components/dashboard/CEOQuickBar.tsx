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
        if (avgMonthlyBurn <= 0) return 36; // Default to 36 if no burn
        return financials.realAvailableCash / avgMonthlyBurn;
    }, [financials.realAvailableCash, avgMonthlyBurn]);

    const taxReserve = financials.vatNet > 0 ? financials.vatNet : 0;

    const runwayEndDate = useMemo(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + Math.floor(runway));
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    }, [runway]);

    // 🛡️ Safety Zone Coloring
    const statusColor = useMemo(() => {
        if (runway >= 6) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', gradient: 'from-emerald-600 to-teal-700', label: 'Safety Zone', message: '자금 흐름이 매우 건강합니다. 성장에 집중하세요!' };
        if (runway >= 3) return { text: 'text-amber-400', bg: 'bg-amber-500/20', gradient: 'from-amber-600 to-orange-700', label: 'Caution Zone', message: '지출 관리가 필요한 시점입니다. 현금 흐름을 점검하세요.' };
        return { text: 'text-rose-400', bg: 'bg-rose-500/20', gradient: 'from-rose-600 to-pink-700', label: 'Danger Zone', message: '런웨이가 위급합니다. 즉각적인 비용 절감이나 펀딩이 필요합니다.' };
    }, [runway]);

    // 💰 Golden Rule: 지출 가능 예산 (Real Cash의 10% 혹은 런웨이 보존 범위 내 지출 권장)
    const comfortableBudget = financials.realAvailableCash * 0.1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Life Expectancy (Runway) */}
            <div className={`relative group overflow-hidden bg-gradient-to-br ${statusColor.gradient} p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500`}>
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Calendar size={120} />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-white/90 font-black text-xs uppercase tracking-widest">
                                <Activity size={12} /> {statusColor.label}
                            </div>
                            <InfoTooltip
                                title="Runway"
                                content="대표님, 이 지표는 수입이 없어도 현재 잔액으로 회사가 얼마나 견딜 수 있는지를 알려줘요."
                                contextualTip={`현재 지출 속도라면 ${runwayEndDate}까지는 걱정 없이 사업하실 수 있습니다.`}
                            />
                        </div>
                        <h4 className="text-white/80 font-bold text-sm tracking-tight mb-4">현재 비즈니스 생존 일수 (Runway)</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white tracking-tighter">{(runway * 30.4).toFixed(0)}</span>
                            <span className="text-2xl font-bold text-white/60">일</span>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                        <span className="w-fit px-3 py-1 bg-white/20 rounded-full text-[10px] font-black text-white uppercase">
                            {runway.toFixed(1)} Months Left
                        </span>
                        <p className="text-white/70 text-[10px] font-bold leading-relaxed">{statusColor.message}</p>
                    </div>
                </div>
            </div>

            {/* 2. Real Disposable Cash & Golden Rule */}
            <div className="bg-[#151D2E] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full group-hover:bg-emerald-500/20 transition-all" />
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck size={12} /> Golden Rule Cash
                    </div>
                    <InfoTooltip
                        title="Golden Rule 예산"
                        content="지갑에 돈이 있다고 다 쓸 수 있는 건 아니죠. 런웨이에 큰 지장을 주지 않으면서 '지금 바로 써도 되는' 안전한 금액을 계산해 드려요."
                        contextualTip={`대표님, 오늘 ₩${(comfortableBudget / 10000).toFixed(0)}만원 정도의 장비나 식대는 기분 좋게 결제하셔도 괜찮습니다.`}
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-sm tracking-tight mb-4">현재 마음 편히 지출 가능한 예산</h4>
                <div className="flex flex-col gap-1">
                    <span className="text-4xl font-black text-white tracking-tighter">₩{financials.realAvailableCash.toLocaleString()}</span>
                    <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                        <Zap size={14} className="text-emerald-400" />
                        <p className="text-[10px] text-emerald-300 font-black uppercase tracking-tight">
                            Safe to spend: ₩{comfortableBudget.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Tax Reserve Warning */}
            <div className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group shadow-xl ${taxReserve > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[#151D2E] border-white/5'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                        <ReceiptText size={12} /> Tax Risk Monitor
                    </div>
                    <InfoTooltip
                        title="Tax Reserve"
                        content="나중에 세무서에서 고지서 날아올 때 당황하지 않게 '미리 떼어놓아야 할 나랏돈'이에요."
                        contextualTip={taxReserve > 0 ? "이 돈은 장부상 수익과 별개로 보관해 두시는 게 마음 편하실 거예요." : "대표님, 현재 세무 리스크가 0건입니다. 아주 클린해요!"}
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-sm tracking-tight mb-4">세무 리스크 및 납부 대기 세액</h4>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-4xl font-black tracking-tighter ${taxReserve > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {taxReserve > 0 ? `₩${taxReserve.toLocaleString()}` : "CLEAN"}
                        </span>
                        {taxReserve === 0 && <ShieldCheck className="text-emerald-400" size={24} />}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${taxReserve > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-tight ${taxReserve > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {taxReserve > 0 ? '통장에 있어도 대표님 돈이 아닙니다' : '세무 리스크: 0건 (안심하셔도 됩니다)'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
