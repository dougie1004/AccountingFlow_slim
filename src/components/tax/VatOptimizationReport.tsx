import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { JournalEntry } from '../../types';

interface VatOptimizationReportProps {
    onClose: () => void;
    optimizedEntries: JournalEntry[];
    onApply: (id: string) => void;
}

export const VatOptimizationReport: React.FC<VatOptimizationReportProps> = ({ onClose, optimizedEntries, onApply }) => {
    const totalAdditionalRefund = optimizedEntries
        .filter(e => e.suggestedDescription?.includes('절세'))
        .reduce((sum, e) => sum + (e.suggestedVat || 0), 0);

    const totalRiskPrevented = optimizedEntries
        .filter(e => e.suggestedDescription?.includes('리스크'))
        .reduce((sum, e) => sum + e.vat, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#070C18]/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#151D2E] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">AI 부가세 최적화 리포트</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">VAT Optimization & Risk Mitigation Intelligence</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="text-emerald-400" size={18} />
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">추가 환급 예상액 (Maximization)</span>
                            </div>
                            <p className="text-3xl font-black text-white">₩{totalAdditionalRefund.toLocaleString()}</p>
                            <p className="text-xs text-emerald-300/70 mt-1 font-bold">놓친 매입세액 공제 항목 {optimizedEntries.filter(e => e.suggestedDescription?.includes('절세')).length}건 감지</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                    </div>

                    <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="text-rose-400" size={18} />
                                <span className="text-xs font-black text-rose-400 uppercase tracking-wider">가산세 리스크 차단 (Mitigation)</span>
                            </div>
                            <p className="text-3xl font-black text-white">₩{totalRiskPrevented.toLocaleString()}</p>
                            <p className="text-xs text-rose-300/70 mt-1 font-bold">불공제 대상 및 면세 오기입 {optimizedEntries.filter(e => e.suggestedDescription?.includes('리스크')).length}건 교정</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="px-8 pb-8 flex-1 overflow-y-auto">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">분석된 상세 내역 리스트</h3>
                    <div className="space-y-4">
                        {optimizedEntries.length === 0 ? (
                            <div className="py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <p className="text-slate-500 font-bold">최적화할 내역이 발견되지 않았습니다.</p>
                            </div>
                        ) : (
                            optimizedEntries.map((entry) => {
                                const isMaximization = entry.suggestedDescription?.includes('절세');
                                return (
                                    <div key={entry.id} className={`p-5 rounded-[2rem] border transition-all ${isMaximization ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isMaximization ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {isMaximization ? '관측된 절세 포인트' : '감지된 세무 리스크'}
                                                    </span>
                                                    <span className="text-xs font-black text-white">{entry.vendor}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold font-mono">{entry.date}</span>
                                                </div>

                                                <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
                                                    <div className="flex-1 text-center border-r border-white/5">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Before VAT</p>
                                                        <p className="text-sm font-black text-slate-400 font-mono">₩{entry.vat.toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex-shrink-0 text-indigo-400">
                                                        <ArrowRight size={16} />
                                                    </div>
                                                    <div className="flex-1 text-center">
                                                        <p className={`text-[9px] font-black uppercase mb-1 ${isMaximization ? 'text-emerald-400' : 'text-rose-400'}`}>After (AI Suggestion)</p>
                                                        <p className="text-sm font-black text-white font-mono">₩{entry.suggestedVat?.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <p className="text-xs font-bold text-slate-300 leading-relaxed pl-1">
                                                    {entry.suggestedDescription}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onApply(entry.id)}
                                                className={`px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 flex-shrink-0 ${isMaximization ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20'}`}
                                            >
                                                반영 및 승인
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 font-bold max-w-md">
                        * 본 리포트는 AI 분석 결과이며, 최종 법적 책임은 납세자에게 있습니다. <br />
                        반영 및 승인 시 장부에 즉시 반영되어 다음 국세청 신고 파일에 포함됩니다.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-[#0B1221] hover:bg-[#1e293b] text-white font-black rounded-2xl border border-white/5 transition-all active:scale-95"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
