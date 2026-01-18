import React, { useState } from 'react';
import { ShieldCheck, ShieldQuestion, ShieldAlert, MessageSquare, Brain, Send, ArrowRight } from 'lucide-react';
import { AnalysisResponse } from '../../types';
import { useAI } from '../../hooks/useAI';
import { cleanMarkdown } from '../../utils/textUtils';

interface ComplianceSidebarProps {
    analysis: AnalysisResponse | null;
    onAnalysisUpdate: (analysis: AnalysisResponse) => void;
    isBusy?: boolean;
}

export const ComplianceSidebar: React.FC<ComplianceSidebarProps> = ({ analysis, onAnalysisUpdate, isBusy }) => {
    const { chatWithCompliance, isParsing } = useAI();
    const [complianceChatInput, setComplianceChatInput] = useState('');
    const [lastUserQuestion, setLastUserQuestion] = useState<string | null>(null);

    const handleComplianceChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!complianceChatInput.trim() || isParsing || isBusy) return;

        setLastUserQuestion(complianceChatInput);
        const result = await chatWithCompliance(
            complianceChatInput,
            analysis?.transaction,
            "Standard SME Policy"
        );
        if (result) {
            onAnalysisUpdate(result);
            setComplianceChatInput('');
        }
    };

    const complianceStatus = analysis?.complianceReview?.status || 'Safe';

    return (
        <div className="h-full bg-[#070C18] p-6 flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-700 rounded-3xl border border-white/5">
            <header className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${complianceStatus === 'Safe' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    complianceStatus === 'Warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {complianceStatus === 'Safe' ? <ShieldCheck size={20} /> :
                        complianceStatus === 'Warning' ? <ShieldQuestion size={20} /> :
                            <ShieldAlert size={20} />}
                </div>
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Accounting AI</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Support & Advisory (회계 상담)</p>
                </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {!analysis ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                        <ShieldCheck size={48} className="text-slate-700" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            입력을 감지하여<br />실시간 규정 검토를 시작합니다
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-300 ${complianceStatus === 'Safe' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300/80' :
                            complianceStatus === 'Warning' ? 'bg-amber-500/5 border-amber-500/10 text-amber-300/80' :
                                'bg-rose-500/5 border-rose-500/10 text-rose-300/80'
                            }`}>
                            <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <MessageSquare size={12} /> Accounting Advisory
                            </h3>
                            {lastUserQuestion && (
                                <div className="mb-4 bg-[#0B1221] p-3 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">User Inquiry</p>
                                    <p className="text-xs font-bold text-slate-300 italic">"{lastUserQuestion}"</p>
                                </div>
                            )}
                            <p className="text-base font-bold leading-relaxed text-white whitespace-pre-wrap mb-4">
                                {cleanMarkdown(analysis.complianceReview?.message) || '검토 중인 리스크가 없습니다.'}
                            </p>

                            {/* Reasoning Section (Why?) */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                                    <Brain size={12} />
                                    AI 판단 근거
                                </p>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    {cleanMarkdown(analysis.transaction?.reasoning) || "규정 및 과거 처리 이력을 바탕으로 판단했습니다."}
                                </p>
                            </div>

                            {/* Verification Badge */}
                            <div className="mt-4 flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                                <ShieldCheck size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-100 uppercase">AI 회계사 검증 완료</span>
                            </div>
                        </div>

                        {analysis.transaction?.needsClarification && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                                    <p className="text-xs font-black text-indigo-400 uppercase mb-2">추가 질문 (Clarification)</p>
                                    <p className="text-sm font-bold text-white">{analysis.transaction?.clarificationPrompt}</p>
                                </div>
                            </div>
                        )}

                        {/* Persistent Chat Input for Compliance AI */}
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Brain size={12} className="text-indigo-400" />
                                AI 회계사와 대화하기
                            </label>
                            <form onSubmit={handleComplianceChat} className="relative">
                                <input
                                    value={complianceChatInput}
                                    onChange={(e) => setComplianceChatInput(e.target.value)}
                                    placeholder="예: 이 비용이 왜 접대비로 분류되었나요?"
                                    className="w-full pl-5 pr-12 py-3.5 bg-[#151D2E] border border-white/5 rounded-2xl text-white font-bold text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 shadow-xl"
                                />
                                <button
                                    type="submit"
                                    disabled={isParsing || !complianceChatInput.trim() || isBusy}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-20"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                            <p className="text-[9px] text-slate-600 font-medium px-2">
                                현재 전표 데이터가 AI 감사관에게 공유되었습니다. 궁금한 점을 자연어로 질문해 보세요.
                            </p>
                        </div>

                        {complianceStatus !== 'Safe' && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logic Logs</p>
                                <div className="space-y-2">
                                    {analysis.complianceReview?.reviewLogs?.map((log, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-white/5 p-2 rounded-lg">
                                            <ArrowRight size={10} className="text-indigo-500" />
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-6 border-t border-white/5 text-center shrink-0">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                    Powered by AccountingFlow Intelligence v2.0
                </p>
            </div>
        </div>
    );
};
