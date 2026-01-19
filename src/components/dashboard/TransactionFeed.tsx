import React, { useState, useContext, useMemo } from 'react';
import { LucideIcon, Sparkles, Brain, ShieldCheck, AlertCircle, CheckCircle, ChevronRight, Calculator, FileText, Trash2, Edit2, Plus, ArrowRight, Send, Check, X, Loader2, ShieldAlert, ShieldQuestion, MessageSquare, Paperclip } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { AnalysisResponse, Partner, EntryType, JournalEntry } from '../../types';
import { AccountingContext } from '../../context/AccountingContext';
import { ALL_ACCOUNTS } from '../../constants/accounts';
import { invoke } from '@tauri-apps/api/core';

interface TransactionFeedProps {
    onConfirm: (entry: JournalEntry) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({ onConfirm }) => {
    const context = useContext(AccountingContext);
    const [input, setInput] = useState('');
    const [userResponse, setUserResponse] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [lastUserQuestion, setLastUserQuestion] = useState<string | null>(null);
    const { partners, addPartner } = context!;
    const { parseTransaction, chatWithCompliance, isParsing, error } = useAI();
    const [selectedFile, setSelectedFile] = useState<{ name: string, bytes: number[], mime: string, url: string } | null>(null);
    const [complianceChatInput, setComplianceChatInput] = useState('');

    const handleSubmit = async (e: React.FormEvent, directResponse?: string) => {
        e.preventDefault();
        const responseToUse = directResponse || userResponse;
        const textToParse = analysis?.transaction?.needsClarification
            ? `Original Input: ${input} \nUser's Additional Info: ${responseToUse}`
            : input;

        if (!textToParse.trim() || isParsing) return;

        const policy = "Default Accounting Policy: Accrual Basis, SME Asset Threshold 1M KRW";
        const result = await parseTransaction(
            textToParse,
            policy,
            partners,
            "default-tenant",
            "Pro",
            selectedFile?.bytes,
            selectedFile?.mime
        );
        if (result) {
            setAnalysis(result);
            if (!result.transaction?.needsClarification) {
                // Clear user response only if finalized
                setUserResponse('');
            }
        }
    };

    const handleConfirm = async () => {
        if (!analysis || !analysis.transaction) return;
        const { transaction, vendorStatus, suggestedVendor, complianceReview } = analysis;

        let debitAccount = '계정 미지정';
        let creditAccount = '계정 미지정';

        switch (transaction.entryType) {
            case 'Expense':
            case 'Asset':
                debitAccount = transaction.accountName || transaction.description;
                // 미확정(Unconfirmed) 상태로 등록 시에는 일단 '미지급금'으로 부채 인식
                creditAccount = '미지급금';
                break;
            case 'Equity':
            case 'Revenue':
            case 'Liability':
                debitAccount = '미수금'; // 미확정 시 '미수금' 처리
                creditAccount = transaction.accountName || '기타자본/부채/수익';
                break;
            case 'Payroll':
                debitAccount = '급여';
                creditAccount = '미지급급여';
                break;
            default:
                debitAccount = 'Suspense';
                creditAccount = 'Suspense';
        }

        // Knowledge Sync: Store compliance logs in clarification_prompt for the Approval Desk
        const complianceLog = complianceReview
            ? `[Compliance Review]\nStatus: ${complianceReview.status}\nMessage: ${complianceReview.message}\nLogs: ${complianceReview.reviewLogs?.join(', ')}`
            : '';

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: transaction.date || new Date().toISOString().split('T')[0],
            description: transaction.description,
            vendor: transaction.vendor,
            debitAccount,
            creditAccount,
            amount: transaction.amount,
            vat: transaction.vat,
            type: transaction.entryType as EntryType,
            status: transaction.confidence === 'High' ? 'Unconfirmed' : 'Pending Review',
            complianceContext: complianceLog, // Knowledge sync from Compliance AI
            attachmentUrl: selectedFile?.url,
        };

        if (vendorStatus === 'Pending_Registration' && suggestedVendor) {
            // "자동 등록" 요청에 따라 즉시 승인(Approved) 상태로 마스터 네트워크에 편입
            if ((window as any).__TAURI_INTERNALS__) {
                const approvedVendor = await invoke<Partner>('approve_partner', {
                    partner: suggestedVendor,
                    partners
                });
                addPartner(approvedVendor);
            } else {
                // Web Fallback: Just add the suggested vendor as "Approved" in the local state
                addPartner({ ...suggestedVendor, status: 'Approved' });
            }
        }

        onConfirm(newEntry);
        setAnalysis(null);
        setInput('');
        setUserResponse('');
        setSelectedFile(null);
    };

    const handleComplianceChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!complianceChatInput.trim() || isParsing) return;

        setLastUserQuestion(complianceChatInput);
        const result = await chatWithCompliance(
            complianceChatInput,
            analysis?.transaction,
            "Standard SME Policy"
        );
        if (result) {
            setAnalysis(result);
            setComplianceChatInput('');
        }
    };

    const complianceStatus = analysis?.complianceReview?.status || 'Safe';

    return (
        <div className="flex flex-col xl:flex-row h-full w-full bg-[#0B1221] animate-in fade-in duration-500 overflow-hidden">
            {/* Left Column: Input & Journal AI */}
            <div className="flex-1 flex flex-col p-6 space-y-6 border-r border-white/5 overflow-y-auto">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Sparkles size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Journal AI</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Execution Layer (실행)</p>
                        </div>
                    </div>
                    {isParsing && (
                        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black animate-pulse">
                            <Loader2 size={12} className="animate-spin" /> ANALYSIS IN PROGRESS
                        </div>
                    )}
                </header>

                <div className="space-y-4">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold animate-in slide-in-from-top-2 duration-300">
                            <AlertCircle size={18} />
                            <span>분석 중 오류 발생: {error}</span>
                        </div>
                    )}
                    <div className="bg-[#151D2E] rounded-3xl border border-white/5 p-1 group transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isParsing}
                            placeholder="전표 데이터를 입력하세요..."
                            className="w-full h-32 px-5 py-4 bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 text-lg font-bold resize-none outline-none"
                        />
                        <div className="flex justify-between items-center p-2 bg-[#0B1221]/30 rounded-b-3xl">
                            <label className="p-2 text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors flex items-center gap-2 group/upload">
                                <Paperclip size={18} />
                                <span className="text-[10px] font-black uppercase opacity-0 group-hover/upload:opacity-100 transition-opacity">증빙 첨부 (OCR 분석)</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (event) => {
                                                const arrayBuffer = event.target?.result as ArrayBuffer;
                                                const bytes = Array.from(new Uint8Array(arrayBuffer));
                                                const url = URL.createObjectURL(file);
                                                setSelectedFile({
                                                    name: file.name,
                                                    bytes,
                                                    mime: file.type,
                                                    url
                                                });
                                                setInput(prev => `${prev}\n[Attached: ${file.name}]`);
                                            };
                                            reader.readAsArrayBuffer(file);
                                        }
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e)}
                                disabled={isParsing || !input.trim()}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-20"
                            >
                                {isParsing ? '분석 중...' : '분개 생성'}
                            </button>
                        </div>
                    </div>
                </div>

                {analysis && !analysis.transaction?.isConsultation && (
                    <div className="animate-in slide-in-from-left-4 duration-500">
                        <div className="bg-[#151D2E] rounded-[2rem] border border-white/10 p-8 space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">분개 초안 (Draft)</span>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${analysis.transaction?.confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                    Confidence: {analysis.transaction?.confidence || 'Medium'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Account</p>
                                    <input
                                        list="feed-account-list"
                                        value={analysis.transaction?.accountName || ""}
                                        onChange={(e) => {
                                            if (analysis.transaction) {
                                                setAnalysis({
                                                    ...analysis,
                                                    transaction: {
                                                        ...analysis.transaction,
                                                        accountName: e.target.value
                                                    }
                                                });
                                            }
                                        }}
                                        placeholder="계정과목 입력..."
                                        className="bg-transparent border-none p-0 text-lg font-black text-white focus:ring-0 outline-none w-full placeholder:text-slate-700"
                                    />
                                    <datalist id="feed-account-list">
                                        {ALL_ACCOUNTS.map(acc => (
                                            <option key={acc.code} value={acc.name}>{acc.code} {acc.description}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Vendor</p>
                                    <p className="text-lg font-black text-indigo-400">{analysis.transaction?.vendor || '내부거래'}</p>
                                </div>
                                <div className="col-span-2 py-4 bg-[#0B1221]/50 rounded-2xl border border-white/5 px-4 italic text-slate-300 font-bold">
                                    "{analysis.transaction?.description}"
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Amount</p>
                                    <p className="text-2xl font-black text-white font-mono">₩{analysis.transaction?.amount.toLocaleString()}</p>
                                </div>
                                <div className="flex items-end justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAnalysis(null)}
                                        className="px-6 py-3 bg-white/5 text-slate-400 font-black rounded-2xl hover:bg-rose-500/10 hover:text-rose-400 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirm}
                                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> 전표 등록
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Compliance AI Sidebar */}
            <div className="w-full xl:w-[400px] bg-[#070C18] p-6 flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-700">
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
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Compliance AI</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Supervision Layer (감수)</p>
                    </div>
                </header>

                <div className="flex-1 space-y-4">
                    {!analysis ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                            <ShieldCheck size={48} className="text-slate-700" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                입력을 감매하여<br />실시간 규정 검토를 시작합니다
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-300 ${complianceStatus === 'Safe' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300/80' :
                                complianceStatus === 'Warning' ? 'bg-amber-500/5 border-amber-500/10 text-amber-300/80' :
                                    'bg-rose-500/5 border-rose-500/10 text-rose-300/80'
                                }`}>
                                <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <MessageSquare size={12} /> Compliance Advisory
                                </h3>
                                {lastUserQuestion && (
                                    <div className="mb-4 bg-[#0B1221] p-3 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">User Inquiry</p>
                                        <p className="text-xs font-bold text-slate-300 italic">"{lastUserQuestion}"</p>
                                    </div>
                                )}
                                <p className="text-sm font-bold leading-relaxed text-white whitespace-pre-wrap">
                                    {analysis.complianceReview?.message || '검토 중인 리스크가 없습니다.'}
                                </p>
                            </div>

                            {analysis.transaction?.needsClarification && (
                                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                    <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                                        <p className="text-xs font-black text-indigo-400 uppercase mb-2">추가 질문 (Clarification)</p>
                                        <p className="text-sm font-bold text-white">{analysis.transaction?.clarificationPrompt}</p>
                                    </div>

                                    {analysis.transaction?.clarificationOptions && (
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.transaction.clarificationOptions.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
                                                        handleSubmit(fakeEvent, opt);
                                                    }}
                                                    className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs font-black transition-all hover:scale-105 active:scale-95"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Persistent Chat Input for Compliance AI */}
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Brain size={12} className="text-indigo-400" />
                                    Compliance Manager 문의
                                </label>
                                <form onSubmit={handleComplianceChat} className="relative">
                                    <input
                                        value={complianceChatInput}
                                        onChange={(e) => setComplianceChatInput(e.target.value)}
                                        placeholder="계정과목이나 규정 관련 궁금한 점..."
                                        className="w-full pl-5 pr-12 py-3.5 bg-[#151D2E] border border-white/5 rounded-2xl text-white font-bold text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 shadow-xl"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isParsing || !complianceChatInput.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-20"
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                                <p className="text-[9px] text-slate-600 font-medium px-2">
                                    현재 실시간 전표 데이터가 Compliance Manager에게 공유되었습니다.
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

                <div className="pt-6 border-t border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                        Powered by Antigravity Compliance Engine v2.0
                    </p>
                </div>
            </div>
        </div>
    );
};
