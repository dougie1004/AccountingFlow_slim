import React, { useMemo } from 'react';
import { ShieldCheck, Calendar, Wallet, ReceiptText, Zap, ArrowRight, Activity, HelpCircle } from 'lucide-react';
import { FinancialSummary } from '../../types';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CEOQuickBarProps {
    financials: FinancialSummary;
    avgMonthlyBurn: number;
    isProfitable?: boolean;
    hasActivity?: boolean;
}

export const CEOQuickBar: React.FC<CEOQuickBarProps> = ({ financials, avgMonthlyBurn, isProfitable = false, hasActivity = false }) => {
    const runway = useMemo(() => {
        if (isProfitable) return 999;
        if (financials.realAvailableCash === 0) return 0;
        if (avgMonthlyBurn <= 0) return 999; // Infinite runway if logic valid
        return financials.realAvailableCash / avgMonthlyBurn;
    }, [financials.realAvailableCash, avgMonthlyBurn, isProfitable]);

    const taxReserve = financials.vatNet > 0 ? financials.vatNet : 0;

    const runwayEndDate = useMemo(() => {
        if (runway >= 999) return "지속 가능 (Surplus)";
        const date = new Date();
        date.setMonth(date.getMonth() + Math.floor(runway));
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    }, [runway]);

    // 🛡️ Strategic Zone Coloring
    const statusColor = useMemo(() => {
        if (!hasActivity) return { text: 'text-slate-400', bg: 'bg-slate-500/10', gradient: 'from-[#1e293b] to-[#0f172a]', label: 'PENDING', message: '분석을 위한 경영 활동 데이터가 부족합니다.' };
        if (runway >= 999) return { text: 'text-indigo-400', bg: 'bg-indigo-500/20', gradient: 'from-[#1e293b] to-[#0f172a]', label: 'GROWTH', message: '흑자 경영 지속 중. 잉여 현금 재투자 전략 수립 권장.' };
        if (runway >= 6) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', gradient: 'from-[#1e293b] to-[#0f172a]', label: 'STABLE', message: '현금 흐름 정상 범위. 자본 활용 효율성 극대화 가능.' };
        if (runway >= 3) return { text: 'text-amber-400', bg: 'bg-amber-500/20', gradient: 'from-[#1e293b] to-[#0f172a]', label: 'MONITOR', message: '가변 비용 지출 정밀 모니터링 및 유동성 추적 필요.' };
        return { text: 'text-rose-400', bg: 'bg-rose-500/20', gradient: 'from-rose-900/40 to-[#0f172a]', label: 'RISK', message: '유동성 결핍 리스크 감지. 자본 충원 전략 수립 시급.' };
    }, [runway, hasActivity]);

    // 💰 Net Free Cash Flow: 가용 자금 중 즉시 운용 가능한 여력
    const operationalFreeCash = financials.realAvailableCash * 0.15;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Life Expectancy (Runway) */}
            <div className={`relative group overflow-hidden bg-[#151D2E] border border-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl transition-all duration-500`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <Calendar size={120} />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className={`flex items-center gap-2 ${statusColor.text} font-black text-xs uppercase tracking-widest`}>
                                <div className={`w-2 h-2 rounded-full ${statusColor.bg.replace('/20', '')}`} /> {statusColor.label}
                            </div>
                            <InfoTooltip
                                title="Runway Analysis"
                                content="현재의 순현금 유출 속도(Burn Rate)를 기반으로 산출된 가용 자산의 소진 예상 기간입니다."
                                contextualTip={runway >= 999 ? "현재 흑자 상태로, 현금 소진 우려가 없습니다." : `현재 지출 추세 기준, ${runwayEndDate} 전후로 자산 소진이 예상됩니다.`}
                            />
                        </div>
                        <h4 className="text-white/60 font-bold text-xs sm:text-sm tracking-tight mb-4">Burnout Projection (Runway)</h4>
                        <div className="flex items-baseline gap-2 flex-wrap min-h-[4rem]">
                            <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter break-all">
                                {!hasActivity ? 'N/A' : (runway >= 999 ? '∞' : (runway * 30.4).toFixed(0))}
                            </span>
                            <span className="text-xl sm:text-2xl font-bold text-white/40">
                                {runway >= 999 ? 'SAFE' : 'DYS'}
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                        <span className={`w-fit px-3 py-1 ${statusColor.bg} rounded-full text-[10px] font-black ${statusColor.text} uppercase`}>
                            {!hasActivity ? 'No Data' : (runway >= 999 ? 'Profitable' : `${runway.toFixed(1)} Months Left`)}
                        </span>
                        <p className="text-slate-500 text-[10px] font-bold leading-relaxed">{statusColor.message}</p>
                    </div>
                </div>
            </div>

            {/* 2. Operational Free Cash */}
            <div className="bg-[#151D2E] border border-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-all" />
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck size={12} /> Operational Liquidity
                    </div>
                    <InfoTooltip
                        title="Unrestricted Operating Liquidity"
                        content="전체 유동 자산 중 고정 지출 및 확정 부채를 제외한 실질 운용 가능 자본입니다. (보수적 관점의 15% 안전 여력 계수 적용)"
                        contextualTip={`현재 유동성 구조 분석 결과, 보수적 관점(Total Cash의 15%)으로 ₩${(operationalFreeCash / 10000).toFixed(0)}만원 수준의 유동성 확보를 권장합니다.`}
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-xs sm:text-sm tracking-tight mb-4 line-clamp-1">Unrestricted Operating Liquidity</h4>
                <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter break-all">₩{financials.realAvailableCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <div className="flex items-center gap-2 mt-4 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                        <Zap size={14} className="text-indigo-400" />
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-tight">
                            Free Cash Est: ₩{operationalFreeCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Tax Liability Monitor */}
            <div className={`p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border transition-all relative overflow-hidden group shadow-xl ${taxReserve > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#151D2E] border-white/5'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest">
                        <ReceiptText size={12} /> Tax Liability Monitor
                    </div>
                    <InfoTooltip
                        title="Accrued Tax Liabilities"
                        content="부가가치세 및 법인세 등 차기 납부 예정인 확정 세무 부채의 추산액입니다."
                        contextualTip={taxReserve > 0 ? "세무 정합성 확보를 위해 해당 금액의 별도 계좌 유보를 권장합니다." : "현재 시점 기준 매입/매출 기반 세무 리스크가 최소화된 상태입니다."}
                    />
                </div>
                <h4 className="text-slate-400 font-bold text-xs sm:text-sm tracking-tight mb-4">Accrued Tax Liabilities</h4>
                <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter break-all ${taxReserve > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {taxReserve > 0 ? `₩${taxReserve.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "CLEAN"}
                        </span>
                        {taxReserve === 0 && <ShieldCheck className="text-emerald-400" size={24} />}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${taxReserve > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-tight ${taxReserve > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {taxReserve > 0 ? 'Tax Reserve Required' : 'No Deferred Tax Risk'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
