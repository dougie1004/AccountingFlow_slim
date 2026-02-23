import React, { useMemo } from 'react';
import { ShieldAlert, Info, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { getCFORiskSnapshot } from '../../bridge/StrategicBridge';
import { JournalEntry } from '../../types';

interface CFOReportCardProps {
    ledger: JournalEntry[];
    systemNow: string;
    initialCashBalance: number;
    onNavigate: (tabId: string) => void;
}

export const CFOReportCard: React.FC<CFOReportCardProps> = ({ ledger, systemNow, initialCashBalance, onNavigate }) => {
    const riskCards = useMemo(() => {
        return getCFORiskSnapshot(ledger, systemNow, initialCashBalance);
    }, [ledger, systemNow, initialCashBalance]);

    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case 'Critical':
                return { color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', icon: <ShieldAlert size={18} /> };
            case 'Watch':
                return { color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: <AlertTriangle size={18} /> };
            case 'Stable':
            default:
                return { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={18} /> };
        }
    };

    return (
        <section className="mb-6">
            <h2 className="text-xl font-black text-white px-2 mb-4 flex items-center gap-2">
                <TargetIcon /> 경영 방어선 요약 (CFO Risk Snapshot)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                {((window as any).isDemoMode || import.meta.env.VITE_APP_MODE === 'demo') ? (
                    <>
                        <div className={`bg-[#151D2E] border border-amber-500/30 hover:bg-[#111827] cursor-pointer transition-all rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between group`}>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Burn vs Cash (Risk)</span>
                                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold"><AlertTriangle size={18} /> WATCH</div>
                                </div>
                                <div className="text-3xl font-black text-white tracking-tighter mb-4">Runway 3.2개월</div>
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-xs font-bold text-slate-300 leading-relaxed">외상매출 회수 속도 개선 시 5.1개월로 연장 가능</p>
                            </div>
                        </div>
                        <div className={`bg-[#151D2E] border border-rose-500/30 hover:bg-[#111827] cursor-pointer transition-all rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between group`}>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">매출 실현율 (AR vs Cash)</span>
                                    <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold"><ShieldAlert size={18} /> CRITICAL</div>
                                </div>
                                <div className="text-3xl font-black text-white tracking-tighter mb-4">매출 대비 회수 60%</div>
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-xs font-bold text-slate-300 leading-relaxed">신규 매출 발생 중이나 현금 유입 속도(Conversion Rate) 저하. 외상매출 회전기간이 45일 -&gt; 78일로 급증</p>
                            </div>
                        </div>
                        <div className={`bg-[#151D2E] border border-emerald-500/30 hover:bg-[#111827] cursor-pointer transition-all rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between group`}>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">단기 유동성 (Quick Ratio)</span>
                                    <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold"><CheckCircle2 size={18} /> STABLE</div>
                                </div>
                                <div className="text-3xl font-black text-white tracking-tighter mb-4">현금잔액 112M</div>
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-xs font-bold text-slate-300 leading-relaxed">연말 인건비 지급 이후 현금 잔액이 안전선 이하로 하락할 리스크 내재</p>
                            </div>
                        </div>
                        <div className={`bg-[#151D2E] border border-amber-500/30 hover:bg-[#111827] cursor-pointer transition-all rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between group`}>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Marketing ROI</span>
                                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold"><AlertTriangle size={18} /> WATCH</div>
                                </div>
                                <div className="text-3xl font-black text-white tracking-tighter mb-4">지출 240% 급증</div>
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-xs font-bold text-slate-300 leading-relaxed">8월 마케팅비 집중 투입분 대비 LTV / CAC 효율 분석 및 전환 점검 필수</p>
                            </div>
                        </div>
                    </>
                ) : (
                    riskCards.map(risk => {
                        const config = getSeverityConfig(risk.severity);
                        return (
                            <div
                                key={risk.id}
                                onClick={() => onNavigate(risk.id)}
                                className={`bg-[#151D2E] border ${config.border} hover:bg-[#111827] cursor-pointer transition-all rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between group`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors flex items-center gap-1">
                                            {risk.title}
                                            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                        <div className={`flex items-center gap-1 ${config.color} ${config.bg} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                                            {config.icon}
                                            {risk.severity.toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tighter mb-4">
                                        {risk.value}
                                    </div>
                                </div>
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-xs font-bold text-slate-300 leading-relaxed">
                                        {risk.narrative}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
};

const TargetIcon = () => (
    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
        <TrendingUp size={16} />
    </div>
);
