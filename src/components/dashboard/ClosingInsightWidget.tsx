import React from 'react';
import { ClosingRecord, AccountingPeriod } from '../../types';
import { ShieldCheck, ArrowRight, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ClosingInsightWidgetProps {
    latestRecord: ClosingRecord | null;
    latestPeriod: AccountingPeriod | null;
    onNavigate?: (tab: string) => void;
}

export const ClosingInsightWidget: React.FC<ClosingInsightWidgetProps> = ({ latestRecord, latestPeriod, onNavigate }) => {
    if (!latestPeriod || latestPeriod.status !== 'CLOSED' || !latestRecord) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-full flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-slate-500/10 rounded-full text-slate-500 mb-4">
                    <Lock size={32} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">대기 중인 결산 정보가 없습니다</h3>
                <p className="text-slate-400 text-sm font-bold max-w-xs mb-6">
                    시스템의 신뢰도를 높이기 위해 월간 결산을 진행하고 확정된 재무 상태를 확인하세요.
                </p>
                <button
                    onClick={() => onNavigate?.('closing-manager')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg active:scale-95"
                >
                    결산 관리로 이동
                </button>
            </div>
        );
    }

    const unsettled = latestRecord.unsettled;

    return (
        <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck size={160} />
            </div>

            <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] uppercase font-black tracking-widest border border-emerald-500/20">
                                Official Record
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-white">
                            {latestRecord.period} 결산 마감 리포트
                        </h3>
                        <p className="text-xs font-bold text-slate-500 mt-1">
                            {new Date(latestRecord.closedAt).toLocaleDateString()} {latestRecord.closedBy}님이 확정함
                        </p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Lock size={24} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black text-slate-500 uppercase">순이익 (Profit)</span>
                            <div className="text-xl font-black text-white mt-1">
                                ₩{latestRecord.summary.profit.toLocaleString()}
                            </div>
                        </div>
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black text-slate-500 uppercase">자본 총계 (Equity)</span>
                            <div className="text-xl font-black text-white mt-1">
                                ₩{latestRecord.summary.equity.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {latestRecord.aiBriefing && (
                        <div className="mb-6 p-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/10 rounded-2xl border border-indigo-500/20">
                            <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                <ShieldCheck size={12} className="animate-pulse" /> AI Financial Insight
                            </div>
                            <p className="text-indigo-200/90 text-xs font-bold leading-relaxed whitespace-pre-line line-clamp-4">
                                {latestRecord.aiBriefing.replace(/###/g, '').replace(/\*\*/g, '')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400" />
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">결산 시 이월된 미결 리스크</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => onNavigate?.('risk-dashboard')}
                                className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 min-w-0 hover:bg-amber-500/10 transition-colors text-left"
                            >
                                <div className="text-[9px] font-black text-slate-500 mb-1 truncate">Operational</div>
                                <div className="text-xs font-bold text-white truncate" title={`₩${unsettled.operationalAmount.toLocaleString()}`}>
                                    ₩{unsettled.operationalAmount.toLocaleString()}
                                </div>
                            </button>
                            <button
                                onClick={() => onNavigate?.('risk-dashboard')}
                                className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 min-w-0 hover:bg-amber-500/10 transition-colors text-left"
                            >
                                <div className="text-[9px] font-black text-slate-500 mb-1 truncate">Matching</div>
                                <div className="text-xs font-bold text-white truncate" title={`₩${unsettled.matchingAmount.toLocaleString()}`}>
                                    ₩{unsettled.matchingAmount.toLocaleString()}
                                </div>
                            </button>
                            <button
                                onClick={() => onNavigate?.('risk-dashboard')}
                                className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 min-w-0 hover:bg-rose-500/10 transition-colors text-left"
                            >
                                <div className="text-[9px] font-black text-slate-500 mb-1 truncate">Compliance</div>
                                <div className="text-xs font-bold text-white truncate" title={`₩${unsettled.complianceAmount.toLocaleString()}`}>
                                    ₩{unsettled.complianceAmount.toLocaleString()}
                                </div>
                            </button>
                        </div>

                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 mt-2">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic line-clamp-2">
                                        "{latestRecord.note || '마감 메모가 없습니다.'}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => onNavigate?.('financial-statements')}
                    className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 shrink-0"
                >
                    상세 리포트 보기 <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};
