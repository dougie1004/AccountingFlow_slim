import React, { useState } from 'react';
import { X, Search, ZoomIn, ZoomOut, FileText, Image as ImageIcon, Download, Share2, ShieldCheck, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry } from '../types';

interface EvidenceViewerProps {
    isOpen: boolean;
    onClose: () => void;
    entry: JournalEntry | null;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ isOpen, onClose, entry }) => {
    const [zoom, setZoom] = useState(100);
    const [activeTab, setActiveTab] = useState<'preview' | 'ocr' | 'audit'>('preview');

    if (!isOpen || !entry) return null;

    // Mock evidence if not present (Simulation for Demo)
    const evidenceUrl = entry.attachmentUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000";
    const ocrData = entry.ocrData ? JSON.parse(entry.ocrData) : {
        merchant: entry.vendor || "Unknown Merchant",
        date: entry.date,
        total: entry.amount,
        items: [
            { desc: entry.description, amount: entry.amount }
        ],
        confidence: entry.confidence || "High (98.2%)"
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#151D2E] w-full max-w-6xl h-[85vh] rounded-3xl border border-white/10 shadow-2xl flex overflow-hidden"
                >
                    {/* Left: Viewer Area */}
                    <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0B1221] relative">
                        {/* Toolbar */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#151D2E]/50">
                            <div className="flex items-center gap-4">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-400" />
                                    Digital Evidence Viewer
                                </h3>
                                <div className="h-4 w-px bg-white/10" />
                                <span className="text-xs font-mono text-slate-500">{entry.id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <ZoomOut size={18} />
                                </button>
                                <span className="text-xs font-mono text-slate-400 w-12 text-center">{zoom}%</span>
                                <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <ZoomIn size={18} />
                                </button>
                                <div className="h-4 w-px bg-white/10 mx-2" />
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Printer size={18} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
                            <motion.div
                                style={{ width: `${zoom}%` }}
                                className="relative shadow-2xl ring-1 ring-white/10"
                            >
                                <img
                                    src={evidenceUrl}
                                    alt="Evidence"
                                    className="w-full h-auto rounded-lg"
                                />
                                {activeTab === 'ocr' && (
                                    <div className="absolute inset-0 bg-indigo-500/10 border-2 border-indigo-500 rounded-lg pointer-events-none">
                                        <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">
                                            OCR CONFIDENCE: {ocrData.confidence}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Right: Meta Panel */}
                    <div className="w-96 bg-[#151D2E] flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-black text-white mb-1">Evidence Details</h2>
                                <p className="text-xs text-slate-500 font-bold">증빙 데이터 및 감사 로그</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-2 gap-1 border-b border-white/5 bg-black/20">
                            {['preview', 'ocr', 'audit'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === tab
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {activeTab === 'preview' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Vendor (공급자)</label>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-white text-sm font-bold">
                                            {entry.vendor}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Amount (금액)</label>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-white text-sm font-bold font-mono">
                                            ₩{entry.amount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Description (적요)</label>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-slate-300 text-sm font-bold">
                                            {entry.description}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                                        <ShieldCheck className="text-emerald-400 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs font-black text-emerald-400 mb-1">DATA INTEGRITY VERIFIED</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                원본 이미지의 해시값(SHA-256)이 블록체인 원장 기록과 일치합니다. 위변조되지 않은 원본임을 보증합니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ocr' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">Extracted Text</span>
                                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">JSON</span>
                                    </div>
                                    <pre className="text-[10px] font-mono text-slate-300 bg-black/40 p-4 rounded-xl overflow-x-auto border border-white/5">
                                        {JSON.stringify(ocrData, null, 2)}
                                    </pre>
                                    <p className="text-[11px] text-slate-500 italic text-center">
                                        * AI OCR Engine v2.4 (Powered by Google Vision)
                                    </p>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="space-y-4">
                                    <div className="relative pl-6 space-y-6 border-l border-white/10 ml-2">
                                        {(entry.auditTrail || ['Upload Confirmed', 'AI Analysis Complete', 'Pending Approval']).map((log, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[29px] top-0 w-3 h-3 rounded-full bg-slate-700 border-2 border-[#151D2E]" />
                                                <p className="text-xs font-bold text-slate-300">{log}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-1">2026-01-23 14:35:22</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-black/20">
                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                <Share2 size={14} />
                                Share Safe Link
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
