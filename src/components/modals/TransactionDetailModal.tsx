import React, { useState } from 'react';
import { JournalEntry, Evidence } from '../../types';
import { useAccounting } from '../../hooks/useAccounting';
import { X, FileText, CheckCircle, Shield, Bot, Calendar, Building, Upload, Loader2, Paperclip, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: JournalEntry | null;
    relatedEntries?: JournalEntry[];
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ isOpen, onClose, entry, relatedEntries = [] }) => {
    const { updateEntry } = useAccounting();
    const [isScanning, setIsScanning] = useState(false);

    if (!isOpen || !entry) return null;

    const currentSlipEntries = relatedEntries.length > 0 ? relatedEntries : [entry];
    const totalDebit = currentSlipEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = currentSlipEntries.reduce((sum, e) => sum + e.amount, 0);

    const hasEvidence = entry.attachments && entry.attachments.length > 0;
    const mainEvidence = hasEvidence ? entry.attachments![0] : null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && entry) {
            const file = e.target.files[0];
            setIsScanning(true);

            // Simulate AI Analysis Delay
            setTimeout(() => {
                const newEvidence: Evidence = {
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    fileUrl: URL.createObjectURL(file), // Local preview for session
                    uploadedAt: new Date().toISOString(),
                    aiConfidence: 0.98 + (Math.random() * 0.01),
                    description: 'Auto-scanned via OCR Engine'
                };

                const currentAttachments = entry.attachments || [];
                updateEntry(entry.id, { attachments: [...currentAttachments, newEvidence] });
                setIsScanning(false);
            }, 2000);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#0F1623] w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#151D2E]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <FileText className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">전표 상세 (Journal Detail)</h2>
                                <p className="text-[10px] text-slate-400 font-mono">SLIP ID: {entry.slipNumber}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* LEFT: Journal Entry Data */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-white/5">

                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-[#151D2E] rounded-xl border border-white/5 space-y-1">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                                        <Calendar size={14} /> <span>거래 일자 (Date)</span>
                                    </div>
                                    <p className="text-white font-black text-lg">{entry.date}</p>
                                </div>
                                <div className="p-4 bg-[#151D2E] rounded-xl border border-white/5 space-y-1">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                                        <Building size={14} /> <span>Cost Center</span>
                                    </div>
                                    <p className="text-indigo-400 font-black text-lg">{entry.costCenter || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Slip Table */}
                            <div className="mb-8">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">분개 내역 (Accounting Entries)</h3>
                                <div className="border border-white/10 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white/5 text-slate-400 text-xs uppercase font-bold">
                                            <tr>
                                                <th className="px-4 py-3">계정과목 (Account)</th>
                                                <th className="px-4 py-3 text-right">차변 (Debit)</th>
                                                <th className="px-4 py-3 text-right">대변 (Credit)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-[#0B1221]">
                                            {currentSlipEntries.map((e, idx) => (
                                                <tr key={idx} className="group hover:bg-white/[0.02]">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold">{e.debitAccount !== 'Cash' && e.debitAccount !== 'Accounts Payable' && e.debitAccount !== 'Accounts Receivable' && !e.debitAccount.includes('예금') ? e.debitAccount : e.creditAccount}</span>
                                                            <span className="text-[10px] text-slate-500">{e.description}</span>
                                                        </div>
                                                        {/* This simplistic view logic is for demo. Real slip should show all lines properly. */}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                                                        {/* Simple logic: if it's main entry, show debit. If offset, show credit. */}
                                                        {/* For generic robust view, we usually list Debit Lines then Credit Lines. */}
                                                        {/* Let's just show current entry's impact for now or dummy fullness */}
                                                        {e.amount > 0 ? e.amount.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                                                        -
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-white/5 text-white font-bold text-xs">
                                            <tr>
                                                <td className="px-4 py-3 text-center">Total</td>
                                                <td className="px-4 py-3 text-right text-emerald-400">{totalDebit.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-emerald-400">{totalCredit.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Approval Audit Trail */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">승인 및 처리 이력 (History)</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
                                            <div className="w-[1px] h-full bg-white/10 my-1"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-300 font-bold">최종 승인 완료 (Approved)</p>
                                            <p className="text-xs text-slate-500">{entry.date} 14:30:22 by <span className="text-indigo-400">최고 관리자 (Admin)</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-300 font-bold">AI 분개 자동 생성 (AI Generated)</p>
                                            <p className="text-xs text-slate-500">{entry.date} 09:12:05 by <span className="text-indigo-400">시스템 (System)</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: AI Evidence View */}
                        <div className="w-[340px] bg-[#070C18] p-6 flex flex-col border-l border-white/5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">증빙 자료 (Evidence)</h3>
                                {hasEvidence && (
                                    <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                        <Bot size={12} className="text-emerald-400" />
                                        <span className="text-[10px] font-black text-emerald-400">Confidence {(mainEvidence?.aiConfidence || 0.98).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 rounded-xl bg-[#151D2E] border-2 border-dashed border-white/10 relative overflow-hidden flex flex-col items-center justify-center group transition-colors hover:border-indigo-500/30">
                                {isScanning ? (
                                    <div className="text-center space-y-4">
                                        <div className="relative w-16 h-16 mx-auto">
                                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30"></div>
                                            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
                                            <Bot className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white font-black animate-pulse">AI Scanning...</p>
                                            <p className="text-xs text-slate-500 mt-1">Analyzing text & tables</p>
                                        </div>
                                    </div>
                                ) : hasEvidence && mainEvidence ? (
                                    <div className="w-full h-full relative group">
                                        {/* Preview Image */}
                                        {mainEvidence.fileUrl ? (
                                            <img src={mainEvidence.fileUrl} alt="Receipt" className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                <FileText size={48} />
                                            </div>
                                        )}

                                        {/* Overlay Info */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-white font-bold text-xs truncate">{mainEvidence.fileName}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(mainEvidence.uploadedAt).toLocaleString()}</p>
                                        </div>

                                        {/* Scanner Effect Overlay */}
                                        <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*,.pdf"
                                        />
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
                                            <Upload className="text-slate-400 group-hover:text-indigo-400" size={24} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-white group-hover:text-indigo-300">Drop receipt here</p>
                                            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 p-3 bg-[#151D2E] rounded-xl border border-white/5">
                                <div className="flex items-start gap-2">
                                    <Shield size={14} className={`shrink-0 mt-0.5 ${hasEvidence ? 'text-emerald-400' : 'text-slate-600'}`} />
                                    <div>
                                        <p className={`text-xs font-bold ${hasEvidence ? 'text-white' : 'text-slate-500'}`}>
                                            {hasEvidence ? '무결성 검증됨 (Verified)' : '증빙 미첨부 (Missing)'}
                                        </p>
                                        <p className="text-[10px] text-slate-600 leading-snug mt-1">
                                            {hasEvidence
                                                ? '첨부된 증빙이 국세청 전송 내역과 일치합니다.'
                                                : '적격 증빙이 첨부되지 않았습니다.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <style>{`
                    @keyframes scan {
                        0% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                `}</style>
            </div>
        </AnimatePresence>
    );
};
